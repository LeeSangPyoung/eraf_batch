#!/bin/bash
# The stop_worker.sh script is used to stop a Celery worker process.
# It takes an optional argument QUEUE_NAME, which specifies the queue name of the worker to be stopped.
# If no queue name is provided, the default queue name is used.
# Default values

set -e

# Check if .env file exists
if [ ! -f .env ]; then
    echo ".env file not found"
    exit 1
fi

# Load environment variables from .env file
set -a
source .env
set +a

# check if QUEUE_NAME is set
if [ -z "${QUEUE_NAME}" ]; then
    echo "Error: QUEUE_NAME is not set"
    exit 1
fi

CONTAINER_NAME="batch-worker-${QUEUE_NAME}"

# stop and remove container
echo "Stopping and removing container ${CONTAINER_NAME}"
docker rm -f ${CONTAINER_NAME}

# Find and kill the Celery worker process
if pgrep -f "celery -A batchbe worker -Q ${QUEUE_NAME}" > /dev/null; then
    pkill -f -9 "celery -A batchbe worker -Q ${QUEUE_NAME}"
    echo "Celery worker with QUEUE_NAME: ${QUEUE_NAME} has been stopped."
else
    echo "No Celery worker found."
fi

exit 0
