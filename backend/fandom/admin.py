from django.contrib import admin

from .models import Album, Like, Profile, DiaryPage, DiaryPhoto, DiaryVideo, GameScore, Member, SiteSettings, Song


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ["stage_name", "birth_name", "unit", "birthday", "order"]
    list_filter = ["unit"]
    list_editable = ["order"]
    prepopulated_fields = {"slug": ["stage_name"]}


class SongInline(admin.TabularInline):
    model = Song
    extra = 1
    fields = ["disc", "track_number", "title", "native_title", "note", "is_title_track", "youtube_url", "spotify_url"]


@admin.register(Album)
class AlbumAdmin(admin.ModelAdmin):
    list_display = ["title", "kind", "language", "release_date", "title_track"]
    list_filter = ["kind", "language"]
    prepopulated_fields = {"slug": ["title"]}
    inlines = [SongInline]


@admin.register(Song)
class SongAdmin(admin.ModelAdmin):
    list_display = ["title", "album", "is_title_track", "youtube_url"]
    list_filter = ["is_title_track", "album"]
    search_fields = ["title"]


@admin.register(GameScore)
class GameScoreAdmin(admin.ModelAdmin):
    list_display = ["player", "game", "score", "created_at"]
    list_filter = ["game"]


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ["__str__", "updated_at"]

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()


class DiaryPhotoInline(admin.TabularInline):
    model = DiaryPhoto
    extra = 0


class DiaryVideoInline(admin.TabularInline):
    model = DiaryVideo
    extra = 0


@admin.register(DiaryPage)
class DiaryPageAdmin(admin.ModelAdmin):
    list_display = ["date", "book", "title", "paper", "is_private", "updated_at"]
    list_filter = ["book", "is_private", "paper"]
    date_hierarchy = "date"
    inlines = [DiaryPhotoInline, DiaryVideoInline]


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "display_name", "bias"]
    search_fields = ["user__username", "display_name"]


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ["user", "song", "created_at"]
