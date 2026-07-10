from django.db import models
from django.utils import timezone

class User(models.Model):
    username = models.CharField(max_length=150, unique=True, db_index=True)
    email = models.CharField(max_length=255)
    role = models.CharField(max_length=50, default="farmer") # 'farmer', 'merchant', 'admin'
    hashed_password = models.CharField(max_length=255)

    def __str__(self):
        return self.username

class Silo(models.Model):
    name = models.CharField(max_length=100)
    grain_type = models.CharField(max_length=50) # 'Rice', 'Wheat', 'Corn', 'Barley'
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
    alert_type = models.CharField(max_length=100) # 'Critical Humidity', 'Critical Temperature', 'Low Stock'
    message = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.alert_type} for Silo {self.silo_id}"
