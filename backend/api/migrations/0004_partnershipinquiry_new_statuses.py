from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_partnershipinquiry_partner_role'),
    ]

    operations = [
        # Remove old statuses columns that no longer exist in choices
        # and update the status field with new choices + default
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
        # Remove archive_reason field (replaced by inactive status)
        migrations.RemoveField(
            model_name='partnershipinquiry',
            name='archive_reason',
        ),
    ]
