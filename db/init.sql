-- LMHospital MySQL initialization
-- This runs only on first container start

CREATE DATABASE IF NOT EXISTS ${MYSQL_DATABASE}
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';

-- Grant privileges to app user
GRANT ALL PRIVILEGES ON ${MYSQL_DATABASE}.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;

USE ${MYSQL_DATABASE};

-- Tables are auto-created by Spring JPA (ddl-auto=update)
-- This file is for any custom initialization only


