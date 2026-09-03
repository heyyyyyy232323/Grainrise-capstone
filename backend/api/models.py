from django.db import models
from django.utils import timezone


class User(models.Model):
    """
    Django mapping for GrainRise's EXISTING centralized PostgreSQL `users` table.

    IMPORTANT:
    managed = False means Django will NOT create, alter, or migrate this table.
    """

    user_id = models.BigIntegerField(primary_key=True)

    class Meta:
        managed = False
        db_table = "users"

    def __str__(self):
        return f"User {self.user_id}"


class RetailerDocument(models.Model):
    """
    Django mapping for the EXISTING PostgreSQL `retailer_documents` table.

    Django will NOT create or migrate this table.
    """

    user_id = models.BigIntegerField(primary_key=True)

    class Meta:
        managed = False
        db_table = "retailer_documents"

    def __str__(self):
        return f"Retailer documents for user {self.user_id}"


# ============================================================
# EXISTING GRAINRISE MODELS
# ============================================================

class Silo(models.Model):
    name = models.CharField(max_length=100)
    grain_type = models.CharField(max_length=50)
    capacity = models.FloatField()
    current_stock = models.FloatField()
    temperature = models.FloatField()
    humidity = models.FloatField()
    moisture = models.FloatField()
    last_updated = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


class Alert(models.Model):
    silo_id = models.IntegerField()
    alert_type = models.CharField(max_length=100)
    message = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.alert_type} for Silo {self.silo_id}"