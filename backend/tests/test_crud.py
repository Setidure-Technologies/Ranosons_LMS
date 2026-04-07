"""
Unit tests for app/crud.py
Uses the in-memory SQLite db_session fixture from conftest.py
"""
import pytest
from app import crud, models, schemas


# ── Role ─────────────────────────────────────────────────────────────────────

def test_create_role(db_session):
    role = crud.create_role(db_session, schemas.RoleCreate(name="Tester"))
    assert role.id is not None
    assert role.name == "Tester"


def test_get_roles(db_session):
    crud.create_role(db_session, schemas.RoleCreate(name="RoleA"))
    crud.create_role(db_session, schemas.RoleCreate(name="RoleB"))
    roles = crud.get_roles(db_session)
    assert len(roles) == 2


# ── User ─────────────────────────────────────────────────────────────────────

def _make_role(db, name="Admin", rid=1):
    role = models.Role(id=rid, name=name)
    db.add(role)
    db.commit()
    return role


def test_create_user_with_password(db_session):
    _make_role(db_session)
    user = crud.create_user(db_session, schemas.UserCreate(
        employee_code="EMP100", role_id=1, password="secret"
    ))
    assert user.id is not None
    assert user.is_registered is True
    assert user.hashed_password != "secret"


def test_create_user_without_password(db_session):
    _make_role(db_session)
    user = crud.create_user(db_session, schemas.UserCreate(
        employee_code="EMP101", role_id=1
    ))
    assert user.is_registered is False
    assert user.hashed_password is None


def test_get_user_by_code(db_session):
    _make_role(db_session)
    crud.create_user(db_session, schemas.UserCreate(employee_code="EMP200", role_id=1))
    result = crud.get_user_by_code(db_session, "EMP200")
    assert result is not None
    assert result.employee_code == "EMP200"


def test_get_user_by_code_missing(db_session):
    assert crud.get_user_by_code(db_session, "NOBODY") is None


def test_delete_user(db_session):
    _make_role(db_session)
    user = crud.create_user(db_session, schemas.UserCreate(
        employee_code="EMP300", role_id=1, password="pw"
    ))
    result = crud.delete_user(db_session, user.id)
    assert result is True
    assert crud.get_user_by_code(db_session, "EMP300") is None


def test_delete_user_not_found(db_session):
    result = crud.delete_user(db_session, 9999)
    assert result is False


def test_delete_admin001_raises(db_session):
    _make_role(db_session)
    admin = crud.create_user(db_session, schemas.UserCreate(
        employee_code="ADMIN001", role_id=1, password="admin"
    ))
    with pytest.raises(ValueError, match="primary administrator"):
        crud.delete_user(db_session, admin.id)


# ── Module ────────────────────────────────────────────────────────────────────

def _make_module(db, creator_id=None):
    return crud.create_module_with_steps(db, schemas.ModuleCreate(
        title="Test Module",
        description="A test module",
        steps=[
            schemas.ModuleStepCreate(
                title="Step 1",
                content="Do this",
                step_type="instruction",
                order_index=0
            )
        ]
    ), creator_id=creator_id)


def test_create_module_with_steps(db_session):
    module = _make_module(db_session)
    assert module.id is not None
    assert module.title == "Test Module"
    steps = db_session.query(models.ModuleStep).filter_by(module_id=module.id).all()
    assert len(steps) == 1
    assert steps[0].title == "Step 1"


def test_get_module(db_session):
    module = _make_module(db_session)
    fetched = crud.get_module(db_session, module.id)
    assert fetched.id == module.id


def test_get_module_not_found(db_session):
    assert crud.get_module(db_session, 9999) is None


def test_get_all_modules(db_session):
    _make_module(db_session)
    _make_module(db_session)
    modules = crud.get_all_modules(db_session)
    assert len(modules) == 2


def test_update_module(db_session):
    module = _make_module(db_session)
    updated = crud.update_module(db_session, module.id, schemas.ModuleCreate(
        title="Updated Title",
        description="Updated desc"
    ))
    assert updated.title == "Updated Title"


def test_update_module_not_found(db_session):
    result = crud.update_module(db_session, 9999, schemas.ModuleCreate(title="X"))
    assert result is None


# ── Step Validation ───────────────────────────────────────────────────────────

def _make_step_with_assignment(db, correct_value, tolerance=None):
    module = _make_module(db)
    step = models.ModuleStep(
        module_id=module.id,
        title="Q Step",
        content="Answer me",
        step_type="question",
        order_index=1
    )
    db.add(step)
    db.commit()
    db.refresh(step)

    assignment = models.AssignmentQuestion(
        step_id=step.id,
        question_text="What is the answer?",
        correct_value=correct_value,
        tolerance=tolerance
    )
    db.add(assignment)
    db.commit()
    db.refresh(step)
    return step


def test_validate_step_no_assignment(db_session):
    module = _make_module(db_session)
    step = db_session.query(models.ModuleStep).filter_by(module_id=module.id).first()
    assert crud.validate_step(step, "anything") is True


def test_validate_step_exact_match_correct(db_session):
    step = _make_step_with_assignment(db_session, correct_value="42mm")
    assert crud.validate_step(step, "42mm") is True


