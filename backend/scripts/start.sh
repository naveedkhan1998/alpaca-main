#!/bin/sh

# Run collectstatic and wait_for_db in the background
python3 manage.py collectstatic --noinput
python3 manage.py wait_for_db

# Run migrations and create an admin user
# Uncomment if migrations are necessary
python3 manage.py makemigrations
python3 manage.py migrate --noinput --skip-checks
python3 manage.py initadmin
python3 manage.py process_data

# Remove existing Celery PID files to prevent conflicts
rm -f /var/run/celery/w1.pid
rm -f /var/run/celery/w2.pid
rm -f /var/run/celery/w3.pid
rm -f /var/run/celery/beat.pid

# Purge all existing tasks from the Celery queues
# The --force flag bypasses the confirmation prompt
celery -A main purge --force || true # || true ensures the script continues even if the purge fails

# Restart Celery workers using celery multi
celery multi restart w1 w2 w3 -A main \
    --pidfile=/var/run/celery/%n.pid \
    --logfile=/var/log/celery/%n.log \
    --loglevel=INFO \
    --time-limit=300

# Start Celery Beat in detached mode
celery -A main beat --detach

# Launch the Django development server, since there is only 1 instance the lru cache will work just fine
python3 manage.py runserver 0.0.0.0:8000

# Alternatively, use Gunicorn for production environments
# echo "STARTING GUNICORN SERVER..."
# gunicorn main.wsgi:application --bind 0.0.0.0:8000 -w 12
# gunicorn main.wsgi:application -t 1800 --bind :8000
# use this to get logs inside backend shell tail -f /var/log/celery/w*.log
