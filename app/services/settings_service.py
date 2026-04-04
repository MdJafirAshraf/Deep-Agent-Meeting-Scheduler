import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models import models


def _to_dict(obj) -> dict:
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}


# Seed defaults used when the profile row does not yet exist
_DEFAULTS = {
    "first_name":   "Alex",
    "last_name":    "Johnson",
    "email":        "alex.johnson@company.com",
    "display_name": "Alex J.",
    "timezone":     "UTC-5",
}


class UserProfileService:
    """
    Business logic for the Settings → Change Details tab.
    The application has exactly ONE profile row; this service
    creates it on first access and manages all subsequent reads/writes.
    """

    def __init__(self, db: Session):
        self.db = db

    # ── private ────────────────────────────────────────────────────────────

    def _get_or_create(self) -> models.UserProfile:
        """Return the single profile row, creating it with defaults if absent."""
        profile = self.db.query(models.UserProfile).first()
        if not profile:
            profile = models.UserProfile(**_DEFAULTS)
            self.db.add(profile)
            self.db.commit()
            self.db.refresh(profile)
        return profile

    # ── public ─────────────────────────────────────────────────────────────

    def get_profile(self) -> dict:
        """Fetch the profile (auto-creates default row on first call)."""
        return _to_dict(self._get_or_create())

    def update_profile(self, payload) -> dict:
        """
        Partial-update the profile.
        Accepts either a Pydantic model (preferred) or a plain dict.
        Only non-None / explicitly-set fields are written.
        """
        profile = self._get_or_create()

        # Normalise to dict
        if hasattr(payload, "model_dump"):
            data = payload.model_dump(exclude_unset=True)
        else:
            data = {k: v for k, v in (payload or {}).items() if v is not None}

        if not data:
            return _to_dict(profile)

        for field, value in data.items():
            if hasattr(profile, field):
                setattr(profile, field, value)

        profile.updated_at = datetime.datetime.now().isoformat()
        self.db.commit()
        self.db.refresh(profile)
        return _to_dict(profile)