def test_validate_step_exact_match_wrong(db_session):
    step = _make_step_with_assignment(db_session, correct_value="42mm")
    assert crud.validate_step(step, "50mm") is False


def test_validate_step_exact_case_insensitive(db_session):
    step = _make_step_with_assignment(db_session, correct_value="Yes")
    assert crud.validate_step(step, "yes") is True


def test_validate_step_numeric_within_tolerance(db_session):
    step = _make_step_with_assignment(db_session, correct_value="10.0", tolerance=0.5)
    assert crud.validate_step(step, "10.3") is True


def test_validate_step_numeric_outside_tolerance(db_session):
    step = _make_step_with_assignment(db_session, correct_value="10.0", tolerance=0.5)
    assert crud.validate_step(step, "11.0") is False


def test_validate_step_numeric_bad_input(db_session):
    step = _make_step_with_assignment(db_session, correct_value="10.0", tolerance=0.5)
    assert crud.validate_step(step, "not-a-number") is False


# ── Progress ─────────────────────────────────────────────────────────────────

def test_assign_module_creates_progress(db_session):
    _make_role(db_session)
    user = crud.create_user(db_session, schemas.UserCreate(employee_code="EMP400", role_id=1))
    module = _make_module(db_session)
    progress = crud.assign_module_to_user(db_session, user.id, module.id)
    assert progress.status == "Not Started"
    assert progress.current_step_index == 0


def test_assign_module_idempotent(db_session):
    _make_role(db_session)
    user = crud.create_user(db_session, schemas.UserCreate(employee_code="EMP401", role_id=1))
    module = _make_module(db_session)
    p1 = crud.assign_module_to_user(db_session, user.id, module.id)
    p2 = crud.assign_module_to_user(db_session, user.id, module.id)
    assert p1.id == p2.id


def test_update_progress_advances_step(db_session):
    _make_role(db_session)
    user = crud.create_user(db_session, schemas.UserCreate(employee_code="EMP402", role_id=1))
    module = _make_module(db_session)
    crud.assign_module_to_user(db_session, user.id, module.id)
    progress = crud.update_progress(db_session, user.id, module.id, step_index=0, passed=True)
    assert progress.current_step_index == 1


def test_update_progress_does_not_advance_on_fail(db_session):
    _make_role(db_session)
    user = crud.create_user(db_session, schemas.UserCreate(employee_code="EMP403", role_id=1))
    module = _make_module(db_session)
    crud.assign_module_to_user(db_session, user.id, module.id)
    progress = crud.update_progress(db_session, user.id, module.id, step_index=0, passed=False)
    assert progress.current_step_index == 0


# ── Comments ──────────────────────────────────────────────────────────────────

def test_create_comment(db_session):
    _make_role(db_session)
    user = crud.create_user(db_session, schemas.UserCreate(employee_code="EMP500", role_id=1))
    module = _make_module(db_session)
    comment = crud.create_comment(db_session, schemas.CommentCreate(
        text="Great module!", module_id=module.id
    ), user_id=user.id)
    assert comment.id is not None
    assert comment.text == "Great module!"


def test_get_comments_for_module(db_session):
    _make_role(db_session)
    user = crud.create_user(db_session, schemas.UserCreate(employee_code="EMP501", role_id=1))
    module = _make_module(db_session)
    crud.create_comment(db_session, schemas.CommentCreate(text="Comment 1", module_id=module.id), user_id=user.id)
    crud.create_comment(db_session, schemas.CommentCreate(text="Comment 2", module_id=module.id), user_id=user.id)
    comments = crud.get_comments_for_module(db_session, module.id)
    assert len(comments) == 2


# ── Quiz Attempts ─────────────────────────────────────────────────────────────

def test_create_quiz_attempt(db_session):
    _make_role(db_session)
    user = crud.create_user(db_session, schemas.UserCreate(employee_code="EMP600", role_id=1))
    module = _make_module(db_session)
    attempt = crud.create_quiz_attempt(db_session, schemas.QuizAttemptCreate(
        module_id=module.id,
        score=8.0,
        max_score=10.0,
        passed=True,
        attempt_data="[]"
    ), user_id=user.id)
    assert attempt.id is not None
    assert attempt.passed is True
    assert attempt.score == 8.0


def test_get_user_quiz_attempts(db_session):
    _make_role(db_session)
    user = crud.create_user(db_session, schemas.UserCreate(employee_code="EMP601", role_id=1))
    module = _make_module(db_session)
    crud.create_quiz_attempt(db_session, schemas.QuizAttemptCreate(
        module_id=module.id, score=5.0, max_score=10.0, passed=False, attempt_data="[]"
    ), user_id=user.id)
    attempts = crud.get_user_quiz_attempts(db_session, user.id)
    assert len(attempts) == 1


# ── Learning Resources ────────────────────────────────────────────────────────

def test_create_resource(db_session):
    resource = crud.create_resource(db_session, schemas.LearningResourceCreate(
        title="Article 1",
        resource_type="article",
        content="Some content"
    ))
    assert resource.id is not None
    assert resource.title == "Article 1"


def test_get_all_resources(db_session):
    crud.create_resource(db_session, schemas.LearningResourceCreate(
        title="R1", resource_type="video", content="url"
    ))
    resources = crud.get_all_resources(db_session)
    assert len(resources) == 1
