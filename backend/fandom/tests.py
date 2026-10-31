from django.core.management import call_command
from rest_framework.test import APITestCase

from fandom.models import DiaryPage, Song


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

    def test_maestro_skin_and_staves_pattern(self):
        self.client.force_authenticate(self.staff)
        maestro = {**self.HEAVEN, "bg": "#0B0D12", "surface": "#13161D", "text": "#EEF2F7", "accent": "#E3263A",
                   "accent2": "#8FB8D8", "font": "serif", "pattern": "staves", "dark": True, "skin": "maestro"}
        theme = self.client.patch("/api/site/", {"theme": maestro}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("maestro", "staves"))
        # the 17 Is Right Here era (Maestro) wears it too
        self.assertEqual(self.client.get("/api/albums/17-is-right-here/").data["theme"]["skin"], "maestro")

    def test_aju_nice_skin_and_hoops_pattern(self):
        self.client.force_authenticate(self.staff)
        ajunice = {**self.HEAVEN, "bg": "#EAF6FB", "surface": "#FFFDF7", "text": "#1F3442", "accent": "#1FA9C0",
                   "accent2": "#FF7A3D", "font": "display", "pattern": "hoops", "dark": False, "skin": "ajunice"}
        theme = self.client.patch("/api/site/", {"theme": ajunice}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("ajunice", "hoops"))
        # the Love & Letter Repackage era (Very Nice) wears it too
        self.assertEqual(self.client.get("/api/albums/love-and-letter-repackage/").data["theme"]["skin"], "ajunice")

    def test_scoups_aesthetics_skin_and_film_pattern(self):
        self.client.force_authenticate(self.staff)
        scoups = {**self.HEAVEN, "bg": "#141210", "surface": "#1E1B18", "text": "#F2E8D8", "accent": "#E8A04A",
                  "accent2": "#8FA7B8", "font": "serif", "pattern": "film", "dark": True, "skin": "scoups"}
        theme = self.client.patch("/api/site/", {"theme": scoups}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("scoups", "film"))
        self.assertEqual(self.client.get("/api/site/").data["theme"]["skin"], "scoups")

    def test_jeonghan_aesthetics_skin_and_butterflies_pattern(self):
        self.client.force_authenticate(self.staff)
        jeonghan = {**self.HEAVEN, "bg": "#15171B", "surface": "#1F232A", "text": "#ECE8E0", "accent": "#C9B79A",
                    "accent2": "#8FA0B4", "font": "serif", "pattern": "butterflies", "dark": True, "skin": "jeonghan"}
        theme = self.client.patch("/api/site/", {"theme": jeonghan}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("jeonghan", "butterflies"))
        self.assertEqual(self.client.get("/api/site/").data["theme"]["skin"], "jeonghan")

    def test_joshua_aesthetics_skin_and_picks_pattern(self):
        self.client.force_authenticate(self.staff)
        joshua = {**self.HEAVEN, "bg": "#F6F3EE", "surface": "#FFFFFF", "text": "#1E1D1B", "accent": "#6E8B74",
                  "accent2": "#D9B48F", "font": "sans", "pattern": "picks", "dark": False, "skin": "joshua"}
        theme = self.client.patch("/api/site/", {"theme": joshua}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("joshua", "picks"))
        self.assertEqual(self.client.get("/api/site/").data["theme"]["skin"], "joshua")

    def test_dk_aesthetics_skin_and_roses_pattern(self):
        self.client.force_authenticate(self.staff)
        dk = {**self.HEAVEN, "bg": "#F3F2EF", "surface": "#FFFFFF", "text": "#141416", "accent": "#3F6A99",
              "accent2": "#9C7A5B", "font": "sans", "pattern": "roses", "dark": False, "skin": "dk"}
        theme = self.client.patch("/api/site/", {"theme": dk}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("dk", "roses"))
        self.assertEqual(self.client.get("/api/site/").data["theme"]["skin"], "dk")

    def test_woozi_aesthetics_skin_and_confetti_pattern(self):
        self.client.force_authenticate(self.staff)
        woozi = {**self.HEAVEN, "bg": "#14141B", "surface": "#1C1C26", "text": "#F3EFF4", "accent": "#F29BB8",
                 "accent2": "#8FB0D9", "font": "sans", "pattern": "confetti", "dark": True, "skin": "woozi"}
        theme = self.client.patch("/api/site/", {"theme": woozi}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("woozi", "confetti"))
        self.assertEqual(self.client.get("/api/site/").data["theme"]["skin"], "woozi")

    def test_jun_aesthetics_skin_and_umbrellas_pattern(self):
        self.client.force_authenticate(self.staff)
        jun = {**self.HEAVEN, "bg": "#EEEDE9", "surface": "#FBFAF7", "text": "#1B1C1F", "accent": "#4F6B7D",
               "accent2": "#C9A43F", "font": "serif", "pattern": "umbrellas", "dark": False, "skin": "jun"}
        theme = self.client.patch("/api/site/", {"theme": jun}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("jun", "umbrellas"))
        self.assertEqual(self.client.get("/api/site/").data["theme"]["skin"], "jun")

    def test_wonwoo_aesthetics_skin_and_books_pattern(self):
        self.client.force_authenticate(self.staff)
        wonwoo = {**self.HEAVEN, "bg": "#121314", "surface": "#1C1D1F", "text": "#E9E6DF", "accent": "#9DB09A",
                  "accent2": "#B99AA6", "font": "serif", "pattern": "books", "dark": True, "skin": "wonwoo"}
        theme = self.client.patch("/api/site/", {"theme": wonwoo}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("wonwoo", "books"))
        self.assertEqual(self.client.get("/api/site/").data["theme"]["skin"], "wonwoo")

    def test_the8_aesthetics_skin_and_ink_pattern(self):
        self.client.force_authenticate(self.staff)
        the8 = {**self.HEAVEN, "bg": "#F2F1EE", "surface": "#FFFFFF", "text": "#1A1A1A", "accent": "#5F6340",
                "accent2": "#7FA7C9", "font": "sans", "pattern": "ink", "dark": False, "skin": "the8"}
        theme = self.client.patch("/api/site/", {"theme": the8}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("the8", "ink"))
        self.assertEqual(self.client.get("/api/site/").data["theme"]["skin"], "the8")

    def test_dino_aesthetics_skin_and_footprints_pattern(self):
        self.client.force_authenticate(self.staff)
        dino = {**self.HEAVEN, "bg": "#111111", "surface": "#1B1B1A", "text": "#F2EDE4", "accent": "#E8642C",
                "accent2": "#2F5A3F", "font": "sans", "pattern": "footprints", "dark": True, "skin": "dino"}
        theme = self.client.patch("/api/site/", {"theme": dino}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("dino", "footprints"))
        self.assertEqual(self.client.get("/api/site/").data["theme"]["skin"], "dino")

    def test_seungkwan_aesthetics_skin_and_tangerines_pattern(self):
        self.client.force_authenticate(self.staff)
        seungkwan = {**self.HEAVEN, "bg": "#0F1626", "surface": "#172036", "text": "#F4EFE6", "accent": "#7FD3BE",
                     "accent2": "#FF9B3D", "font": "sans", "pattern": "tangerines", "dark": True, "skin": "seungkwan"}
        theme = self.client.patch("/api/site/", {"theme": seungkwan}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("seungkwan", "tangerines"))
        self.assertEqual(self.client.get("/api/site/").data["theme"]["skin"], "seungkwan")

    def test_vernon_aesthetics_skin_and_lemons_pattern(self):
        self.client.force_authenticate(self.staff)
        vernon = {**self.HEAVEN, "bg": "#F4F7FA", "surface": "#FFFFFF", "text": "#1A2433", "accent": "#4A7FB8",
                  "accent2": "#E8B92E", "font": "sans", "pattern": "lemons", "dark": False, "skin": "vernon"}
        theme = self.client.patch("/api/site/", {"theme": vernon}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("vernon", "lemons"))
        self.assertEqual(self.client.get("/api/site/").data["theme"]["skin"], "vernon")

    def test_mingyu_aesthetics_skin_and_leaves_pattern(self):
        self.client.force_authenticate(self.staff)
        mingyu = {**self.HEAVEN, "bg": "#F1EEE6", "surface": "#FBFAF5", "text": "#1B211A", "accent": "#3F7A3A",
                  "accent2": "#1F4E8C", "font": "serif", "pattern": "leaves", "dark": False, "skin": "mingyu"}
        theme = self.client.patch("/api/site/", {"theme": mingyu}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("mingyu", "leaves"))
        self.assertEqual(self.client.get("/api/site/").data["theme"]["skin"], "mingyu")

    def test_hoshi_aesthetics_skin_and_tiger_pattern(self):
        self.client.force_authenticate(self.staff)
        hoshi = {**self.HEAVEN, "bg": "#0F1712", "surface": "#18221A", "text": "#F4F1E6", "accent": "#F29A38",
                 "accent2": "#9CC27A", "font": "display", "pattern": "tiger", "dark": True, "skin": "hoshi"}
        theme = self.client.patch("/api/site/", {"theme": hoshi}, format="json").data["theme"]
        self.assertEqual((theme["skin"], theme["pattern"]), ("hoshi", "tiger"))
        self.assertEqual(self.client.get("/api/site/").data["theme"]["skin"], "hoshi")


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


