from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Standard Metadata
    app_name: str = "AI Meeting Scheduler"
    app_version: str = "2.0.0"
    debug: bool = False

    # Database Configuration
    # In V2, use 'validation_alias' to map environment variables
    database_url: str = Field(
        default="sqlite:///app\\db\\scheduler.db", 
        validation_alias="DATABASE_URL"
    )

    # MNC Standard: Using SettingsConfigDict instead of 'class Config'
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False  # Recommended for cross-platform compatibility
    )

settings = Settings()