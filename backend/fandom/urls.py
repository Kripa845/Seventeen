from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AlbumViewSet,
    ContentVersionView,
    DiaryPageViewSet,
    GameScoreViewSet,
    LikeDetailView,
    LikesView,
    LoginView,
    LogoutView,
    MemberViewSet,
    MeView,
    MyScoresView,
    PasswordView,
    ProfileView,
    RegisterView,
    SiteSettingsView,
    SongViewSet,
    UserAdminViewSet,
)

router = DefaultRouter()
router.register("members", MemberViewSet, basename="member")
router.register("albums", AlbumViewSet, basename="album")
router.register("songs", SongViewSet, basename="song")
router.register("scores", GameScoreViewSet, basename="score")
router.register("diary", DiaryPageViewSet, basename="diary")
router.register("users", UserAdminViewSet, basename="user")

urlpatterns = router.urls + [
    path("site/", SiteSettingsView.as_view(), name="site"),
    path("version/", ContentVersionView.as_view(), name="version"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("me/profile/", ProfileView.as_view(), name="my-profile"),
    path("me/password/", PasswordView.as_view(), name="my-password"),
    path("me/likes/", LikesView.as_view(), name="my-likes"),
    path("me/likes/<int:song_id>/", LikeDetailView.as_view(), name="my-like"),
    path("me/scores/", MyScoresView.as_view(), name="my-scores"),
]
