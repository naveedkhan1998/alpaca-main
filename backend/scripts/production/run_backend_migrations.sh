#!/bin/sh

echo "STARTING HTTP SERVER..."
python3 http_server.py & # Run HTTP server in background

echo "Waiting for database to be ready..."
python3 manage.py wait_for_db

echo "Running database migrations..."
python3 manage.py migrate --noinput --skip-checks
python3 manage.py collectstatic --noinput --skip-checks

echo "Initializing admin user..."
python3 manage.py initadmin
