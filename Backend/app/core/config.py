from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str
    API_V1_STR: str
    
    JWT_SECRET_KEY: str
    JWT_REFRESH_SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    
    DATABASE_URL: str
    
    model_config = ConfigDict(case_sensitive=True, env_file=".env", env_file_encoding="utf-8")

settings = Settings()
