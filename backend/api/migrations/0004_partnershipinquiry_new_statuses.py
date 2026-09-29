from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_partnershipinquiry_partner_role'),
    ]

    operations = [
        migrations.AlterField(
            model_name='partnershipinquiry',
            name='status',
            field=models.CharField(
                choices=[
                    ('to_review', 'To Review'),
                    ('active', 'Active'),
                    ('inactive', 'Inactive'),
                ],
                default='to_review',
                max_length=50,
            ),
        ),
    ]