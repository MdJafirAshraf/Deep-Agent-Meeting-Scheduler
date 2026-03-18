from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.schemas import ContactCreate, ContactUpdate
from app.services.contact_service import ContactService

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.get("", response_class=JSONResponse)
async def list_contacts(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    service = ContactService(db)
    contacts = service.list_contacts(search=search)
    return JSONResponse(content={"contacts": contacts, "total": len(contacts)})


@router.post("", status_code=201, response_class=JSONResponse)
async def create_contact(payload: ContactCreate, db: Session = Depends(get_db)):
    service = ContactService(db)
    contact = service.create_contact(payload)
    return JSONResponse(content={"message": "Contact created", "contact": contact}, status_code=201)


@router.get("/stats/summary", response_class=JSONResponse)
async def contacts_stats(db: Session = Depends(get_db)):
    service = ContactService(db)
    return JSONResponse(content=service.stats_summary())


@router.get("/{contact_id}", response_class=JSONResponse)
async def get_contact(contact_id: int, db: Session = Depends(get_db)):
    service = ContactService(db)
    contact = service.get_contact(contact_id)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    return JSONResponse(content={"contact": contact})


@router.put("/{contact_id}", response_class=JSONResponse)
async def update_contact(contact_id: int, payload: ContactUpdate, db: Session = Depends(get_db)):
    service = ContactService(db)
    contact = service.update_contact(contact_id, payload)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    return JSONResponse(content={"message": "Contact updated", "contact": contact})


@router.patch("/{contact_id}", response_class=JSONResponse)
async def patch_contact(contact_id: int, payload: ContactUpdate, db: Session = Depends(get_db)):
    return await update_contact(contact_id, payload, db)


@router.delete("/all", response_class=JSONResponse)
async def delete_all_contacts(db: Session = Depends(get_db)):
    service = ContactService(db)
    count = service.delete_all_contacts()
    return JSONResponse(content={"message": f"Deleted {count} contacts"})


@router.delete("/{contact_id}", response_class=JSONResponse)
async def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    service = ContactService(db)
    ok = service.delete_contact(contact_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Contact not found")
    return JSONResponse(content={"message": "Contact deleted", "id": contact_id})
