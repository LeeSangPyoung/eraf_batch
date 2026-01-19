# Generated manually for adding PeriodicTask indexes

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("celerytasks", "0001_initial"),
        (
            "django_celery_beat",
            "0001_initial",
        ),  # Assuming you have django-celery-beat installed
    ]

    operations = [
        migrations.RunSQL(
            """
            CREATE INDEX IF NOT EXISTS periodictask_name_enabled_idx
            ON django_celery_beat_periodictask (enabled);
            """,
            reverse_sql="DROP INDEX IF EXISTS periodictask_name_enabled_idx;",
        ),
        migrations.RunSQL(
            """
            CREATE INDEX IF NOT EXISTS periodictask_description_idx
            ON django_celery_beat_periodictask (description);
            """,
            reverse_sql="DROP INDEX IF EXISTS periodictask_description_idx;",
        ),
    ]
