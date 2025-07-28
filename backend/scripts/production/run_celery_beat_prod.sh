#!/bin/bash
set -e

# Set the maximum memory limit to 500 MB
#ulimit -v $((512 * 1024))

echo "STARTING HTTP SERVER..."
python3 http_server.py & # Run HTTP server in background

echo "STARTING CELERY BEAT SCHEDULER WITH MEMORY LIMIT..."

# Create necessary directories
mkdir -p /tmp/run/celery

# Remove existing beat PID file
rm -f /tmp/run/celery/beat.pid

# Start Celery Beat scheduler detached
celery -A main beat \
    --pidfile=/tmp/run/celery/beat.pid \
    --loglevel=INFO \
    --max-interval=60 \
    --scheduler django_celery_beat.schedulers:DatabaseScheduler
