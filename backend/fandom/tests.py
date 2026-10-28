from django.core.management import call_command
from rest_framework.test import APITestCase

from fandom.models import Song


class ApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_svt", verbosity=0)

    def test_thirteen_members(self):
        res = self.client.get("/api/members/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 13)

    def test_filter_by_unit(self):
        res = self.client.get("/api/members/?unit=performance")
        self.assertEqual({m["slug"] for m in res.data}, {"jun", "hoshi", "the8", "dino"})

    def test_album_detail_has_songs_and_theme(self):
        res = self.client.get("/api/albums/fml/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual([x["title"] for x in res.data["songs"] if x["is_title_track"]], ["F*ck My Life", "Super"])
        self.assertIn("accent", res.data["theme"])

    def test_title_tracks_have_mv_and_admin_links_are_kept(self):
        res = self.client.get("/api/songs/?title_tracks=1")
        self.assertTrue(all(s["youtube_url"] for s in res.data))
        Song.objects.filter(album__slug="fml", title="Super").update(youtube_url="https://youtu.be/custom12345")
        call_command("seed_svt", verbosity=0)
        self.assertEqual(Song.objects.get(album__slug="fml", title="Super").youtube_url, "https://youtu.be/custom12345")

    def test_full_tracklists_with_discs(self):
        songs = self.client.get("/api/albums/17-is-right-here/").data["songs"]
        self.assertEqual(len(songs), 33)
        self.assertEqual((songs[12]["disc"], songs[12]["track_number"], songs[12]["title"]), (2, 1, "Adore U"))
        self.assertEqual(self.client.get("/api/albums/always-yours/").data["language"], "ja")

    def test_versions_dont_borrow_the_original_mv(self):
        songs = {s["title"]: s for s in self.client.get("/api/albums/17-is-right-here/").data["songs"]}
        self.assertTrue(songs["Mansae"]["youtube_url"])
        japanese_mv = Song.objects.get(album__slug="dream", title="Dream").youtube_url
        self.assertNotEqual(songs["Dream (Korean ver.)"]["youtube_url"], japanese_mv)

    def test_album_has_spotify_field(self):
        self.assertIn("spotify_url", self.client.get("/api/albums/").data[0])

    def test_seed_is_idempotent(self):
        call_command("seed_svt", verbosity=0)
        self.assertEqual(len(self.client.get("/api/albums/").data), 26)
        self.assertEqual(len(self.client.get("/api/songs/").data), 261)

    def test_post_and_list_scores(self):
        self.assertEqual(self.client.post("/api/scores/", {"game": "memory", "player": "x", "score": 1}).status_code, 403)
        self.assertEqual(self.client.get("/api/scores/?game=memory").status_code, 403)  # games are for viewers
        from django.contrib.auth.models import User

        self.client.force_authenticate(User.objects.create_user("player", password="diamond-17"))
        for name, score in [("carat1", 50), ("carat2", 90)]:
            res = self.client.post("/api/scores/", {"game": "memory", "player": name, "score": score})
            self.assertEqual(res.status_code, 201)
        res = self.client.get("/api/scores/?game=memory")
        self.assertEqual([s["player"] for s in res.data], ["carat2", "carat1"])

    def test_rejects_blank_player(self):
        from django.contrib.auth.models import User

        self.client.force_authenticate(User.objects.create_user("player", password="diamond-17"))
        res = self.client.post("/api/scores/", {"game": "memory", "player": "  ", "score": 5})
        self.assertEqual(res.status_code, 400)


class StaffTestCase(APITestCase):
    """A staff account, a signed-in-but-not-staff fan, and a throwaway media folder."""

    @classmethod
    def setUpTestData(cls):
        call_command("seed_svt", verbosity=0)
        from django.contrib.auth.models import User

        cls.staff = User.objects.create_user("carat", password="diamond-17", is_staff=True)
        cls.fan = User.objects.create_user("fan", password="diamond-17")

    def setUp(self):
        import shutil
        import tempfile

        from django.test import override_settings

        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, True)
        self.enterContext(override_settings(MEDIA_ROOT=self.media))

    def image(self, name="p.png"):
        from io import BytesIO

        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        buf = BytesIO()
        Image.new("RGB", (8, 8), "pink").save(buf, "PNG")
        return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")


class StudioTests(StaffTestCase):
    """Editing through the Studio: staff only, validated, and tidy with files."""

    def test_visitors_cannot_edit(self):
        self.assertEqual(self.client.patch("/api/members/hoshi/", {"tagline": "x"}, format="json").status_code, 403)
        self.assertEqual(self.client.patch("/api/site/", {"hero_lede": "x"}, format="json").status_code, 403)
        self.client.force_authenticate(self.fan)
        self.assertEqual(self.client.delete("/api/albums/fml/").status_code, 403)

    def test_login_needs_csrf_and_only_admins_can_edit(self):
        from rest_framework.test import APIClient

        c = APIClient(enforce_csrf_checks=True)
        self.assertEqual(c.post("/api/auth/login/", {"username": "carat", "password": "diamond-17"}).status_code, 403)
        token = c.get("/api/auth/me/").cookies["csrftoken"].value
        viewer = APIClient()
        res = viewer.post("/api/auth/login/", {"username": "fan", "password": "diamond-17"})
        self.assertEqual(res.data["user"]["role"], "viewer")
        self.assertEqual(viewer.patch("/api/members/hoshi/", {"tagline": "x"}, format="json").status_code, 403)
        res = c.post("/api/auth/login/", {"username": "carat", "password": "nope"}, HTTP_X_CSRFTOKEN=token)
        self.assertEqual(res.status_code, 400)
        res = c.post("/api/auth/login/", {"username": "carat", "password": "diamond-17"}, HTTP_X_CSRFTOKEN=token)
        self.assertEqual(res.data["user"]["username"], "carat")
        token = c.cookies["csrftoken"].value  # rotated on login
        self.assertEqual(c.patch("/api/members/hoshi/", {"tagline": "Horanghae!"}, format="json").status_code, 403)
        res = c.patch("/api/members/hoshi/", {"tagline": "Horanghae!"}, format="json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(res.status_code, 200)

    def test_replacing_a_photo_deletes_the_old_file(self):
        import os

        self.client.force_authenticate(self.staff)
        first = self.client.patch("/api/members/hoshi/", {"photo": self.image()}, format="multipart").data["photo"]
        self.client.patch("/api/members/hoshi/", {"photo": self.image()}, format="multipart")
        self.assertEqual(len(os.listdir(os.path.join(self.media, "members"))), 1)
        self.client.patch("/api/members/hoshi/", {"photo": None}, format="json")
        self.assertEqual(os.listdir(os.path.join(self.media, "members")), [])
        self.assertTrue(first)

    def test_theme_is_validated(self):
        self.client.force_authenticate(self.staff)
        theme = self.client.get("/api/site/").data["theme"]
        res = self.client.patch("/api/site/", {"theme": {**theme, "accent": "pink"}}, format="json")
        self.assertEqual(res.status_code, 400)
        res = self.client.patch("/api/site/", {"theme": {**theme, "accent": "#112233"}, "hero_lede": "Hi"}, format="json")
        self.assertEqual((res.data["theme"]["accent"], res.data["hero_lede"]), ("#112233", "Hi"))

    def test_new_album_and_songs(self):
        self.client.force_authenticate(self.staff)
        theme = self.client.get("/api/site/").data["theme"]
        album = self.client.post(
            "/api/albums/",
            {"title": "FML", "kind": "mini", "release_date": "2026-05-01", "theme": theme},
            format="json",
        ).data
        self.assertEqual(album["slug"], "fml-2")
        song = self.client.post("/api/songs/", {"album": album["id"], "title": "New Song", "is_title_track": True}, format="json")
        self.assertEqual(song.status_code, 201)
        self.assertEqual(self.client.get("/api/albums/fml-2/").data["title_track"], "New Song")
        self.client.delete(f"/api/songs/{song.data['id']}/")
        self.assertEqual(self.client.get("/api/albums/fml-2/").data["title_track"], "")


class DiaryTests(StaffTestCase):
    """The diary: signed-in viewers read public pages; staff write, upload photos and keep pages private."""

    def page(self, **extra):
        return self.client.post("/api/diary/", {"date": "2026-10-25", "title": " Concert day ", **extra}, format="json")

    def test_viewers_can_read_but_not_write(self):
        self.assertEqual(self.page().status_code, 403)
        self.client.force_authenticate(self.staff)
        public = self.page().data
        self.page(is_private=True)
        self.assertEqual(len(self.client.get("/api/diary/").data), 2)
        self.assertEqual(public["title"], "Concert day")
        self.client.force_authenticate(self.fan)
        self.assertEqual([p["id"] for p in self.client.get("/api/diary/").data], [public["id"]])
        self.assertEqual(self.client.patch(f"/api/diary/{public['id']}/", {"title": "x"}, format="json").status_code, 403)
        # signed-out visitors only get the landing page
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/diary/").status_code, 403)
        self.assertEqual(self.client.get("/api/diary/?book=album").status_code, 403)
        self.assertEqual(self.client.get(f"/api/diary/{public['id']}/").status_code, 403)

    def test_items_are_validated_and_cleaned(self):
        self.client.force_authenticate(self.staff)
        page = self.page().data
        url = f"/api/diary/{page['id']}/"
        items = [
            {"id": "a", "kind": "text", "x": 500, "y": 10, "w": 30, "r": 4, "z": 1, "text": "Aju nice!", "font": "cute", "color": "#C25E73", "extra": "dropped"},
            {"id": "b", "kind": "sticker", "x": 40, "y": 40, "w": 12, "r": 0, "z": 2, "sticker": "💎"},
            {"id": "c", "kind": "member", "x": 60, "y": 50, "w": 20, "r": -5, "z": 3, "member": "hoshi", "frame": "polaroid"},
        ]
        res = self.client.patch(url, {"items": items}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["items"][0]["x"], 120)
        self.assertNotIn("extra", res.data["items"][0])
        for bad in [{"kind": "video"}, {**items[0], "font": "comic"}, {**items[0], "color": "red"}, {**items[2], "frame": "glitter"}]:
            self.assertEqual(self.client.patch(url, {"items": [bad]}, format="json").status_code, 400)

    def test_photos_belong_to_their_page_and_are_tidied(self):
        import os

        self.client.force_authenticate(self.staff)
        first, second = self.page().data, self.page().data
        photo = self.client.post(f"/api/diary/{first['id']}/photos/", {"image": self.image()}, format="multipart")
        self.assertEqual(photo.status_code, 201)
        spare = self.client.post(f"/api/diary/{first['id']}/photos/", {"image": self.image()}, format="multipart").data
        item = {"id": "p", "kind": "photo", "x": 50, "y": 50, "w": 30, "r": 0, "z": 1, "photo": photo.data["id"], "a": 0.75}
        res = self.client.patch(f"/api/diary/{second['id']}/", {"items": [item]}, format="json")
        self.assertEqual(res.status_code, 400)
        res = self.client.patch(f"/api/diary/{first['id']}/", {"items": [item]}, format="json")
        self.assertEqual(list(res.data["photos"]), [str(photo.data["id"])])
        self.assertNotIn(str(spare["id"]), res.data["photos"])
        folder = os.path.join(self.media, "diary")
        self.assertEqual(len(os.listdir(folder)), 1)
        self.client.delete(f"/api/diary/{first['id']}/")
        self.assertEqual(os.listdir(folder), [])

    def test_rejects_non_images(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.client.force_authenticate(self.staff)
        page = self.page().data
        res = self.client.post(f"/api/diary/{page['id']}/photos/", {"image": SimpleUploadedFile("x.png", b"nope")}, format="multipart")
        self.assertEqual(res.status_code, 400)

    def test_songs_on_a_page(self):
        self.client.force_authenticate(self.staff)
        page = self.page().data
        url = f"/api/diary/{page['id']}/"
        song_id = Song.objects.get(album__slug="fml", title="Super").id
        base = {"id": "s", "kind": "song", "x": 50, "y": 50, "w": 26, "r": 0, "z": 1}
        items = [
            {**base, "song": song_id, "style": "vinyl"},
            {**base, "id": "c", "song": None, "url": "https://youtu.be/abc123xyz00", "title": "Our song", "artist": "Someone"},
        ]
        res = self.client.patch(url, {"items": items}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual((res.data["items"][0]["style"], res.data["items"][1]["style"]), ("vinyl", "card"))
        for bad in [
            {**base, "song": 999999},
            {**base, "song": None, "url": "https://example.com/x", "title": "Nope"},
            {**base, "song": None, "url": "https://youtu.be/abc123xyz00", "title": " "},
            {**base, "song": song_id, "style": "radio"},
        ]:
            self.assertEqual(self.client.patch(url, {"items": [bad]}, format="json").status_code, 400)



class PhotoAlbumTests(StaffTestCase):
    """Photo albums: pages of photos, member photos, songs and videos, kept apart from the diary."""

    def album(self, **extra):
        return self.client.post("/api/diary/", {"book": "album", "date": "2026-10-22", "title": "Attacca", **extra}, format="json")

    def video(self, name="clip.mp4", data=b"\x00\x00\x00\x18ftypmp42"):
        from django.core.files.uploadedfile import SimpleUploadedFile

        return SimpleUploadedFile(name, data, content_type="video/mp4")

    def test_albums_and_diary_are_listed_apart(self):
        self.client.force_authenticate(self.staff)
        album = self.album().data
        diary = self.client.post("/api/diary/", {"date": "2026-10-22"}, format="json").data
        self.assertEqual((album["book"], diary["book"]), ("album", "diary"))
        self.assertEqual([p["id"] for p in self.client.get("/api/diary/?book=album").data], [album["id"]])
        self.assertEqual([p["id"] for p in self.client.get("/api/diary/").data], [diary["id"]])
        res = self.client.patch(f"/api/diary/{album['id']}/", {"book": "diary"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_albums_hold_pictures_songs_and_videos_only(self):
        self.client.force_authenticate(self.staff)
        url = f"/api/diary/{self.album().data['id']}/"
        base = {"x": 50, "y": 50, "w": 30, "r": 0, "z": 1}
        ok = [
            {**base, "id": "m", "kind": "member", "member": "hoshi", "frame": "heart"},
            {**base, "id": "v", "kind": "video", "video": None, "url": "https://youtu.be/abc123xyz00", "frame": "film"},
        ]
        res = self.client.patch(url, {"items": ok}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual([i["frame"] for i in res.data["items"]], ["heart", "film"])
        for bad in [
            {**base, "id": "t", "kind": "text", "text": "hi"},
            {**base, "id": "s", "kind": "sticker", "sticker": "💎"},
            {**base, "id": "v", "kind": "video", "video": None, "url": "https://example.com/x.mp4"},
        ]:
            self.assertEqual(self.client.patch(url, {"items": [bad]}, format="json").status_code, 400)

    def test_uploaded_videos_belong_to_their_page_and_are_tidied(self):
        import os

        self.client.force_authenticate(self.staff)
        first, second = self.album().data, self.album().data
        res = self.client.post(f"/api/diary/{first['id']}/videos/", {"file": self.video()}, format="multipart")
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data["file"].startswith("/media/diary/videos/"))
        bad = self.client.post(f"/api/diary/{first['id']}/videos/", {"file": self.video("clip.exe")}, format="multipart")
        self.assertEqual(bad.status_code, 400)
        item = {"id": "v", "kind": "video", "video": res.data["id"], "x": 50, "y": 50, "w": 40, "r": 0, "z": 1}
        self.assertEqual(self.client.patch(f"/api/diary/{second['id']}/", {"items": [item]}, format="json").status_code, 400)
        page = self.client.patch(f"/api/diary/{first['id']}/", {"items": [item]}, format="json").data
        self.assertEqual(list(page["videos"]), [str(res.data["id"])])
        folder = os.path.join(self.media, "diary", "videos")
        self.assertEqual(len(os.listdir(folder)), 1)
        self.client.delete(f"/api/diary/{first['id']}/")
        self.assertEqual(os.listdir(folder), [])

    def test_album_pages_have_no_date_and_only_admins_add_them(self):
        self.client.force_authenticate(self.fan)  # a signed-in viewer
        self.assertEqual(self.album().status_code, 403)
        self.client.force_authenticate(self.staff)
        page = self.album().data
        self.assertIsNone(page["date"])
        self.assertIsNone(self.client.patch(f"/api/diary/{page['id']}/", {"date": "2026-01-01"}, format="json").data["date"])
        res = self.client.post("/api/diary/", {"book": "diary", "title": "no date"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_visitors_cannot_upload(self):
        self.client.force_authenticate(self.staff)
        page = self.album().data
        self.client.force_authenticate(None)
        res = self.client.post(f"/api/diary/{page['id']}/videos/", {"file": self.video()}, format="multipart")
        self.assertEqual(res.status_code, 403)

class AccountTests(StaffTestCase):
    """Two roles: viewers register and get their own data; admins also get the Studio and the fan list."""

    def register(self, username="newcarat", password="seventeen-right-here", **extra):
        return self.client.post("/api/auth/register/", {"username": username, "password": password, **extra}, format="json")

    def test_register_makes_a_signed_in_viewer(self):
        res = self.register(display_name="New CARAT", bias="hoshi")
        self.assertEqual(res.status_code, 201)
        me = self.client.get("/api/auth/me/").data["user"]
        self.assertEqual((me["role"], me["display_name"], me["bias"], me["is_staff"]), ("viewer", "New CARAT", "hoshi", False))
        self.assertEqual(self.client.patch("/api/site/", {"hero_lede": "x"}, format="json").status_code, 403)

    def test_register_rejects_taken_names_and_weak_passwords(self):
        self.assertIn("username", self.register(username="Carat").data)
        self.assertIn("password", self.register(password="12345678").data)
        self.assertIn("username", self.register(username="a b").data)
        self.assertEqual(self.register(is_staff=True).data["user"]["role"], "viewer")  # can't sign yourself up as admin

    def test_likes_scores_and_profile_are_private_to_each_viewer(self):
        song = self.client.get("/api/songs/?title_tracks=1").data[0]["id"]
        self.assertEqual(self.client.get("/api/me/likes/").status_code, 403)
        self.client.force_authenticate(self.fan)
        self.client.post("/api/me/likes/", {"song": song}, format="json")
        self.client.post("/api/me/likes/", {"song": song}, format="json")  # liking twice is harmless
        self.assertEqual([s["id"] for s in self.client.get("/api/me/likes/").data], [song])
        self.client.post("/api/scores/", {"game": "memory", "player": "fan", "score": 70}, format="json")
        self.assertEqual(len(self.client.get("/api/me/scores/").data), 1)
        self.assertEqual(self.client.patch("/api/me/profile/", {"bias": "woozi"}, format="json").data["user"]["bias"], "woozi")
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get("/api/me/likes/").data, [])
        self.client.delete(f"/api/me/likes/{song}/")
        self.client.force_authenticate(self.fan)
        self.client.delete(f"/api/me/likes/{song}/")
        self.assertEqual(self.client.get("/api/me/likes/").data, [])

    def test_password_change_keeps_you_signed_in(self):
        self.register()
        res = self.client.post("/api/me/password/", {"old_password": "wrong", "new_password": "another-good-one-17"}, format="json")
        self.assertIn("old_password", res.data)
        res = self.client.post("/api/me/password/", {"old_password": "seventeen-right-here", "new_password": "another-good-one-17"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me/").data["user"]["username"], "newcarat")

    def test_only_admins_manage_accounts(self):
        self.client.force_authenticate(self.fan)
        self.assertEqual(self.client.get("/api/users/").status_code, 403)
        self.client.force_authenticate(self.staff)
        users = {u["username"]: u for u in self.client.get("/api/users/").data}
        self.assertEqual(set(users), {"carat", "fan"})
        res = self.client.patch(f"/api/users/{users['fan']['id']}/", {"is_staff": True}, format="json")
        self.assertTrue(res.data["is_staff"])
        res = self.client.patch(f"/api/users/{users['carat']['id']}/", {"is_staff": False}, format="json")
        self.assertEqual(res.status_code, 400)


class SeedAdminTests(StaffTestCase):
    def test_seed_admin_creates_then_updates(self):
        from io import StringIO

        from django.contrib.auth.models import User

        out = StringIO()
        call_command("seed_admin", username="boss", stdout=out)
        password = out.getvalue().split("Password: ")[1].split()[0]
        user = User.objects.get(username="boss")
        self.assertTrue(user.is_staff and user.is_superuser and user.check_password(password))

        user.is_staff = False
        user.save()
        call_command("seed_admin", username="boss", stdout=StringIO())  # re-run: admin again, password kept
        user.refresh_from_db()
        self.assertTrue(user.is_staff and user.check_password(password))

        call_command("seed_admin", username="boss", password="a-new-pass-for-17", stdout=StringIO())
        user.refresh_from_db()
        self.assertTrue(user.check_password("a-new-pass-for-17"))

    def test_seed_admin_rejects_weak_passwords(self):
        from io import StringIO

        from django.core.management.base import CommandError

        with self.assertRaises(CommandError):
            call_command("seed_admin", username="boss", password="12345678", stdout=StringIO())


class AdminSectionsTests(StaffTestCase):
    """User management and Games management in the Studio."""

    def test_admin_adds_resets_and_deletes_accounts(self):
        self.client.force_authenticate(self.fan)
        self.assertEqual(self.client.post("/api/users/", {"username": "x", "password": "y"}, format="json").status_code, 403)
        self.client.force_authenticate(self.staff)
        res = self.client.post("/api/users/", {"username": "helper", "password": "carat-helper-17", "is_staff": True}, format="json")
        self.assertEqual((res.status_code, res.data["is_staff"]), (201, True))
        self.assertIn("password", self.client.post("/api/users/", {"username": "weak", "password": "123"}, format="json").data)
        new = self.client.post(f"/api/users/{res.data['id']}/reset_password/").data["password"]
        from django.contrib.auth.models import User

        self.assertTrue(User.objects.get(username="helper").check_password(new))
        self.assertEqual(self.client.delete(f"/api/users/{self.staff.id}/").status_code, 400)
        self.assertEqual(self.client.delete(f"/api/users/{res.data['id']}/").status_code, 204)

    def test_admin_moderates_and_pauses_games(self):
        self.client.force_authenticate(self.fan)
        for name, score in [("a", 10), ("b", 20)]:
            self.client.post("/api/scores/", {"game": "guess", "player": name, "score": score}, format="json")
        self.assertEqual(len(self.client.get("/api/scores/?game=guess&all=1").data), 2)  # viewers: top 10, no accounts
        self.assertNotIn("username", self.client.get("/api/scores/?game=guess&all=1").data[0])
        first = self.client.get("/api/scores/?game=guess").data[0]["id"]
        self.assertEqual(self.client.delete(f"/api/scores/{first}/").status_code, 403)
        self.client.force_authenticate(self.staff)
        self.assertIn("username", self.client.get("/api/scores/?all=1").data[0])
        self.assertEqual(self.client.delete(f"/api/scores/{first}/").status_code, 204)
        self.assertEqual(self.client.post("/api/scores/clear/", {"game": "guess"}, format="json").data["deleted"], 1)
        self.client.patch("/api/site/", {"disabled_games": ["memory"]}, format="json")
        res = self.client.post("/api/scores/", {"game": "memory", "player": "a", "score": 5}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self.client.patch("/api/site/", {"disabled_games": ["chess"]}, format="json").status_code, 400)


class HeavenThemeTests(StaffTestCase):
    """The photo theme: a skin on top of the colour tokens."""

    HEAVEN = {"bg": "#0B1238", "surface": "#17205A", "text": "#FFF7E0", "accent": "#FFD93D", "accent2": "#FF5FA2",
              "font": "marker", "pattern": "daisies", "dark": True, "skin": "heaven"}

    def test_skin_is_kept_and_checked(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.patch("/api/site/", {"theme": self.HEAVEN}, format="json").data["theme"]["skin"], "heaven")
        res = self.client.patch("/api/site/", {"theme": {**self.HEAVEN, "skin": "glitter"}}, format="json")
        self.assertEqual(res.status_code, 400)
        plain = self.client.patch("/api/site/", {"theme": {**self.HEAVEN, "skin": "none"}}, format="json").data["theme"]
        self.assertNotIn("skin", plain)

    def test_darling_skin_and_smileys_pattern(self):
        self.client.force_authenticate(self.staff)
        darling = {**self.HEAVEN, "bg": "#FFF6E6", "surface": "#FFFCF4", "text": "#3B2A1E", "accent": "#F2A33A",
                   "accent2": "#4F86D9", "font": "serif", "pattern": "smileys", "dark": False, "skin": "darling"}
        theme = self.client.patch("/api/site/", {"theme": darling}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("darling", "smileys"))
        self.assertEqual(self.client.get("/api/site/").data["theme"]["skin"], "darling")

    def test_left_and_right_skin_and_signs_pattern(self):
        self.client.force_authenticate(self.staff)
        leftright = {**self.HEAVEN, "bg": "#D9ECF7", "surface": "#FFFFFF", "text": "#1C2433", "accent": "#E3262E",
                     "accent2": "#2F6FD0", "font": "display", "pattern": "signs", "dark": False, "skin": "leftright"}
        theme = self.client.patch("/api/site/", {"theme": leftright}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("leftright", "signs"))
        # the Heng:garæ era wears it too
        self.assertEqual(self.client.get("/api/albums/henggarae/").data["theme"]["skin"], "leftright")

    def test_world_skin_and_flowers_pattern(self):
        self.client.force_authenticate(self.staff)
        world = {**self.HEAVEN, "bg": "#F4F7FC", "surface": "#FFFFFF", "text": "#1F2A44", "accent": "#1F4FA8",
                 "accent2": "#F28CAB", "font": "display", "pattern": "flowers", "dark": False, "skin": "world"}
        theme = self.client.patch("/api/site/", {"theme": world}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("world", "flowers"))
        # the Sector 17 era (_World) wears it too
        self.assertEqual(self.client.get("/api/albums/sector-17/").data["theme"]["skin"], "world")

    def test_rock_with_you_skin_and_orbits_pattern(self):
        self.client.force_authenticate(self.staff)
        attacca = {**self.HEAVEN, "bg": "#0D0F1E", "surface": "#171A2E", "text": "#F3F0F7", "accent": "#FF2D6F",
                   "accent2": "#7AA7FF", "font": "serif", "pattern": "orbits", "dark": True, "skin": "attacca"}
        theme = self.client.patch("/api/site/", {"theme": attacca}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("attacca", "orbits"))
        # the Attacca era wears it too
        self.assertEqual(self.client.get("/api/albums/attacca/").data["theme"]["skin"], "attacca")

    def test_hot_skin_and_suns_pattern(self):
        self.client.force_authenticate(self.staff)
        hot = {**self.HEAVEN, "bg": "#120806", "surface": "#22100B", "text": "#FFE9D2", "accent": "#FF5A1F",
               "accent2": "#FFD23F", "font": "marker", "pattern": "suns", "dark": True, "skin": "hot"}
        theme = self.client.patch("/api/site/", {"theme": hot}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("hot", "suns"))
        # the Face the Sun era wears it too
        self.assertEqual(self.client.get("/api/albums/face-the-sun/").data["theme"]["skin"], "hot")

    def test_home_run_skin_and_billiards_pattern(self):
        self.client.force_authenticate(self.staff)
        homerun = {**self.HEAVEN, "bg": "#14110F", "surface": "#221D1A", "text": "#F2E6D4", "accent": "#D79A72",
                   "accent2": "#1E52A8", "font": "serif", "pattern": "billiards", "dark": True, "skin": "homerun"}
        theme = self.client.patch("/api/site/", {"theme": homerun}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("homerun", "billiards"))
        # the ; [Semicolon] era wears it too
        self.assertEqual(self.client.get("/api/albums/semicolon/").data["theme"]["skin"], "homerun")


class ContentSyncTests(StaffTestCase):
    """Covers changed by an admin reach viewers: new URLs every upload, and a version stamp pages can watch."""

    def test_replacing_a_cover_gives_a_new_url_and_a_new_version(self):
        self.client.force_authenticate(self.staff)
        v0 = self.client.get("/api/version/").data["version"]
        first = self.client.patch("/api/albums/fml/", {"cover": self.image("cover.png")}, format="multipart").data["cover"]
        v1 = self.client.get("/api/version/").data["version"]
        second = self.client.patch("/api/albums/fml/", {"cover": self.image("cover.png")}, format="multipart").data["cover"]
        third = self.client.patch("/api/albums/fml/", {"cover": self.image("cover.png")}, format="multipart").data["cover"]
        self.assertEqual(len({first, second, third}), 3)  # same file name, never the same URL
        self.assertNotEqual(v0, v1)
        self.assertNotEqual(v1, self.client.get("/api/version/").data["version"])

    def test_viewers_see_the_cover_on_albums_songs_and_their_playlist(self):
        self.client.force_authenticate(self.staff)
        cover = self.client.patch("/api/albums/fml/", {"cover": self.image()}, format="multipart").data["cover"]
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/albums/fml/").data["cover"], cover)
        song = next(s for s in self.client.get("/api/songs/?title_tracks=1").data if s["album_slug"] == "fml")
        self.assertEqual(song["album_cover"], cover)

    def test_deleting_changes_the_version(self):
        self.client.force_authenticate(self.staff)
        before = self.client.get("/api/version/").data["version"]
        self.client.delete("/api/albums/fml/")
        self.assertNotEqual(before, self.client.get("/api/version/").data["version"])


class MilitaryServiceTests(StaffTestCase):
    """Enlistment and discharge dates the member pages count down from."""

    def test_seeded_and_public(self):
        hoshi = self.client.get("/api/members/hoshi/").data
        self.assertEqual((hoshi["service"], hoshi["enlistment_date"], hoshi["discharge_date"]), ("active", "2025-09-16", "2027-03-15"))
        self.assertEqual(self.client.get("/api/members/scoups/").data["service_label"], "Exempt")

    def test_staff_edit_and_discharge_must_follow_enlistment(self):
        self.client.force_authenticate(self.staff)
        res = self.client.patch("/api/members/dk/", {"discharge_date": "2026-01-01"}, format="json")
        self.assertEqual(res.status_code, 400)
        res = self.client.patch("/api/members/dk/", {"discharge_date": "2028-03-08"}, format="json")
        self.assertEqual(res.data["discharge_date"], "2028-03-08")


class AlbumOrderTests(StaffTestCase):
    """Album management in the Studio: photo album pages keep the order an admin gives them."""

    def album(self, title):
        return self.client.post("/api/diary/", {"book": "album", "title": title}, format="json").data

    def order(self):
        return [p["title"] for p in self.client.get("/api/diary/?book=album").data]

    def test_new_pages_go_last_and_reorder_sticks(self):
        self.client.force_authenticate(self.staff)
        a, b, c = self.album("A"), self.album("B"), self.album("C")
        self.assertEqual([a["position"], b["position"], c["position"]], [1, 2, 3])
        res = self.client.post("/api/diary/reorder/", {"ids": [c["id"], a["id"], b["id"]]}, format="json")
        self.assertEqual([p["title"] for p in res.data], ["C", "A", "B"])
        self.assertEqual(self.order(), ["C", "A", "B"])
        self.album("D")
        self.assertEqual(self.order(), ["C", "A", "B", "D"])
        # position can't be set by a normal save
        self.client.patch(f"/api/diary/{a['id']}/", {"position": 99}, format="json")
        self.assertEqual(self.order(), ["C", "A", "B", "D"])

    def test_reorder_needs_every_album_page_once(self):
        self.client.force_authenticate(self.staff)
        a, b = self.album("A"), self.album("B")
        diary = self.client.post("/api/diary/", {"date": "2026-10-22"}, format="json").data
        for ids in ([a["id"]], [a["id"], a["id"]], [a["id"], b["id"], diary["id"]], "nope"):
            res = self.client.post("/api/diary/reorder/", {"ids": ids}, format="json")
            self.assertEqual(res.status_code, 400, ids)
        self.assertEqual(self.order(), ["A", "B"])

    def test_only_staff_reorder(self):
        self.client.force_authenticate(self.staff)
        a, b = self.album("A"), self.album("B")
        self.client.force_authenticate(self.fan)
        res = self.client.post("/api/diary/reorder/", {"ids": [b["id"], a["id"]]}, format="json")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(self.order(), ["A", "B"])


class LandingAccessTests(StaffTestCase):
    """The landing page reads members, albums and songs signed out; the rest needs an account."""

    def test_landing_data_is_public(self):
        for path in ("/api/members/", "/api/albums/", "/api/songs/?title_tracks=1", "/api/site/", "/api/version/"):
            self.assertEqual(self.client.get(path).status_code, 200, path)

    def test_games_diary_and_memories_need_an_account(self):
        for path in ("/api/scores/?game=memory", "/api/diary/", "/api/diary/?book=album", "/api/me/likes/"):
            self.assertEqual(self.client.get(path).status_code, 403, path)
        self.client.force_authenticate(self.fan)
        for path in ("/api/scores/?game=memory", "/api/diary/", "/api/diary/?book=album", "/api/me/likes/"):
            self.assertEqual(self.client.get(path).status_code, 200, path)
        res = self.client.post("/api/scores/", {"game": "memory", "player": "fan", "score": 12}, format="json")
        self.assertEqual(res.status_code, 201)
