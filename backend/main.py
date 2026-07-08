import os
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from jose import JWTError, jwt
from passlib.context import CryptContext

from database import engine, create_db_and_tables, get_session
from models import (
    User, UserCreate, UserResponse, Token, TokenData,
    Silo, SiloCreate, SiloUpdate, Alert
)

app = FastAPI(title="GrainRise Capstone API", version="1.0.0")

# Enable CORS for React Web and React Native mobile App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication logic helpers
SECRET_KEY = os.getenv("JWT_SECRET", "super-grainrise-capstone-secret-key-998822")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # Long expiration for capstone presentations

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Seeding functional logic
def seed_data(session: Session):
    # Check if we already have users or silos
    statement = select(User)
    existing_users = session.exec(statement).all()
    if not existing_users:
        # Create default administration / farmer users
        admin_user = User(
            username="admin",
            email="admin@grainrise.com",
            hashed_password=get_password_hash("admin123"),
            role="admin"
        )
        farmer_user = User(
            username="farmer",
            email="farmer@grainrise.com",
            hashed_password=get_password_hash("farmer123"),
            role="farmer"
        )
        session.add(admin_user)
        session.add(farmer_user)
        session.commit()

    statement_silos = select(Silo)
    existing_silos = session.exec(statement_silos).all()
    if not existing_silos:
        # Create 4 realistic silos
        silo1 = Silo(
            name="Silo Alpha",
            grain_type="Rice",
            capacity=1000.0,
            current_stock=780.0,
            temperature=24.5,
            humidity=55.2,
            moisture=13.1
        )
        silo2 = Silo(
            name="Silo Beta",
            grain_type="Wheat",
            capacity=1500.0,
            current_stock=120.0,
            temperature=26.0,
            humidity=58.0,
            moisture=14.5
        )
        silo3 = Silo(
            name="Silo Gamma",
            grain_type="Corn",
            capacity=800.0,
            current_stock=750.0,
            temperature=31.2,  # Warm - potential alert
            humidity=68.5,  # High - alert
            moisture=17.2   # Warning moisture
        )
        silo4 = Silo(
            name="Silo Delta",
            grain_type="Rice",
            capacity=1200.0,
            current_stock=950.0,
            temperature=22.1,
            humidity=50.0,
            moisture=12.2
        )
        session.add(silo1)
        session.add(silo2)
        session.add(silo3)
        session.add(silo4)
        session.commit()

        # Let's seed warning alert for Silo Gamma
        alert1 = Alert(
            silo_id=3,
            alert_type="Critical Humidity",
            message="Silo Gamma humidity is 68.5% (exceeds safe threshold of 60%). Risk of spoilage!",
            is_resolved=False
        )
        alert2 = Alert(
            silo_id=3,
            alert_type="Critical Temperature",
            message="Silo Gamma temperature is 31.2°C. Elevated temperature detected.",
            is_resolved=False
        )
        session.add(alert1)
        session.add(alert2)
        session.commit()

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    with Session(engine) as session:
        seed_data(session)

@app.get("/")
def read_root():
    return {"message": "Welcome to GrainRise Capstone API", "status": "Online"}


# --- AUTH ENDPOINTS ---

@app.post("/api/auth/register", response_model=UserResponse)
def register(user_in: UserCreate, session: Session = Depends(get_session)):
    stmt = select(User).where(User.username == user_in.username)
    db_user = session.exec(stmt).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed = get_password_hash(user_in.password)
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        role=user_in.role,
        hashed_password=hashed
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user

@app.post("/api/auth/login", response_model=Token)
def login(user_in: UserCreate, session: Session = Depends(get_session)):
    stmt = select(User).where(User.username == user_in.username)
    db_user = session.exec(stmt).first()
    if not db_user or not verify_password(user_in.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": db_user.username, "role": db_user.role}
    )
    return {"access_token": access_token, "token_type": "bearer"}


# --- SILO ENDPOINTS ---

@app.get("/api/silos", response_model=List[Silo])
def get_silos(session: Session = Depends(get_session)):
    return session.exec(select(Silo)).all()

@app.post("/api/silos", response_model=Silo)
def create_silo(silo: SiloCreate, session: Session = Depends(get_session)):
    db_silo = Silo.from_orm(silo)
    session.add(db_silo)
    session.commit()
    session.refresh(db_silo)
    return db_silo

@app.put("/api/silos/{silo_id}", response_model=Silo)
def update_silo(silo_id: int, silo_data: SiloUpdate, session: Session = Depends(get_session)):
    db_silo = session.get(Silo, silo_id)
    if not db_silo:
        raise HTTPException(status_code=404, detail="Silo not found")
    
    update_dict = silo_data.dict(exclude_unset=True)
    for key, val in update_dict.items():
        setattr(db_silo, key, val)
    
    db_silo.last_updated = datetime.utcnow()
    
    # Auto-generate alerts based on new values
    if db_silo.humidity > 60:
        alert_msg = f"{db_silo.name} humidity is {db_silo.humidity}%. Spoilage risk detected!"
        existing_alert = session.exec(select(Alert).where(Alert.silo_id == silo_id, Alert.alert_type == "Critical Humidity", Alert.is_resolved == False)).first()
        if not existing_alert:
            session.add(Alert(silo_id=silo_id, alert_type="Critical Humidity", message=alert_msg))
            
    if db_silo.temperature > 30:
        alert_msg = f"{db_silo.name} temperature is {db_silo.temperature}°C. Dangerously high!"
        existing_alert = session.exec(select(Alert).where(Alert.silo_id == silo_id, Alert.alert_type == "Critical Temperature", Alert.is_resolved == False)).first()
        if not existing_alert:
            session.add(Alert(silo_id=silo_id, alert_type="Critical Temperature", message=alert_msg))
            
    session.commit()
    session.refresh(db_silo)
    return db_silo


# --- ALERTS ENDPOINTS ---

@app.get("/api/alerts", response_model=List[Alert])
def get_alerts(session: Session = Depends(get_session)):
    return session.exec(select(Alert)).all()

@app.put("/api/alerts/{alert_id}", response_model=Alert)
def resolve_alert(alert_id: int, session: Session = Depends(get_session)):
    alert = session.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_resolved = True
    session.commit()
    session.refresh(alert)
    return alert