class DiaryWritersTests(StaffTestCase):
    """Viewers write the diary: they add pages and change their own; admins change any page.
    Photo albums stay admin-made."""

    def setUp(self):
        super().setUp()
        from django.contrib.auth.models import User

        self.other = User.objects.create_user("other-fan", password="diamond-17")

    def page(self, **extra):
        return self.client.post("/api/diary/", {"date": "2026-10-28", "title": "Fan meeting", **extra}, format="json")

    def test_viewers_add_and_edit_their_own_pages(self):
        self.client.force_authenticate(self.fan)
        res = self.page()
        self.assertEqual(res.status_code, 201)
        page = res.data
        self.assertEqual((page["author_name"], page["can_edit"]), ("fan", True))
        url = f"/api/diary/{page['id']}/"
        self.assertEqual(self.client.patch(url, {"title": "Fan meeting ♡"}, format="json").status_code, 200)
        photo = self.client.post(f"{url}photos/", {"image": self.image()}, format="multipart")
        self.assertEqual(photo.status_code, 201)

        # another viewer reads it but can't change it
        self.client.force_authenticate(self.other)
        self.assertFalse(self.client.get(url).data["can_edit"])
        self.assertEqual(self.client.patch(url, {"title": "x"}, format="json").status_code, 403)
        self.assertEqual(self.client.post(f"{url}photos/", {"image": self.image()}, format="multipart").status_code, 403)
        self.assertEqual(self.client.delete(url).status_code, 403)

        # admins can change any page
        self.client.force_authenticate(self.staff)
        self.assertTrue(self.client.get(url).data["can_edit"])
        self.assertEqual(self.client.patch(url, {"title": "Checked"}, format="json").status_code, 200)

        self.client.force_authenticate(self.fan)
        self.assertEqual(self.client.delete(url).status_code, 204)

    def test_private_pages_are_for_their_writer_and_admins(self):
        self.client.force_authenticate(self.fan)
        secret = self.page(is_private=True).data
        self.page()
        self.assertEqual(len(self.client.get("/api/diary/").data), 2)
        self.client.force_authenticate(self.other)
        self.assertEqual([p["id"] for p in self.client.get("/api/diary/").data if p["id"] == secret["id"]], [])
        self.assertEqual(self.client.get(f"/api/diary/{secret['id']}/").status_code, 404)
        self.client.force_authenticate(self.staff)
        self.assertEqual(len(self.client.get("/api/diary/").data), 2)

    def test_photo_albums_stay_admin_made(self):
        self.client.force_authenticate(self.staff)
        album = self.client.post("/api/diary/", {"book": "album", "title": "Tour"}, format="json").data
        self.client.force_authenticate(self.fan)
        self.assertEqual(self.client.post("/api/diary/", {"book": "album", "title": "Mine"}, format="json").status_code, 403)
        self.assertEqual(self.client.patch(f"/api/diary/{album['id']}/", {"title": "x"}, format="json").status_code, 403)
        self.assertEqual(self.client.post(f"/api/diary/{album['id']}/photos/", {"image": self.image()}, format="multipart").status_code, 403)
        self.assertEqual(self.client.post("/api/diary/reorder/", {"ids": [album["id"]]}, format="json").status_code, 403)
        self.assertFalse(self.client.get(f"/api/diary/{album['id']}/").data["can_edit"])


