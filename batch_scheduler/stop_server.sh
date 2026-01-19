#!/bin/bash

# Find and kill the Celery worker process
if pgrep -f "nohub gunicorn --workers 5 --bind 0.0.0.0:5500 app:app" > /dev/null; then
    pkill -f "nohub gunicorn --workers 5 --bind 0.0.0.0:5500 app:app"
    echo "Stopped batch scheduler successfully"
else
    echo "No batch scheduler process found"
fi

exit 0
