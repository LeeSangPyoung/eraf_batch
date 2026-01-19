#!/bin/bash

# Find and kill the Celery beat process
if pgrep -f "python start_beat.py" > /dev/null; then
    pkill -f "python start_beat.py"
    echo "Celery Beat has been stopped."
else
    echo "No Celery Beat process found."
fi

exit 0
