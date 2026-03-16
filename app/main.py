import uvicorn

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.v1.api import router as api_router
from app.core.config import settings
from app.db.seed import seed_database
from app.db.session import Base, engine


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version=settings.app_version)

    # Mount static files from the app/static directory.
    app.mount("/static", StaticFiles(directory="app/static"), name="static")

    app.include_router(api_router)

    return app


app = create_app()


# Create database tables & seed on startup
Base.metadata.create_all(bind=engine)
seed_database()


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
