#!/bin/sh

echo "STARTING GUNICORN SERVER..."
gunicorn main.wsgi:application -t 1800 --bind :8000 --log-level=info
