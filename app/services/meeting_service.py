from typing import List, Optional

from sqlalchemy.orm import Session

from app.models import models
from app.schemas import MeetingCreate, MeetingUpdate

from app.clients.calendar.google_calendar import GoogleCalendarClient

class MeetingService:
    """Business logic for meetings."""

    def __init__(self, db: Session):
        self.db = db
        self.calendar = GoogleCalendarClient()

    def list_meetings(
        self,
        type: Optional[str] = None,
        date: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[dict]:
        # use google calendar
        self.calendar.get_events()


        query = self.db.query(models.Meeting)

        if type:
            query = query.filter(models.Meeting.type.ilike(type))
        if date:
            query = query.filter(models.Meeting.date == date)

        results = query.all()

        if search:
            q = search.lower()
            results = [
                m
                for m in results
                if q in (m.title or "").lower() or q in (m.participants or "").lower()
            ]

        results.sort(key=lambda m: (m.date or "", m.time or ""))

        return [{c.name: getattr(m, c.name) for c in m.__table__.columns} for m in results]

    def create_meeting(self, payload: MeetingCreate) -> dict:
        db_meeting = models.Meeting(**payload.model_dump())
        self.db.add(db_meeting)
        self.db.commit()
        self.db.refresh(db_meeting)
        return {c.name: getattr(db_meeting, c.name) for c in db_meeting.__table__.columns}

    def get_meeting(self, meeting_id: int) -> Optional[dict]:
        meeting = self.db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
        if not meeting:
            return None
        return {c.name: getattr(meeting, c.name) for c in meeting.__table__.columns}

    def update_meeting(self, meeting_id: int, payload: MeetingUpdate) -> Optional[dict]:
        db_meeting = self.db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
        if not db_meeting:
            return None

        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_meeting, key, value)

        self.db.commit()
        self.db.refresh(db_meeting)
        return {c.name: getattr(db_meeting, c.name) for c in db_meeting.__table__.columns}

    def delete_meeting(self, meeting_id: int) -> bool:
        db_meeting = self.db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
        if not db_meeting:
            return False
        self.db.delete(db_meeting)
        self.db.commit()
        return True

    def delete_all_meetings(self) -> int:
        count = self.db.query(models.Meeting).delete()
        self.db.commit()
        return count

    def stats_summary(self) -> dict:
        import datetime

        today = datetime.datetime.today().strftime("%Y-%m-%d")

        all_m = self.db.query(models.Meeting).all()

        return {
            "total": len(all_m),
            "today": sum(1 for m in all_m if m.date == today),
            "upcoming": sum(1 for m in all_m if m.date and m.date > today),
            "external": sum(1 for m in all_m if m.type == "External"),
            "by_type": {
                t: sum(1 for m in all_m if m.type == t)
                for t in ["Internal", "External", "Recurring", "Review"]
            },
        }
