# Multi-stage build for Batch Scheduler Server

# Stage 1: Build
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# Copy parent POM and modules
COPY pom.xml .
COPY batch-scheduler-common/ ./batch-scheduler-common/
COPY batch-scheduler-server/ ./batch-scheduler-server/
COPY batch-scheduler-agent/ ./batch-scheduler-agent/

# Build all modules including agent (skip tests for faster builds)
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Install necessary runtime dependencies including Docker CLI
RUN apk add --no-cache \
    openssh-client \
    bash \
    curl \
    docker-cli

# Copy the built server JAR from builder stage
COPY --from=builder /app/batch-scheduler-server/target/batch-scheduler-server-*.jar app.jar

# Copy the built agent JAR from builder stage (for JAR deployment scenario)
COPY --from=builder /app/batch-scheduler-agent/target/batch-scheduler-agent-*.jar batch-scheduler-agent.jar

# Create directories for logs and keys
RUN mkdir -p /app/logs /app/keys

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
