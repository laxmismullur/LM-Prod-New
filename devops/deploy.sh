#!/bin/bash
# LM Hospital native deployment script
# Runs on EC2 via AWS SSM after Jenkins writes /home/ubuntu/lm-hospital/.env
# Pre-requisites: bootstrap.tpl already executed
set -euo pipefail

# Fix git safe directory — SSM runs as root, repo may be owned by ubuntu
git config --global --add safe.directory /home/ubuntu/lm-hospital
git config --global --add safe.directory '*'

APP_DIR=/home/ubuntu/lm-hospital
FRONTEND_DIST=/var/www/lm-hospital
LOG_FILE=/var/log/lm-hospital/deploy.log
GIT_REPO="${GIT_REPO_URL:-https://github.com/laxmismullur/LM-Hospital-Production.git}"

mkdir -p /var/log/lm-hospital
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== LM Hospital Deploy: $(date) ==="

# 0. Ensure swap exists (guards against OOM during Maven build + running services)
if ! swapon --show | grep -q '/swapfile'; then
    echo "--- Creating 2 GB swap ---"
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
echo "Swap: $(free -h | awk '/^Swap/{print $2}')"

# 1. Load environment
set -a
source "$APP_DIR/.env"
set +a

# 2. Clone or update source code
echo "--- Syncing source code ---"
if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
    git clean -fd
else
    git clone "$GIT_REPO" "$APP_DIR"
    cd "$APP_DIR"
fi

# Reload .env after git reset
set -a
source "$APP_DIR/.env"
set +a

# 3. Initialise MySQL database and user
echo "--- Initialising MySQL ---"
export MYSQL_DATABASE DB_USERNAME DB_PASSWORD
envsubst < "$APP_DIR/db/schema.sql" | mysql -u root --connect-expired-password

# 4. Build Spring Boot backend
#    Stop the running backend first so its JVM heap is free during compilation.
#    Maven gets its own 512 MB cap via MAVEN_OPTS to avoid OOM-killing other services.
echo "--- Stopping backend before build ---"
systemctl stop lm-hospital-backend || true

echo "--- Building backend ---"
cd "$APP_DIR/backend"
MAVEN_OPTS="-Xms128m -Xmx512m" mvn clean package -DskipTests --no-transfer-progress -q
cp target/LMHospital.jar "$APP_DIR/backend/LMHospital.jar"

# 5. Build React frontend
echo "--- Building frontend ---"
cd "$APP_DIR/frontend"
npm ci --prefer-offline --silent
npm run build
mkdir -p "$FRONTEND_DIST"
rm -rf "${FRONTEND_DIST:?}"/*
cp -r dist/* "$FRONTEND_DIST/"
chown -R www-data:www-data "$FRONTEND_DIST"

# 6. Deploy Prometheus config
echo "--- Updating Prometheus config ---"
cp "$APP_DIR/devops/prometheus/prometheus.yml" /etc/prometheus/prometheus.yml
chown prometheus:prometheus /etc/prometheus/prometheus.yml

# 7. Deploy Grafana datasource provisioning
echo "--- Updating Grafana provisioning ---"
mkdir -p /etc/grafana/provisioning/datasources
cp "$APP_DIR/devops/grafana/provisioning/datasources/prometheus.yml" \
   /etc/grafana/provisioning/datasources/prometheus.yml
chown -R root:grafana /etc/grafana/provisioning/datasources

# 8. Deploy Nginx config
echo "--- Updating Nginx config ---"
cp "$APP_DIR/devops/nginx/lm-hospital.conf" /etc/nginx/sites-available/lm-hospital
ln -sf /etc/nginx/sites-available/lm-hospital /etc/nginx/sites-enabled/lm-hospital
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# 9. Apply JVM memory limits via systemd drop-in, then restart services
#    Caps Spring Boot heap so it coexists with MySQL, Prometheus and Grafana.
echo "--- Applying JVM memory limits ---"
mkdir -p /etc/systemd/system/lm-hospital-backend.service.d
printf '[Service]\nExecStart=\nExecStart=/usr/bin/java -Xms256m -Xmx512m -jar /home/ubuntu/lm-hospital/backend/LMHospital.jar\n' \
    > /etc/systemd/system/lm-hospital-backend.service.d/memory.conf

echo "--- Restarting services ---"
systemctl daemon-reload
systemctl restart lm-hospital-backend
systemctl reload-or-restart prometheus
systemctl reload-or-restart grafana-server

# 10. Wait for backend to become healthy (up to 10 minutes)
echo "--- Health check ---"
RETRY=0
MAX_RETRIES=60
until curl -sf http://localhost:8085/actuator/health | grep -q '"status":"UP"' || [ "$RETRY" -ge "$MAX_RETRIES" ]; do
    echo "Waiting for backend... attempt $((RETRY + 1))/$MAX_RETRIES"
    RETRY=$((RETRY + 1))
    sleep 10
done

if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Backend did not become healthy within 10 minutes"
    echo "--- Last 80 backend log lines ---"
    journalctl -u lm-hospital-backend --no-pager -n 80
    echo "--- Memory at failure ---"
    free -h
    exit 1
fi

PUBLIC_IP=$(curl -sf --max-time 3 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "EC2_PUBLIC_IP")

echo "=== Deploy complete: $(date) ==="
echo "  App        : http://$PUBLIC_IP"
echo "  Backend    : http://$PUBLIC_IP:8085/actuator/health"
echo "  Grafana    : http://$PUBLIC_IP:3001"
echo "  Prometheus : http://$PUBLIC_IP:9090"
