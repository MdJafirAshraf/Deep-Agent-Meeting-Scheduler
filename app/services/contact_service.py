from typing import List, Optional

from sqlalchemy.orm import Session

from app.models import models
from app.schemas import ContactCreate, ContactUpdate


class ContactService:
    """Business logic for contact management."""

    def __init__(self, db: Session):
        self.db = db

    def list_contacts(
        self,
        search: Optional[str] = None,
    ) -> List[dict]:
        query = self.db.query(models.Contact)

        results = query.all()

        if search:
            q = search.lower()
            results = [
                c
                for c in results
                if q in ((c.first_name or "") + " " + (c.last_name or "")).lower()
                or q in (c.email or "").lower()
            ]

        results.sort(key=lambda c: (c.last_name or "", c.first_name or ""))

        return [{c.name: getattr(obj, c.name) for c in obj.__table__.columns} for obj in results]

    def create_contact(self, payload: ContactCreate) -> dict:
        db_contact = models.Contact(**payload.model_dump())
        self.db.add(db_contact)
        self.db.commit()
        self.db.refresh(db_contact)
        return {c.name: getattr(db_contact, c.name) for c in db_contact.__table__.columns}

    def get_contact(self, contact_id: int) -> Optional[dict]:
        contact = self.db.query(models.Contact).filter(models.Contact.id == contact_id).first()
        if not contact:
            return None
        return {c.name: getattr(contact, c.name) for c in contact.__table__.columns}

    def update_contact(self, contact_id: int, payload: ContactUpdate) -> Optional[dict]:
        db_contact = self.db.query(models.Contact).filter(models.Contact.id == contact_id).first()
        if not db_contact:
            return None

        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_contact, key, value)

        self.db.commit()
        self.db.refresh(db_contact)
        return {c.name: getattr(db_contact, c.name) for c in db_contact.__table__.columns}

    def delete_contact(self, contact_id: int) -> bool:
        db_contact = self.db.query(models.Contact).filter(models.Contact.id == contact_id).first()
        if not db_contact:
            return False
        self.db.delete(db_contact)
        self.db.commit()
        return True

    def delete_all_contacts(self) -> int:
        count = self.db.query(models.Contact).delete()
        self.db.commit()
        return count

    def stats_summary(self) -> dict:
        total = self.db.query(models.Contact).count()
        return {
            "total": total,
        }
