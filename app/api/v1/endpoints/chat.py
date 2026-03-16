from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas import ChatMessage
from app.services.chat_service import ChatService

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_class=JSONResponse)
async def chat(msg: ChatMessage, db: Session = Depends(get_db)):
    if not msg.message or not msg.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    service = ChatService(db)
    response = service.respond(msg.message)
    return JSONResponse(content={"response": response})


@router.get("/history", response_class=JSONResponse)
async def get_chat_history(db: Session = Depends(get_db)):
    service = ChatService(db)
    history = service.get_history()
    return JSONResponse(content={"history": history})