class DiaryKitTests(StaffTestCase):
    """The newer fonts, word stickers and doodles save like the first ones."""

    def test_new_fonts_and_stickers_save(self):
        self.client.force_authenticate(self.fan)
        page = self.client.post("/api/diary/", {"date": "2026-10-28"}, format="json").data
        items = [
            {"id": "t1", "kind": "text", "text": "오늘 진짜 행복했다", "font": "pen", "style": "note", "size": 4, "color": "#2B2B2B", "x": 50, "y": 50, "w": 26, "r": 0, "z": 1},
            {"id": "t2", "kind": "text", "text": "LEVEL 17", "font": "pixel", "style": "label", "size": 2.6, "color": "#2B2B2B", "x": 30, "y": 30, "w": 24, "r": 0, "z": 2},
            {"id": "s1", "kind": "sticker", "sticker": "shape:lightstick", "x": 20, "y": 20, "w": 9, "r": 0, "z": 3},
            {"id": "s2", "kind": "sticker", "sticker": "label:encore", "x": 70, "y": 70, "w": 22, "r": 0, "z": 4},
            {"id": "s3", "kind": "sticker", "sticker": "🪩", "x": 80, "y": 20, "w": 9, "r": 0, "z": 5},
        ]
        res = self.client.patch(f"/api/diary/{page['id']}/", {"items": items}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        saved = {i["id"]: i for i in res.data["items"]}
        self.assertEqual((saved["t1"]["font"], saved["t2"]["font"]), ("pen", "pixel"))
        self.assertEqual(saved["s1"]["sticker"], "shape:lightstick")


class FanFeatureTests(StaffTestCase):
    """The calendar's events, lyrics, birthday themes, the photocard binder and letters."""

    def test_events_read_by_anyone_written_by_staff(self):
        event = {"title": "Comeback", "date": "2026-11-20", "kind": "comeback"}
        self.client.force_authenticate(self.fan)
        self.assertEqual(self.client.post("/api/events/", event, format="json").status_code, 403)
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.post("/api/events/", event, format="json").status_code, 201)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/events/").data[0]["kind_label"], "Comeback")

    def test_lyrics_on_one_song_only(self):
        song = Song.objects.first()
        self.client.force_authenticate(self.staff)
        res = self.client.patch(f"/api/songs/{song.id}/", {"lyrics": "# Chorus\r\nAju nice [AJU NICE!]"}, format="json")
        self.assertEqual(res.data["lyrics"], "# Chorus\nAju nice [AJU NICE!]")
        self.assertNotIn("lyrics", self.client.get("/api/songs/").data[0])

    def test_birthday_themes_switch(self):
        self.assertTrue(self.client.get("/api/site/").data["birthday_themes"])
        self.client.force_authenticate(self.staff)
        self.assertFalse(self.client.patch("/api/site/", {"birthday_themes": False}, format="json").data["birthday_themes"])

    def make_card(self, **extra):
        self.client.force_authenticate(self.staff)
        res = self.client.post("/api/cards/", {"title": "Hoshi · FML", "member": "hoshi", "image": self.image(), **extra}, format="multipart")
        self.assertEqual(res.status_code, 201, res.data)
        return res.data

    def test_cards_need_staff_to_upload(self):
        self.client.force_authenticate(self.fan)
        res = self.client.post("/api/cards/", {"title": "x", "image": self.image()}, format="multipart")
        self.assertEqual(res.status_code, 403)
        card = self.make_card()
        self.assertTrue(card["image"].startswith("/media/cards/hoshi-"))
        self.assertEqual(card["member_name"], "Hoshi")

    def test_one_pack_a_day(self):
        card = self.make_card()
        self.client.force_authenticate(self.fan)
        self.assertTrue(self.client.get("/api/me/binder/").data["pack_ready"])
        res = self.client.post("/api/me/binder/")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(len(res.data["pulled"]), 3)
        self.assertEqual(res.data["counts"], {str(card["id"]): 3})
        self.assertFalse(res.data["pack_ready"])
        self.assertEqual(self.client.post("/api/me/binder/").status_code, 400)

    def test_letters_wait_for_review(self):
        self.client.force_authenticate(self.fan)
        res = self.client.post("/api/letters/", {"member": "woozi", "body": "Thank you for every song.", "paper": "mint"}, format="json")
        self.assertEqual((res.status_code, res.data["status"]), (201, "pending"))
        letter = res.data["id"]
        # someone else can't see it yet
        from django.contrib.auth.models import User

        other = User.objects.create_user("other", password="diamond-17")
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get("/api/letters/").data, [])
        self.assertEqual(self.client.post(f"/api/letters/{letter}/review/", {"status": "approved"}).status_code, 403)
        self.assertEqual(self.client.delete(f"/api/letters/{letter}/").status_code, 404)
        self.client.force_authenticate(self.staff)
        self.client.post(f"/api/letters/{letter}/review/", {"status": "approved"})
        self.client.force_authenticate(other)
        self.assertEqual([x["member_name"] for x in self.client.get("/api/letters/?member=woozi").data], ["Woozi"])
        self.assertEqual(self.client.get("/api/letters/?member=all").data, [])

    def test_letter_paper_checked(self):
        self.client.force_authenticate(self.fan)
        res = self.client.post("/api/letters/", {"body": "Hello SEVENTEEN!", "paper": "glitter"}, format="json")
        self.assertEqual(res.status_code, 400)


