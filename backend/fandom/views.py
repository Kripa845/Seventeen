from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout, update_session_auth_hash
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.db.models import Count, Max, Q
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Album, CardPull, DiaryPage, Event, GameScore, Letter, Like, Member, PhotoCard, Profile, Report, SiteSettings, Song
from .serializers import (
    AdminCreateUserSerializer,
    AdminScoreSerializer,
    AdminUserSerializer,
    AlbumDetailSerializer,
    AlbumListSerializer,
    DiaryPageSerializer,
    can_edit_page,
    DiaryPhotoSerializer,
    DiaryVideoSerializer,
    EventSerializer,
    GameScoreSerializer,
    LetterSerializer,
    MemberSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PhotoCardSerializer,
    ProfileSerializer,
    RegisterSerializer,
    ReportSerializer,
    check_password,
    SiteSettingsSerializer,
    SongSerializer,
)


User = get_user_model()


class IsStaffOrReadOnly(permissions.BasePermission):
    """Anyone can read; only staff (signed in to the Studio) can change things."""

    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or bool(request.user and request.user.is_staff)


class DiaryAccess(permissions.BasePermission):
    """The diary and the photo albums, for signed-in accounts. Everyone reads the public pages;
    viewers add diary pages and change their own; admins change anything and keep the photo albums."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS or user.is_staff:
            return True
        if view.action == "create":
            return request.data.get("book", DiaryPage.Book.DIARY) == DiaryPage.Book.DIARY
        return view.action != "reorder"  # the rest is checked per page

    def has_object_permission(self, request, view, page):
        return request.method in permissions.SAFE_METHODS or can_edit_page(request.user, page)


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

    def get_serializer_context(self):
        # one song (and the Studio's saves) come with lyrics; lists of songs don't
        return {**super().get_serializer_context(), "with_lyrics": self.action != "list"}

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
    ?book=album lists the photo albums instead. Signed-in accounts read and add diary pages,
    and change the ones they wrote; admins change any page and keep the photo albums.
    Private pages are seen only by their writer and admins.

    POST /api/diary/<id>/photos/ {image} and /api/diary/<id>/videos/ {file} upload a photo
    or a video to place on that page.

    POST /api/diary/reorder/ {ids: [every photo album page id, in the new order]} (staff).
    """

    serializer_class = DiaryPageSerializer
    permission_classes = [DiaryAccess]

    def get_queryset(self):
        qs = DiaryPage.objects.select_related("author__profile").prefetch_related("photos", "videos")
        if self.action == "list":
            qs = qs.filter(book=self.request.query_params.get("book", DiaryPage.Book.DIARY))
        user = self.request.user
        if not user.is_staff:
            qs = qs.filter(Q(is_private=False) | Q(author=user))
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

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
        for model in (Album, Member, Song, Event, PhotoCard):
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
            "email": user.email,
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


