import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://hippocamp:hippocamp_local@localhost:5432/hippocamp"
    )
    
    # Will add more settings as needed (AWS, auth, etc.)


settings = Settings()

