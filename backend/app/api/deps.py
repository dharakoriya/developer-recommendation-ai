import uuid
from typing import Callable, Sequence
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.enums import UserRole
from app.core.security import decode_access_token

security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    auth_credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Extracts Bearer token from request Authorization header, decodes JWT,
    and returns current active user from database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not auth_credentials or not auth_credentials.credentials:
        raise credentials_exception

    token = auth_credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception

    user_id_str: str | None = payload.get("sub")
    if not user_id_str:
        raise credentials_exception

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
        )

    return user


def require_roles(*allowed_roles: UserRole) -> Callable:
    """
    Reusable authorization dependency factory that verifies current authenticated user
    possesses one of the allowed roles. Returns HTTP 403 Forbidden if unauthorized.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            role_names = [role.value if hasattr(role, "value") else str(role) for role in allowed_roles]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden. Required role(s): {', '.join(role_names)}",
            )
        return current_user

    return role_checker
