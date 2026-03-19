import datetime
import json
 
from sqlalchemy.orm import Session
 
from app.db.session import SessionLocal
from app.models import models
 
 
def _iso(date: str, time: str) -> str:
    return f"{date}T{time}:00"
 
 
def _end(date: str, time: str, mins: int) -> str:
    base = datetime.datetime.fromisoformat(_iso(date, time))
    return (base + datetime.timedelta(minutes=mins)).isoformat()


def seed_database():
    db: Session = SessionLocal()
    if db.query(models.Meeting).first() is not None:
        db.close()
        return
 
    today = datetime.datetime.today().strftime("%Y-%m-%d")
    d1    = "2026-03-20"
    d2    = "2026-03-21"
 
    meetings_data = [
        {
            "title":          "Product Sync",
            "description":    "Weekly product team sync — review roadmap and blockers.",
            "date":           today,
            "time":           "10:00",
            "timezone":       "America/New_York",
            "start_datetime": _iso(today, "10:00"),
            "end_datetime":   _end(today, "10:00", 30),
            "duration":       30,
            "participants":   "sarah@co.com, mike@co.com",
            "reminders":      '{"useDefault": true, "overrides": []}',
        },
        {
            "title":          "Client: TechCorp",
            "description":    "Q1 project review call with TechCorp.",
            "date":           today,
            "time":           "14:30",
            "timezone":       "America/New_York",
            "start_datetime": _iso(today, "14:30"),
            "end_datetime":   _end(today, "14:30", 45),
            "duration":       45,
            "participants":   "alex@techcorp.com",
            "reminders":      '{"useDefault": true, "overrides": []}',
        },
        {
            "title":          "Sprint Retro",
            "description":    "End-of-sprint retrospective — what went well, what to improve.",
            "date":           today,
            "time":           "16:00",
            "timezone":       "America/New_York",
            "start_datetime": _iso(today, "16:00"),
            "end_datetime":   _end(today, "16:00", 60),
            "duration":       60,
            "participants":   "emma@co.com, david@co.com",
            "reminders":      '{"useDefault": true, "overrides": []}',
        },
        {
            "title":          "Design Review",
            "description":    "Review latest Figma mocks for the v3 dashboard.",
            "date":           d1,
            "time":           "11:00",
            "timezone":       "America/New_York",
            "start_datetime": _iso(d1, "11:00"),
            "end_datetime":   _end(d1, "11:00", 30),
            "duration":       30,
            "participants":   "david@co.com",
            "reminders":      '{"useDefault": true, "overrides": []}',
        },
        {
            "title":          "1:1 with Emma",
            "description":    "Bi-weekly 1-on-1: career goals, blockers, feedback.",
            "date":           d2,
            "time":           "09:30",
            "timezone":       "America/New_York",
            "start_datetime": _iso(d2, "09:30"),
            "end_datetime":   _end(d2, "09:30", 30),
            "duration":       30,
            "participants":   "emma@co.com",
            "reminders":      '{"useDefault": true, "overrides": []}',
        },
    ]
 
    for m in meetings_data:
        db.add(models.Meeting(**m))

    contacts_data = [
        {
            "first_name": "Emma",
            "last_name": "Watson",
            "email": "emma@co.com",
            "phone": "+1 (555) 100-0001",
            "notes": "Key marketing stakeholder. Weekly sync every Monday.",
        },
        {
            "first_name": "David",
            "last_name": "Chen",
            "email": "david@co.com",
            "phone": "+1 (555) 100-0002",
            "notes": "Design Director. Prefers async communication.",
        },
        {
            "first_name": "Alex",
            "last_name": "Thomas",
            "email": "alex@techcorp.com",
            "phone": "+1 (555) 200-0003",
            "notes": "Primary TechCorp contact for Q1 project.",
        },
        {
            "first_name": "Sarah",
            "last_name": "Kim",
            "email": "sarah@co.com",
            "phone": "+1 (555) 100-0004",
            "notes": "Senior engineer on the platform team.",
        },
        {
            "first_name": "Michael",
            "last_name": "Rivera",
            "email": "mike@co.com",
            "phone": "+1 (555) 100-0005",
            "notes": "Joining the ops team next month.",
        },
        {
            "first_name": "Jennifer",
            "last_name": "Lee",
            "email": "jen@marketinghub.com",
            "phone": "+1 (555) 300-0006",
            "notes": "Partnership contact for co-marketing initiatives.",
        },
        {
            "first_name": "Robert",
            "last_name": "Fox",
            "email": "rob@techcorp.com",
            "phone": "+1 (555) 200-0007",
            "notes": "Backend lead at TechCorp.",
        },
        {
            "first_name": "Priya",
            "last_name": "Sharma",
            "email": "priya@co.com",
            "phone": "+1 (555) 100-0008",
            "notes": "On extended leave until Q2.",
        },
    ]

    for c in contacts_data:
        db.add(models.Contact(**c))

    db.commit()
    db.close()
