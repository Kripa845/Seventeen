from django.db import migrations, models


def number_albums(apps, schema_editor):
    """Photo album pages keep the order they were made in until it's changed in the Studio."""
    DiaryPage = apps.get_model("fandom", "DiaryPage")
    pages = list(DiaryPage.objects.filter(book="album").order_by("id"))
    for i, page in enumerate(pages, start=1):
        page.position = i
    DiaryPage.objects.bulk_update(pages, ["position"])


class Migration(migrations.Migration):

    dependencies = [
        ('fandom', '0011_undated_albums'),
    ]

    operations = [
        migrations.AddField(
            model_name='diarypage',
            name='position',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterModelOptions(
            name='diarypage',
            options={'ordering': ['date', 'position', 'id']},
        ),
        migrations.RunPython(number_albums, migrations.RunPython.noop),
    ]
