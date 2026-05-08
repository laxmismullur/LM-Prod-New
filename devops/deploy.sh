#!/bin/bash
# LM Hospital native deployment script
# Runs on EC2 via AWS SSM after Jenkins writes /opt/lm-hospital/.env
# Pre-requisites: bootstrap.tpl (or bootstrap-user-script.sh) already executed
set -euo pipefail

APP_DIR=/opt/lm-hospital
FRONTEND_DIST=/var/www/lm-hospital
LOG_FILE=/var/log/lm-hospital/deploy.log
GIT_REPO="${GIT_REPO_URL:-https://github.com/laxmismullur/LM-Hospital-Production.git}"

mkdir -p /var/log/lm-hospital
exec > >(tee -a "$LOG_FILE") 2>&1
echo "=== LM Hospital Deploy: $(date) ==="

# 1. Load environment (written by Jenkins before this script runs)
set -a
# shellcheck source=/dev/null
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

# Reload .env after git reset (Jenkins writes it before calling this script,
# but reset --hard would overwrite a committed .env — Jenkins rewrites it)
set -a
source "$APP_DIR/.env"
set +a

# 3. Initialise MySQL database and user
echo "--- Initialising MySQL ---"
export MYSQL_DATABASE DB_USERNAME DB_PASSWORD
envsubst < "$APP_DIR/db/schema.sql" | mysql -u root --connect-expired-password

# 4. Build Spring Boot backend
echo "--- Building backend ---"
cd "$APP_DIR/backend"
mvn clean package -DskipTests --no-transfer-progress -q
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

# 9. Restart application services
echo "--- Restarting services ---"
systemctl daemon-reload
systemctl restart lm-hospital-backend
systemctl reload-or-restart prometheus
systemctl reload-or-restart grafana-server

# 10. Wait for backend to become healthy
echo "--- Health check ---"
RETRY=0
until curl -sf http://localhost:8085/actuator/health | grep -q '"status":"UP"' || [ "$RETRY" -ge 18 ]; do
    echo "Waiting for backend... attempt $((RETRY + 1))/18"
    RETRY=$((RETRY + 1))
    sleep 10
done

if [ "$RETRY" -ge 18 ]; then
    echo "ERROR: Backend did not become healthy within 3 minutes"
    journalctl -u lm-hospital-backend --no-pager -n 50
    exit 1
fi

PUBLIC_IP=$(curl -sf --max-time 3 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "EC2_PUBLIC_IP")

echo "=== Deploy complete: $(date) ==="
echo "  App        : http://$PUBLIC_IP"
echo "  Backend    : http://$PUBLIC_IP:8085/actuator/health"
echo "  Grafana    : http://$PUBLIC_IP:3001  (admin: GF_SECURITY_ADMIN_USER from .env)"
echo "  Prometheus : http://$PUBLIC_IP:9090"
