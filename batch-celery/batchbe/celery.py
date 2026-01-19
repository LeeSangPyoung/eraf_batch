from __future__ import absolute_import, unicode_literals

import os

import django

# Set the Django settings module before importing Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "batchbe.settings")

# Initialize Django before creating the Celery app
django.setup()

from celery import Celery
from django.conf import settings

app = Celery("batchbe")

# Configure Celery using Django settings
app.config_from_object("django.conf:settings", namespace="CELERY")

# Load task modules from all registered Django app configs.
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)

# Load task modules from all registered Django app configs.
app.autodiscover_tasks(["celerytasks"])

# Conditionally instrument Celery with OpenTelemetry
OTEL_MONITOR = os.getenv("OTEL_MONITOR", "False").lower() in ("true", "1", "yes")
if OTEL_MONITOR:
    from opentelemetry.instrumentation.celery import CeleryInstrumentor

    CeleryInstrumentor().instrument()
    print("Celery OpenTelemetry instrumentation enabled")
else:
    print("Celery OpenTelemetry instrumentation disabled")
