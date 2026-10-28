import os
import secrets

from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from fandom.models import Profile


class Command(BaseCommand):
    help = (
        "Create (or update) an admin account for the Studio. "
        "Username/password come from --username/--password, else SVT_ADMIN_USERNAME/SVT_ADMIN_PASSWORD, "
        "else 'admin' and a freshly generated password that is printed once."
    )

    def add_arguments(self, parser):
        parser.add_argument("--username", default=os.environ.get("SVT_ADMIN_USERNAME", "admin"))
        parser.add_argument("--password", default=os.environ.get("SVT_ADMIN_PASSWORD"))
        parser.add_argument("--display-name", default="", help="Shown on the site (defaults to the username)")

    def handle(self, *args, username, password, display_name, **options):
        User = get_user_model()
        user = User.objects.filter(username__iexact=username).first()
        created = user is None
        if created:
            user = User(username=username)

        generated = False
        if password is None and created:
            password, generated = secrets.token_urlsafe(12), True

        if password is not None:
            try:
                password_validation.validate_password(password, user)
            except ValidationError as e:
                raise CommandError("Password not accepted: " + " ".join(e.messages))
            user.set_password(password)

        user.is_staff = user.is_superuser = user.is_active = True
        user.save()
        profile = Profile.for_user(user)
        if display_name:
            profile.display_name = display_name
            profile.save(update_fields=["display_name"])

        self.stdout.write(self.style.SUCCESS(f"{'Created' if created else 'Updated'} admin “{user.username}”."))
        if generated:
            self.stdout.write(f"  Password: {password}")
            self.stdout.write("  (Shown only this once. Change it on your dashboard at /me.)")
        elif password is None:
            self.stdout.write("  Kept the existing password (pass --password to change it).")
        self.stdout.write("  Sign in at http://localhost:5173/login")
