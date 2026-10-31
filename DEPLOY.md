# Deploying the SEVENTEEN fan site

The site deploys as **one app**: Django serves the API, the admin panel, uploads (if you have no bucket) and the built React site. You need:

- **A host that runs Python**, such as Render, Railway, Fly.io or a VPS.
- **A Postgres database.** Most hosts offer one with a click.
- **S3-compatible storage for uploads**, such as Cloudflare R2, AWS S3 or Backblaze B2. You can skip this only if your host gives you a disk that keeps its files between deploys (a VPS, or a Railway volume).
- **An email service for password resets** (optional), such as Brevo, Mailgun or a Gmail app password.

## 1. Build and start

| | Command (run from the repository root) |
|---|---|
| **Build** | `bash backend/build.sh` |
| **Start** | `cd backend && gunicorn config.wsgi --bind 0.0.0.0:$PORT --workers 3` |

`build.sh` builds the React site, installs the Python packages, collects the admin's static files and runs the database migrations. The host needs **Python 3.10+** and **Node 18+**.

## 2. Environment variables

Required:

| Variable | Example | What it does |
|---|---|---|
| `DJANGO_DEBUG` | `0` | Production mode. The site won't start without a secret key. |
| `DJANGO_SECRET_KEY` | a long random string | Signs sessions and reset links. Generate one with `python -c "import secrets; print(secrets.token_urlsafe(50))"` and keep it secret. |
| `DJANGO_ALLOWED_HOSTS` | `carat.example.com,myapp.onrender.com` | The domains the site answers on. |
| `DJANGO_TRUSTED_ORIGINS` | `https://carat.example.com,https://myapp.onrender.com` | The same addresses with `https://`, for sign-in forms. |
| `SITE_URL` | `https://carat.example.com` | Used for the links in password-reset emails. |
| `DATABASE_URL` | `postgres://user:pass@host:5432/db` | Your Postgres database. Without it the site uses SQLite. |

Uploads (S3-compatible storage):

| Variable | Example |
|---|---|
| `AWS_STORAGE_BUCKET_NAME` | `svt-uploads` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | from your storage provider |
| `AWS_S3_ENDPOINT_URL` | Cloudflare R2: `https://<account>.r2.cloudflarestorage.com` (leave empty for AWS) |
| `AWS_S3_REGION_NAME` | `auto` for R2, e.g. `ap-south-1` for AWS |
| `AWS_S3_CUSTOM_DOMAIN` | optional: a public bucket or CDN domain. Without it, file links are signed and expire. |

Email (optional; without it, reset emails are only printed in the server log):

| Variable | Example |
|---|---|
| `EMAIL_HOST` | `smtp-relay.brevo.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | from your email provider |
| `DEFAULT_FROM_EMAIL` | `SEVENTEEN fan site <no-reply@carat.example.com>` |

Optional:

| Variable | Default | What it does |
|---|---|---|
| `DJANGO_SSL_REDIRECT` | `1` | Sends `http://` visitors to `https://`. Set it to `0` only if your host already does this and you get redirect loops. |
| `DJANGO_HSTS_SECONDS` | `3600` | How long browsers remember to use HTTPS only. Raise it to `31536000` (a year) once everything works. |
| `MEDIA_ROOT` | `backend/media` | Where uploads go when there's no bucket, e.g. a mounted disk like `/data/media`. |

## 3. First deploy only

Run these once in the host's shell:

```bash
cd backend
python manage.py seed_svt      # the 13 members, 26 albums and 261 songs
python manage.py seed_admin --username yourname   # an admin account; prints a password once
```

Then sign in, open **Studio** and add your own email under **Account** on your dashboard, so you can reset your password by email.

### Or: bring your local site along (instead of seeding)

Your edited members, themes, diary pages and accounts are in `backend/db.sqlite3`, and the photos are in `backend/media/`. Neither is in git. Copy them from your computer, in PowerShell, from `backend/` with the venv active:

```powershell
$env:PYTHONUTF8 = "1"
python manage.py dumpdata --natural-foreign --natural-primary --exclude contenttypes --exclude auth.permission --exclude sessions --exclude admin.logentry -o site-data.json

# point this terminal at the live database (the host's *external* database URL) and bucket
$env:DATABASE_URL = "postgres://..."
$env:AWS_STORAGE_BUCKET_NAME = "svt-uploads"; $env:AWS_ACCESS_KEY_ID = "..."; $env:AWS_SECRET_ACCESS_KEY = "..."
$env:AWS_S3_ENDPOINT_URL = "https://<account>.r2.cloudflarestorage.com"; $env:AWS_S3_REGION_NAME = "auto"

python manage.py migrate
python manage.py loaddata site-data.json
python manage.py push_media          # copies backend/media into the bucket, same file names
Remove-Item site-data.json           # it holds accounts: don't commit or share it
```

Close that terminal afterwards, so later commands don't hit the live site by accident.

## 4. Check it

- `https://your-site/` loads the landing page, and `https://your-site/members` loads after you sign in.
- `https://your-site/admin/` shows the Django admin with its styles.
- Upload a diary photo, redeploy, and check the photo is still there.
- Use **Forgot your password?** on the sign-in page and check the email arrives.
- Run `python manage.py check --deploy` on the server. It's fine if it warns about `SECURE_HSTS_INCLUDE_SUBDOMAINS` and `SECURE_HSTS_PRELOAD`.

## Example: Render

1. **New → Web Service.** Connect the repository.
2. Set the **Build command** to `bash backend/build.sh` and the **Start command** to `cd backend && gunicorn config.wsgi --bind 0.0.0.0:$PORT --workers 3`.
3. **New → Postgres.** Copy its *Internal Database URL* into `DATABASE_URL` on the web service.
4. Add the other environment variables from step 2, then deploy.
5. Open the service's **Shell** and run the step 3 commands.
