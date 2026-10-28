from django.db import migrations, models

# Announced enlistments (PLEDIS, via news reports). Discharge dates are expected:
# 18 months for Army active duty, 21 for social service agents.
SERVICE = {
    'scoups': ('exempt', 'Exempt after an ACL injury', None, None),
    'jeonghan': ('alternative', '', '2024-09-26', '2026-06-25'),
    'joshua': ('not_required', 'US citizen', None, None),
    'jun': ('not_required', 'Chinese citizen', None, None),
    'hoshi': ('active', 'Army', '2025-09-16', '2027-03-15'),
    'wonwoo': ('alternative', '', '2025-04-03', '2027-01-02'),
    'woozi': ('active', 'Army', '2025-09-15', '2027-03-14'),
    'dk': ('active', 'Army', '2026-09-08', '2028-03-07'),
    'mingyu': ('alternative', '', '2026-09-10', '2028-06-09'),
    'the8': ('not_required', 'Chinese citizen', None, None),
    'seungkwan': ('active', 'Army military band', '2026-10-26', '2028-04-25'),
    'vernon': ('alternative', '', '2026-08-20', '2028-05-19'),
    'dino': ('active', 'Army military band', '2026-10-26', '2028-04-25'),
}


def fill(apps, schema_editor):
    Member = apps.get_model("fandom", "Member")
    for slug, (service, note, start, end) in SERVICE.items():
        Member.objects.filter(slug=slug, service="").update(
            service=service, service_note=note, enlistment_date=start, discharge_date=end
        )


class Migration(migrations.Migration):

    dependencies = [
        ("fandom", "0008_content_sync"),
    ]

    operations = [
        migrations.AddField(
            model_name="member",
            name="service",
            field=models.CharField(
                blank=True, max_length=20,
                choices=[("", "Not announced"), ("active", "Active duty"), ("alternative", "Social service agent"),
                         ("exempt", "Exempt"), ("not_required", "Not required")],
            ),
        ),
        migrations.AddField(
            model_name="member",
            name="service_note",
            field=models.CharField(blank=True, help_text="e.g. Army military band", max_length=120),
        ),
        migrations.AddField(
            model_name="member",
            name="enlistment_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="member",
            name="discharge_date",
            field=models.DateField(blank=True, help_text="Official or expected", null=True),
        ),
        migrations.RunPython(fill, migrations.RunPython.noop),
    ]
