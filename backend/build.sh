#!/usr/bin/env bash
# One build for the whole site: the React app, then Django. Run from the repository root.
set -o errexit

(cd frontend && npm ci && npm run build)

cd backend
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate --noinput
