from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import User, Silo, Alert
from .serializers import (
    UserSerializer, UserCreateSerializer, 
    SiloSerializer, SiloUpdateSerializer, AlertSerializer
)
from .utils import get_password_hash, verify_password, create_access_token

@api_view(['GET'])
def read_root(request):
    return Response({"message": "Welcome to GrainRise Capstone API", "status": "Online"})

# --- AUTH ENDPOINTS ---

@api_view(['POST'])
def register(request):
    serializer = UserCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    username = serializer.validated_data['username']
    email = serializer.validated_data['email']
    password = serializer.validated_data['password']
    role = serializer.validated_data.get('role', 'farmer')

    if User.objects.filter(username=username).exists():
        return Response({"detail": "Username already registered"}, status=status.HTTP_400_BAD_REQUEST)

    hashed = get_password_hash(password)
    user = User.objects.create(
        username=username,
        email=email,
        role=role,
        hashed_password=hashed
    )
    
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

@api_view(['POST'])
def login(request):
    # In FastAPI, user_in maps to UserCreate structure, containing username and password
    # Let's read these from request.data safely
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({"detail": "Username and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(username=username).first()
    if not user or not verify_password(password, user.hashed_password):
        return Response(
            {"detail": "Incorrect username or password"}, 
            status=status.HTTP_401_UNAUTHORIZED,
            headers={"WWW-Authenticate": "Bearer"}
        )

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}
    )
    return Response({"access_token": access_token, "token_type": "bearer"})

# --- SILO ENDPOINTS ---

@api_view(['GET', 'POST'])
def silos_list(request):
    if request.method == 'GET':
        silos = Silo.objects.all()
        return Response(SiloSerializer(silos, many=True).data)
        
    elif request.method == 'POST':
        serializer = SiloSerializer(data=request.data)
        if serializer.is_valid():
            silo = serializer.save()
            return Response(SiloSerializer(silo).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT'])
def update_silo(request, silo_id):
    try:
        silo = Silo.objects.get(id=silo_id)
    except Silo.DoesNotExist:
        return Response({"detail": "Silo not found"}, status=status.HTTP_404_NOT_FOUND)

    serializer = SiloUpdateSerializer(silo, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    updated_silo = serializer.save()
    updated_silo.last_updated = timezone.now()
    updated_silo.save()

    # Auto-generate alerts based on new values
    if updated_silo.humidity > 60:
        alert_msg = f"{updated_silo.name} humidity is {updated_silo.humidity}%. Spoilage risk detected!"
        existing = Alert.objects.filter(silo_id=silo_id, alert_type="Critical Humidity", is_resolved=False).first()
        if not existing:
            Alert.objects.create(silo_id=silo_id, alert_type="Critical Humidity", message=alert_msg)

    if updated_silo.temperature > 30:
        alert_msg = f"{updated_silo.name} temperature is {updated_silo.temperature}°C. Dangerously high!"
        existing = Alert.objects.filter(silo_id=silo_id, alert_type="Critical Temperature", is_resolved=False).first()
        if not existing:
            Alert.objects.create(silo_id=silo_id, alert_type="Critical Temperature", message=alert_msg)

    return Response(SiloSerializer(updated_silo).data)

# --- ALERTS ENDPOINTS ---

@api_view(['GET'])
def alerts_list(request):
    alerts = Alert.objects.all()
    return Response(AlertSerializer(alerts, many=True).data)

@api_view(['PUT'])
def resolve_alert(request, alert_id):
    try:
        alert = Alert.objects.get(id=alert_id)
    except Alert.DoesNotExist:
        return Response({"detail": "Alert not found"}, status=status.HTTP_404_NOT_FOUND)

    alert.is_resolved = True
    alert.save()
    return Response(AlertSerializer(alert).data)
