from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime

# --- USER MODELS ---
class UserBase(SQLModel):
    username: str = Field(index=True, unique=True)
    email: str
    role: str = "farmer" # 'farmer', 'merchant', 'admin'

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

class Token(SQLModel):
    access_token: str
    token_type: str

class TokenData(SQLModel):
    username: Optional[str] = None


# --- SILO / SENSOR MODELS ---
class SiloBase(SQLModel):
    name: str
    grain_type: str  # 'Rice', 'Wheat', 'Corn', 'Barley'
    capacity: float  # in Metric Tons (MT)
    current_stock: float  # in Metric Tons (MT)
    temperature: float  # in Celsius (°C)
    humidity: float  # in %
    moisture: float  # in %

class Silo(SiloBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class SiloCreate(SiloBase):
    pass

class SiloUpdate(SQLModel):
    name: Optional[str] = None
    grain_type: Optional[str] = None
    capacity: Optional[float] = None
    current_stock: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    moisture: Optional[float] = None


# --- ALERTS MODELS ---
class AlertBase(SQLModel):
    silo_id: int
    alert_type: str  # 'Critical Humidity', 'Critical Temperature', 'Low Stock'
    message: str
    is_resolved: bool = False

class Alert(AlertBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
