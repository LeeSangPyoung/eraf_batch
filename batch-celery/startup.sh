#!/bin/bash
python manage.py makemigrations celerytasks
python manage.py migrate

# Start the application in the background
python manage.py runserver 0.0.0.0:8000
