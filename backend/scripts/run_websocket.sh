#!/bin/bash
set -e

echo "Starting websocket Service..."

# Wait for database to be ready
python3 manage.py wait_for_db


python3 manage.py run_websocket