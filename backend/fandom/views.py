from django.contrib.auth import authenticate, get_user_model, login, logout, update_session_auth_hash
from django.db.models import Count, Max
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Album, DiaryPage, GameScore, Like, Member, Profile, SiteSettings, Song
from .serializers import (
    AdminCreateUserSerializer,
    AdminScoreSerializer,
    AdminUserSerializer,
    AlbumDetailSerializer,
    AlbumListSerializer,
    DiaryPageSerializer,
    DiaryPhotoSerializer,
    DiaryVideoSerializer,
    GameScoreSerializer,
    MemberSerializer,
    PasswordChangeSerializer,
    ProfileSerializer,
    RegisterSerializer,
    SiteSettingsSerializer,
    SongSerializer,
)


class IsStaffOrReadOnly(permissions.BasePermission):
    """Anyone can read; only staff (signed in to the Studio) can change things."""

    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or bool(request.user and request.user.is_staff)


class SignedInReadsStaffWrites(permissions.BasePermission):
    """Signed-in accounts (viewers and admins) can read; only staff can change things.
    The diary, the photo albums and the games are for signed-in CARATs, not the landing page."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return request.method in permissions.SAFE_METHODS or user.is_staff


class MemberViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet
):
    """GET /api/members/ and /api/members/<slug>/ ; filter with ?unit=vocal. Staff can PATCH."""

    serializer_class = MemberSerializer
    permission_classes = [IsStaffOrReadOnly]
    lookup_field = "slug"

    def get_queryset(self):
        qs = Member.objects.all()
        unit = self.request.query_params.get("unit")
        return qs.filter(unit=unit) if unit else qs


class AlbumViewSet(viewsets.ModelViewSet):
    """GET /api/albums/ and /api/albums/<slug>/ (detail includes songs). Staff can create, edit, delete."""

    queryset = Album.objects.prefetch_related("songs")
    permission_classes = [IsStaffOrReadOnly]
    lookup_field = "slug"

    def get_serializer_class(self):
        return AlbumListSerializer if self.action == "list" else AlbumDetailSerializer

    def perform_destroy(self, instance):
        if instance.cover:
            instance.cover.delete(save=False)
        instance.delete()


class SongViewSet(viewsets.ModelViewSet):
    """GET /api/songs/ ; ?title_tracks=1 for title tracks only. Staff can create, edit, delete."""

    serializer_class = SongSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):
        qs = Song.objects.select_related("album")
        if self.request.query_params.get("title_tracks"):
            qs = qs.filter(is_title_track=True)
        return qs

    def perform_destroy(self, instance):
        album = instance.album
        instance.delete()
        album.refresh_title_track()


class SiteSettingsView(APIView):
    """GET /api/site/ : default theme and home-page words. Staff can PATCH."""

    permission_classes = [IsStaffOrReadOnly]

    def get(self, request):
        return Response(SiteSettingsSerializer(SiteSettings.load()).data)

    def patch(self, request):
        serializer = SiteSettingsSerializer(SiteSettings.load(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DiaryPageViewSet(viewsets.ModelViewSet):
    """GET /api/diary/ : every diary page, oldest first (private pages only for staff);
    ?book=album lists the photo albums instead. Signed-in accounts read; staff write.

    POST /api/diary/<id>/photos/ {image} and /api/diary/<id>/videos/ {file} upload a photo
    or a video to place on that page.

    POST /api/diary/reorder/ {ids: [every photo album page id, in the new order]} (staff).
    """

    serializer_class = DiaryPageSerializer
    permission_classes = [SignedInReadsStaffWrites]

    def get_queryset(self):
        qs = DiaryPage.objects.prefetch_related("photos", "videos")
        if self.action == "list":
            qs = qs.filter(book=self.request.query_params.get("book", DiaryPage.Book.DIARY))
        if not (self.request.user and self.request.user.is_staff):
            qs = qs.filter(is_private=False)
        return qs

    def perform_destroy(self, instance):
        instance.delete_photos()
        instance.delete_videos()
        instance.delete()

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        ids = request.data.get("ids")
        pages = DiaryPage.objects.filter(book=DiaryPage.Book.ALBUM)
        if not isinstance(ids, list) or len(ids) != len(set(ids)) or set(ids) != set(pages.values_list("id", flat=True)):
            raise ValidationError({"ids": "Send every photo album page once, in the new order."})
        position = {pk: i for i, pk in enumerate(ids, start=1)}
        changed = [p for p in pages if p.position != position[p.id]]
        for page in changed:
            page.position = position[page.id]
        DiaryPage.objects.bulk_update(changed, ["position"])
        return Response(self.get_serializer(self.get_queryset().filter(book=DiaryPage.Book.ALBUM), many=True).data)

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser])
    def photos(self, request, pk=None):
        serializer = DiaryPhotoSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(page=self.get_object())
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser])
    def videos(self, request, pk=None):
        serializer = DiaryVideoSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(page=self.get_object())
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ContentVersionView(APIView):
    """GET /api/version/ : a stamp that changes whenever members, albums, songs or the site
    settings change (Studio, Django admin or import_images). Open pages check it and refresh,
    so a new album cover shows up for everyone without a reload."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        parts = []
        for model in (Album, Member, Song):
            agg = model.objects.aggregate(n=Count("id"), t=Max("updated_at"))
            parts.append(f"{agg['n']}@{agg['t'].timestamp() if agg['t'] else 0:.6f}")
        parts.append(f"{SiteSettings.load().updated_at.timestamp():.6f}")
        return Response({"version": "-".join(parts)})


