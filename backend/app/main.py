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

# ...existing code...
def _create_dev_user_if_missing():
    db = database.SessionLocal()
    try:
        # create or ensure a list of dev users exist
        dev_users = [
            {"employee_code": "TEST001", "password": "test123", "is_registered": True, "role_id": None},
            {"employee_code": "EMP002", "password": "user123", "is_registered": True, "role_id": 1},  # regular user
        ]

        for udef in dev_users:
            existing = db.query(models.User).filter(models.User.employee_code == udef["employee_code"]).first()
            if not existing:
                user = models.User(
                    employee_code=udef["employee_code"],
                    hashed_password=auth.get_password_hash(udef["password"]),
                    is_registered=udef["is_registered"],
                )
                # set role_id if your model has it
                if hasattr(user, "role_id") and udef.get("role_id") is not None:
                    setattr(user, "role_id", udef["role_id"])
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"Created dev user: {udef['employee_code']} / {udef['password']}")
            else:
                print("Dev user already exists:", existing.employee_code)

        # Debug: list users currently in DB (avoid accessing relationships)
        users = db.query(models.User).all()
        print("Users in DB:")
        for u in users:
            uid = getattr(u, "id", None)
            code = getattr(u, "employee_code", "<no_code>")
            role = getattr(u, "role_id", None)
            registered = getattr(u, "is_registered", None)
            hashed = getattr(u, "hashed_password", "") or ""
            print(f" - id={uid} code={code} role_id={role} registered={registered} hashed_prefix={hashed[:24]}")

        # Verify the test passwords against the stored hash (if helper available)
        if hasattr(auth, "verify_password"):
            for udef in dev_users:
                try:
                    row = db.query(models.User).filter(models.User.employee_code == udef["employee_code"]).first()
                    ok = auth.verify_password(udef["password"], getattr(row, "hashed_password", ""))
                    print(f"auth.verify_password('{udef['password']}', {udef['employee_code']}) =>", ok)
                except Exception as e:
                    print("Error verifying password for", udef["employee_code"], e)

        # Print DB engine url for sanity
        try:
            engine = getattr(database, "engine", None)
            if engine is not None:
                print("Database engine url:", str(engine.url))
        except Exception:
            pass

    except Exception as e:
        db.rollback()
        print("Dev user creation error:", e)
    finally:
        db.close()
# ...existing code...

@app.on_event("startup")
def _on_startup():
    # 1. Create all tables
    database.Base.metadata.create_all(bind=database.engine)
    print("Database tables ensured.")

    # 1b. Add Hindi translation columns if missing (SQLite ALTER TABLE)
    _ensure_hindi_columns()

    # 2. Seed roles + ADMIN001
    from .seed_mvp import seed_data
    seed_data()
    print("Seed data ensured.")

    # 3. Create dev users
    _create_dev_user_if_missing()


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