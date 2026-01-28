from fastapi import APIRouter, HTTPException, Request
from src.backend.services.security import AccessTokenService
from src.backend.services.security import RefreshTokenService
from src.backend.services.database import SessionDep

router = APIRouter()


@router.post(
    "/refresh", summary="Обновление access токена", tags=["Работа  с токенами"]
)
async def refresh(request: Request, session: SessionDep):
    """
    Эндпоинт для обновления access token.

    Он ищет пользователя по refresh token и выдает клиенту новый access token
    """
    refresh_token = RefreshTokenService.get_hashed_token(
        request.cookies.get("refresh_token")
    )
    user_id = await RefreshTokenService.find_user_by_refresh_token(
        hashed_token=refresh_token, session=session
    )
    if not user_id:
        raise HTTPException(status_code=401, detail="Не авторизован")
    return {
        "access_token": AccessTokenService.create_access_token(user_id),
    }