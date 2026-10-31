import os
import uuid

from django.conf import settings
from django.db import models


def _unique_name(folder, stem, filename):
    """A fresh name for every upload. Re-using a name (fml.png, then fml.png again) would keep
    the same URL, and browsers would go on showing the old picture from their cache."""
    ext = os.path.splitext(filename)[1].lower() or ".jpg"
    return f"{folder}/{stem or 'image'}-{uuid.uuid4().hex[:8]}{ext}"


def member_photo_path(instance, filename):
    return _unique_name("members", instance.slug, filename)


def album_cover_path(instance, filename):
    return _unique_name("albums", instance.slug, filename)


def diary_photo_path(instance, filename):
    return _unique_name("diary", f"page{instance.page_id}", filename)


def diary_video_path(instance, filename):
    return _unique_name("diary/videos", f"page{instance.page_id}", filename)


def photocard_path(instance, filename):
    return _unique_name("cards", instance.member.slug if instance.member_id else "ot13", filename)


def default_site_theme():
    """CARAT's Rose Quartz & Serenity, the site's look until it's changed in the Studio."""
    return {
        "bg": "#FBF6F8", "surface": "#FFFFFF", "text": "#2E2A3B", "accent": "#C25E73",
        "accent2": "#7D93C9", "font": "serif", "pattern": "sparkle", "dark": False,
    }


class Member(models.Model):
    class Unit(models.TextChoices):
        HIPHOP = "hiphop", "Hip-hop Unit"
        VOCAL = "vocal", "Vocal Unit"
        PERFORMANCE = "performance", "Performance Unit"

    class Service(models.TextChoices):
        UNKNOWN = "", "Not announced"
        ACTIVE = "active", "Active duty"
        ALTERNATIVE = "alternative", "Social service agent"
        EXEMPT = "exempt", "Exempt"
        NOT_REQUIRED = "not_required", "Not required"

    slug = models.SlugField(unique=True)
    stage_name = models.CharField(max_length=50)
    birth_name = models.CharField(max_length=100)
    birthday = models.DateField()
    birthplace = models.CharField(max_length=100, blank=True)
    unit = models.CharField(max_length=20, choices=Unit.choices)
    is_unit_leader = models.BooleanField(default=False)
    position = models.CharField(max_length=150, blank=True)
    # Design choices for this site (not official): used for member themes.
    color = models.CharField(max_length=7, help_text="Hex colour, e.g. #F7CAC9")
    symbol = models.CharField(max_length=8, blank=True, help_text="An emoji used on cards")
    tagline = models.CharField(max_length=200, blank=True)
    fun_facts = models.JSONField(default=list, blank=True)
    photo = models.ImageField(upload_to=member_photo_path, blank=True, null=True)
    # Mandatory military service; the site counts down to discharge_date.
    service = models.CharField(max_length=20, choices=Service.choices, blank=True)
    service_note = models.CharField(max_length=120, blank=True, help_text="e.g. Army military band")
    enlistment_date = models.DateField(blank=True, null=True)
    discharge_date = models.DateField(blank=True, null=True, help_text="Official or expected")
    order = models.PositiveSmallIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.stage_name


class Album(models.Model):
    class Kind(models.TextChoices):
        MINI = "mini", "Mini album"
        STUDIO = "studio", "Studio album"
        REPACKAGE = "repackage", "Repackage"
        SPECIAL = "special", "Special album"
        BEST = "best", "Best album"
        SINGLE = "single", "Single album"

    class Language(models.TextChoices):
        KOREAN = "ko", "Korean release"
        JAPANESE = "ja", "Japanese release"

    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=100)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    language = models.CharField(max_length=2, choices=Language.choices, default=Language.KOREAN)
    release_date = models.DateField()
    title_track = models.CharField(max_length=100, blank=True, help_text="Shown on cards; several are joined with &")
    era_mood = models.CharField(max_length=200, blank=True)
    # Theme tokens the frontend turns into CSS variables.
    theme = models.JSONField(
        default=dict,
        help_text='{"bg": "#..", "surface": "#..", "text": "#..", "accent": "#..", "accent2": "#..", "font": "serif|sans|display|mono", "pattern": "sparkle|grid|waves|stars|petals|none", "dark": false}',
    )
    cover = models.ImageField(upload_to=album_cover_path, blank=True, null=True)
    spotify_url = models.URLField(blank=True, help_text="Paste the Spotify album link to make the whole album playable")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["release_date"]

    def __str__(self):
        return self.title

    def refresh_title_track(self):
        """Keep the card label in step with the songs marked as title tracks."""
        leads = " & ".join(self.songs.filter(is_title_track=True).values_list("title", flat=True))
        if leads != self.title_track:
            self.title_track = leads
            self.save(update_fields=["title_track"])


