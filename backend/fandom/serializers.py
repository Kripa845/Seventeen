import os
import re

from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Max
from django.utils.text import slugify
from rest_framework import serializers

from .models import Album, DiaryPage, DiaryPhoto, DiaryVideo, GameScore, Member, Profile, SiteSettings, Song

HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")
FONTS = {"serif", "sans", "display", "mono", "marker"}
PATTERNS = {"sparkle", "grid", "waves", "stars", "petals", "daisies", "smileys", "signs", "flowers", "orbits", "suns", "billiards", "staves", "hoops", "film", "butterflies", "picks", "umbrellas", "roses", "books", "confetti", "ink", "footprints", "tangerines", "lemons", "leaves", "tiger", "none"}
# A skin adds photos and decorations on top of the colours (frontend/src/themes/<skin>.css).
SKINS = {"none", "heaven", "darling", "leftright", "world", "attacca", "hot", "homerun", "maestro", "ajunice", "scoups", "jeonghan", "joshua", "jun", "dk", "wonwoo", "woozi", "the8", "dino", "seungkwan", "vernon", "mingyu", "hoshi"}


def validate_theme(value):
    """Theme tokens the frontend turns into CSS variables; a bad one would break the page."""
    if not isinstance(value, dict):
        raise serializers.ValidationError("Theme must be an object.")
    errors = {}
    for key in ("bg", "surface", "text", "accent", "accent2"):
        if not HEX.match(str(value.get(key, ""))):
            errors[key] = "Use a colour like #C25E73."
    if value.get("font") not in FONTS:
        errors["font"] = f"Pick one of: {', '.join(sorted(FONTS))}."
    if value.get("pattern") not in PATTERNS:
        errors["pattern"] = f"Pick one of: {', '.join(sorted(PATTERNS))}."
    if not isinstance(value.get("dark"), bool):
        errors["dark"] = "Must be true or false."
    if value.get("skin", "none") not in SKINS:
        errors["skin"] = f"Pick one of: {', '.join(sorted(SKINS))}."
    if errors:
        raise serializers.ValidationError(errors)
    theme = {k: value[k] for k in ("bg", "surface", "text", "accent", "accent2", "font", "pattern", "dark")}
    if value.get("skin", "none") != "none":
        theme["skin"] = value["skin"]
    return theme


class ReplacesFilesMixin:
    """When an image is replaced or removed, delete the old file from media/."""

    file_fields: tuple[str, ...] = ()

    def update(self, instance, validated_data):
        old = {f: getattr(instance, f).name for f in self.file_fields if f in validated_data}
        instance = super().update(instance, validated_data)
        for field, name in old.items():
            if name and name != getattr(instance, field).name:
                getattr(instance, field).storage.delete(name)
        return instance


class MediaImageField(serializers.ImageField):
    """Gives /media/... rather than http://127.0.0.1:8000/media/..., so uploaded pictures load
    from whatever address the site is opened on (the frontend forwards /media to Django)."""

    def to_representation(self, value):
        return value.url if value else None


class MemberSerializer(ReplacesFilesMixin, serializers.ModelSerializer):
    file_fields = ("photo",)
    photo = MediaImageField(required=False, allow_null=True)
    unit_label = serializers.CharField(source="get_unit_display", read_only=True)
    service_label = serializers.CharField(source="get_service_display", read_only=True)

    class Meta:
        model = Member
        fields = [
            "id", "slug", "stage_name", "birth_name", "birthday", "birthplace",
            "unit", "unit_label", "is_unit_leader", "position", "color", "symbol",
            "tagline", "fun_facts", "photo", "service", "service_label", "service_note",
            "enlistment_date", "discharge_date", "order",
        ]
        read_only_fields = ["slug", "order"]

    def validate_color(self, value):
        if not HEX.match(value):
            raise serializers.ValidationError("Use a colour like #C25E73.")
        return value

    def validate_fun_facts(self, value):
        if not isinstance(value, list) or not all(isinstance(x, str) for x in value):
            raise serializers.ValidationError("Fun facts must be a list of sentences.")
        return [x.strip() for x in value if x.strip()]

    def validate(self, attrs):
        start = attrs.get("enlistment_date", getattr(self.instance, "enlistment_date", None))
        end = attrs.get("discharge_date", getattr(self.instance, "discharge_date", None))
        if start and end and end <= start:
            raise serializers.ValidationError({"discharge_date": "Discharge must be after enlistment."})
        return attrs


