# Multi-stage build for Batch Scheduler Agent

# Stage 1: Build
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# Copy parent POM and all modules
COPY pom.xml .
COPY batch-scheduler-common/ ./batch-scheduler-common/
COPY batch-scheduler-server/ ./batch-scheduler-server/
COPY batch-scheduler-agent/ ./batch-scheduler-agent/

# Build the agent
RUN mvn clean package -DskipTests -pl batch-scheduler-agent -am

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Install bash, python3 for script execution
RUN apk add --no-cache bash curl python3 \
    && ln -sf /usr/bin/python3 /usr/bin/python

# Copy the built JAR from builder stage
COPY --from=builder /app/batch-scheduler-agent/target/batch-scheduler-agent-*.jar agent.jar

# Create log directory
RUN mkdir -p /app/logs

# Expose agent port (default: 8081)
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8081/actuator/health || exit 1

# Run the agent
ENTRYPOINT ["java", "-jar", "agent.jar"]
