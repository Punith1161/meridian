import os
import logging
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger("meridian.auth")
security = HTTPBearer()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 10080))

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is required")


def _truncate_to_bcrypt_max(s: str) -> str:
    """Truncate a string so its UTF-8 encoding is at most 72 bytes.

    bcrypt only consumes the first 72 bytes of a password; passing longer
    values raises ValueError in some bcrypt bindings. Truncate by bytes to
    avoid surprises when the string contains multi-byte characters.
    """
    b = s.encode("utf-8")
    if len(b) <= 72:
        return s
    tb = b[:72]
    truncated = tb.decode("utf-8", "ignore")
    logger.warning("Password longer than 72 bytes; truncating for bcrypt compatibility")
    return truncated


def hash_password(password: str) -> str:
    pw = _truncate_to_bcrypt_max(password)
    return pwd_context.hash(pw)


def verify_password(plain: str, hashed: str) -> bool:
    pw = _truncate_to_bcrypt_max(plain)
    return pwd_context.verify(pw, hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    token = credentials.credentials
    
    credential_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credential_exception
    except JWTError:
        raise credential_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credential_exception
    
    return user