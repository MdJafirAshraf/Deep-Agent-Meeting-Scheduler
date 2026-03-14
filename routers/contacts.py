from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime
from models.schemas import ContactCreate, ContactUpdate
from database.store import contacts, next_cid

router = APIRouter(prefix="/api/contacts", tags=["contacts"])

@router.get("")
async def list_contacts(role: Optional[str]=None, company: Optional[str]=None, status: Optional[str]=None, search: Optional[str]=None):
    result = list(contacts.values())
    if role:    result = [c for c in result if (c.get("role") or "").lower()==role.lower()]
    if company: result = [c for c in result if (c.get("company") or "").lower()==company.lower()]
    if status:  result = [c for c in result if (c.get("status") or "").lower()==status.lower()]
    if search:
        q = search.lower()
        result = [c for c in result if q in (c.get("first_name","")+" "+c.get("last_name","")).lower()
                                    or q in (c.get("email","")).lower()
                                    or q in (c.get("company","")).lower()]
    result.sort(key=lambda c: (c.get("last_name",""), c.get("first_name","")))
    return JSONResponse(content={"contacts": result, "total": len(result)})
 
@router.post("", status_code=201)
async def create_contact(payload: ContactCreate):
    cid = next_cid()
    c = {"id": cid, **payload.model_dump(), "created_at": datetime.now().isoformat(), "updated_at": datetime.now().isoformat()}
    contacts[cid] = c
    return JSONResponse(content={"message": "Contact created", "contact": c}, status_code=201)

@router.get("/stats/summary")
async def contacts_stats():
    all_c = list(contacts.values())
    companies = set(c.get("company") for c in all_c if c.get("company"))
    by_role = {}
    for c in all_c:
        r = c.get("role","Other"); by_role[r] = by_role.get(r,0)+1
    return JSONResponse(content={
        "total": len(all_c),
        "active": sum(1 for c in all_c if c.get("status")=="Active"),
        "inactive": sum(1 for c in all_c if c.get("status")=="Inactive"),
        "pending": sum(1 for c in all_c if c.get("status")=="Pending"),
        "companies": len(companies),
        "by_role": by_role,
    })
 
@router.get("/{contact_id}")
async def get_contact(contact_id: int):
    c = contacts.get(contact_id)
    if not c: raise HTTPException(status_code=404, detail="Contact not found")
    return JSONResponse(content={"contact": c})
 
@router.put("/{contact_id}")
async def update_contact(contact_id: int, payload: ContactUpdate):
    c = contacts.get(contact_id)
    if not c: raise HTTPException(status_code=404, detail="Contact not found")
    c.update({k: v for k, v in payload.model_dump(exclude_none=True).items()})
    c["updated_at"] = datetime.now().isoformat()
    contacts[contact_id] = c
    return JSONResponse(content={"message": "Contact updated", "contact": c})
 
@router.patch("/{contact_id}")
async def patch_contact(contact_id: int, payload: ContactUpdate):
    return await update_contact(contact_id, payload)

@router.delete("/all")
async def delete_all_contacts():
    count = len(contacts); contacts.clear()
    return JSONResponse(content={"message": f"Deleted {count} contacts"})
 
@router.delete("/{contact_id}")
async def delete_contact(contact_id: int):
    if contact_id not in contacts: raise HTTPException(status_code=404, detail="Contact not found")
    del contacts[contact_id]
    return JSONResponse(content={"message": "Contact deleted", "id": contact_id})
