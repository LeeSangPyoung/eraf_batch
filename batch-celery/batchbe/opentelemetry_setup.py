from opentelemetry import trace
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter

import logging

import os


def setup_otel():
    # Check if OpenTelemetry monitoring is enabled
    otel_monitor = os.getenv("OTEL_MONITOR", "False").lower() in ("true", "1", "yes")
    
    if not otel_monitor:
        print("OpenTelemetry monitoring is disabled (OTEL_MONITOR=False)")
        return
    
    print("Setting up OpenTelemetry monitoring...")
    
    service_name = os.getenv("OTEL_SERVICE_NAME", "batch-celery")
    otel_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
    otel_insecure = os.getenv("OTEL_EXPORTER_OTLP_INSECURE", "true").lower() in ("true", "1", "yes")

    # --- Resource Info ---
    resource = Resource(attributes={
        SERVICE_NAME: service_name
    })

    # --- Tracer Setup ---
    tracer_provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(tracer_provider)

    otlp_trace_exporter = OTLPSpanExporter(endpoint=otel_endpoint, insecure=otel_insecure)
    span_processor = BatchSpanProcessor(otlp_trace_exporter)
    tracer_provider.add_span_processor(span_processor)

    # --- Logger Setup ---
    log_provider = LoggerProvider(resource=resource)
    otlp_log_exporter = OTLPLogExporter(endpoint=otel_endpoint, insecure=otel_insecure)
    log_provider.add_log_record_processor(BatchLogRecordProcessor(otlp_log_exporter))

    # Set it globally
    logging_handler = LoggingHandler(level=logging.NOTSET, logger_provider=log_provider)
    logging.getLogger().addHandler(logging_handler)
    
    print("OpenTelemetry monitoring setup completed")
