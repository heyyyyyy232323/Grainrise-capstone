import os
import jwt
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext

SECRET_KEY = os.getenv("JWT_SECRET", "super-grainrise-capstone-secret-key-998822")
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    # PyJWT returns a string in newer versions, but let's make sure it is decoded properly
    if isinstance(encoded_jwt, bytes):
        return encoded_jwt.decode('utf-8')
    return encoded_jwt
