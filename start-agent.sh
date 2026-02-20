#!/bin/bash
cd /workspace/worker4

# Load Java environment
if [ -f /etc/profile.d/java.sh ]; then
    source /etc/profile.d/java.sh
fi

# Create log and backup directories in agent folder
mkdir -p /workspace/worker4/logs
mkdir -p /workspace/worker4/logs/backup

# Stop existing process if running
if [ -f agent.pid ]; then
    PID=$(cat agent.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID
        sleep 2
    fi
    rm -f agent.pid
fi

# Start agent
nohup java -jar batch-scheduler-agent.jar --spring.config.location=application.yml > /workspace/worker4/logs/agent.log 2>&1 &
echo $! > agent.pid
echo "Agent started with PID: $(cat agent.pid)"
