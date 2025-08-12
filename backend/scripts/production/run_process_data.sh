#!/bin/sh

echo "STARTING HTTP SERVER..."
python3 http_server.py & # Run HTTP server in background

echo "Waiting for database to be ready..."
python3 manage.py wait_for_db

echo "Processing initial data..."
python3 manage.py run_websocket
