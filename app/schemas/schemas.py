from typing import Optional

from pydantic import BaseModel


class ChatMessage(BaseModel):
    message: str


class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    date: str
    time: str
    timezone: Optional[str] = "UTC"
    start_datetime: Optional[str] = ""
    end_datetime: Optional[str] = ""
    duration: Optional[int] = 30
    participants: Optional[str] = ""
    reminders: Optional[str] = '{"useDefault": true, "overrides": []}'
 
 
class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    timezone: Optional[str] = None
    start_datetime: Optional[str] = None
    end_datetime: Optional[str] = None
    duration: Optional[int] = None
    participants: Optional[str] = None
    reminders: Optional[str] = None


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
