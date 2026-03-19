from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.schemas import MeetingCreate, MeetingUpdate
from app.services.meeting_service import MeetingService

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


@router.get("", response_class=JSONResponse)
async def list_meetings(
    type: Optional[str] = None,
    date: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    service = MeetingService(db)
    meetings = service.list_meetings(date=date, search=search)
    return JSONResponse(content={"meetings": meetings, "total": len(meetings)})


@router.post("", status_code=201, response_class=JSONResponse)
async def create_meeting(payload: MeetingCreate, db: Session = Depends(get_db)):
    service = MeetingService(db)
    meeting = service.create_meeting(payload)
    return JSONResponse(content={"message": "Meeting created successfully", "meeting": meeting}, status_code=201)


@router.get("/stats/summary", response_class=JSONResponse)
async def meetings_stats(db: Session = Depends(get_db)):
    service = MeetingService(db)
    return JSONResponse(content=service.stats_summary())


@router.get("/{meeting_id}", response_class=JSONResponse)
async def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    service = MeetingService(db)
    meeting = service.get_meeting(meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return JSONResponse(content={"meeting": meeting})


@router.put("/{meeting_id}", response_class=JSONResponse)
async def update_meeting(meeting_id: int, payload: MeetingUpdate, db: Session = Depends(get_db)):
    service = MeetingService(db)
    meeting = service.update_meeting(meeting_id, payload)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return JSONResponse(content={"message": "Meeting updated successfully", "meeting": meeting})


@router.patch("/{meeting_id}", response_class=JSONResponse)
async def patch_meeting(meeting_id: int, payload: MeetingUpdate, db: Session = Depends(get_db)):
    return await update_meeting(meeting_id, payload, db)


@router.delete("/all", response_class=JSONResponse)
async def delete_all_meetings(db: Session = Depends(get_db)):
    service = MeetingService(db)
    count = service.delete_all_meetings()
    return JSONResponse(content={"message": f"Deleted all {count} meetings"})


@router.delete("/{meeting_id}", response_class=JSONResponse)
async def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    service = MeetingService(db)
    ok = service.delete_meeting(meeting_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return JSONResponse(content={"message": "Meeting deleted successfully", "id": meeting_id})
