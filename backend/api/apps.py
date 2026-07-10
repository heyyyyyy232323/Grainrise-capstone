from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        from django.db.models.signals import post_migrate
        post_migrate.connect(_seed_data, sender=self)


def _seed_data(sender, **kwargs):
    """
    Seed default users, silos, and alerts after migrations run.
    Safe to call repeatedly — checks for existing data first.
    """
    try:
        from api.models import User, Silo, Alert
        from api.utils import get_password_hash

        if not User.objects.exists():
            User.objects.create(
                username="admin",
                email="admin@grainrise.com",
                hashed_password=get_password_hash("admin123"),
                role="admin"
            )
            User.objects.create(
                username="farmer",
                email="farmer@grainrise.com",
                hashed_password=get_password_hash("farmer123"),
                role="farmer"
            )

        if not Silo.objects.exists():
            Silo.objects.create(
                name="Silo Alpha", grain_type="Rice",
                capacity=1000.0, current_stock=780.0,
                temperature=24.5, humidity=55.2, moisture=13.1
            )
            Silo.objects.create(
                name="Silo Beta", grain_type="Wheat",
                capacity=1500.0, current_stock=120.0,
                temperature=26.0, humidity=58.0, moisture=14.5
            )
            silo3 = Silo.objects.create(
                name="Silo Gamma", grain_type="Corn",
                capacity=800.0, current_stock=750.0,
                temperature=31.2, humidity=68.5, moisture=17.2
            )
            Silo.objects.create(
                name="Silo Delta", grain_type="Rice",
                capacity=1200.0, current_stock=950.0,
                temperature=22.1, humidity=50.0, moisture=12.2
            )

            Alert.objects.create(
                silo_id=silo3.id,
                alert_type="Critical Humidity",
                message=f"Silo Gamma humidity is 68.5% (exceeds safe threshold of 60%). Risk of spoilage!",
                is_resolved=False
            )
            Alert.objects.create(
                silo_id=silo3.id,
                alert_type="Critical Temperature",
                message=f"Silo Gamma temperature is 31.2\u00b0C. Elevated temperature detected.",
                is_resolved=False
            )
    except Exception:
        # Silently catch errors if tables don't exist yet
        pass
