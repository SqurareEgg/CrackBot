from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.dependencies import get_db, get_current_user
from app.models.user import User, RefreshToken
from app.schemas.auth import LoginRequest, TokenResponse, UserOut, RefreshRequest
from app.schemas.common import ok, err
from app.services.auth import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)

router = APIRouter()


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return access + refresh tokens."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="비활성화된 계정입니다.",
        )

    access_token = create_access_token({"sub": user.id})
    refresh_token_str = create_refresh_token({"sub": user.id})

    # Persist refresh token
    expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db_token = RefreshToken(
        user_id=user.id,
        token=refresh_token_str,
        expires_at=expires_at,
    )
    db.add(db_token)
    db.commit()

    user_out = UserOut.model_validate(user)
    token_response = TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_str,
        token_type="Bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_out,
    )
    return ok(token_response.model_dump(), message="로그인에 성공했습니다.")


@router.post("/refresh")
def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    """Issue a new access token using a valid refresh token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="갱신 토큰이 유효하지 않습니다.",
    )
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise credentials_exception
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    db_token = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == body.refresh_token,
            RefreshToken.is_revoked == False,  # noqa: E712
        )
        .first()
    )
    if not db_token:
        raise credentials_exception

    if db_token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="갱신 토큰이 만료되었습니다.",
        )

    new_access_token = create_access_token({"sub": user_id})
    return ok(
        {
            "access_token": new_access_token,
            "token_type": "Bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        },
        message="토큰이 갱신되었습니다.",
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(body: RefreshRequest, db: Session = Depends(get_db)):
    """Revoke the given refresh token."""
    db_token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == body.refresh_token)
        .first()
    )
    if db_token:
        db_token.is_revoked = True
        db.commit()
    return None


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Return current authenticated user's info."""
    user_out = UserOut.model_validate(current_user)
    return ok(user_out.model_dump(), message="사용자 정보를 가져왔습니다.")
