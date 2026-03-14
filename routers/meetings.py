from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional
from models import models, schemas
from database.config import get_db

router = APIRouter(prefix="/api/meetings", tags=["meetings"])

@router.get("")
async def list_meetings(
    type: Optional[str] = None, 
    date: Optional[str] = None, 
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Meeting)
    
    if type:
        query = query.filter(models.Meeting.type.ilike(type))
    if date:
        query = query.filter(models.Meeting.date == date)
    
    results = query.all()
    
    if search:
        q = search.lower()
        results = [m for m in results if q in (m.title or "").lower() or q in (m.participants or "").lower()]

    results.sort(key=lambda m: (m.date or "", m.time or ""))

    # Convert sqlalchemy objects to dictionaries
    meetings_data = [{c.name: getattr(m, c.name) for c in m.__table__.columns} for m in results]
    
    return JSONResponse(content={"meetings": meetings_data, "total": len(results)})

@router.post("", status_code=201)
async def create_meeting(payload: schemas.MeetingCreate, db: Session = Depends(get_db)):
    db_meeting = models.Meeting(**payload.model_dump())
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    
    meeting_dict = {c.name: getattr(db_meeting, c.name) for c in db_meeting.__table__.columns}
    return JSONResponse(content={"message": "Meeting created successfully", "meeting": meeting_dict}, status_code=201)

@router.get("/stats/summary")
async def meetings_stats(db: Session = Depends(get_db)):
    import datetime
    today = datetime.datetime.today().strftime("%Y-%m-%d")
    
    all_m = db.query(models.Meeting).all()
    
    return JSONResponse(content={
        "total":    len(all_m),
        "today":    sum(1 for m in all_m if m.date == today),
        "upcoming": sum(1 for m in all_m if m.date and m.date > today),
        "external": sum(1 for m in all_m if m.type == "External"),
        "by_type": {
            t: sum(1 for m in all_m if m.type == t)
            for t in ["Internal", "External", "Recurring", "Review"]
        },
    })

@router.get("/{meeting_id}")
async def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    meeting_dict = {c.name: getattr(meeting, c.name) for c in meeting.__table__.columns}
    return JSONResponse(content={"meeting": meeting_dict})

@router.put("/{meeting_id}")
async def update_meeting(meeting_id: int, payload: schemas.MeetingUpdate, db: Session = Depends(get_db)):
    db_meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_meeting, key, value)
        
    db.commit()
    db.refresh(db_meeting)
    
    meeting_dict = {c.name: getattr(db_meeting, c.name) for c in db_meeting.__table__.columns}
    return JSONResponse(content={"message": "Meeting updated successfully", "meeting": meeting_dict})

@router.patch("/{meeting_id}")
async def patch_meeting(meeting_id: int, payload: schemas.MeetingUpdate, db: Session = Depends(get_db)):
    return await update_meeting(meeting_id, payload, db)

@router.delete("/all")
async def delete_all_meetings(db: Session = Depends(get_db)):
    count = db.query(models.Meeting).delete()
    db.commit()
    return JSONResponse(content={"message": f"Deleted all {count} meetings"})

@router.delete("/{meeting_id}")
async def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    db_meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    db.delete(db_meeting)
    db.commit()
    return JSONResponse(content={"message": "Meeting deleted successfully", "id": meeting_id})
