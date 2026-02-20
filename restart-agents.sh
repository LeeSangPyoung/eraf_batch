#!/bin/bash
# Run this on 192.168.152.129 as tangosvc

cd /workspace/worker

# Stop all agents
echo "Stopping agents..."
pkill -f batch-scheduler-agent
sleep 3

# Update JAR
echo "Updating JAR..."
cp batch-scheduler-agent-1.0.0-SNAPSHOT.jar batch-scheduler-agent.jar

# Start agents
echo "Starting agents..."
for i in 1 2 3 4; do
  cd /workspace/worker/worker$i
  mkdir -p logs
  nohup java -jar ../batch-scheduler-agent.jar --spring.config.location=application.yml > logs/agent.log 2>&1 &
  echo "Started worker$i"
done

sleep 3
ps aux | grep batch-scheduler-agent | grep -v grep
echo "Done!"
