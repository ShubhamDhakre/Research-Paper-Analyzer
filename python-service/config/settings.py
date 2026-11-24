import os
from pathlib import Path
from dotenv import load_dotenv

# Path to the root .env file
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_ENV_PATH = ROOT_DIR / ".env"

if ROOT_ENV_PATH.exists():
    load_dotenv(dotenv_path=ROOT_ENV_PATH)
else:
    load_dotenv()


class Settings:
    PROJECT_NAME: str = "AI Research Paper Analyzer - AI Service"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("NODE_ENV", "development")
    
    # Server configuration
    PORT: int = int(os.getenv("PYTHON_SERVICE_PORT", "8000"))
    HOST: str = os.getenv("PYTHON_SERVICE_HOST", "0.0.0.0")
    
    # Allowed CORS Origins
    CLIENT_URL: str = os.getenv("CLIENT_URL", "http://localhost:5173")
    BACKEND_URL: str = f"http://localhost:{os.getenv('PORT', '5000')}"
    
    # AI / LLM Settings
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-1.5-flash")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    
    # Storage settings
    CHROMA_PERSIST_DIRECTORY: str = os.getenv("CHROMA_PERSIST_DIRECTORY", "./data/chroma")
    MAX_PDF_SIZE_MB: int = int(os.getenv("MAX_PDF_SIZE_MB", "20"))


settings = Settings()
