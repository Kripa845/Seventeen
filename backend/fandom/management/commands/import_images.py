import re
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand

from fandom.models import Album, Member

IMAGE_TYPES = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def key(name: str) -> str:
    """'S.Coups' / 'scoups' / 'Face the Sun' / 'face-the-sun' all reduce to one comparable key."""
    return re.sub(r"[^0-9a-z]", "", name.lower())


class Command(BaseCommand):
    help = (
        "Attach member photos and album covers from a folder. Put files in <folder>/members/ and "
        "<folder>/albums/, named after the member or album (e.g. hoshi.jpg, The8.png, fml.jpg, "
        "Face the Sun.webp). Existing images are replaced."
    )

    def add_arguments(self, parser):
        parser.add_argument("folder", nargs="?", default=str(settings.BASE_DIR / "images"))
        parser.add_argument("--list", action="store_true", help="Print the file names that will be recognised")

    def handle(self, *args, folder, list, **options):
        root = Path(folder)
        groups = [
            ("members", Member, "photo", lambda m: [m.slug, m.stage_name]),
            ("albums", Album, "cover", lambda a: [a.slug, a.title]),
        ]

        if list:
            for sub, model, _, names in groups:
                self.stdout.write(f"{root / sub}:")
                for obj in model.objects.all():
                    self.stdout.write(f"  {names(obj)[0]}.jpg   ({names(obj)[1]})")
            return

        if not root.is_dir():
            (root / "members").mkdir(parents=True)
            (root / "albums").mkdir()
            self.stdout.write(f"Created {root}\\members and {root}\\albums. Put your images there and run this again.")
            return

        for sub, model, field, names in groups:
            lookup = {key(n): obj for obj in model.objects.all() for n in names(obj)}
            files = [p for p in sorted((root / sub).glob("*")) if p.suffix.lower() in IMAGE_TYPES]
            done = set()
            for path in files:
                obj = lookup.get(key(path.stem))
                if obj is None:
                    self.stdout.write(self.style.WARNING(f"  ? {sub}/{path.name}: no {sub[:-1]} with that name, skipped"))
                    continue
                image = getattr(obj, field)
                if image:
                    image.delete(save=False)  # don't leave the old file behind in media/
                with path.open("rb") as f:
                    image.save(f"{obj.slug}{path.suffix.lower()}", File(f), save=True)
                done.add(obj.pk)
                self.stdout.write(f"  ✓ {sub}/{path.name} → {obj}")
            missing = [str(o) for o in model.objects.all() if o.pk not in done and not getattr(o, field)]
            self.stdout.write(self.style.SUCCESS(f"{sub}: {len(done)} added"))
            if missing:
                self.stdout.write(f"  still without an image: {', '.join(missing)}")
