#!/bin/bash
set -e

echo "Starting Backend Server..."

# Wait for database to be ready
python3 manage.py wait_for_db

# Run database migrations
python3 manage.py migrate --noinput --skip-checks

# Initialize admin user
python3 manage.py initadmin

# Process initial data
python3 manage.py process_data

# Start Django development server
echo "Starting Django server on 0.0.0.0:8000"
python3 manage.py runserver 0.0.0.0:8000
