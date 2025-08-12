#!/bin/bash
set -e
# Set the maximum memory limit to 500 MB
#ulimit -v $((512 * 1024))
# Disabled for now as it uses up too many redis connections

echo "Starting Flower - Celery Monitoring Tool..."

# Start Flower with proper configuration
celery -A main flower --port=8000
