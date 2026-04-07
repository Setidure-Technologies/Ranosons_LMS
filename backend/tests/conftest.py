"""
Shared pytest fixtures for Ranosons LMS backend tests.

Design:
- Uses a FILE-based SQLite test DB (/tmp/test_ranoson.db) to avoid named
  in-memory cross-connection teardown bugs.
- Tables are created ONCE at module load time so the app startup event
  (which inspects the DB schema) doesn't fail.
- Per-test isolation: drop_all + create_all in the `clean_db` autouse fixture.
  The `client` fixture depends on `clean_db` so tables are always fresh when
  TestClient starts. The `db_session` fixture also depends on `clean_db`.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app import models, auth as auth_module

# ── File-based test SQLite (avoids named in-memory cross-connection issues) ───
TEST_DB_PATH = "/tmp/test_ranoson.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables ONCE at import time so app startup event can inspect them
Base.metadata.create_all(bind=engine)


# ── FastAPI dependency override ───────────────────────────────────────────────
def override_get_db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


app.dependency_overrides[get_db] = override_get_db


# ── Per-test isolation: recreate schema after each test ───────────────────────
@pytest.fixture(autouse=True)
def clean_db():
    """
    Recreate tables fresh after each test.
    All other fixtures that use the DB depend on this so they happen first.
    """
    yield
    # Teardown: dispose connections, then drop/recreate
    engine.dispose()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


# ── db_session: explicitly depends on clean_db ───────────────────────────────
@pytest.fixture()
def db_session(clean_db):
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


# ── TestClient: explicitly depends on clean_db ───────────────────────────────
@pytest.fixture()
def client(clean_db):
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


# ── Helpers ───────────────────────────────────────────────────────────────────
def _seed_role(session, name="Admin", role_id=1):
    role = models.Role(id=role_id, name=name)
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


# ── Pre-seeded user fixtures ──────────────────────────────────────────────────
@pytest.fixture()
def admin_user(db_session):
    _seed_role(db_session, name="Admin", role_id=1)
    user = models.User(
        employee_code="ADMIN001",
        hashed_password=auth_module.get_password_hash("admin123"),
        is_registered=True,
        is_active=True,
        role_id=1,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def regular_user(db_session, admin_user):
    _seed_role(db_session, name="Employee", role_id=2)
    user = models.User(
        employee_code="EMP001",
        hashed_password=auth_module.get_password_hash("emp123"),
        is_registered=True,
        is_active=True,
        role_id=2,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def admin_token(admin_user):
    return auth_module.create_access_token(data={"sub": admin_user.employee_code})


@pytest.fixture()
def user_token(regular_user):
    return auth_module.create_access_token(data={"sub": regular_user.employee_code})
