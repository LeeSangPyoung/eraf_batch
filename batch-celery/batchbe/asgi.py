"""
ASGI config for batchbe project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os

# Check if OpenTelemetry monitoring is enabled
OTEL_MONITOR = os.getenv("OTEL_MONITOR", "False").lower() in ("true", "1", "yes")

if OTEL_MONITOR:
    import batchbe.opentelemetry_setup  # OpenTelemetry initialization

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'batchbe.settings')

application = get_asgi_application()
