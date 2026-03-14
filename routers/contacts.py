from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional
from models import models, schemas
from database.config import get_db

router = APIRouter(prefix="/api/contacts", tags=["contacts"])

@router.get("")
async def list_contacts(
    role: Optional[str] = None, 
    company: Optional[str] = None, 
    status: Optional[str] = None, 
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Contact)

    if role:
        query = query.filter(models.Contact.role.ilike(role))
    if company:
        query = query.filter(models.Contact.company.ilike(company))
    if status:
        query = query.filter(models.Contact.status.ilike(status))
        
    results = query.all()
    
    if search:
        q = search.lower()
        results = [c for c in results if q in ((c.first_name or "") + " " + (c.last_name or "")).lower()
                                      or q in (c.email or "").lower()
                                      or q in (c.company or "").lower()]

    results.sort(key=lambda c: (c.last_name or "", c.first_name or ""))

    # Convert sqlalchemy objects to dictionaries
    contacts_data = [{c.name: getattr(obj, c.name) for c in obj.__table__.columns} for obj in results]
    
    return JSONResponse(content={"contacts": contacts_data, "total": len(results)})
 
@router.post("", status_code=201)
async def create_contact(payload: schemas.ContactCreate, db: Session = Depends(get_db)):
    db_contact = models.Contact(**payload.model_dump())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    
    contact_dict = {c.name: getattr(db_contact, c.name) for c in db_contact.__table__.columns}
    return JSONResponse(content={"message": "Contact created", "contact": contact_dict}, status_code=201)

@router.get("/stats/summary")
async def contacts_stats(db: Session = Depends(get_db)):
    all_c = db.query(models.Contact).all()
    
    companies = set(c.company for c in all_c if c.company)
    by_role = {}
    for c in all_c:
        r = c.role or "Other"
        by_role[r] = by_role.get(r, 0) + 1
        
    return JSONResponse(content={
        "total": len(all_c),
        "active": sum(1 for c in all_c if c.status == "Active"),
        "inactive": sum(1 for c in all_c if c.status == "Inactive"),
        "pending": sum(1 for c in all_c if c.status == "Pending"),
        "companies": len(companies),
        "by_role": by_role,
    })
 
@router.get("/{contact_id}")
async def get_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(models.Contact).filter(models.Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    contact_dict = {c.name: getattr(contact, c.name) for c in contact.__table__.columns}
    return JSONResponse(content={"contact": contact_dict})
 
@router.put("/{contact_id}")
async def update_contact(contact_id: int, payload: schemas.ContactUpdate, db: Session = Depends(get_db)):
    db_contact = db.query(models.Contact).filter(models.Contact.id == contact_id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_contact, key, value)
        
    db.commit()
    db.refresh(db_contact)
    
    contact_dict = {c.name: getattr(db_contact, c.name) for c in db_contact.__table__.columns}
    return JSONResponse(content={"message": "Contact updated", "contact": contact_dict})
 
@router.patch("/{contact_id}")
async def patch_contact(contact_id: int, payload: schemas.ContactUpdate, db: Session = Depends(get_db)):
    return await update_contact(contact_id, payload, db)

@router.delete("/all")
async def delete_all_contacts(db: Session = Depends(get_db)):
    count = db.query(models.Contact).delete()
    db.commit()
    return JSONResponse(content={"message": f"Deleted {count} contacts"})
 
@router.delete("/{contact_id}")
async def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    db_contact = db.query(models.Contact).filter(models.Contact.id == contact_id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    id_deleted = db_contact.id
    db.delete(db_contact)
    db.commit()
    return JSONResponse(content={"message": "Contact deleted", "id": id_deleted})
