import uvicorn

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastmcp import FastMCP

from app.api.v1.api import router as api_router
from app.core.config import settings
from app.db.seed import seed_database
from app.db.session import Base, engine


# Create database tables & seed on startup
Base.metadata.create_all(bind=engine)
seed_database()

# Initialize FastAPI app with metadata.
app = FastAPI(title=settings.app_name, version=settings.app_version)

# Mount static files from the app/static directory.
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Include API routes.
app.include_router(api_router)


# Convert to MCP server
mcp = FastMCP.from_fastapi(app=app) 
mcp_app = mcp.http_app(path='/mcp') # Create ASGI app from MCP server

# Mount MCP app to FastAPI app
app.mount("/llm", mcp_app)

print("✅ MCP Server mounted at /mcp")


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
