#!/bin/bash
set -e

echo "Starting Flower - Celery Monitoring Tool..."

# Start Flower with proper configuration
celery -A main flower 
