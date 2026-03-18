"""Entry point for the FastAPI application.

This file exists at the repository root to preserve the existing startup command
(python main.py) while the application code is organized under app/.
"""

import uvicorn
from app.main import app

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
