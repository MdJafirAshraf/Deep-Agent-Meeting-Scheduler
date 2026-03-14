from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="templates")

@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "active_page": "assistant"})

@router.get("/meetings", response_class=HTMLResponse)
async def meetings_page(request: Request):
    return templates.TemplateResponse("meetings.html", {"request": request, "active_page": "meetings"})

@router.get("/calendar", response_class=HTMLResponse)
async def calendar_page(request: Request):
    return templates.TemplateResponse("calendar.html", {"request": request, "active_page": "calendar"})

@router.get("/contacts", response_class=HTMLResponse)
async def contacts_page(request: Request):
    return templates.TemplateResponse("contacts.html", {"request": request, "active_page": "contacts"})

@router.get("/activity_logs", response_class=HTMLResponse)
async def activity_logs_page(request: Request):
    return templates.TemplateResponse("activity_logs.html", {"request": request, "active_page": "activity_logs"})
