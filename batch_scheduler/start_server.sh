#!/bin/bash

# Activate the Conda environment
source activate base
conda activate tesbatch

# Check if pip command is available
if ! command -v pip &> /dev/null; then
    echo "Error: pip command not found"
    exit 1
fi

# Install dependencies
timeout 300 pip install --upgrade pip
timeout 300 pip install --no-cache-dir -r requirements.txt --verbose --no-input

# Check if pip install was successful
if [ $? -ne 0 ]; then
    echo "Error: pip install failed"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
  echo ".env file not found"
  exit 1
fi

# Start batch_scheduler
flask db upgrade
# python emergency_recovery_sync.py
exec nohup gunicorn --workers 5 --bind 0.0.0.0:5500 app:app &