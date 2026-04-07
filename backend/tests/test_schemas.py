"""
Unit tests for app/schemas.py — Pydantic validation.
"""
import pytest
from pydantic import ValidationError
from app.schemas import (
    UserCreate,
    UserLogin,
    UserRegister,
    ModuleCreate,
    ModuleStepCreate,
    QuizAttemptCreate,
    StepSubmission,
    RoleCreate,
    CommentCreate,
    LearningResourceCreate,
)


# ── UserCreate ────────────────────────────────────────────────────────────────

def test_user_create_valid():
    u = UserCreate(employee_code="EMP001", role_id=1, password="pw")
    assert u.employee_code == "EMP001"
    assert u.role_id == 1


def test_user_create_missing_employee_code():
    with pytest.raises(ValidationError):
        UserCreate(role_id=1)


def test_user_create_missing_role_id():
    with pytest.raises(ValidationError):
        UserCreate(employee_code="EMP001")


def test_user_create_optional_phone():
    u = UserCreate(employee_code="EMP002", role_id=2, phone_number="9876543210")
    assert u.phone_number == "9876543210"


# ── UserLogin / UserRegister ──────────────────────────────────────────────────

def test_user_login_valid():
    u = UserLogin(employee_code="EMP001", password="secret")
    assert u.employee_code == "EMP001"


def test_user_login_missing_password():
    with pytest.raises(ValidationError):
        UserLogin(employee_code="EMP001")


def test_user_register_valid():
    u = UserRegister(employee_code="EMP001", password="pass")
    assert u.password == "pass"


# ── RoleCreate ────────────────────────────────────────────────────────────────

def test_role_create_valid():
    r = RoleCreate(name="Supervisor")
    assert r.name == "Supervisor"
    assert r.permissions is None


def test_role_create_with_permissions():
    r = RoleCreate(name="Editor", permissions='["edit_module"]')
    assert r.permissions == '["edit_module"]'


# ── ModuleCreate ──────────────────────────────────────────────────────────────

def test_module_create_minimal():
    m = ModuleCreate(title="My Module")
    assert m.title == "My Module"
    assert m.steps == []
    assert m.description is None


def test_module_create_with_steps():
    m = ModuleCreate(
        title="Module A",
        steps=[ModuleStepCreate(title="Step 1", content="Do this", order_index=0)]
    )
    assert len(m.steps) == 1
    assert m.steps[0].title == "Step 1"


def test_module_create_missing_title():
    with pytest.raises(ValidationError):
        ModuleCreate()


# ── ModuleStepCreate ─────────────────────────────────────────────────────────

def test_module_step_create_valid():
    s = ModuleStepCreate(title="Step A", content="Content here", order_index=0)
    assert s.step_type == "instruction"  # default


def test_module_step_create_missing_content():
    with pytest.raises(ValidationError):
        ModuleStepCreate(title="Step A", order_index=0)


# ── StepSubmission ────────────────────────────────────────────────────────────

def test_step_submission_valid():
    s = StepSubmission(step_id=1, value="42mm")
    assert s.step_id == 1
    assert s.value == "42mm"


def test_step_submission_missing_value():
    with pytest.raises(ValidationError):
        StepSubmission(step_id=1)


# ── QuizAttemptCreate ─────────────────────────────────────────────────────────

def test_quiz_attempt_create_valid():
    q = QuizAttemptCreate(score=8.0, max_score=10.0, passed=True, attempt_data="[]")
    assert q.score == 8.0
    assert q.passed is True


def test_quiz_attempt_create_missing_score():
    with pytest.raises(ValidationError):
        QuizAttemptCreate(max_score=10.0, passed=True, attempt_data="[]")


# ── CommentCreate ─────────────────────────────────────────────────────────────

def test_comment_create_valid():
    c = CommentCreate(text="Nice!", module_id=1)
    assert c.text == "Nice!"
    assert c.parent_id is None


def test_comment_create_missing_text():
    with pytest.raises(ValidationError):
        CommentCreate(module_id=1)


# ── LearningResourceCreate ───────────────────────────────────────────────────

def test_learning_resource_create_valid():
    r = LearningResourceCreate(
        title="How to use calipers",
        resource_type="article",
        content="Use calipers gently."
    )
    assert r.resource_type == "article"