def user_payload(user):
    """Who is signed in. role is "admin" (can use the Studio) or "viewer" (a fan account)."""
    if not user.is_authenticated:
        return {"user": None}
    profile = Profile.for_user(user)
    return {
        "user": {
            "username": user.get_username(),
            "is_staff": user.is_staff,
            "role": "admin" if user.is_staff else "viewer",
            "display_name": profile.name,
            "bias": profile.bias.slug if profile.bias else None,
            "date_joined": user.date_joined.date().isoformat(),
        }
    }


@method_decorator(ensure_csrf_cookie, name="dispatch")
class MeView(APIView):
    """GET /api/auth/me/ : who is signed in. Also hands the browser its CSRF cookie."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(user_payload(request.user))


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    """POST /api/auth/login/ {username, password}: viewers and admins alike; the payload says which."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = "login"

    def get_throttles(self):
        from rest_framework.throttling import ScopedRateThrottle

        return [ScopedRateThrottle()]

    def post(self, request):
        user = authenticate(
            request,
            username=request.data.get("username", ""),
            password=request.data.get("password", ""),
        )
        if user is None:
            return Response({"detail": "Wrong username or password."}, status=status.HTTP_400_BAD_REQUEST)
        login(request, user)
        return Response(user_payload(user))


@method_decorator(csrf_protect, name="dispatch")
class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        logout(request)
        return Response({"user": None})


class GameScoreViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    """GET /api/scores/?game=memory (top 10)  ·  POST /api/scores/ {game, player, score}
    Both need a signed-in account: the games are for viewers, not the landing page.

    Admins: GET ?all=1 lists every score (with accounts), DELETE /api/scores/<id>/ removes one,
    POST /api/scores/clear/ {game} empties a leaderboard.
    """

    serializer_class = GameScoreSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ("destroy", "clear"):
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def is_admin_list(self):
        return self.request.query_params.get("all") and self.request.user.is_staff

    def get_queryset(self):
        qs = GameScore.objects.all()
        game = self.request.query_params.get("game")
        if game:
            qs = qs.filter(game=game)
        return qs

    def list(self, request, *args, **kwargs):
        if self.is_admin_list():
            qs = self.get_queryset().select_related("user")[:2000]
            return Response(AdminScoreSerializer(qs, many=True).data)
        data = self.get_serializer(self.get_queryset()[:10], many=True).data
        return Response(data)

    @action(detail=False, methods=["post"])
    def clear(self, request):
        game = request.data.get("game")
        if game not in GameScore.Game.values:
            raise ValidationError({"game": "Pick a game to clear."})
        deleted, _ = GameScore.objects.filter(game=game).delete()
        return Response({"deleted": deleted})

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ---------- Accounts: register, the viewer's own data, and the admin's list of fans ----------


@method_decorator(csrf_protect, name="dispatch")
class RegisterView(APIView):
    """POST /api/auth/register/ {username, password, display_name?, bias?}: a new viewer, signed in."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = "register"

    def get_throttles(self):
        from rest_framework.throttling import ScopedRateThrottle

        return [ScopedRateThrottle()]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        return Response(user_payload(user), status=status.HTTP_201_CREATED)


class ProfileView(APIView):
    """GET/PATCH /api/me/profile/ {display_name, bias}"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(ProfileSerializer(Profile.for_user(request.user)).data)

    def patch(self, request):
        serializer = ProfileSerializer(Profile.for_user(request.user), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(user_payload(request.user))


class PasswordView(APIView):
    """POST /api/me/password/ {old_password, new_password}; stays signed in afterwards."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        update_session_auth_hash(request, request.user)
        return Response({"detail": "Password changed."})


class LikesView(APIView):
    """GET /api/me/likes/ : my liked songs, newest first. POST {song: id} likes one."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        songs = [like.song for like in request.user.likes.select_related("song__album")]
        return Response(SongSerializer(songs, many=True, context={"request": request}).data)

    def post(self, request):
        song = Song.objects.filter(pk=request.data.get("song")).first()
        if song is None:
            return Response({"detail": "That song doesn\u2019t exist."}, status=status.HTTP_400_BAD_REQUEST)
        Like.objects.get_or_create(user=request.user, song=song)
        return Response({"liked": True}, status=status.HTTP_201_CREATED)


class LikeDetailView(APIView):
    """DELETE /api/me/likes/<song id>/ unlikes it."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, song_id):
        request.user.likes.filter(song_id=song_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyScoresView(APIView):
    """GET /api/me/scores/ : every score I saved while signed in, best first."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(GameScoreSerializer(request.user.scores.all(), many=True).data)


class UserAdminViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Admins only. GET /api/users/ lists every account; POST adds one; PATCH {is_staff, is_active}
    changes a role; DELETE removes an account; POST /api/users/<id>/reset_password/ makes a new password."""

    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

    def get_queryset(self):
        return get_user_model().objects.select_related("profile__bias").order_by("-date_joined")

    def perform_update(self, serializer):
        data = serializer.validated_data
        if serializer.instance == self.request.user and (data.get("is_staff") is False or data.get("is_active") is False):
            raise ValidationError({"detail": "You can\u2019t remove your own admin role or switch off your own account."})
        serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = AdminCreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        if instance == self.request.user:
            raise ValidationError({"detail": "You can\u2019t delete your own account here."})
        instance.delete()

    @action(detail=True, methods=["post"])
    def reset_password(self, request, pk=None):
        import secrets

        user = self.get_object()
        password = secrets.token_urlsafe(9)
        user.set_password(password)
        user.save()
        return Response({"password": password})
