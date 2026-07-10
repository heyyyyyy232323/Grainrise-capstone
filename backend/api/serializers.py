from rest_framework import serializers
from .models import User, Silo, Alert

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role']

class UserCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.CharField(max_length=255)
    password = serializers.CharField(max_length=255)
    role = serializers.CharField(max_length=50, default='farmer')

class SiloSerializer(serializers.ModelSerializer):
    class Meta:
        model = Silo
        fields = '__all__'

class SiloUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Silo
        fields = ['name', 'grain_type', 'capacity', 'current_stock', 'temperature', 'humidity', 'moisture']

    def __init__(self, *args, **kwargs):
        # Dynamically set all fields to optional for partial updates
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.required = False
            field.allow_null = True

class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = '__all__'
