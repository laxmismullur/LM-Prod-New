-- LMHospital MySQL setup for native (non-Docker) EC2 deployment
-- Used by devops/deploy.sh via: envsubst < db/schema.sql | mysql -u root
-- Required env vars: MYSQL_DATABASE, DB_USERNAME, DB_PASSWORD
-- Tables are auto-created by Spring JPA (ddl-auto=update)

CREATE DATABASE IF NOT EXISTS ${MYSQL_DATABASE}
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${MYSQL_DATABASE}.* TO '${DB_USERNAME}'@'%';
FLUSH PRIVILEGES;

USE ${MYSQL_DATABASE};
