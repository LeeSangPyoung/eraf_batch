#!/bin/sh

set -e

# Run worker
echo "QUEUE NAME: ${QUEUE_NAME}"
celery -A batchbe worker -Q ${QUEUE_NAME} -n ${QUEUE_NAME} -c 10 --loglevel=info
