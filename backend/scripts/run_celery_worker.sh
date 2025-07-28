#!/bin/bash
set -e

echo "Starting Celery Worker with auto-restart..."

# Create necessary directories
mkdir -p /tmp/run/celery
mkdir -p /tmp/log/celery

# Remove existing Celery PID files to prevent conflicts
rm -f /tmp/run/celery/w1.pid
rm -f /tmp/run/celery/w2.pid
rm -f /tmp/run/celery/w3.pid
rm -f /tmp/run/celery/beat.pid

# Purge all existing tasks from the Celery queues
echo "Purging existing Celery tasks..."
celery -A main purge --force || true

# Start Celery worker with watchmedo for auto-restart
echo "Starting Celery worker with watchmedo auto-restart..."
watchmedo auto-restart \
    --directory=/app \
    --pattern=*.py \
    --recursive \
    -- celery -A main worker -l info