class Song(models.Model):
    album = models.ForeignKey(Album, related_name="songs", on_delete=models.CASCADE)
    title = models.CharField(max_length=100)
    native_title = models.CharField(max_length=100, blank=True, help_text="Korean or Japanese title")
    note = models.CharField(max_length=120, blank=True, help_text="Unit, solo or edition, e.g. Vocal Team")
    is_title_track = models.BooleanField(default=False)
    disc = models.PositiveSmallIntegerField(default=1)
    track_number = models.PositiveSmallIntegerField(default=1)
    youtube_url = models.URLField(blank=True, help_text="Paste the official MV link")
    spotify_url = models.URLField(blank=True, help_text="Paste the Spotify track link")
    # One line per lyric line. [like this] is what CARATs chant; a line starting with # names a part (# Chorus).
    lyrics = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["album__release_date", "disc", "track_number"]

    def __str__(self):
        return f"{self.title} ({self.album.title})"


class GameScore(models.Model):
    class Game(models.TextChoices):
        MEMORY = "memory", "Memory Match"
        UNIT_SORT = "unit_sort", "Unit Sorter"
        GUESS = "guess", "Guess the Member"

    game = models.CharField(max_length=20, choices=Game.choices)
    player = models.CharField(max_length=30)
    score = models.IntegerField()
    # Set when a signed-in viewer saves a score, so it shows on their dashboard.
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="scores")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-score", "created_at"]

    def __str__(self):
        return f"{self.player} – {self.game}: {self.score}"


class SiteSettings(models.Model):
    """A single row: the site's default theme and home-page words, edited in the Studio."""

    theme = models.JSONField(default=default_site_theme)
    hero_eyebrow = models.CharField(max_length=80, default="for CARAT, since 2015")
    hero_lede = models.CharField(
        max_length=300,
        default="Thirteen members, three units, one team. Wander through every era, meet the boys, and play a little.",
    )
    # Game keys (see GameScore.Game) an admin has paused; they can't be played or scored.
    disabled_games = models.JSONField(default=list, blank=True)
    # On a member's birthday the site wears that member's theme for the day.
    birthday_themes = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "site settings"

    def __str__(self):
        return "Site settings"

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class DiaryPage(models.Model):
    """One spread of the diary (photos, stickers and notes) or of a photo album
    (photos, member photos, songs and videos), laid out on a dated page."""

    class Book(models.TextChoices):
        DIARY = "diary", "Diary"
        ALBUM = "album", "Photo album"

    class Paper(models.TextChoices):
        PLAIN = "plain", "Plain"
        LINED = "lined", "Lined"
        GRID = "grid", "Grid"
        DOTS = "dots", "Dots"
        KRAFT = "kraft", "Kraft"
        BLUSH = "blush", "Blush"
        NIGHT = "night", "Night"
        ALBUM = "album", "Black album"
        LINEN = "linen", "Linen"

    book = models.CharField(max_length=10, choices=Book.choices, default=Book.DIARY)
    # Diary pages are dated; photo album pages aren't (they keep the order they were made in).
    date = models.DateField(null=True, blank=True)
    title = models.CharField(max_length=80, blank=True)
    paper = models.CharField(max_length=10, choices=Paper.choices, default=Paper.PLAIN)
    # Everything on the spread; positions are % of the spread (see DiaryPageSerializer.validate_items).
    items = models.JSONField(default=list, blank=True)
    is_private = models.BooleanField(default=False, help_text="Only its writer and admins can see it")
    # Who wrote it. Viewers add diary pages and change their own; admins change any page.
    # Empty for pages made before pages had writers (admins look after those).
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="diary_pages"
    )
    # Photo album pages keep this order (set in Studio, Album management); diary pages go by date.
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["date", "position", "id"]

    def __str__(self):
        return f"{self.date or ''} {self.title}".strip() or f"Page {self.pk}"

    def delete_photos(self, keep=()):
        """Remove this page's uploaded photos (and their files), except the ids in keep."""
        for photo in self.photos.exclude(id__in=keep):
            photo.image.delete(save=False)
            photo.delete()

    def delete_videos(self, keep=()):
        """Remove this page's uploaded videos (and their files), except the ids in keep."""
        for video in self.videos.exclude(id__in=keep):
            video.file.delete(save=False)
            video.delete()


