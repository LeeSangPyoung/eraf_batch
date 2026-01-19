#!/bin/bash

flask db upgrade
python emergency_recovery_sync.py
gunicorn --workers 5 --bind 0.0.0.0:5500 app:app
