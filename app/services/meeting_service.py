import datetime
import json
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models import models
from app.schemas import MeetingCreate, MeetingUpdate
from app.clients.calendar.google_calendar import GoogleCalendarClient


def _derive_datetimes(data: dict) -> dict:
    """Auto-build start_datetime / end_datetime from date + time + duration when absent."""
    date     = data.get("date", "")
    time     = data.get("time", "")
    duration = data.get("duration") or 30

    if not data.get("start_datetime") and date and time:
        data["start_datetime"] = f"{date}T{time}:00"

    if not data.get("end_datetime") and data.get("start_datetime"):
        base = datetime.datetime.fromisoformat(data["start_datetime"])
        data["end_datetime"] = (base + datetime.timedelta(minutes=duration)).isoformat()

    return data


def _to_dict(m) -> dict:
    return {c.name: getattr(m, c.name) for c in m.__table__.columns}


class MeetingService:
    """Business logic for meetings."""

    def __init__(self, db: Session):
        self.db       = db
        self.calendar = GoogleCalendarClient()

    def list_meetings(
        self,
        date:   Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[dict]:
        query = self.db.query(models.Meeting)
        if date:
            query = query.filter(models.Meeting.date == date)

        results = query.all()

        if search:
            q = search.lower()
            results = [
                m for m in results
                if q in (m.title       or "").lower()
                or q in (m.description or "").lower()
                or q in (m.participants or "").lower()
            ]

        results.sort(key=lambda m: (m.date or "", m.time or ""))
        return [_to_dict(m) for m in results]

    def create_meeting(self, payload: MeetingCreate) -> dict:
        data       = _derive_datetimes(payload.model_dump())
        db_meeting = models.Meeting(**data)
        self.db.add(db_meeting)
        self.db.commit()
        self.db.refresh(db_meeting)
        self.calendar.create_event(db_meeting)
        return _to_dict(db_meeting)

    def get_meeting(self, meeting_id: int) -> Optional[dict]:
        m = self.db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
        return _to_dict(m) if m else None

    def update_meeting(self, meeting_id: int, payload: MeetingUpdate) -> Optional[dict]:
        db_meeting = self.db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
        if not db_meeting:
            return None

        update_data = _derive_datetimes(payload.model_dump(exclude_unset=True))
        for key, value in update_data.items():
            setattr(db_meeting, key, value)

        self.db.commit()
        self.db.refresh(db_meeting)
        return _to_dict(db_meeting)

    def delete_meeting(self, meeting_id: int) -> bool:
        m = self.db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
        if not m:
            return False
        self.db.delete(m)
        self.db.commit()
        return True

    def delete_all_meetings(self) -> int:
        count = self.db.query(models.Meeting).delete()
        self.db.commit()
        return count

    def stats_summary(self) -> dict:
        today = datetime.date.today().isoformat()
        all_m = self.db.query(models.Meeting).all()
        return {
            "total":    len(all_m),
            "today":    sum(1 for m in all_m if m.date == today),
            "upcoming": sum(1 for m in all_m if (m.date or "") > today),
        }