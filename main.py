import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from database.config import engine, Base
from database.seed import seed_database
from routers import pages, chat, meetings, contacts

# Create database tables
Base.metadata.create_all(bind=engine)

# Seed database securely
seed_database()


app = FastAPI(title="AI Meeting Scheduler", version="2.0.0")

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(pages.router)
app.include_router(chat.router)
app.include_router(meetings.router)
app.include_router(contacts.router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)