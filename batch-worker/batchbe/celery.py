from __future__ import absolute_import, unicode_literals

import os
import time

# Set Django settings module before any other imports
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "batchbe.settings")

# Import Django and other modules WITHOUT gevent monkey patching
import django
from celery import Celery
from celery.signals import worker_init, worker_process_init

# Initialize Django
django.setup()

from django.conf import settings

from .telemetry import setup_otel

app = Celery("batchbe")

# Load config from Django settings with CELERY_ prefix
app.config_from_object("django.conf:settings", namespace="CELERY")

# Performance optimizations for Celery app
app.conf.update(
    # Worker optimizations
    worker_prefetch_multiplier=1,  # Process one task at a time for better memory usage
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks to prevent memory leaks
    worker_disable_rate_limits=True,  # Disable rate limiting for better performance
    worker_pool="prefork",  # Use prefork for better performance with CPU-bound tasks
    worker_concurrency=4,  # Number of worker processes (adjust based on CPU cores)
    worker_pool_restarts=True,
    worker_hijack_root_logger=False,
    worker_log_color=False,
    worker_max_memory_per_child=200000,  # 200MB
    # Task routing and queue optimizations
    task_default_queue=os.getenv("QUEUE_NAME", "default"),
    task_default_exchange=os.getenv("QUEUE_NAME", "default"),
    task_default_routing_key=os.getenv("QUEUE_NAME", "default"),
    # Result backend optimizations
    result_expires=3600,  # 1 hour
    # Serialization optimizations
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    # Broker optimizations
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=10,
    broker_pool_limit=10,
    broker_connection_timeout=30,
    broker_connection_retry=True,
    broker_heartbeat=10,
    # Task execution time limits
    task_time_limit=3600,  # 1 hour
    task_soft_time_limit=3300,  # 55 minutes
    # Performance monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
    # Database connection optimizations
    result_backend_transport_options={
        "master_name": "mymaster",
        "visibility_timeout": 3600,
        "fanout_prefix": True,
        "fanout_patterns": True,
    },
    # Logging optimizations
    worker_log_format="[%(asctime)s: %(levelname)s/%(processName)s] %(message)s",
    worker_task_log_format="[%(asctime)s: %(levelname)s/%(processName)s] [%(task_name)s(%(task_id)s)] %(message)s",
    task_allow_error_cb_on_chord_header=True,
)

# Auto-discover tasks from Django apps
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)

# Optional: Also load tasks from a custom package
app.autodiscover_tasks(["celerytasks"])


# Performance monitoring setup
@app.task(bind=True)
def debug_task(self):
    """Debug task for monitoring performance."""
    print(f"Request: {self.request!r}")
    return "Debug task completed"


@worker_process_init.connect(weak=False)
def init_celery_tracing(*args, **kwargs):
    setup_otel()


@worker_init.connect(weak=False)
def update_worker_start_time(*args, **kwargs):
    from celerytasks import redis_helper
    from celerytasks.recovery import update_all_pending_local_tasks

    queue_name = os.getenv("QUEUE_NAME", "default")
    redis_helper.set_key(f"worker:{queue_name}:start_time", int(time.time() * 1000))

    # update all pending local tasks to false
    update_all_pending_local_tasks()
