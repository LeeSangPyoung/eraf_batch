"""
WSGI config for batchbe project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os

# Check if OpenTelemetry monitoring is enabled
OTEL_MONITOR = os.getenv("OTEL_MONITOR", "False").lower() in ("true", "1", "yes")

if OTEL_MONITOR:
    import batchbe.opentelemetry_setup  # OpenTelemetry initialization

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "batchbe.settings")

application = get_wsgi_application()
