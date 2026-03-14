from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime
from models.schemas import MeetingCreate, MeetingUpdate
from database.store import meetings, next_mid

router = APIRouter(prefix="/api/meetings", tags=["meetings"])

@router.get("")
async def list_meetings(type: Optional[str] = None, date: Optional[str] = None, search: Optional[str] = None):
    result = list(meetings.values())
    if type:
        result = [m for m in result if m.get("type", "").lower() == type.lower()]
    if date:
        result = [m for m in result if m.get("date") == date]
    if search:
        q = search.lower()
        result = [m for m in result if q in m.get("title", "").lower() or q in m.get("participants", "").lower()]

    result.sort(key=lambda m: (m.get("date", ""), m.get("time", "")))
    return JSONResponse(content={"meetings": result, "total": len(result)})

@router.post("", status_code=201)
async def create_meeting(payload: MeetingCreate):
    mid = next_mid()
    meeting = {
        "id": mid,
        "title": payload.title,
        "type": payload.type or "Internal",
        "platform": payload.platform or "Google Meet",
        "participants": payload.participants or "",
        "date": payload.date,
        "time": payload.time,
        "duration": payload.duration or 30,
        "link": payload.link or "",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }
    meetings[mid] = meeting
    return JSONResponse(content={"message": "Meeting created successfully", "meeting": meeting}, status_code=201)

@router.get("/stats/summary")
async def meetings_stats():
    today = datetime.today().strftime("%Y-%m-%d")
    all_m = list(meetings.values())
    return JSONResponse(content={
        "total":    len(all_m),
        "today":    sum(1 for m in all_m if m.get("date") == today),
        "upcoming": sum(1 for m in all_m if m.get("date", "") > today),
        "external": sum(1 for m in all_m if m.get("type") == "External"),
        "by_type": {
            t: sum(1 for m in all_m if m.get("type") == t)
            for t in ["Internal", "External", "Recurring", "Review"]
        },
    })

@router.get("/{meeting_id}")
async def get_meeting(meeting_id: int):
    meeting = meetings.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return JSONResponse(content={"meeting": meeting})

@router.put("/{meeting_id}")
async def update_meeting(meeting_id: int, payload: MeetingUpdate):
    meeting = meetings.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    update_data = payload.model_dump(exclude_none=True)
    meeting.update(update_data)
    meeting["updated_at"] = datetime.now().isoformat()
    meetings[meeting_id] = meeting
    return JSONResponse(content={"message": "Meeting updated successfully", "meeting": meeting})

@router.patch("/{meeting_id}")
async def patch_meeting(meeting_id: int, payload: MeetingUpdate):
    return await update_meeting(meeting_id, payload)

@router.delete("/all")
async def delete_all_meetings():
    count = len(meetings)
    meetings.clear()
    return JSONResponse(content={"message": f"Deleted all {count} meetings"})

@router.delete("/{meeting_id}")
async def delete_meeting(meeting_id: int):
    if meeting_id not in meetings:
        raise HTTPException(status_code=404, detail="Meeting not found")
    del meetings[meeting_id]
    return JSONResponse(content={"message": "Meeting deleted successfully", "id": meeting_id})
