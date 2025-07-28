#!/bin/bash
set -e

echo "Starting Celery Beat Scheduler..."

# Create necessary directories
mkdir -p /tmp/run/celery
mkdir -p /tmp/log/celery

# Remove existing beat PID file
rm -f /tmp/run/celery/beat.pid

# Start Celery Beat scheduler
echo "Starting Celery Beat with ERROR logging..."
celery -A main beat \
    --pidfile=/tmp/run/celery/beat.pid \
    --loglevel=info \
    --max-interval=60 \
    --scheduler django_celery_beat.schedulers:DatabaseScheduler
