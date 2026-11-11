from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    SENTIMENT_MODEL_ID: str = "cardiffnlp/twitter-roberta-base-sentiment-latest"
    DEVICE: str = "cpu"
    MAX_UPLOAD_SIZE_MB: int = 10
    OCR_CONFIDENCE_THRESHOLD: float = 0.4
    OCR_LANGUAGES: List[str] = ["en"]
    DATABASE_URL: str = "sqlite:///./sentivision.db"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    MODEL_CACHE_DIR: str = "./model_cache"


settings = Settings()
