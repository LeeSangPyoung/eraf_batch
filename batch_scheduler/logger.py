import json
import logging
import os
import sys
import uuid

import flask
from concurrent_log_handler import ConcurrentTimedRotatingFileHandler
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs._internal.export import BatchLogRecordProcessor

import config
from config import Config, LOGGER
from tracing import initialize_tracer

if config.Config.DEBUG_SQLALCHEMY:
    sql_logger = logging.getLogger('sqlalchemy.engine')
    sql_logger.setLevel(logging.DEBUG)
    sql_logger.addHandler(logging.StreamHandler(sys.stdout))


def get_request_id():
    if getattr(flask.g, 'request_id', None):
        return flask.g.request_id

    new_uuid = uuid.uuid4().hex
    flask.g.request_id = new_uuid

    return new_uuid


class DictToJsonFormatter(logging.Formatter):
    """Converts log messages of type `dict` to JSON strings."""

    def format(self, record: logging.LogRecord) -> str:
        try:
            record.msg = json.dumps(record.msg)  # Serialize dict to string
        except Exception:
            record.msg = str(record.msg)

        return super().format(record)


class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.req_id = get_request_id() if flask.has_request_context() else ''
        return True


try:
    logger = logging.getLogger(LOGGER.LOGGER_NAME)
    logger.setLevel(logging.DEBUG if Config.DEBUG else logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(req_id)s - %(name)s - %(levelname)s - %(message)s')

    # Concurrent log handler
    logfile = os.path.abspath(LOGGER.LOG_DIR)
    os.makedirs(os.path.dirname(logfile), exist_ok=True)
    rotateHandler = ConcurrentTimedRotatingFileHandler(filename=logfile, when="MIDNIGHT", interval=1, mode="a",
                                                       maxBytes=int(LOGGER.LOG_FILE_MAX_BYTES),
                                                       backupCount=int(LOGGER.LOG_FILE_BACKUP_COUNT), use_gzip=True)
    rotateHandler.addFilter(RequestIdFilter())
    rotateHandler.setFormatter(formatter)
    logger.addHandler(rotateHandler)

    if config.Config.DEBUG:
        consoleHandler = logging.StreamHandler(sys.stdout)
        consoleHandler.addFilter(RequestIdFilter())
        consoleHandler.setFormatter(formatter)
        logger.addHandler(consoleHandler)

    if config.Config.DEBUG_SQLALCHEMY:
        sql_logger = logging.getLogger('sqlalchemy.engine')
        sql_logger.setLevel(logging.DEBUG)

    if config.Config.ENABLE_OTEL:
        resource = initialize_tracer()

        log_provider = LoggerProvider(resource=resource)
        log_exporter = OTLPLogExporter()
        log_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))
        otel_handler = LoggingHandler(
            logger_provider=log_provider,
        )
        otel_handler.setFormatter(DictToJsonFormatter())
        logger.addHandler(otel_handler)


except Exception as e:
    print(f'Exception: {e}')


def get_logger():
    return logger
