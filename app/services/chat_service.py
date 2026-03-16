from sqlalchemy.orm import Session

from app.models import models


class ChatService:
    """Business logic for chat interactions."""

    def __init__(self, db: Session):
        self.db = db

    def _generate_ai_response(self, user_message: str) -> str:
        text = user_message.lower()

        if "schedule" in text or "sync" in text or "meeting" in text:
            return (
                "I can help with that! I've drafted a meeting invitation for you. 📅<br><br>"
                "Please review the details, and I can send out the invites."
                "<div class=\"mt-3 p-3 bg-light rounded-4 border border-primary border-opacity-10 shadow-sm\">"
                "  <div class=\"d-flex justify-content-between align-items-start mb-2\">"
                "    <div>"
                "      <strong class=\"text-dark d-block\">Draft: Cross-team Sync</strong>"
                "      <span class=\"text-muted small\"><i class=\"fa-regular fa-clock me-1\"></i> Tomorrow, 10:00 AM (30 min)</span>"
                "    </div>"
                "    <button class=\"btn btn-sm btn-primary shadow-sm rounded-pill px-3\" "
                "            data-bs-toggle=\"modal\" data-bs-target=\"#meetingModal\">Review</button>"
                "  </div>"
                "</div>"
            )
        if "availability" in text or "free" in text or "find time" in text:
            return (
                "Looking at your calendar, here is your availability for today:<br>"
                "<ul class=\"mb-3 mt-2 ps-3 text-dark\">"
                "  <li><strong class=\"text-success\">Free</strong>: 11:30 AM – 1:00 PM (1.5 hrs)</li>"
                "  <li><strong class=\"text-success\">Free</strong>: 3:30 PM – 5:00 PM (1.5 hrs)</li>"
                "</ul>"
                "Would you like me to hold any of that time for deep work?"
            )
        if "cancel" in text or "reschedule" in text:
            return "Sure, I can help adjust your schedule. Which meeting would you like to modify?"
        if "emma" in text:
            return (
                "I've drafted a 1:1 invite with Emma based on your recent emails.<br><br>"
                "<div class=\"mt-2 p-3 bg-light rounded-4 border border-primary border-opacity-10 shadow-sm\">"
                "  <strong class=\"text-dark d-block\">1:1 Sync – John / Emma</strong>"
                "  <span class=\"text-muted small\"><i class=\"fa-regular fa-clock me-1\"></i> Tomorrow, 11:00 AM</span>"
                "</div>"
            )
        if "confirm" in text:
            return "<strong>Done!</strong> 🎉 The meeting has been scheduled and invites sent."
        if "block" in text:
            return "Got it! I've blocked that time on your calendar. 🛡️<br>No one will be able to book over this slot."

        return (
            "I'm here to handle your calendar tasks smoothly. 🚀<br><br>"
            "You can ask me to schedule events, manage your availability, "
            "prepare for upcoming calls, or reschedule conflicts. What's on your mind?"
        )

    def append_user_message(self, content: str) -> models.ChatMessage:
        msg = models.ChatMessage(role="user", content=content)
        self.db.add(msg)
        self.db.flush()
        return msg

    def append_assistant_message(self, content: str) -> models.ChatMessage:
        msg = models.ChatMessage(role="assistant", content=content)
        self.db.add(msg)
        self.db.flush()
        return msg

    def get_history(self):
        history = (
            self.db.query(models.ChatMessage)
            .order_by(models.ChatMessage.timestamp.asc())
            .all()
        )
        return [
            {c.name: getattr(msg, c.name) for c in msg.__table__.columns} for msg in history
        ]

    def respond(self, user_text: str):
        user_text = user_text.strip()
        self.append_user_message(user_text)
        ai_response = self._generate_ai_response(user_text)
        self.append_assistant_message(ai_response)
        self.db.commit()
        return ai_response
