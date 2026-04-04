from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas import UserProfileUpdate
from app.services.settings_service import UserProfileService

router = APIRouter(prefix="/api/settings", tags=["settings"])


# ── GET /api/settings/profile ──────────────────────────────────────────────

@router.get("/profile", response_class=JSONResponse)
async def get_profile(db: Session = Depends(get_db)):
    """
    Return the current user profile.
    Creates a default row on first call so the front-end always
    gets a fully-populated object (never 404 on a fresh install).
    """
    svc = UserProfileService(db)
    return JSONResponse(content={"profile": svc.get_profile()})


# ── PUT /api/settings/profile ─────────────────────────────────────────────

@router.put("/profile", response_class=JSONResponse)
async def update_profile(payload: UserProfileUpdate, db: Session = Depends(get_db)):
    """
    Partial-update user profile.
    Only the fields present in the request body are changed;
    omitted fields retain their current values.
    """
    if not payload.model_dump(exclude_unset=True):
        raise HTTPException(status_code=400, detail="No fields provided for update.")

    svc = UserProfileService(db)
    updated = svc.update_profile(payload)
    return JSONResponse(content={"message": "Profile updated successfully", "profile": updated})


# ── PATCH /api/settings/profile ───────────────────────────────────────────

@router.patch("/profile", response_class=JSONResponse)
async def patch_profile(payload: UserProfileUpdate, db: Session = Depends(get_db)):
    """PATCH alias — identical semantics to PUT for this resource."""
    return await update_profile(payload, db)