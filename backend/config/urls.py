from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

from fandom import spa

admin.site.site_header = "SEVENTEEN fan site admin"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("fandom.urls")),
]

# Uploads: from the bucket when there is one, otherwise from MEDIA_ROOT here.
if settings.SERVE_MEDIA:
    urlpatterns += [re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT})]

# Every other address is a page of the React site (/members, /diary...), which routes itself.
urlpatterns += [re_path(r"^(?!api/|admin/|media/|static/)(?P<path>.*)$", spa.index)]
