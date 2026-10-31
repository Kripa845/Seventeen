from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = (
        "Copy the local uploads folder (backend/media) into the upload storage, keeping each file's name, "
        "so the database's links keep working. Run it on your computer with the bucket's AWS_* variables set. "
        "Files already there are skipped."
    )

    def add_arguments(self, parser):
        parser.add_argument("--source", default=str(settings.BASE_DIR / "media"), help="Folder to copy from")
        parser.add_argument("--dry-run", action="store_true", help="List what would be copied")

    def handle(self, *args, source, dry_run, **options):
        root = Path(source)
        if not root.is_dir():
            raise CommandError(f"No folder at {root}")
        if not settings.STORAGES["default"]["BACKEND"].endswith("S3Storage") and not dry_run:
            raise CommandError("Uploads aren't set to a bucket: set AWS_STORAGE_BUCKET_NAME and its keys first.")

        copied = skipped = 0
        for path in sorted(p for p in root.rglob("*") if p.is_file()):
            name = path.relative_to(root).as_posix()
            if not dry_run and default_storage.exists(name):
                skipped += 1
                continue
            self.stdout.write(f"{'would copy' if dry_run else 'copying'} {name}")
            if not dry_run:
                with path.open("rb") as fh:
                    saved = default_storage.save(name, File(fh))
                if saved != name:
                    raise CommandError(f"The storage renamed {name} to {saved}; stopping so links don't break.")
            copied += 1
        self.stdout.write(self.style.SUCCESS(f"{'Would copy' if dry_run else 'Copied'} {copied} files, skipped {skipped} already there."))
