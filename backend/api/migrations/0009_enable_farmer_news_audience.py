from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0008_contactsupportmessage"),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                """
                ALTER TABLE news_article_audiences
                DROP CHECK chk_news_article_audiences_role
                """,
                """
                ALTER TABLE news_article_audiences
                ADD CONSTRAINT chk_news_article_audiences_role
                CHECK (
                    user_role IN (
                        'farmer',
                        'miller_manager',
                        'warehouse_manager',
                        'retailer'
                    )
                )
                """,
                """
                UPDATE news_fetch_queries
                SET audience_roles = JSON_ARRAY(
                    'farmer',
                    'miller_manager',
                    'warehouse_manager',
                    'retailer'
                )
                WHERE api_provider = 'newsdata'
                  AND is_active = 1
                """,
                """
                INSERT IGNORE INTO news_article_audiences (
                    news_id,
                    user_role,
                    created_at
                )
                SELECT
                    news_id,
                    'farmer',
                    CURRENT_TIMESTAMP(6)
                FROM news_articles
                WHERE status = 'active'
                """,
            ],
            reverse_sql=[
                """
                DELETE FROM news_article_audiences
                WHERE user_role = 'farmer'
                """,
                """
                ALTER TABLE news_article_audiences
                DROP CHECK chk_news_article_audiences_role
                """,
                """
                ALTER TABLE news_article_audiences
                ADD CONSTRAINT chk_news_article_audiences_role
                CHECK (
                    user_role IN (
                        'miller_manager',
                        'warehouse_manager',
                        'retailer'
                    )
                )
                """,
            ],
        ),
    ]
