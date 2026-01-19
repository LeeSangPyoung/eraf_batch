import logging
import os

# Check if OpenTelemetry monitoring is enabled
OTEL_MONITOR = os.getenv("OTEL_MONITOR", "False").lower() in ("true", "1", "yes")

if OTEL_MONITOR:
    from opentelemetry.instrumentation.logging import LoggingInstrumentor

    # Set up OTEL trace context in logs
    LoggingInstrumentor().instrument(set_logging_format=True)

# Logger config
logger = logging.getLogger("batch-celery-logger")
logger.setLevel(logging.DEBUG)

# Environment configs
log_file = os.getenv("LOG_FILE", "./log/batch-celery.log")
max_bytes = os.getenv("LOG_MAX_BYTES", 10485760)
backup_count = os.getenv("LOG_BACKUP_COUNT", 7)

# Log format based on OpenTelemetry availability
if OTEL_MONITOR:
    log_format = "%(asctime)s - %(levelname)s - trace_id=%(otelTraceID)s span_id=%(otelSpanID)s - %(name)s - %(message)s"
else:
    log_format = "%(asctime)s - %(levelname)s - %(name)s - %(message)s"

formatter = logging.Formatter(fmt=log_format, datefmt="%Y-%m-%d %H:%M:%S")

# File log handler
# logfile = os.path.abspath(log_file)
# os.makedirs(os.path.dirname(logfile), exist_ok=True)
# rotateHandler = ConcurrentTimedRotatingFileHandler(
#     filename=logfile,
#     when="MIDNIGHT",
#     interval=1,
#     mode="a",
#     maxBytes=int(max_bytes),
#     backupCount=int(backup_count),
#     use_gzip=True,
# )
# rotateHandler.setFormatter(formatter)
# logger.addHandler(rotateHandler)


# Function to get the logger
def get_logger():
    return logger
