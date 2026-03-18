from sqlalchemy import Column, Integer, String, Text

from app.db.session import Base

import datetime


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    type = Column(String, default="Internal")
    platform = Column(String, default="Google Meet")
    participants = Column(Text, default="")
    date = Column(String)
    time = Column(String)
    duration = Column(Integer, default=30)
    link = Column(String, default="")
    created_at = Column(String, default=lambda: datetime.datetime.now().isoformat())
    updated_at = Column(
        String,
        default=lambda: datetime.datetime.now().isoformat(),
        onupdate=lambda: datetime.datetime.now().isoformat(),
    )


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True)
    last_name = Column(String, index=True)
    email = Column(String, default="")
    phone = Column(String, default="")
    notes = Column(Text, default="")
    created_at = Column(String, default=lambda: datetime.datetime.now().isoformat())
    updated_at = Column(
        String,
        default=lambda: datetime.datetime.now().isoformat(),
        onupdate=lambda: datetime.datetime.now().isoformat(),
    )


class ChatMessage(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String)  # 'user' or 'assistant'
    content = Column(Text)
    timestamp = Column(String, default=lambda: datetime.datetime.now().isoformat())
