from typing import Optional

from pydantic import BaseModel


class ChatMessage(BaseModel):
    message: str


class MeetingCreate(BaseModel):
    title: str
    type: Optional[str] = "Internal"
    platform: Optional[str] = "Google Meet"
    participants: Optional[str] = ""
    date: str
    time: str
    duration: Optional[int] = 30
    link: Optional[str] = ""


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    platform: Optional[str] = None
    participants: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    duration: Optional[int] = None
    link: Optional[str] = None


class ContactCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    notes: Optional[str] = ""


class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
