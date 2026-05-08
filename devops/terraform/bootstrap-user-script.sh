#!/bin/bash
# LM Hospital EC2 bootstrap — standalone version (no Terraform template variables)
# Installs all runtime dependencies natively (no Docker)
# Run manually on Ubuntu 22.04 or use as EC2 user-data directly
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

APP_NAME="lm-hospital"
LOG=/var/log/lm-bootstrap.log
exec > >(tee -a "$LOG") 2>&1
echo "=== LM Hospital Bootstrap: $(date) ==="

# ── System update & base packages ────────────────────────────
apt-get update -y && apt-get upgrade -y
apt-get install -y \
    apt-transport-https ca-certificates curl gnupg lsb-release \
    git wget unzip gettext-base net-tools software-properties-common \
    openjdk-21-jdk maven

java -version 2>&1
mvn -version

# ── Node.js 20 ───────────────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v && npm -v

# ── MySQL 8.0 ────────────────────────────────────────────────
apt-get install -y mysql-server
systemctl enable --now mysql
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';" 2>/dev/null || true
mysql -e "FLUSH PRIVILEGES;" 2>/dev/null || true

# ── Nginx ────────────────────────────────────────────────────
apt-get install -y nginx
systemctl enable nginx

# ── Prometheus ───────────────────────────────────────────────
PROM_VER="2.51.2"
useradd --no-create-home --shell /bin/false prometheus 2>/dev/null || true
mkdir -p /etc/prometheus /var/lib/prometheus
wget -qO /tmp/prometheus.tar.gz \
    "https://github.com/prometheus/prometheus/releases/download/v$PROM_VER/prometheus-$PROM_VER.linux-amd64.tar.gz"
tar xf /tmp/prometheus.tar.gz -C /tmp
cp /tmp/prometheus-$PROM_VER.linux-amd64/prometheus  /usr/local/bin/
cp /tmp/prometheus-$PROM_VER.linux-amd64/promtool    /usr/local/bin/
cp -r /tmp/prometheus-$PROM_VER.linux-amd64/consoles          /etc/prometheus/
cp -r /tmp/prometheus-$PROM_VER.linux-amd64/console_libraries /etc/prometheus/
chown -R prometheus:prometheus /etc/prometheus /var/lib/prometheus
chown    prometheus:prometheus /usr/local/bin/prometheus /usr/local/bin/promtool
rm -rf /tmp/prometheus-$PROM_VER.linux-amd64 /tmp/prometheus.tar.gz

# ── Node Exporter ────────────────────────────────────────────
NODE_EXP_VER="1.8.0"
useradd --no-create-home --shell /bin/false node_exporter 2>/dev/null || true
wget -qO /tmp/node_exporter.tar.gz \
    "https://github.com/prometheus/node_exporter/releases/download/v$NODE_EXP_VER/node_exporter-$NODE_EXP_VER.linux-amd64.tar.gz"
tar xf /tmp/node_exporter.tar.gz -C /tmp
cp /tmp/node_exporter-$NODE_EXP_VER.linux-amd64/node_exporter /usr/local/bin/
chown node_exporter:node_exporter /usr/local/bin/node_exporter
rm -rf /tmp/node_exporter-$NODE_EXP_VER.linux-amd64 /tmp/node_exporter.tar.gz

# ── Grafana ──────────────────────────────────────────────────
wget -q -O /usr/share/keyrings/grafana.key https://apt.grafana.com/gpg.key
echo "deb [signed-by=/usr/share/keyrings/grafana.key] https://apt.grafana.com stable main" \
    > /etc/apt/sources.list.d/grafana.list
apt-get update -y && apt-get install -y grafana
sed -i 's/^;http_port = 3000/http_port = 3001/' /etc/grafana/grafana.ini
grep -q "^http_port" /etc/grafana/grafana.ini || \
    sed -i '/^\[server\]/a http_port = 3001' /etc/grafana/grafana.ini
systemctl enable grafana-server

# ── AWS SSM Agent ─────────────────────────────────────────────
systemctl enable --now amazon-ssm-agent 2>/dev/null || \
    snap start amazon-ssm-agent 2>/dev/null || true

# ── Systemd: Node Exporter ────────────────────────────────────
cat > /etc/systemd/system/node_exporter.service <<'SVCEOF'
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter
Restart=on-failure

[Install]
WantedBy=multi-user.target
SVCEOF

# ── Systemd: Prometheus ───────────────────────────────────────
cat > /etc/prometheus/prometheus.yml <<'PROMEOF'
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
PROMEOF
chown prometheus:prometheus /etc/prometheus/prometheus.yml

cat > /etc/systemd/system/prometheus.service <<'SVCEOF'
[Unit]
Description=Prometheus Monitoring
After=network.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \
    --config.file=/etc/prometheus/prometheus.yml \
    --storage.tsdb.path=/var/lib/prometheus/ \
    --web.listen-address=0.0.0.0:9090 \
    --storage.tsdb.retention.time=15d
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCEOF

# ── Systemd: Grafana — load app .env for GF_ credentials ──────
mkdir -p /etc/systemd/system/grafana-server.service.d
cat > /etc/systemd/system/grafana-server.service.d/env.conf <<'SVCEOF'
[Service]
EnvironmentFile=-/opt/lm-hospital/.env
SVCEOF

# ── Systemd: Spring Boot backend ─────────────────────────────
cat > /etc/systemd/system/lm-hospital-backend.service <<'SVCEOF'
[Unit]
Description=LM Hospital Spring Boot Backend
After=network.target mysql.service
Requires=mysql.service

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/lm-hospital/backend
EnvironmentFile=/opt/lm-hospital/.env
ExecStart=/usr/bin/java -jar /opt/lm-hospital/backend/LMHospital.jar
SuccessExitStatus=143
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

# ── Nginx placeholder (real config deployed by deploy.sh) ─────
cat > /etc/nginx/sites-available/lm-hospital <<'NGINXEOF'
server {
    listen 80 default_server;
    server_name _;
    root /var/www/lm-hospital;
    index index.html;
    location / {
        return 200 'LM Hospital Server - Awaiting Jenkins Deployment';
        add_header Content-Type text/plain;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/lm-hospital /etc/nginx/sites-enabled/lm-hospital
rm -f /etc/nginx/sites-enabled/default
mkdir -p /var/www/lm-hospital
chown www-data:www-data /var/www/lm-hospital

# ── App directories ───────────────────────────────────────────
mkdir -p /opt/$APP_NAME/backend
mkdir -p /var/log/$APP_NAME
chown -R ubuntu:ubuntu /opt/$APP_NAME /var/log/$APP_NAME

# ── Enable & start services ───────────────────────────────────
systemctl daemon-reload
systemctl enable  lm-hospital-backend node_exporter prometheus
systemctl start   node_exporter prometheus
nginx -t && systemctl restart nginx

echo "=== Bootstrap complete: $(date) ==="
echo "Java: $(java -version 2>&1 | head -1)"
echo "Node: $(node -v)"
echo "Services ready: MySQL, Nginx, Prometheus, Grafana, Node Exporter"
echo "Awaiting Jenkins deployment of application code and secrets."
