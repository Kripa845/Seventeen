import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from fandom.models import Album, Member, Song

SEED_DIR = Path(__file__).resolve().parents[2] / "seed"


class Command(BaseCommand):
    help = "Load SEVENTEEN members, albums and full tracklists. Safe to run again (updates, never deletes)."

    @transaction.atomic
    def handle(self, *args, **options):
        members = json.loads((SEED_DIR / "members.json").read_text(encoding="utf-8"))
        for i, data in enumerate(members):
            slug = data.pop("slug")
            Member.objects.update_or_create(slug=slug, defaults={**data, "order": i})

        albums = json.loads((SEED_DIR / "albums.json").read_text(encoding="utf-8"))
        for data in albums:
            slug = data.pop("slug")
            tracks = data.pop("tracks", [])
            album, _ = Album.objects.update_or_create(slug=slug, defaults=data)
            for t in tracks:
                song, _ = Song.objects.update_or_create(
                    album=album,
                    title=t["title"],
                    defaults={
                        "native_title": t.get("native", ""),
                        "note": t.get("note", ""),
                        "is_title_track": t.get("lead", False),
                        "disc": t.get("disc", 1),
                        "track_number": t["no"],
                    },
                )
                # Fill in the official MV only where no link has been set yet, so links added in admin are kept.
                if t.get("youtube") and not song.youtube_url:
                    song.youtube_url = t["youtube"]
                    song.save(update_fields=["youtube_url"])

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {Member.objects.count()} members, {Album.objects.count()} albums, {Song.objects.count()} songs."
        ))
