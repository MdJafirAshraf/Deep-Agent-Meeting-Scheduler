# Deep-Agent-Meeting-Scheduler

A Deep-Agent Scheduling Assistant powered by MCP, featuring persistent memory for autonomous and intelligent meeting orchestration.

## Features

- **Premium SaaS UI:** Inspired by modern software interfaces, featuring a sleek four-column layout (Sidebar icon rail, Conversation list, Chat area, Context details).
- **AI Chat Assistant:** Interactive chat panel allowing users to communicate in natural language to schedule meetings, check availability, and reorganize events.
- **Smart Insights:** Contextual panel providing proactive suggestions, such as reminding users to schedule follow-ups or blocking time for deep work.
- **Dynamic Meeting Modal:** Clean and premium dialog for manual meeting creation/editing (with fields for title, participants, scheduling, and duration).
- **Quick Action Chips:** Pre-configured chat commands for faster interaction.
- **FastAPI Backend:** Fully converted to a modern `FastAPI` application with `Jinja2` templating and an API endpoint `/api/chat` for seamless AJAX communication.

## Tech Stack

- **Backend:** Python, FastAPI, Uvicorn
- **Frontend Engine:** Jinja2 (Templates)
- **UI & Styling:** HTML5, pure CSS3 (custom CSS variables & properties), Bootstrap 5 (for grid/modals), FontAwesome 6
- **Interactions:** Vanilla JavaScript (`fetch` API for asynchronous chatting)

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repo_url>
   cd Deep-Agent-Meeting-Scheduler
   ```

2. **Install Dependencies:**
   Make sure you have Python installed, then install the required pip packages.
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Application:**
   Start the FastAPI server using Uvicorn.
   ```bash
   python main.py
   ```
   Or alternatively:
   ```bash
   uvicorn main:app --reload
   ```

4. **Access the App:**
   Open your browser and navigate to:
   [http://localhost:8000](http://localhost:8000)

## Project Structure

```text
Deep-Agent-Meeting-Scheduler/
├── main.py                  # Main FastAPI application and API routes
├── requirements.txt         # Project pip dependencies
├── templates/
│   └── index.html           # Main dashboard Jinja2 layout
└── static/
    ├── css/
    │   └── styles.css       # Premium custom styling suite
    └── js/
        └── script.js        # Frontend logic and API integration
```

## Future Roadmaps
- Integration seamlessly with LLM inference engines (OpenAI, Gemini) inside `main.py`
- Persistent Database interactions
- Advanced MCP routing and real Calendar syncs (Google Workspace/Office 365)

```
Deep-Agent-Meeting-Scheduler
├─ .python-version
├─ app
│  ├─ api
│  │  ├─ v1
│  │  │  ├─ api.py
│  │  │  ├─ endpoints
│  │  │  │  ├─ chat.py
│  │  │  │  ├─ contacts.py
│  │  │  │  ├─ meetings.py
│  │  │  │  ├─ pages.py
│  │  │  │  └─ __init__.py
│  │  │  └─ __init__.py
│  │  └─ __init__.py
│  ├─ core
│  │  ├─ config.py
│  │  └─ __init__.py
│  ├─ db
│  │  ├─ seed.py
│  │  ├─ session.py
│  │  └─ __init__.py
│  ├─ main.py
│  ├─ models
│  │  ├─ models.py
│  │  └─ __init__.py
│  ├─ schemas
│  │  ├─ schemas.py
│  │  └─ __init__.py
│  ├─ services
│  │  ├─ chat_service.py
│  │  ├─ contact_service.py
│  │  ├─ meeting_service.py
│  │  └─ __init__.py
│  ├─ static
│  │  ├─ css
│  │  │  ├─ calendar.css
│  │  │  ├─ contacts.css
│  │  │  ├─ meetings.css
│  │  │  ├─ settings.css
│  │  │  └─ styles.css
│  │  └─ js
│  │     ├─ calendar.js
│  │     ├─ contacts.js
│  │     ├─ meetings.js
│  │     ├─ script.js
│  │     └─ settings.js
│  ├─ templates
│  │  ├─ base.html
│  │  ├─ calendar.html
│  │  ├─ contacts.html
│  │  ├─ index.html
│  │  ├─ meetings.html
│  │  └─ settings.html
│  └─ __init__.py
├─ pyproject.toml
├─ README.md
├─ requirements.txt
├─ run.py
└─ uv.lock

```