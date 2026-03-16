from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates


router = APIRouter()

# Locate the templates directory relative to the `app/` package.
APP_ROOT = Path(__file__).resolve().parents[3]
templates = Jinja2Templates(directory=str(APP_ROOT / "templates"))


@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "index.html", {"request": request, "active_page": "assistant"}
    )


@router.get("/meetings", response_class=HTMLResponse)
async def meetings_page(request: Request):
    return templates.TemplateResponse(
        "meetings.html", {"request": request, "active_page": "meetings"}
    )


@router.get("/calendar", response_class=HTMLResponse)
async def calendar_page(request: Request):
    return templates.TemplateResponse(
        "calendar.html", {"request": request, "active_page": "calendar"}
    )


@router.get("/contacts", response_class=HTMLResponse)
async def contacts_page(request: Request):
    return templates.TemplateResponse(
        "contacts.html", {"request": request, "active_page": "contacts"}
    )


@router.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    return templates.TemplateResponse(
        "settings.html", {"request": request, "active_page": "settings"}
    )