def scoped_throttles(view):
    """The view's throttle_scope rate from DEFAULT_THROTTLE_RATES (like LoginView's)."""
    from rest_framework.throttling import ScopedRateThrottle

    return [ScopedRateThrottle()]


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetView(APIView):
    """POST /api/auth/password-reset/ {email}: emails a link to set a new password.
    The answer is the same whether or not the email has an account, so it can't be used to
    find out who's registered."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = "reset"

    def get_throttles(self):
        return scoped_throttles(self)

    def post(self, request):
        email = str(request.data.get("email", "")).strip()
        user = User.objects.filter(email__iexact=email, is_active=True).first() if email else None
        if user and user.has_usable_password():
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.SITE_URL}/reset-password?uid={uid}&token={token}"
            name = Profile.for_user(user).name
            send_mail(
                "Set a new password ◆ SEVENTEEN fan site",
                f"Hi {name},\n\nSomeone (hopefully you) asked to reset the password for @{user.get_username()}.\n"
                f"Choose a new one here (the link works for 3 hours):\n\n{link}\n\n"
                "If it wasn't you, ignore this email: your password stays the same.\n",
                None,
                [user.email],
            )
        return Response({"detail": "If that email belongs to an account, a reset link is on its way."})


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetConfirmView(APIView):
    """POST /api/auth/password-reset/confirm/ {uid, token, new_password}"""

    permission_classes = [permissions.AllowAny]
    throttle_scope = "reset"

    def get_throttles(self):
        return scoped_throttles(self)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(data["uid"])), is_active=True)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            user = None
        if user is None or not default_token_generator.check_token(user, data["token"]):
            raise ValidationError({"detail": "This reset link has expired or was already used. Ask for a new one."})
        try:
            check_password(data["new_password"], user)
        except ValidationError as e:
            raise ValidationError({"new_password": e.detail})
        user.set_password(data["new_password"])
        user.save()
        return Response({"detail": "Password changed. Sign in with your new password."})


@method_decorator(csrf_protect, name="dispatch")
class AccountView(APIView):
    """DELETE /api/me/account/ {password}: deletes the account and everything it made
    (diary pages with their photos and videos, letters, likes, photocards). Game scores stay on
    the leaderboards without a name. The last admin can't delete themselves."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        user = request.user
        if not user.check_password(str(request.data.get("password", ""))):
            raise ValidationError({"password": "That isn't your password."})
        if user.is_staff and not User.objects.filter(is_staff=True, is_active=True).exclude(pk=user.pk).exists():
            raise ValidationError({"detail": "You're the only admin. Make someone else an admin first."})
        with transaction.atomic():
            for page in user.diary_pages.all():
                page.delete_photos()
                page.delete_videos()
                page.delete()
            logout(request)
            user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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


# ---------- For CARATs: the calendar, photocards and letters ----------


class EventViewSet(viewsets.ModelViewSet):
    """GET /api/events/ : comebacks, concerts and other dates for the calendar
    (birthdays and the anniversary are added by the page itself). Staff add, edit and delete."""

    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [IsStaffOrReadOnly]