class SongSerializer(serializers.ModelSerializer):
    album = serializers.PrimaryKeyRelatedField(queryset=Album.objects.all())
    album_title = serializers.CharField(source="album.title", read_only=True)
    album_slug = serializers.CharField(source="album.slug", read_only=True)
    album_spotify_url = serializers.CharField(source="album.spotify_url", read_only=True)
    album_cover = serializers.SerializerMethodField()

    class Meta:
        model = Song
        fields = [
            "id", "album", "title", "native_title", "note", "is_title_track", "disc", "track_number",
            "youtube_url", "spotify_url", "album_title", "album_slug", "album_spotify_url", "album_cover",
        ]

    def get_album_cover(self, song):
        """The album's uploaded cover, so song lists (playlists, the dashboard) show the same art."""
        if not song.album.cover:
            return None
        return song.album.cover.url

    def save(self, **kwargs):
        song = super().save(**kwargs)
        song.album.refresh_title_track()
        return song


class AlbumListSerializer(ReplacesFilesMixin, serializers.ModelSerializer):
    file_fields = ("cover",)
    cover = MediaImageField(required=False, allow_null=True)
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = Album
        fields = [
            "id", "slug", "title", "kind", "kind_label", "language", "release_date",
            "title_track", "era_mood", "theme", "cover", "spotify_url",
        ]
        read_only_fields = ["slug", "title_track"]

    def validate_theme(self, value):
        return validate_theme(value)

    def create(self, validated_data):
        base = slugify(validated_data["title"]) or "album"
        slug, n = base, 2
        while Album.objects.filter(slug=slug).exists():
            slug, n = f"{base}-{n}", n + 1
        return super().create({**validated_data, "slug": slug})


class AlbumDetailSerializer(AlbumListSerializer):
    songs = SongSerializer(many=True, read_only=True)

    class Meta(AlbumListSerializer.Meta):
        fields = AlbumListSerializer.Meta.fields + ["songs"]


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = ["theme", "hero_eyebrow", "hero_lede", "disabled_games", "updated_at"]
        read_only_fields = ["updated_at"]

    def validate_theme(self, value):
        return validate_theme(value)

    def validate_disabled_games(self, value):
        games = set(GameScore.Game.values)
        if not isinstance(value, list) or not all(g in games for g in value):
            raise serializers.ValidationError(f"Use game keys from: {', '.join(sorted(games))}.")
        return sorted(set(value))


class GameScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameScore
        fields = ["id", "game", "player", "score", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_player(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Enter a name.")
        return value

    def validate_score(self, value):
        if value < 0 or value > 100000:
            raise serializers.ValidationError("Score out of range.")
        return value

    def validate_game(self, value):
        if value in SiteSettings.load().disabled_games:
            raise serializers.ValidationError("This game is paused right now.")
        return value


class AdminScoreSerializer(GameScoreSerializer):
    """Scores as the Games management page sees them: with the account that saved them."""

    username = serializers.CharField(source="user.username", read_only=True, default=None)

    class Meta(GameScoreSerializer.Meta):
        fields = GameScoreSerializer.Meta.fields + ["username"]


# ---------- Diary ----------

ITEM_KINDS = {"photo", "member", "sticker", "text", "song", "video"}
# Photo albums hold only pictures, songs and videos.
ALBUM_KINDS = {"photo", "member", "song", "video"}
YOUTUBE_URL = re.compile(r"^https://(www\.|m\.)?(youtube\.com|youtu\.be)/\S+$")
SONG_STYLES = {"card", "vinyl", "cassette"}
MUSIC_URL = re.compile(r"^https://(www\.|m\.|music\.)?(youtube\.com|youtu\.be|open\.spotify\.com)/\S+$")
FRAMES = {"none", "cutout", "polaroid", "tape", "round", "heart", "arch", "stamp", "film", "gold", "torn"}
TEXT_FONTS = {"hand", "cute", "marker", "type", "script", "serif", "bold", "pen", "round", "poster", "retro", "bubbly", "magazine", "pixel"}
TEXT_STYLES = {"plain", "note", "label", "tape"}
MAX_ITEMS = 150
MAX_PHOTO_MB = 10
MAX_VIDEO_MB = 100
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v"}


def _num(raw, key, lo, hi, default):
    value = raw.get(key, default)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise serializers.ValidationError(f"{key} must be a number.")
    return round(min(max(float(value), lo), hi), 3)


def _text(raw, key, limit):
    value = raw.get(key, "")
    if not isinstance(value, str):
        raise serializers.ValidationError(f"{key} must be text.")
    return value[:limit]


def _choice(raw, key, choices, default):
    value = raw.get(key, default)
    if value not in choices:
        raise serializers.ValidationError(f"{key}: pick one of {', '.join(sorted(choices))}.")
    return value


def clean_item(raw):
    """One thing on a spread. x and y are its centre and w its width, all in % of the spread."""
    if not isinstance(raw, dict):
        raise serializers.ValidationError("Each item must be an object.")
    kind = _choice(raw, "kind", ITEM_KINDS, None)
    item = {
        "id": _text(raw, "id", 40) or "item",
        "kind": kind,
        "x": _num(raw, "x", -20, 120, 50),
        "y": _num(raw, "y", -20, 120, 50),
        "w": _num(raw, "w", 2, 100, 20),
        "r": _num(raw, "r", -180, 180, 0),
        "z": int(_num(raw, "z", 0, 10000, 0)),
    }
    if kind == "photo":
        photo = raw.get("photo")
        if isinstance(photo, bool) or not isinstance(photo, int):
            raise serializers.ValidationError("A photo item needs the id of an uploaded photo.")
        item.update(photo=photo, a=_num(raw, "a", 0.1, 10, 1))
    elif kind == "member":
        item.update(member=_text(raw, "member", 50), a=_num(raw, "a", 0.1, 10, 1.25))
    elif kind == "sticker":
        item["sticker"] = _text(raw, "sticker", 40)
        if not item["sticker"]:
            raise serializers.ValidationError("Pick a sticker.")
    elif kind == "video":
        # An uploaded clip (video id) or a YouTube link.
        video = raw.get("video")
        if video is not None:
            if isinstance(video, bool) or not isinstance(video, int):
                raise serializers.ValidationError("video must be the id of an uploaded video.")
            item["video"] = video
        else:
            url = _text(raw, "url", 300).strip()
            if not YOUTUBE_URL.match(url):
                raise serializers.ValidationError("Paste a YouTube link for the video.")
            item.update(video=None, url=url)
        item["a"] = _num(raw, "a", 0.1, 10, 0.5625)
    elif kind == "song":
        # A SEVENTEEN song from the site (song id), or any song by its YouTube / Spotify link.
        song = raw.get("song")
        item["style"] = _choice(raw, "style", SONG_STYLES, "card")
        if song is not None:
            if isinstance(song, bool) or not isinstance(song, int):
                raise serializers.ValidationError("song must be the id of a song.")
            item["song"] = song
        else:
            url = _text(raw, "url", 300).strip()
            if not MUSIC_URL.match(url):
                raise serializers.ValidationError("Paste a YouTube or Spotify link for the song.")
            title = _text(raw, "title", 100).strip()
            if not title:
                raise serializers.ValidationError("Give the song a title.")
            item.update(song=None, url=url, title=title, artist=_text(raw, "artist", 80).strip())
    else:
        color = raw.get("color", "#2B2B2B")
        if not HEX.match(str(color)):
            raise serializers.ValidationError("Use a colour like #C25E73.")
        item.update(
            text=_text(raw, "text", 600),
            font=_choice(raw, "font", TEXT_FONTS, "hand"),
            style=_choice(raw, "style", TEXT_STYLES, "plain"),
            size=_num(raw, "size", 1, 20, 3),
            color=color,
        )
    if kind in ("photo", "member", "video"):
        item.update(frame=_choice(raw, "frame", FRAMES, "cutout"), caption=_text(raw, "caption", 80))
    return item


class DiaryPhotoSerializer(serializers.ModelSerializer):
    image = MediaImageField()

    class Meta:
        model = DiaryPhoto
        fields = ["id", "image"]

    def validate_image(self, value):
        if value.size > MAX_PHOTO_MB * 1024 * 1024:
            raise serializers.ValidationError(f"Images up to {MAX_PHOTO_MB} MB, please.")
        return value


class MediaFileField(serializers.FileField):
    """Like MediaImageField: /media/... so files load from whatever address the site is on."""

    def to_representation(self, value):
        return value.url if value else None


class DiaryVideoSerializer(serializers.ModelSerializer):
    file = MediaFileField()

    class Meta:
        model = DiaryVideo
        fields = ["id", "file"]

    def validate_file(self, value):
        if os.path.splitext(value.name)[1].lower() not in VIDEO_EXTENSIONS:
            raise serializers.ValidationError("Videos as MP4, WebM or MOV, please.")
        if value.size > MAX_VIDEO_MB * 1024 * 1024:
            raise serializers.ValidationError(f"Videos up to {MAX_VIDEO_MB} MB, please.")
        return value


def can_edit_page(user, page):
    """Admins change any page; a viewer changes the diary pages they wrote."""
    if not (user and user.is_authenticated):
        return False
    return user.is_staff or (page.book == DiaryPage.Book.DIARY and page.author_id == user.id)


class DiaryPageSerializer(serializers.ModelSerializer):
    # {photo id: url} and {video id: url} for the uploaded things on this page.
    photos = serializers.SerializerMethodField()
    videos = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = DiaryPage
        fields = [
            "id", "book", "date", "title", "paper", "items", "is_private", "position", "photos", "videos",
            "author_name", "can_edit", "created_at", "updated_at",
        ]
        # position changes only through POST /api/diary/reorder/
        read_only_fields = ["position", "created_at", "updated_at"]

    def get_photos(self, page):
        return {str(p.id): p.image.url for p in page.photos.all()}

    def get_author_name(self, page):
        if not page.author:
            return ""
        profile = getattr(page.author, "profile", None)  # read only: never creates one
        return profile.name if profile else page.author.get_username()

    def get_can_edit(self, page):
        request = self.context.get("request")
        return bool(request) and can_edit_page(request.user, page)

    def get_videos(self, page):
        return {str(v.id): v.file.url for v in page.videos.all()}

    def validate_book(self, value):
        if self.instance and value != self.instance.book:
            raise serializers.ValidationError("A page can't move between the diary and the albums.")
        return value

    def validate(self, attrs):
        book = self.instance.book if self.instance else attrs.get("book", DiaryPage.Book.DIARY)
        if book == DiaryPage.Book.ALBUM:
            attrs["date"] = None  # photo albums are kept without dates
        elif not (attrs.get("date") or (self.instance and self.instance.date and "date" not in attrs)):
            raise serializers.ValidationError({"date": "Pick a date for the diary page."})
        return attrs

    def validate_title(self, value):
        return value.strip()

    def validate_items(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Items must be a list.")
        if len(value) > MAX_ITEMS:
            raise serializers.ValidationError(f"A page holds up to {MAX_ITEMS} things.")
        items = [clean_item(raw) for raw in value]
        book = self.instance.book if self.instance else self.initial_data.get("book", DiaryPage.Book.DIARY)
        if book == DiaryPage.Book.ALBUM and any(i["kind"] not in ALBUM_KINDS for i in items):
            raise serializers.ValidationError("Photo albums hold photos, member photos, songs and videos only.")
        videos = set(self.instance.videos.values_list("id", flat=True)) if self.instance else set()
        if any(i["kind"] == "video" and i["video"] is not None and i["video"] not in videos for i in items):
            raise serializers.ValidationError("That video belongs to another page, or was deleted.")
        owned = set(self.instance.photos.values_list("id", flat=True)) if self.instance else set()
        if any(i["kind"] == "photo" and i["photo"] not in owned for i in items):
            raise serializers.ValidationError("That photo belongs to another page, or was deleted.")
        song_ids = {i["song"] for i in items if i["kind"] == "song" and i["song"] is not None}
        if song_ids and Song.objects.filter(id__in=song_ids).count() != len(song_ids):
            raise serializers.ValidationError("One of those songs isn't on the site any more.")
        return items

    def create(self, validated_data):
        if validated_data.get("book") == DiaryPage.Book.ALBUM:
            # a new album page goes at the end
            last = DiaryPage.objects.filter(book=DiaryPage.Book.ALBUM).aggregate(m=Max("position"))["m"]
            validated_data["position"] = (last or 0) + 1
        return super().create(validated_data)

    def update(self, instance, validated_data):
        page = super().update(instance, validated_data)
        if "items" in validated_data:
            # Photos taken off the page (or uploaded and never placed) are deleted.
            page.delete_photos(keep=[i["photo"] for i in page.items if i["kind"] == "photo"])
            page.delete_videos(keep=[i["video"] for i in page.items if i["kind"] == "video" and i["video"]])
        return page


# ---------- Accounts ----------

User = get_user_model()
USERNAME = re.compile(r"^[A-Za-z0-9_.-]{3,30}$")


def check_password(password, user):
    try:
        password_validation.validate_password(password, user)
    except DjangoValidationError as e:
        raise serializers.ValidationError(list(e.messages))
    return password


class ProfileSerializer(serializers.ModelSerializer):
    bias = serializers.SlugRelatedField(slug_field="slug", queryset=Member.objects.all(), allow_null=True, required=False)

    class Meta:
        model = Profile
        fields = ["display_name", "bias"]

    def validate_display_name(self, value):
        return value.strip()


class RegisterSerializer(serializers.Serializer):
    """A new viewer account. Admin rights are only ever given in the Studio."""

    username = serializers.CharField(max_length=30)
    password = serializers.CharField(write_only=True, max_length=128)
    display_name = serializers.CharField(max_length=30, required=False, allow_blank=True)
    bias = serializers.SlugRelatedField(slug_field="slug", queryset=Member.objects.all(), allow_null=True, required=False)

    def validate_username(self, value):
        value = value.strip()
        if not USERNAME.match(value):
            raise serializers.ValidationError("Use 3–30 letters, numbers, dots, dashes or underscores.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("That username is taken.")
        return value

    def validate(self, attrs):
        try:
            check_password(attrs["password"], User(username=attrs["username"]))
        except serializers.ValidationError as e:
            raise serializers.ValidationError({"password": e.detail})
        return attrs

    def create(self, data):
        user = User.objects.create_user(username=data["username"], password=data["password"])
        Profile.objects.create(user=user, display_name=data.get("display_name", "").strip(), bias=data.get("bias"))
        return user


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, max_length=128)

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("That isn't your current password.")
        return value

    def validate_new_password(self, value):
        return check_password(value, self.context["request"].user)


class AdminUserSerializer(serializers.ModelSerializer):
    """What the Studio's Fans page shows; only the role and active switches are editable."""

    display_name = serializers.SerializerMethodField()
    bias = serializers.SerializerMethodField()
    likes = serializers.IntegerField(source="likes.count", read_only=True)
    games = serializers.IntegerField(source="scores.count", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "display_name", "bias", "is_staff", "is_active", "date_joined", "last_login", "likes", "games"]
        read_only_fields = ["id", "username", "date_joined", "last_login"]

    def _profile(self, user):
        return getattr(user, "profile", None)

    def get_display_name(self, user):
        p = self._profile(user)
        return p.name if p else user.get_username()

    def get_bias(self, user):
        p = self._profile(user)
        return p.bias.slug if p and p.bias else None


class AdminCreateUserSerializer(serializers.Serializer):
    """An account made by an admin in User management (viewer or admin)."""

    username = serializers.CharField(max_length=30)
    password = serializers.CharField(write_only=True, max_length=128)
    display_name = serializers.CharField(max_length=30, required=False, allow_blank=True)
    is_staff = serializers.BooleanField(default=False)

    validate_username = RegisterSerializer.validate_username

    def validate(self, attrs):
        try:
            check_password(attrs["password"], User(username=attrs["username"]))
        except serializers.ValidationError as e:
            raise serializers.ValidationError({"password": e.detail})
        return attrs

    def create(self, data):
        user = User.objects.create_user(username=data["username"], password=data["password"], is_staff=data["is_staff"])
        Profile.objects.create(user=user, display_name=data.get("display_name", "").strip())
        return user
