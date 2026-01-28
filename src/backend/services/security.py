import secrets
from src.backend.services.database import SessionDep
from fastapi import Response
import jwt
import bcrypt
import hashlib
import uuid
import datetime
from sqlalchemy import delete, select
from src.backend.schemas.schemas import settings
from src.backend.models.token import TokensModel


class PasswordService:
    """
    Класс для работы с паролями
    """

    @staticmethod
    def get_hash_password(password: str):
        """
        Метод для хэширования пароля
        """
        password_bytes = password.encode("utf-8")
        salt = bcrypt.gensalt()
        hashed_bytes = bcrypt.hashpw(password_bytes, salt)
        return hashed_bytes.decode("utf-8")

    @staticmethod
    def verify_password(password: str, hashed_password: str):
        """
        Метод для сравнеия пароля с хэшированным паролем
        """
        password_bytes = password.encode("utf-8")
        hashed_password_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hashed_password_bytes)


class RefreshTokenService:
    """
    Класс для работы с refresh token
    """

    @classmethod
    def create_refresh_token(cls):
        return secrets.token_urlsafe(32)

    @staticmethod
    def get_hashed_token(token: str):
        return hashlib.sha256(token.encode()).hexdigest()

    @classmethod
    async def create_and_save_refresh_token(
        cls, session: SessionDep, user_id: uuid.UUID, response: Response
    ):
        """
        Создает refresh token, записывает его в куки и в базу данных
        """
        refresh_token = RefreshTokenService.create_refresh_token()
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=30 * 24 * 60 * 60,
        )
        new_token = TokensModel(
            id=uuid.uuid4(),
            user_id=user_id,
            hashed_token=RefreshTokenService.get_hashed_token(refresh_token),
            exp_at=datetime.datetime.now(tz=datetime.timezone.utc)
            + datetime.timedelta(days=30),
        )
        session.add(new_token)
        return refresh_token

    @classmethod
    async def delete_refresh_tokens(cls, session: SessionDep, user_id: uuid.UUID):
        query = delete(TokensModel).where(TokensModel.user_id == user_id)
        await session.execute(query)

    @classmethod
    async def find_user_by_refresh_token(cls, session: SessionDep, hashed_token: str):
        """
        Метод для поиска пользователя по refresh token
        """
        result = await session.execute(
            select(TokensModel).where(hashed_token == TokensModel.hashed_token)
        )
        user = result.scalar_one_or_none()
        if user:
            return user.user_id
        return None


class AccessTokenService:
    """
    Класс для работы с access token
    """

    @classmethod
    def create_access_token(cls, user_id: uuid.UUID):
        """
        Метод для создания access token
        """
        now = datetime.datetime.now(tz=datetime.timezone.utc)
        payload = {
            "sub": str(user_id),
            "iat": now,
            "exp": now + datetime.timedelta(minutes=40),
        }
        return jwt.encode(payload, settings.SECRET_KEY, settings.ALGORITHM)

    @classmethod
    def decode_access_token(cls, token: str):
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
