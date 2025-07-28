import os

from celery import Celery

# Set the default Django settings module for the 'celery' program.
from main.settings.base import INSTALLED_APPS

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "main.settings.local")

app = Celery("main", include=[])

# get schedule from CANDLE_MAKER_SCHEDULCING environment variable

CANDLE_MAKER_SCHEDULE = int(os.getenv("CANDLE_MAKER_SCHEDULE", 1))

app.conf.beat_schedule = {
    "candle_making_job": {
        "task": "candle_maker",
        "schedule": CANDLE_MAKER_SCHEDULE,
        "relative": True,
    },
    # "websocket_connect": {
    #     "task": "websocket_start",
    #     "schedule": 6000,
    #     "relative": True,
    # },
}


CELERY_TIMEZONE = "Asia/Kolkata"
# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.conf.broker_connection_retry_on_startup = True
app.config_from_object("django.conf:settings")
# CELERY_BROKER_URL = 'amqp://guest:guest@rabbitmq3:5672/'
# Load task modules from all registered Django apps.
app.autodiscover_tasks(lambda: INSTALLED_APPS)
BROKER_CONNECTION_RETRY = True
BROKER_CONNECTION_MAX_RETRIES = 0
BROKER_CONNECTION_TIMEOUT = 10120
