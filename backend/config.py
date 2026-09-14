"""
config.py — loads environment variables from .env via python-dotenv.
All other modules import `settings` from here; never read env vars directly.
"""

from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    gemini_api_key: str = ""
    github_token: str = ""
    database_url: str = "sqlite:///./hackathon.db"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
