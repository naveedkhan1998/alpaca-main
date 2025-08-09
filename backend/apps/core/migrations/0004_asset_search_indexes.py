from django.db import migrations

SQL_ENABLE_TRGM = """
CREATE EXTENSION IF NOT EXISTS pg_trgm;
"""

SQL_DISABLE_TRGM = """
DROP EXTENSION IF EXISTS pg_trgm;
"""


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0003_candle_minute_candle_ids"),
    ]

    operations = [
        migrations.RunSQL(SQL_ENABLE_TRGM, reverse_sql=SQL_DISABLE_TRGM),
    ]
