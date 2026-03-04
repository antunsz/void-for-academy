import os

AGNO_DB_URL = os.getenv("AGNO_DB_URL", "sqlite:///acad.db")
AGNO_PORT = int(os.getenv("AGNO_PORT", "7777"))
AGNO_HOST = os.getenv("AGNO_HOST", "localhost")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

DEFAULT_MODEL_PROVIDER = os.getenv("ACAD_MODEL_PROVIDER", "anthropic")
DEFAULT_MODEL_ID = os.getenv("ACAD_MODEL_ID", "claude-sonnet-4-20250514")
