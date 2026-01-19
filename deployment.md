# TES Batch Scheduler Deployment Guide for Rocky Linux

This guide provides step-by-step instructions for deploying the TES Batch Scheduler system on Rocky Linux. The system consists of four main components:

- **batch_scheduler**: Flask-based scheduler API
- **batch-celery**: Django-based Celery backend with Beat scheduler and Flower monitoring
- **batch-worker**: Celery worker for task execution
- **fe-batch-scheduler**: React frontend application

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Environment Configuration](#environment-configuration)
4. [Deployment](#deployment)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Rocky Linux 8.x or 9.x**
- **Docker Engine 26.0+**
- **Docker Compose 2.27+**
- **Git**

## Installation Steps

### 1. Update System Packages

```bash
sudo dnf update -y
sudo dnf install -y curl wget git
```

### 2. Install Docker Engine

```bash
# Install required packages
sudo dnf install -y dnf-utils

# Add Docker repository
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker Engine
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group
sudo usermod -aG docker $USER

# Logout and login again to apply group changes
```

Reference: https://docs.rockylinux.org/10/gemstones/containers/docker/

### 3. Install Docker Compose (if not included with Docker)

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 4. Clone Repository

```bash
# Clone the repository
git clone https://github.com/LeeSangPyoung/2025_tesbatch.git
cd 2025_tesbatch

# Or if you have the code locally, navigate to the directory
cd /path/to/2025_tesbatch
```

## Environment Configuration

### 1. Create Environment Files

Create `.env` files for each service based on the provided examples:

#### Batch Scheduler Environment
```bash
# Copy and modify batch_scheduler environment
cp batch_scheduler/env.example batch_scheduler/.env

# Edit the environment file
nano batch_scheduler/.env
```

Update the following variables in `batch_scheduler/.env`:
```bash
DEBUG=True
ENABLE_OTEL=True

# Database Configuration
POSTGRES_HOST=<your host ip>
POSTGRES_PORT=5433
POSTGRES_USERNAME=<your postgresql username>
POSTGRES_PASSWORD=<your postgresql password>
POSTGRES_DB=scheduler
POSTGRES_SCHEMA=batch_scheduler

# Logging Configuration
LOKI_HOST=<your host ip>
LOKI_PORT=3100
LOGGER_NAME=batch-scheduler
LOG_DIR=./log/batch_scheduler/batch_scheduler.log
LOG_FILE_MAX_BYTES=10485760
LOG_FILE_BACKUP_COUNT=7

# Celery Configuration
CELERY_HOST=<your host ip>
CELERY_PORT=5086

# SSH Configuration
SSH_KEYS_PATH=/app/.ssh/
SSH_DEFAULT_USERNAME=admin
SSH_PASSWORD=12345

# Security Configuration
ENCRYPTION_KEY_PATH=./keys/encryption_key
SECRET_KEY_PATH=./keys/encryption_key

# OpenTelemetry Configuration
OTEL_EXPORTER_OTLP_ENDPOINT="http://<your host ip>:4318"
OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
OTEL_SERVICE_NAME=batch_scheduler
```

Replace the following variables:
- **\<your host ip\>**: Your host IP address (e.g.: 10.38.148.151)
- **\<your postgresql username\>**: PostgreSQL username for batch_scheduler database (e.g.: postgresql)
- **\<your postgresql password\>**: PostgreSQL password for batch_scheduler database

#### Batch Celery Environment
```bash
# Copy and modify batch-celery environment
cp batch-celery/env-example batch-celery/.env

# Edit the environment file
nano batch-celery/.env
```

Update the following variables in `batch-celery/.env`:
```bash
ALLOWED_HOSTS=localhost,127.0.0.1,<your host ip>
LOG_LEVEL=INFO
CELERY_BROKER_URL=redis://<your host ip>:6380/0
DATABASE_URL=postgres://<your postgresql username>:<your postgresql password>@<your host ip>:3567/celery?currentSchema=batch_celery
CELERY_RESULT_BACKEND=django-db
BASE_URL=http://<your host ip>:3499
LOKI_URL=http://<your host ip>:3100/loki/api/v1/push
LOG_DIR=./log/batch_celery/
LOG_MAX_BYTES=10485760
LOG_BACKUP_COUNT=7
OTEL_MONITOR=True
OTEL_EXPORTER_OTLP_ENDPOINT=http://<your host ip>:4318
OTEL_SERVICE_NAME=batch-celery
OTEL_EXPORTER_OTLP_INSECURE=True
OTEL_PYTHON_DJANGO_INSTRUMENT=True
BEAT_MAX_INTERVAL=1
REDIS_HOST=<your host ip>
REDIS_PORT=6380
REDIS_DB=0
```

Replace the following variables:
- **\<your host ip\>**: Your host IP address (e.g.: 10.38.148.151)
- **\<your postgresql username\>**: PostgreSQL username for batch_celery database (e.g.: postgresql)
- **\<your postgresql password\>**: PostgreSQL password for batch_celery database

#### Batch Worker Environment
```bash
# Copy and modify batch-worker environment
cp batch-worker/env-example batch-worker/.env

# Edit the environment file
nano batch-worker/.env
```

Update the following variables in `batch-worker/.env`:
```bash
ALLOWED_HOSTS=localhost,127.0.0.1,<your host ip>
CELERY_BROKER_URL=redis://<your host ip>:6380/0
DATABASE_URL=postgres://<your postgresql username>:<your postgresql password>@<your host ip>:3567/celery?currentSchema=batch_celery
CELERY_RESULT_BACKEND=django-db
BASE_URL=http://<your host ip>:3499
LOKI_URL=http://<your host ip>:3100/loki/api/v1/push
LOG_DIR=/var/log/
LOG_MAX_BYTES=10485760
LOG_BACKUP_COUNT=7
OTEL_SERVICE_NAME=batch-worker
OTEL_EXPORTER_OTLP_ENDPOINT=http://<your host ip>:4318
OTEL_EXPORTER_OTLP_INSECURE=True
LOG_LEVEL=INFO
OTEL_MONITOR=True
MOUNT_PATH=<data mount path>
REDIS_HOST=<your host ip>
REDIS_PORT=6380
CONCURRENT_WORKERS=<number of concurrent worker>

```

Replace the following variables:
- **\<your host ip\>**: Your host IP address (e.g.: 10.38.148.151)
- **\<your postgresql username\>**: PostgreSQL username (e.g.: postgresql)
- **\<your postgresql password\>**: PostgreSQL password
- **\<data mount path\>**: Data mount path (e.g.: /workspace/tangosvc)
- **\<number of concurrent worker\>**: Number of concurrent tasks that be executed concurrently within a worker.

**Note**: batch-worker env file **MUST ALWAYS** have a blank line at the end of file.

### 2. Create Required Directories

```bash
# Create SSH keys directory
mkdir -p batch_scheduler/keys
mkdir -p batch_scheduler/reference/celery
```

### 3. Generate Encryption Keys

```bash
# Generate encryption key for batch_scheduler
openssl rand -base64 32 > batch_scheduler/keys/encryption_key
chmod 600 batch_scheduler/keys/encryption_key
```

Or if the user has existing keys, copy them to `batch_scheduler/keys/encryption_key`

### 4. Build worker application

```bash
cd batch-worker
bash zip_application.sh <unique version>
mv batch-worker.zip ../batch_scheduler/reference/celery
```

Make sure `batch-worker.zip` is copied over `batch_scheduler/reference/celery`.

Replace **\<unique version\>** with a unique identifier for your build.

E.g.:

```bash
bash zip_application.sh 20250930.1
```

To make sure the unique identifier is unique, run the following 
command:

```bash
docker image ls | grep batch-worker | grep <unique identifier>
```

### 5. Update docker-compose

Update `docker-compose.yml` to replace the following variables:
- **${HOST_IP}**: Your host IP address (e.g.: 10.38.148.151)
- **${SCHEDULER_DB_USER}**: PostgreSQL username for batch_scheduler database (e.g.: postgresql)
- **${SCHEDULER_DB_PASSWORD}**: PostgreSQL password for batch_scheduler database
- **${CELERY_DB_USER}**: PostgreSQL username for batch_celery database (e.g.: postgresql)
- **${CELERY_DB_PASSWORD}**: PostgreSQL password for batch_celery database

## Deployment

### 1. Start-up monitoring stack

```bash
cd batch_scheduler/deploy/monitoring
docker compose up -d
```

### 2. Build and Start Services

```bash
# Navigate to project root
cd /path/to/2025_tesbatch

# Build and start all services
docker-compose up -d --build
```

### 3. Check Service Status

```bash
# Check if all containers are running
docker-compose ps

# Check logs for any issues
docker-compose logs -f
```

### 4. Verify Services

- **Frontend**: http://\<your host ip\>:3456
- **Scheduler API**: http://\<your host ip\>:3499
- **Celery Backend**: http://\<your host ip\>:5086
- **Flower Monitoring**: http://\<your host ip\>:3998
- **Grafana**: http://\<your host ip\>:3000

## Verification

### 1. Health Checks

```bash
# Check if all services are responding
curl -f http://localhost:3456 || echo "Frontend not responding"
curl -f http://localhost:3499/health || echo "Scheduler API not responding"
curl -f http://localhost:5086/health || echo "Celery Backend not responding"
curl -f http://localhost:3998 || echo "Flower not responding"
```

### 2. Redis Connectivity

```bash
# Check Redis connection
docker-compose exec redis redis-cli ping
```

## Troubleshooting

### Common Issues

#### 1. Port Conflicts
```bash
# Check if ports are already in use
sudo netstat -tulpn | grep :3456
sudo netstat -tulpn | grep :3499
sudo netstat -tulpn | grep :5086
sudo netstat -tulpn | grep :3998
sudo netstat -tulpn | grep :6380

# Kill processes using these ports if needed
sudo fuser -k 3456/tcp
```
#### 2. Docker Issues
```bash
# Check Docker status
sudo systemctl status docker

# Restart Docker if needed
sudo systemctl restart docker

# Clean up Docker resources
docker system prune -a
```

#### 3. Unable to migrate scheduler database

PostgreSQL user provided in batch scheduler environment variables must be the one with permission to create `pg_trgm` extension. In case of failed migration, Remove `pg_trgm` extension and try running docker-compose again. `batch-scheduler` service will recreate the extension.

### Log Analysis

```bash
# View logs for specific services
docker-compose logs batch-scheduler
docker-compose logs batch-celery-be
docker-compose logs batch-celery-worker
docker-compose logs batch-scheduler-fe

# Follow logs in real-time
docker-compose logs -f batch-scheduler
```

### Service Management

```bash
# Stop all services
docker-compose down

# Restart specific service
docker-compose restart batch-scheduler

# Rebuild and restart
docker-compose up -d --build batch-scheduler

# Remove all containers and volumes
docker-compose down -v
```

## Support

For additional support or issues:

1. Check the logs first: `docker-compose logs -f`
2. Verify environment configuration
3. Ensure all prerequisites are met
4. Check network connectivity between services
5. Review this documentation for troubleshooting steps

---
