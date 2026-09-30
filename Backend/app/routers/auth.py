from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    UserResponse,
    Token,
    TokenRefreshRequest,
)
from app.services.auth_service import AuthService
from app.core.security import decode_token
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    return AuthService.register_user(db, user_data)


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    return AuthService.login_user(db, credentials)

@router.post("/refresh", response_model=Token)
def refresh(refresh_data: TokenRefreshRequest, db: Session = Depends(get_db)):
    token_data = AuthService.refresh_access_token(db, refresh_data.refresh_token)
    
    # Decode token payload to attach current user details in the response
    payload = decode_token(token_data["access_token"], settings.JWT_SECRET_KEY)
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    
    return {
        "access_token": token_data["access_token"],
        "refresh_token": token_data["refresh_token"],
        "token_type": "bearer",
        "user": user
    }

@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    AuthService.logout_user(db, current_user)
    return {"detail": "Successfully logged out."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=list[UserResponse])
def get_all_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(User).filter(User.is_active == True).order_by(User.full_name.asc()).all()


