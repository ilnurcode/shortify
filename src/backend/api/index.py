from fastapi import APIRouter, Request, Response
from fastapi.templating import Jinja2Templates
from starlette import status

from src.backend.schemas.schemas import BASE_DIR

router = APIRouter()
templates = Jinja2Templates(directory=f"{BASE_DIR}/src/frontend/templates")


@router.get("/", summary="Отображение главной страницы", tags=["Веб"])
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@router.get("/favicon.ico")
async def favicon():
    return Response(status_code=204)