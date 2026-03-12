"""
AI Meeting Scheduler - FastAPI Application
"""

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from datetime import datetime
import uvicorn

# ── App Setup ──────────────────────────────────────────────────────────────────
app = FastAPI(title="AI Meeting Scheduler", version="1.0.0")

# Mount static files (CSS, JS, images)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Jinja2 templates
templates = Jinja2Templates(directory="templates")


# ── Models ─────────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    message: str


class MeetingCreate(BaseModel):
    title: str
    participants: str = ""
    date: str
    time: str
    duration: int = 30
    link: str = ""


# ── In-Memory Store (replace with DB later) ───────────────────────────────────
meetings: list[dict] = []
chat_history: list[dict] = []


# ── Helper: AI Response Generator ─────────────────────────────────────────────
def generate_ai_response(user_message: str) -> str:
    """
    Generate a context-aware AI response based on keywords in the user message.
    Replace this with a real LLM integration (OpenAI, Gemini, etc.) later.
    """
    text = user_message.lower()

    if "schedule" in text or "sync" in text or "meeting" in text:
        return (
            'I can help with that! I\'ve drafted a meeting invitation for you. 📅<br><br>'
            'Please review the details, and I can send out the invites.'
            '<div class="mt-3 p-3 bg-light rounded-4 border border-primary border-opacity-10 shadow-sm">'
            '  <div class="d-flex justify-content-between align-items-start mb-2">'
            '    <div>'
            '      <strong class="text-dark d-block">Draft: Cross-team Sync</strong>'
            '      <span class="text-muted small"><i class="fa-regular fa-clock me-1"></i> Tomorrow, 10:00 AM (30 min)</span>'
            '    </div>'
            '    <button class="btn btn-sm btn-primary shadow-sm rounded-pill px-3" '
            '            data-bs-toggle="modal" data-bs-target="#meetingModal">Review</button>'
            '  </div>'
            '</div>'
        )

    if "availability" in text or "free" in text or "find time" in text:
        return (
            'Looking at your calendar, here is your availability for today:<br>'
            '<ul class="mb-3 mt-2 ps-3 text-dark">'
            '  <li><strong class="text-success">Free</strong>: 11:30 AM – 1:00 PM (1.5 hrs)</li>'
            '  <li><strong class="text-success">Free</strong>: 3:30 PM – 5:00 PM (1.5 hrs)</li>'
            '</ul>'
            'Would you like me to hold any of that time for deep work?'
            '<div class="quick-actions mt-3 d-flex flex-wrap gap-2">'
            '  <button class="btn btn-sm btn-white text-primary fw-medium rounded-pill shadow-sm border hover-lift" '
            '          onclick="sendQuickAction(\'Block 1:30 PM for lunch\')">Block Lunch</button>'
            '  <button class="btn btn-sm btn-white text-primary fw-medium rounded-pill shadow-sm border hover-lift" '
            '          onclick="sendQuickAction(\'Block afternoon for deep work\')">Block Deep Work</button>'
            '</div>'
        )

    if "cancel" in text or "reschedule" in text:
        return (
            'Sure, I can help adjust your schedule. Which meeting would you like to modify?<br>'
            '<div class="mt-3 d-flex flex-column gap-2">'
            '  <div class="p-2 bg-light rounded-3 border d-flex justify-content-between align-items-center '
            '       cursor-pointer hover-shadow transition" onclick="sendQuickAction(\'Cancel Product Sync\')">'
            '    <div><div class="fw-bold small text-dark">Product Sync</div>'
            '    <div style="font-size:0.75rem;" class="text-muted">10:00 AM</div></div>'
            '    <i class="fa-solid fa-chevron-right text-muted small"></i></div>'
            '  <div class="p-2 bg-light rounded-3 border d-flex justify-content-between align-items-center '
            '       cursor-pointer hover-shadow transition" onclick="sendQuickAction(\'Cancel Client Call\')">'
            '    <div><div class="fw-bold small text-dark">Client Call: TechCorp</div>'
            '    <div style="font-size:0.75rem;" class="text-muted">2:30 PM</div></div>'
            '    <i class="fa-solid fa-chevron-right text-muted small"></i></div>'
            '</div>'
        )

    if "emma" in text:
        return (
            'I\'ve drafted a 1:1 invite with Emma based on your recent emails.<br><br>'
            '<div class="mt-2 p-3 bg-light rounded-4 border border-primary border-opacity-10 shadow-sm">'
            '  <div class="d-flex justify-content-between align-items-start mb-2">'
            '    <div>'
            '      <strong class="text-dark d-block">1:1 Sync – John / Emma</strong>'
            '      <span class="text-muted small"><i class="fa-regular fa-clock me-1"></i> Tomorrow, 11:00 AM</span>'
            '    </div>'
            '    <button class="btn btn-sm btn-primary shadow-sm rounded-pill px-3" '
            '            data-bs-toggle="modal" data-bs-target="#meetingModal">Schedule</button>'
            '  </div>'
            '</div>'
        )

    if "confirm" in text:
        return (
            '<strong>Done!</strong> 🎉 The meeting has been scheduled and '
            'invites have been sent to all participants.'
        )

    if "block" in text:
        return (
            'Got it! I\'ve blocked that time on your calendar. 🛡️<br><br>'
            'No one will be able to book over this slot.'
        )

    return (
        'I\'m here to handle your calendar tasks smoothly. 🚀<br><br>'
        'You can ask me to schedule events, manage your availability, '
        'prepare for upcoming calls, or reschedule conflicts. What\'s on your mind?'
    )


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Serve the main dashboard page."""
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/chat")
async def chat(msg: ChatMessage):
    """Handle chat messages and return AI-generated responses."""
    user_text = msg.message.strip()

    # Store user message
    chat_history.append({
        "role": "user",
        "content": user_text,
        "timestamp": datetime.now().isoformat()
    })

    # Generate AI response
    ai_response = generate_ai_response(user_text)

    # Store AI response
    chat_history.append({
        "role": "assistant",
        "content": ai_response,
        "timestamp": datetime.now().isoformat()
    })

    return JSONResponse(content={"response": ai_response})


@app.post("/api/meetings")
async def create_meeting(meeting: MeetingCreate):
    """Create a new meeting entry."""
    new_meeting = {
        "id": len(meetings) + 1,
        "title": meeting.title,
        "participants": meeting.participants,
        "date": meeting.date,
        "time": meeting.time,
        "duration": meeting.duration,
        "link": meeting.link,
        "created_at": datetime.now().isoformat()
    }
    meetings.append(new_meeting)
    return JSONResponse(
        content={"message": "Meeting created successfully", "meeting": new_meeting},
        status_code=201
    )


@app.get("/api/meetings")
async def list_meetings():
    """Return all meetings."""
    return JSONResponse(content={"meetings": meetings})


@app.get("/api/chat/history")
async def get_chat_history():
    """Return the full chat history."""
    return JSONResponse(content={"history": chat_history})


# ── Entry Point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
