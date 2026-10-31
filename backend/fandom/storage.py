"""Uploads on Cloudinary, for hosts whose own disk is wiped on every restart (see DEPLOY.md).

Files keep the names Django gives them ("members/w2.jpg"), so the database stays the same whether the
uploads live on disk, in an S3 bucket or here. Cloudinary keeps images and videos apart, so each file
goes to the right kind by its extension.
"""

import os
from urllib.request import urlopen

import cloudinary
import cloudinary.api
import cloudinary.uploader
import cloudinary.utils
from django.core.files.base import ContentFile
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible

VIDEO = {".mp4", ".webm", ".mov", ".m4v"}
IMAGE = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".bmp", ".svg", ".heic"}


@deconstructible
class CloudinaryStorage(Storage):
    """Reads CLOUDINARY_URL (cloudinary://<key>:<secret>@<cloud name>); everything goes in one folder."""

    def __init__(self, folder=None):
        self.folder = (folder if folder is not None else os.environ.get("CLOUDINARY_FOLDER", "svt")).strip("/")
        cloudinary.config(secure=True)

    # name "members/w2.jpg" -> ("svt/members/w2", "image", "jpg")
    def _where(self, name):
        stem, ext = os.path.splitext(name.replace("\\", "/"))
        ext = ext.lower()
        kind = "video" if ext in VIDEO else "image" if ext in IMAGE else "raw"
        path = f"{self.folder}/{stem}" if self.folder else stem
        # raw files keep their extension in the id; images and videos get it back as the delivery format
        return (path + ext if kind == "raw" else path), kind, ext.lstrip(".")

    def _save(self, name, content):
        public_id, kind, _ = self._where(name)
        content.seek(0)
        upload = cloudinary.uploader.upload_large if kind == "video" else cloudinary.uploader.upload
        upload(content, public_id=public_id, resource_type=kind, overwrite=False, unique_filename=False, use_filename=False)
        return name

    def _open(self, name, mode="rb"):
        with urlopen(self.url(name)) as res:  # noqa: S310 (our own Cloudinary address)
            return ContentFile(res.read(), name=name)

    def exists(self, name):
        public_id, kind, _ = self._where(name)
        try:
            cloudinary.api.resource(public_id, resource_type=kind)
            return True
        except cloudinary.exceptions.NotFound:
            return False

    def delete(self, name):
        if not name:
            return
        public_id, kind, _ = self._where(name)
        cloudinary.uploader.destroy(public_id, resource_type=kind, invalidate=True)

    def size(self, name):
        public_id, kind, _ = self._where(name)
        return cloudinary.api.resource(public_id, resource_type=kind)["bytes"]

    def url(self, name):
        public_id, kind, ext = self._where(name)
        url, _ = cloudinary.utils.cloudinary_url(public_id, resource_type=kind, format=None if kind == "raw" else ext, secure=True)
        return url
