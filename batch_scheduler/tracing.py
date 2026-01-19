from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

resource = None
_initialized = False


# Initialize tracing
def initialize_tracer():
    global _initialized, resource
    if _initialized:
        return resource
    resource = Resource.create()

    # Set the global tracer provider with resource
    trace.set_tracer_provider(TracerProvider(resource=resource))

    # Create an OTLP exporter - note we're using the standard paths
    otlp_exporter = OTLPSpanExporter()

    # Add the exporter to the tracer providerx
    span_processor = BatchSpanProcessor(otlp_exporter)
    trace.get_tracer_provider().add_span_processor(span_processor)

    # Set flag to True
    _initialized = True

    return resource