class SignedInReadsStaffWrites(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return request.method in permissions.SAFE_METHODS or user.is_staff


class PhotoCardViewSet(viewsets.ModelViewSet):
    """GET /api/cards/ : every photocard (signed in). Staff upload (multipart: image, title,
    member, album, rarity), edit and delete them."""

    queryset = PhotoCard.objects.select_related("member", "album")
    serializer_class = PhotoCardSerializer
    permission_classes = [SignedInReadsStaffWrites]

    def perform_destroy(self, card):
        card.image.delete(save=False)
        card.delete()


PACK_SIZE = 3
RARITY_WEIGHT = {PhotoCard.Rarity.COMMON: 10, PhotoCard.Rarity.RARE: 4, PhotoCard.Rarity.SPECIAL: 1}


def binder_payload(user):
    today = timezone.localdate()
    pulls = CardPull.objects.filter(user=user)
    counts = {}
    for card_id in pulls.values_list("card_id", flat=True):
        counts[str(card_id)] = counts.get(str(card_id), 0) + 1
    return {
        "counts": counts,
        "pack_ready": not pulls.filter(pulled_on=today).exists(),
        "today": list(pulls.filter(pulled_on=today).values_list("card_id", flat=True)),
        "pack_size": PACK_SIZE,
    }


class BinderView(APIView):
    """GET /api/me/binder/ : which cards I have (with duplicates) and whether today's pack is waiting.
    POST /api/me/binder/ opens today's pack: PACK_SIZE random cards, rarer ones less often."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(binder_payload(request.user))

    def post(self, request):
        import random

        today = timezone.localdate()
        if CardPull.objects.filter(user=request.user, pulled_on=today).exists():
            return Response({"detail": "You've opened today's pack. A new one comes tomorrow."}, status=status.HTTP_400_BAD_REQUEST)
        cards = list(PhotoCard.objects.select_related("member", "album"))
        if not cards:
            return Response({"detail": "There are no photocards yet."}, status=status.HTTP_400_BAD_REQUEST)
        picked = random.choices(cards, weights=[RARITY_WEIGHT.get(c.rarity, 1) for c in cards], k=PACK_SIZE)
        CardPull.objects.bulk_create([CardPull(user=request.user, card=c, pulled_on=today) for c in picked])
        return Response({
            **binder_payload(request.user),
            "pulled": PhotoCardSerializer(picked, many=True).data,
        }, status=status.HTTP_201_CREATED)


MAX_PENDING_LETTERS = 5


class LetterViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """Letters to SEVENTEEN, for signed-in accounts.

    GET /api/letters/ : approved letters plus my own (any status); ?member=<slug> for one member's
    mailbox, ?member=all for letters to the whole team. Admins: ?all=1 lists every letter.
    POST {member?, body, paper} sends one; a viewer's waits for an admin, an admin's is approved.
    DELETE: my own letters (admins: any). POST /api/letters/<id>/review/ {status} (admins).
    """

    serializer_class = LetterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Letter.objects.select_related("author__profile", "member")
        user = self.request.user
        # viewers see approved letters and their own; admins see every letter except in the plain list
        if not user.is_staff or (self.action == "list" and not self.request.query_params.get("all")):
            qs = qs.filter(Q(status=Letter.Status.APPROVED) | Q(author=user))
        member = self.request.query_params.get("member")
        if member == "all":
            qs = qs.filter(member__isnull=True)
        elif member:
            qs = qs.filter(member__slug=member)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_staff and user.letters.filter(status=Letter.Status.PENDING).count() >= MAX_PENDING_LETTERS:
            raise ValidationError({"detail": f"You have {MAX_PENDING_LETTERS} letters waiting for review. Send more once they're read."})
        serializer.save(author=user, status=Letter.Status.APPROVED if user.is_staff else Letter.Status.PENDING)

    def perform_destroy(self, letter):
        if not (self.request.user.is_staff or letter.author_id == self.request.user.id):
            raise PermissionDenied("You can only take back your own letters.")
        letter.delete()

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def review(self, request, pk=None):
        letter = self.get_object()
        value = request.data.get("status")
        if value not in Letter.Status.values:
            raise ValidationError({"status": f"Use one of: {', '.join(Letter.Status.values)}."})
        letter.status = value
        letter.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(letter).data)


class ReportViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    """Reports on diary pages and letters.

    POST /api/reports/ {kind, target_id, reason, note?}: any signed-in account, about someone else's post.
    GET /api/reports/?status=open (admins). POST /api/reports/<id>/resolve/ {action} (admins):
    "dismiss" keeps the post, "hide" makes it private (diary) or hides it (letter), "delete" removes it.
    Resolving one report resolves every open report on the same post.
    """

    serializer_class = ReportSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    throttle_scope = "report"

    def get_throttles(self):
        return scoped_throttles(self) if self.action == "create" else super().get_throttles()

    def get_queryset(self):
        qs = Report.objects.select_related("reporter__profile")
        value = self.request.query_params.get("status")
        return qs.filter(status=value) if value in Report.Status.values else qs

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        report = self.get_object()
        what = request.data.get("action")
        if what not in ("dismiss", "hide", "delete"):
            raise ValidationError({"action": "Use dismiss, hide or delete."})
        post = report.target()
        if post is not None and what == "hide":
            if isinstance(post, DiaryPage):
                post.is_private = True
                post.save(update_fields=["is_private", "updated_at"])
            else:
                post.status = Letter.Status.HIDDEN
                post.save(update_fields=["status", "updated_at"])
        elif post is not None and what == "delete":
            if isinstance(post, DiaryPage):
                post.delete_photos()
                post.delete_videos()
            post.delete()
        outcome = {"dismiss": "dismissed", "hide": "hidden", "delete": "deleted"}[what]
        Report.objects.filter(kind=report.kind, target_id=report.target_id, status=Report.Status.OPEN).update(
            status=Report.Status.RESOLVED, outcome=outcome, resolved_at=timezone.now()
        )
        report.refresh_from_db()
        return Response(self.get_serializer(report).data)