class DiaryPhoto(models.Model):
    page = models.ForeignKey(DiaryPage, related_name="photos", on_delete=models.CASCADE)
    image = models.ImageField(upload_to=diary_photo_path)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.image.name


# ---------- Accounts: viewers and admins ----------


class Profile(models.Model):
    """A signed-in fan's name and bias. Admins (is_staff) have one too."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    display_name = models.CharField(max_length=30, blank=True)
    bias = models.ForeignKey(Member, null=True, blank=True, on_delete=models.SET_NULL, related_name="fans")

    def __str__(self):
        return self.name

    @property
    def name(self):
        return self.display_name or self.user.get_username()

    @classmethod
    def for_user(cls, user):
        profile, _ = cls.objects.get_or_create(user=user)
        return profile


class Like(models.Model):
    """A song a viewer hearted; together they make the viewer's playlist."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="likes")
    song = models.ForeignKey(Song, on_delete=models.CASCADE, related_name="likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["user", "song"], name="one_like_per_song")]

    def __str__(self):
        return f"{self.user} ♥ {self.song}"


class DiaryVideo(models.Model):
    page = models.ForeignKey(DiaryPage, related_name="videos", on_delete=models.CASCADE)
    file = models.FileField(upload_to=diary_video_path)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file.name


# ---------- For CARATs: the calendar, photocards and letters ----------


class Event(models.Model):
    """A date on the calendar that isn't a birthday or the anniversary: a comeback, a concert..."""

    class Kind(models.TextChoices):
        COMEBACK = "comeback", "Comeback"
        CONCERT = "concert", "Concert"
        FANMEETING = "fanmeeting", "Fan meeting"
        BROADCAST = "broadcast", "Broadcast"
        OTHER = "other", "Other"

    title = models.CharField(max_length=100)
    date = models.DateField()
    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.COMEBACK)
    note = models.CharField(max_length=200, blank=True)
    link = models.URLField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["date", "id"]

    def __str__(self):
        return f"{self.date} {self.title}"


class PhotoCard(models.Model):
    """A card admins upload; viewers collect them into their binder from a daily pack."""

    class Rarity(models.TextChoices):
        COMMON = "common", "Common"
        RARE = "rare", "Rare"
        SPECIAL = "special", "Special"

    title = models.CharField(max_length=80)
    member = models.ForeignKey(Member, null=True, blank=True, on_delete=models.SET_NULL, related_name="cards",
                               help_text="Leave empty for a group card")
    album = models.ForeignKey(Album, null=True, blank=True, on_delete=models.SET_NULL, related_name="cards")
    image = models.ImageField(upload_to=photocard_path)
    rarity = models.CharField(max_length=8, choices=Rarity.choices, default=Rarity.COMMON)
    order = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.title


class CardPull(models.Model):
    """One card out of a viewer's daily pack. Pulling a card again is a duplicate (kept as a count)."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="card_pulls")
    card = models.ForeignKey(PhotoCard, on_delete=models.CASCADE, related_name="pulls")
    pulled_on = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} pulled {self.card}"


class Letter(models.Model):
    """A fan letter to one member (or to all thirteen). Admins approve it before others see it."""

    class Status(models.TextChoices):
        PENDING = "pending", "Waiting for review"
        APPROVED = "approved", "Approved"
        HIDDEN = "hidden", "Hidden"

    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="letters")
    member = models.ForeignKey(Member, null=True, blank=True, on_delete=models.CASCADE, related_name="letters",
                               help_text="Empty: to all of SEVENTEEN")
    body = models.TextField(max_length=2000)
    paper = models.CharField(max_length=10, default="rose")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Letter from {self.author} to {self.member or 'SEVENTEEN'}"
