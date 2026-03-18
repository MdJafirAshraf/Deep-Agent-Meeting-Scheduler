import datetime

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import models


def seed_database():
    db: Session = SessionLocal()

    # Skip seeding if we already have data
    if db.query(models.Meeting).first() is not None:
        db.close()
        return

    today = datetime.datetime.today().strftime("%Y-%m-%d")

    meetings_data = [
        {
            "title": "Product Sync",
            "type": "Internal",
            "platform": "Google Meet",
            "participants": "sarah@co.com, mike@co.com",
            "date": today,
            "time": "10:00",
            "duration": 30,
            "link": "https://meet.google.com/abc",
        },
        {
            "title": "Client: TechCorp",
            "type": "External",
            "platform": "Phone",
            "participants": "alex@techcorp.com",
            "date": today,
            "time": "14:30",
            "duration": 45,
            "link": "",
        },
        {
            "title": "Sprint Retro",
            "type": "Recurring",
            "platform": "Zoom",
            "participants": "emma@co.com, david@co.com",
            "date": today,
            "time": "16:00",
            "duration": 60,
            "link": "https://zoom.us/j/123",
        },
        {
            "title": "Design Review",
            "type": "Review",
            "platform": "Google Meet",
            "participants": "david@co.com",
            "date": "2026-03-20",
            "time": "11:00",
            "duration": 30,
            "link": "",
        },
        {
            "title": "1:1 with Emma",
            "type": "Internal",
            "platform": "Teams",
            "participants": "emma@co.com",
            "date": "2026-03-21",
            "time": "09:30",
            "duration": 30,
            "link": "",
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
