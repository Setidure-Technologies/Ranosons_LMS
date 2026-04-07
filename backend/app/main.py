from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import endpoints
from app import database, models, auth

from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="Ranoson Springs LMS", version="0.1.0")

# Create static directory if it doesn't exist
os.makedirs("static/videos", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://localhost:4801",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(endpoints.router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {"message": "Welcome to Ranoson Springs LMS API"}

# End of root route

@app.on_event("startup")
def _on_startup():
    # 1. Create all tables
    database.Base.metadata.create_all(bind=database.engine)
    print("Database tables ensured.")

    # 1b. Add Hindi translation columns if missing (SQLite ALTER TABLE)
    _ensure_hindi_columns()

    # Seed roles + ADMIN001
    from .seed_mvp import seed_data
    seed_data()
    print("Seed data ensured.")


def _ensure_hindi_columns():
    """Add Hindi translation columns if they don't exist yet (for existing databases)."""
    from sqlalchemy import text, inspect
    inspector = inspect(database.engine)

    # Module columns
    module_cols = [c['name'] for c in inspector.get_columns('modules')]
    hindi_module_cols = {
        'hindi_description': 'TEXT',
        'hindi_objectives': 'TEXT',
        'hindi_applications': 'TEXT',
        'hindi_quiz_data': 'TEXT',
    }
    for col_name, col_type in hindi_module_cols.items():
        if col_name not in module_cols:
            with database.engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE modules ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            print(f"  Added column modules.{col_name}")

    # ModuleStep columns
    step_cols = [c['name'] for c in inspector.get_columns('module_steps')]
    hindi_step_cols = {
        'hindi_title': 'VARCHAR',
        'hindi_content': 'TEXT',
    }
    for col_name, col_type in hindi_step_cols.items():
        if col_name not in step_cols:
            with database.engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE module_steps ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            print(f"  Added column module_steps.{col_name}")

    print("Hindi translation columns ensured.")