class LaunchTests(StaffTestCase):
    """What a public site needs: email resets, deleting your account, and reporting posts."""

    def setUp(self):
        super().setUp()
        from django.core.cache import cache

        cache.clear()  # throttles count in the cache

    def test_password_reset_by_email(self):
        import re

        from django.core import mail

        self.client.force_authenticate(self.fan)
        res = self.client.patch("/api/me/profile/", {"email": "Fan@Example.com"}, format="json")
        self.assertEqual(res.data["user"]["email"], "fan@example.com")
        self.client.force_authenticate(self.staff)
        self.assertIn("email", self.client.patch("/api/me/profile/", {"email": "fan@example.com"}, format="json").data)  # taken
        self.client.force_authenticate(None)

        same = self.client.post("/api/auth/password-reset/", {"email": "nobody@example.com"}, format="json").data
        self.assertEqual(len(mail.outbox), 0)
        res = self.client.post("/api/auth/password-reset/", {"email": "fan@example.com"}, format="json")
        self.assertEqual(res.data, same)  # no hint about who has an account
        self.assertEqual(len(mail.outbox), 1)
        uid, token = re.search(r"uid=([^&\s]+)&token=(\S+)", mail.outbox[0].body).groups()

        weak = self.client.post("/api/auth/password-reset/confirm/", {"uid": uid, "token": token, "new_password": "12345678"}, format="json")
        self.assertIn("new_password", weak.data)
        ok = self.client.post("/api/auth/password-reset/confirm/", {"uid": uid, "token": token, "new_password": "brand-new-diamond-17"}, format="json")
        self.assertEqual(ok.status_code, 200)
        again = self.client.post("/api/auth/password-reset/confirm/", {"uid": uid, "token": token, "new_password": "another-one-17-x"}, format="json")
        self.assertEqual(again.status_code, 400)  # links work once
        self.assertEqual(self.client.post("/api/auth/login/", {"username": "fan", "password": "brand-new-diamond-17"}, format="json").status_code, 200)

    def test_register_with_email(self):
        res = self.client.post("/api/auth/register/", {"username": "mailcarat", "password": "seventeen-right-here", "email": "m@example.com"}, format="json")
        self.assertEqual(res.data["user"]["email"], "m@example.com")

    def test_delete_account_takes_its_posts(self):
        from django.contrib.auth.models import User

        self.client.force_authenticate(self.fan)
        page = self.client.post("/api/diary/", {"date": "2025-05-26", "title": "mine"}, format="json").data["id"]
        self.assertIn("password", self.client.delete("/api/me/account/", {"password": "nope"}, format="json").data)
        self.assertEqual(self.client.delete("/api/me/account/", {"password": "diamond-17"}, format="json").status_code, 204)
        self.assertFalse(User.objects.filter(username="fan").exists())
        self.assertFalse(DiaryPage.objects.filter(pk=page).exists())

    def test_the_only_admin_cant_delete_themselves(self):
        self.client.force_authenticate(self.staff)
        res = self.client.delete("/api/me/account/", {"password": "diamond-17"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_reporting_and_resolving(self):
        from django.contrib.auth.models import User

        other = User.objects.create_user("other", password="diamond-17")
        self.client.force_authenticate(other)
        page = self.client.post("/api/diary/", {"date": "2025-05-26", "title": "rude"}, format="json").data["id"]
        secret = self.client.post("/api/diary/", {"date": "2025-05-27", "is_private": True}, format="json").data["id"]
        own = self.client.post("/api/reports/", {"kind": "diary", "target_id": page, "reason": "spam"}, format="json")
        self.assertEqual(own.status_code, 400)  # not your own

        self.client.force_authenticate(self.fan)
        self.assertEqual(self.client.post("/api/reports/", {"kind": "diary", "target_id": secret, "reason": "spam"}, format="json").status_code, 400)
        res = self.client.post("/api/reports/", {"kind": "diary", "target_id": page, "reason": "unkind", "note": "mean words"}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(self.client.post("/api/reports/", {"kind": "diary", "target_id": page, "reason": "spam"}, format="json").status_code, 400)
        self.assertEqual(self.client.get("/api/reports/").status_code, 403)

        self.client.force_authenticate(self.staff)
        open_reports = self.client.get("/api/reports/?status=open").data
        self.assertEqual([(r["target"]["title"], r["reporter_name"]) for r in open_reports], [("rude", "fan")])
        done = self.client.post(f"/api/reports/{open_reports[0]['id']}/resolve/", {"action": "hide"}, format="json").data
        self.assertEqual((done["status"], done["outcome"]), ("resolved", "hidden"))
        self.assertTrue(DiaryPage.objects.get(pk=page).is_private)
        self.assertEqual(self.client.get("/api/reports/?status=open").data, [])

    def test_spa_pages_fall_back_to_the_react_site(self):
        import tempfile
        from pathlib import Path

        from django.test import override_settings

        dist = Path(tempfile.mkdtemp())
        self.addCleanup(__import__("shutil").rmtree, dist, True)
        (dist / "index.html").write_text("<div id=root></div>")
        with override_settings(FRONTEND_DIST=dist):
            res = self.client.get("/members/hoshi")
            self.assertEqual(res.status_code, 200)
            self.assertIn(b"root", b"".join(res.streaming_content))
            self.assertEqual(self.client.get("/api/nope/").status_code, 404)  # the API keeps its 404s
