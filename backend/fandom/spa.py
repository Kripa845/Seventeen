"""The built React site, served by Django in production so the whole site is one app."""

from django.conf import settings
from django.http import FileResponse, Http404
from django.views.decorators.cache import never_cache


@never_cache  # the page names this deploy's hashed JS files, so it must never be cached
def index(request, path=""):
    page = settings.FRONTEND_DIST / "index.html"
    if not page.is_file():
        raise Http404("The site isn't built: run `npm run build` in frontend/.")
    return FileResponse(page.open("rb"), content_type="text/html")
