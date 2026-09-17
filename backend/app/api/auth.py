from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.auth import UserRegister, UserLogin, UserResponse, TokenResponse
from app.core.security import get_password_hash, verify_password, create_access_token
from app.api.deps import get_current_user, require_roles

router = APIRouter()


@router.post("/register", status_code=status.HTTP_403_FORBIDDEN, summary="Register a new user (Disabled)")
def register_user(user_in: UserRegister, db: Session = Depends(get_db)):
    """
    Public registration is permanently disabled.
    Accounts must be provisioned by a DEVAlign Administrator via the Admin User Management panel (/api/users).
    """
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Public self-registration is disabled in DEVAlign AI. User accounts must be provisioned by a system Administrator.",
    )


@router.post("/login", response_model=TokenResponse, summary="Authenticate user and obtain JWT access token")
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates user with email and password.
    Returns Bearer JWT access token and basic user details.
    """
    clean_email = credentials.email.strip().lower()
    user = db.execute(
        select(User).where(func.lower(User.email) == clean_email)
    ).scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated. Please contact your DEVAlign administrator.",
        )

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse, summary="Get current authenticated user profile")
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns profile information of the currently authenticated user.
    Requires Bearer JWT in Authorization header.
    """
    return current_user


@router.get("/test-role/admin", summary="Test ADMIN role authorization")
def test_admin_role(current_user: User = Depends(require_roles(UserRole.ADMIN))):
    """
    Protected test route accessible only to ADMIN role.
    """
    return {"message": f"Hello Admin {current_user.name}", "role": current_user.role}


@router.get("/test-role/manager", summary="Test MANAGER or ADMIN role authorization")
def test_manager_role(current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER))):
    """
    Protected test route accessible to MANAGER and ADMIN roles.
    """
    return {"message": f"Hello Manager/Admin {current_user.name}", "role": current_user.role}
