#!/usr/bin/env python
import os
import sys

# Check if OpenTelemetry monitoring is enabled
OTEL_MONITOR = os.getenv("OTEL_MONITOR", "False").lower() in ("true", "1", "yes")

if OTEL_MONITOR:
    # Initialize OTEL before anything else
    import batchbe.opentelemetry_setup
    from opentelemetry.instrumentation.django import DjangoInstrumentor
    from opentelemetry.instrumentation.logging import LoggingInstrumentor
    from opentelemetry.instrumentation.django import DjangoInstrumentor
    from opentelemetry.instrumentation.logging import LoggingInstrumentor
    from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor
    from opentelemetry.instrumentation.redis import RedisInstrumentor
    from opentelemetry.instrumentation.requests import RequestsInstrumentor
    from opentelemetry.instrumentation.urllib import URLLibInstrumentor
    from opentelemetry.instrumentation.urllib3 import URLLib3Instrumentor

def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "batchbe.settings")
    
    if OTEL_MONITOR:
        LoggingInstrumentor().instrument(set_logging_format=True)
        DjangoInstrumentor().instrument(is_sql_commentor_enabled=True)
        Psycopg2Instrumentor().instrument(skip_dep_check=True, enable_commenter=True)
        URLLibInstrumentor().instrument()
        URLLib3Instrumentor().instrument()
        RequestsInstrumentor().instrument()
        RedisInstrumentor().instrument()

    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()
