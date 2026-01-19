import logging
import os

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.celery import CeleryInstrumentor
from opentelemetry.instrumentation.django import DjangoInstrumentor
from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.urllib import URLLibInstrumentor
from opentelemetry.instrumentation.urllib3 import URLLib3Instrumentor
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor


def setup_otel():
    # Check if OpenTelemetry monitoring is enabled
    otel_monitor = os.getenv("OTEL_MONITOR", "False").lower() in ("true", "1", "yes")

    if not otel_monitor:
        print("OpenTelemetry monitoring is disabled (OTEL_MONITOR=False)")
        log_format = "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
    else:
        print("Setting up OpenTelemetry monitoring...")
        log_format = "%(asctime)s - %(levelname)s - trace_id=%(otelTraceID)s span_id=%(otelSpanID)s - %(name)s - %(message)s"

    # Set the formatter for all root handlers
    formatter = logging.Formatter(log_format)
    for handler in logging.getLogger().handlers:
        handler.setFormatter(formatter)

    if not otel_monitor:
        return

    service_name = os.getenv("OTEL_SERVICE_NAME", "batch-worker")
    otel_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
    otel_insecure = os.getenv("OTEL_EXPORTER_OTLP_INSECURE", "true").lower() in (
        "true",
        "1",
        "yes",
    )

    # Get queue name from environment
    queue_name = os.getenv("QUEUE_NAME", "default")

    # --- Resource Info ---
    resource = Resource(
        attributes={SERVICE_NAME: service_name, "queue.name": queue_name}
    )

    # --- Tracer Setup ---
    tracer_provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(tracer_provider)

    otlp_trace_exporter = OTLPSpanExporter(
        endpoint=otel_endpoint, insecure=otel_insecure
    )
    span_processor = BatchSpanProcessor(otlp_trace_exporter)
    tracer_provider.add_span_processor(span_processor)

    # --- Logger Setup ---
    log_provider = LoggerProvider(resource=resource)
    otlp_log_exporter = OTLPLogExporter(endpoint=otel_endpoint, insecure=otel_insecure)
    log_provider.add_log_record_processor(BatchLogRecordProcessor(otlp_log_exporter))

    # Set it globally
    logging_handler = LoggingHandler(level=logging.NOTSET, logger_provider=log_provider)
    logging.getLogger().addHandler(logging_handler)

    # Instrument Celery
    CeleryInstrumentor().instrument()

    # Instrument Django
    DjangoInstrumentor().instrument(is_sql_commentor_enabled=True)

    # Instrument Redis
    RedisInstrumentor().instrument()

    # Instrument Requests
    RequestsInstrumentor().instrument()

    # Instrument Psycopg2
    Psycopg2Instrumentor().instrument(skip_dep_check=True, enable_commentor=True)

    URLLibInstrumentor().instrument()
    URLLib3Instrumentor().instrument()

    print("OpenTelemetry monitoring setup completed")
