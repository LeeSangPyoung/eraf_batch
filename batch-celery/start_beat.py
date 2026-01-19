#!/usr/bin/env python
"""
Start Celery Beat with proper Django initialization.
This script ensures Django is fully set up before starting Celery Beat.
"""

import os
import sys
from pathlib import Path

import django

# Add the project root to Python path
project_root = Path(__file__).resolve().parent
sys.path.insert(0, str(project_root))

# Set Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "batchbe.settings")

# Initialize Django
django.setup()

# Import after Django setup
from celery.bin.celery import main as celery_main


def main():
    """Main function to start Celery Beat."""
    # Verify Django is properly initialized
    try:
        print("✓ Django and django_celery_beat are properly initialized")
    except Exception as e:
        print(f"✗ Error initializing Django: {e}")
        sys.exit(1)

    # Use environment variables if provided
    log_level = os.environ.get("LOG_LEVEL", "INFO").lower()
    beat_max_interval = os.environ.get("BEAT_MAX_INTERVAL", "1")

    # Build CLI args dynamically
    sys.argv = [
        "celery",
        "beat",
        f"--loglevel={log_level}",
        "--scheduler=django_celery_beat.schedulers:DatabaseScheduler",
        f"--max-interval={beat_max_interval}",
        "--app=batchbe.celery:app",
    ]

    print(f"Starting Celery Beat with log level: {log_level}")
    print(f"Max interval: {beat_max_interval}")
    print("Scheduler: django_celery_beat.schedulers:DatabaseScheduler")

    # Start Celery beat
    try:
        celery_main()
    except KeyboardInterrupt:
        print("\nCelery Beat stopped by user")
    except Exception as e:
        print(f"Error starting Celery Beat: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
