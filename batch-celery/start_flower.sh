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
LOG_FILENAME="batch-flower.log"
LOG_FILE="${LOG_DIR}${LOG_FILENAME}"
export LOG_FILE

# Start Celery flower
nohup celery -A batchbe flower --address=0.0.0.0 --port=5555 &

# Echo success message and exit
echo "Celery flower started successfully"

exit 0
