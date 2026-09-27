from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_partnershipinquiry_new_statuses'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE users ALTER COLUMN gender DROP NOT NULL;
                ALTER TABLE users ALTER COLUMN province DROP NOT NULL;
                ALTER TABLE users ALTER COLUMN municipality DROP NOT NULL;
                ALTER TABLE users ALTER COLUMN postal_code DROP NOT NULL;
                ALTER TABLE users ALTER COLUMN barangay DROP NOT NULL;
                ALTER TABLE users ALTER COLUMN street_address DROP NOT NULL;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

                ALTER TABLE supplier_profiles ALTER COLUMN province DROP NOT NULL;
                ALTER TABLE supplier_profiles ALTER COLUMN municipality DROP NOT NULL;
                ALTER TABLE supplier_profiles ALTER COLUMN postal_code DROP NOT NULL;
                ALTER TABLE supplier_profiles ALTER COLUMN barangay DROP NOT NULL;
                ALTER TABLE supplier_profiles ALTER COLUMN street_address DROP NOT NULL;

                ALTER TABLE supplier_documents ALTER COLUMN government_issued_id DROP NOT NULL;
                ALTER TABLE supplier_documents ALTER COLUMN business_permit DROP NOT NULL;
                ALTER TABLE supplier_documents ALTER COLUMN business_registration DROP NOT NULL;
                ALTER TABLE supplier_documents ALTER COLUMN milling_license DROP NOT NULL;

                ALTER TABLE warehouse_profiles ALTER COLUMN province DROP NOT NULL;
                ALTER TABLE warehouse_profiles ALTER COLUMN municipality DROP NOT NULL;
                ALTER TABLE warehouse_profiles ALTER COLUMN postal_code DROP NOT NULL;
                ALTER TABLE warehouse_profiles ALTER COLUMN barangay DROP NOT NULL;
                ALTER TABLE warehouse_profiles ALTER COLUMN street_address DROP NOT NULL;

                ALTER TABLE warehouse_documents ALTER COLUMN government_issued_id DROP NOT NULL;
                ALTER TABLE warehouse_documents ALTER COLUMN business_permit DROP NOT NULL;
                ALTER TABLE warehouse_documents ALTER COLUMN business_registration DROP NOT NULL;
                ALTER TABLE warehouse_documents ALTER COLUMN warehouse_license DROP NOT NULL;

                ALTER TABLE retailer_documents ALTER COLUMN barangay_permit DROP NOT NULL;
                ALTER TABLE retailer_documents ALTER COLUMN valid_id DROP NOT NULL;
            """,
            reverse_sql="""
                -- noop
            """
        ),
    ]
