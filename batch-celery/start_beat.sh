#!/bin/bash
source activate base
conda activate tesbatch
# Update requests library to ensure compatibility
pip install --upgrade requests

# Check if .env file exists
if [ ! -f .env ]; then
  echo ".env file not found"
  exit 1
fi

# Export variables from .env file
set -a
source .env
set +a

# Check if pip command is available
if ! command -v pip &> /dev/null; then
    echo "Error: pip command not found"
    exit 1
fi

# Install dependencies with verbose output and no-input option
timeout 300 pip install -r requirements.txt --verbose --no-input

# Define log filename and append it to LOG_DIR
LOG_FILENAME="batch-beat.log"
LOG_FILE="${LOG_DIR}${LOG_FILENAME}"
export LOG_FILE

echo "Storing logs to $LOG_FILE"

# Start Celery beat
nohup celery -A batchbe.celery beat --loglevel=info --scheduler=django_celery_beat.schedulers:DatabaseScheduler --max-interval=1 &

# Echo success message and exit
echo "Celery beat started successfully"

exit 0
