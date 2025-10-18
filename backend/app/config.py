import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret")
    SESSION_COOKIE_NAME = "fluentai_session"
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://localhost:3002").split(",")
    REDIS_URL = os.environ.get("REDIS_URL")
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
    ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
    PROVIDER = os.environ.get("PROVIDER", "openai")  # openai|groq|anthropic
    MODEL = os.environ.get("MODEL", "gpt-4o-mini")
    MAX_TOKENS = int(os.environ.get("MAX_TOKENS", "300"))
    SLIDING_WINDOW_TURNS = int(os.environ.get("SLIDING_WINDOW_TURNS", "10"))
    PORT = int(os.environ.get("PORT", "8001"))