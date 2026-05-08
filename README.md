# LM Hospital Management System
### Spring Boot · React · MySQL · Docker · Jenkins · Terraform · Prometheus · Grafana

Full-stack hospital management web application with DevOps integration.  
All source files prefixed with `LM` as per requirement.

---

## Modules

| Module | Roles | Key Functions |
|---|---|---|
| **Admin** | ADMIN | Add/edit/delete doctors, manage user accounts, view all system activity |
| **Patient Management** | ADMIN, DOCTOR, NURSE, RECEPTIONIST | Register patients, update details, view medical history |
| **Appointment Management** | ADMIN, DOCTOR, NURSE, RECEPTIONIST | Book appointments, view schedules, confirm/complete/cancel |
| **Medical Records** | ADMIN, DOCTOR, NURSE | Store diagnosis, prescriptions, treatment history per patient |

---

## Tech Stack

**Backend:** Java 21 · Spring Boot 3.2 · Spring Security · JWT · Spring Data JPA · MySQL  
**Frontend:** React 18 · Vite · React Router v6 · Axios · Lucide Icons  
**Database:** MySQL 8.0  
**DevOps:** Docker · Docker Compose · Jenkins CI/CD · Terraform (AWS EC2) · Prometheus · Grafana

---

## Quick Start (Local Dev)

### Prerequisites
- Java 21, Maven 3.9+
- Node.js 20+
- MySQL 8.0 running locally

### 1. MySQL Setup
```sql
CREATE DATABASE lm_hospital_db CHARACTER SET utf8mb4;
CREATE USER 'lmuser'@'localhost' IDENTIFIED BY 'lmpassword';
GRANT ALL ON lm_hospital_db.* TO 'lmuser'@'localhost';
```

### 2. Backend
```bash
cd LMHospital/backend
# Set env vars or edit application.properties
export DB_USERNAME=lmuser
export DB_PASSWORD=lmpassword
mvn spring-boot:run
# → http://localhost:8080
```

### 3. Frontend
```bash
cd LMHospital/frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Docker Compose (Recommended)

Runs the full stack: App + MySQL + Prometheus + Grafana.

```bash
cd LMHospital

# Create .env file
cat > .env << EOF2
DB_USERNAME=lmuser
DB_PASSWORD=lmpassword
DB_ROOT_PASSWORD=LMHospital@2024
JWT_SECRET=lmHospitalSecretKey2024SuperSecureKeyForJWTTokenGeneration
GRAFANA_USER=lmadmin
GRAFANA_PASSWORD=lmgrafana
EOF2

docker-compose up -d
```

| Service | URL |
|---|---|
| Frontend (React) | http://localhost |
| Backend API | http://localhost:8080 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |

---

## Demo Credentials

| Username | Password | Role |
|---|---|---|
| `lm_admin` | `admin123` | ADMIN — full access |
| `lm_doctor` | `doctor123` | DOCTOR |
| `lm_nurse` | `nurse123` | NURSE |
| `lm_reception` | `recep123` | RECEPTIONIST |

---

## DevOps Setup

### CI/CD — Jenkins

1. Create a Pipeline job in Jenkins
2. Point it to `devops/jenkins/Jenkinsfile`
3. Add credentials: `docker-hub-credentials`, `ec2-ssh-key`, `ec2-host`, `db-password`, `jwt-secret`

**Pipeline stages:**
```
Checkout → Build Backend → Build Frontend → Docker Build → Docker Push → Deploy EC2 → Health Check
```

### Infrastructure — Terraform (AWS EC2)

```bash
cd devops/terraform
terraform init
terraform plan -var="key_pair_name=your-key"
terraform apply -var="key_pair_name=your-key"
# Outputs: EC2 public IP, App URL, Grafana URL, Prometheus URL
```

Provisions: VPC · Subnet · Internet Gateway · Security Group · EC2 (t2.medium, Amazon Linux 2023) · Elastic IP

### Monitoring — Prometheus + Grafana

Spring Boot exposes metrics at `/actuator/prometheus` via Micrometer.

Prometheus scrapes every 10s → Grafana visualizes:
- HTTP request rates, response times
- JVM heap usage, GC pauses
- DB connection pool stats
- Custom hospital metrics

**Grafana:** http://localhost:3001 (default: lmadmin / lmgrafana)  
Add Prometheus data source: `http://lm-prometheus:9090`

---

## API Reference

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/lm/auth/login` | Login → JWT | Public |
| GET | `/api/lm/dashboard/stats` | System-wide stats | All |
| GET/POST | `/api/lm/doctors` | List / Add doctor | Admin |
| PUT | `/api/lm/doctors/{id}` | Update doctor | Admin |
| DELETE | `/api/lm/doctors/{id}` | Remove doctor | Admin |
| PATCH | `/api/lm/doctors/{id}/toggle-active` | Toggle active | Admin |
| GET/POST | `/api/lm/patients` | List / Register patient | Staff |
| GET | `/api/lm/patients/{id}` | Get patient | Staff |
| PUT/DELETE | `/api/lm/patients/{id}` | Update/delete | Staff |
| GET/POST | `/api/lm/appointments` | List / Book | Staff |
| PATCH | `/api/lm/appointments/{id}/status` | Update status + notes | Staff |
| GET/POST | `/api/lm/medical-records` | List / Create records | Doctor/Nurse |
| GET | `/api/lm/medical-records/patient/{id}` | Patient history | Staff |
| GET | `/actuator/health` | Health check | Public |
| GET | `/actuator/prometheus` | Prometheus metrics | Internal |

---

## Project Structure

```
LMHospital/
├── backend/               # Spring Boot
│   ├── Dockerfile
│   ├── pom.xml            # MySQL + Actuator + Micrometer
│   └── src/main/java/com/lm/hospital/
│       ├── config/        LMSecurityConfig, LMDataInitializer
│       ├── controller/    LMAuth, LMDoctor, LMPatient, LMAppointment, LMMedicalRecord, LMDashboard
│       ├── model/         LMUser, LMDoctor, LMPatient, LMAppointment, LMMedicalRecord + enums
│       ├── repository/    All JPA repos
│       ├── security/      LMJwtUtils, LMAuthTokenFilter, LMUserDetailsService
│       └── dto/           LMLoginRequest, LMJwtResponse, LMDashboardStats
├── frontend/              # React + Vite
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── pages/         LMLoginPage, LMDashboard, LMDoctors, LMPatients, LMAppointments, LMMedicalRecords
│       ├── components/    LMLayout
│       ├── context/       LMAuthContext
│       └── services/      LMApiService
├── devops/
│   ├── jenkins/           Jenkinsfile
│   ├── prometheus/        prometheus.yml
│   └── terraform/         main.tf (AWS EC2)
├── db/                    init.sql
├── docker-compose.yml
└── README.md
```
 & "C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" -u root -p