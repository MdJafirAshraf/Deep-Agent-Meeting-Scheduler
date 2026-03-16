from fastapi import APIRouter

from app.api.v1.endpoints import chat, contacts, meetings, pages

router = APIRouter()

# UI / page routes
router.include_router(pages.router)

# API routes
router.include_router(chat.router)
router.include_router(meetings.router)
router.include_router(contacts.router)
