from sqlalchemy.orm import Session, joinedload
from . import models, schemas
from typing import Optional

# --- User Management ---
def get_user_by_code(db: Session, employee_code: str):
    return db.query(models.User).filter(models.User.employee_code == employee_code).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

# --- Role Management ---
def get_roles(db: Session):
    return db.query(models.Role).all()

def create_role(db: Session, role: schemas.RoleCreate):
    db_role = models.Role(name=role.name, permissions=role.permissions)
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role

def create_user(db: Session, user: schemas.UserCreate):
    from .auth import get_password_hash
    hashed = None
    if user.password:
        hashed = get_password_hash(user.password)
        
    db_user = models.User(
        employee_code=user.employee_code,
        role_id=user.role_id,
        phone_number=user.phone_number,
        hashed_password=hashed,
        is_registered=True if hashed else False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def register_user(db: Session, db_user: models.User, password: str):
    from .auth import get_password_hash
    db_user.hashed_password = get_password_hash(password)
    db_user.is_registered = True
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Module Management ---
def create_module_with_steps(db: Session, module: schemas.ModuleCreate, creator_id: int):
    # 1. Create Module
    db_module = models.Module(
        title=module.title,
        description=module.description,
        video_url=module.video_url,
        created_by_id=creator_id
    )
    db.add(db_module)
    db.commit()
    db.refresh(db_module)

    # 2. Create Steps
    for step_data in module.steps:
        db_step = models.ModuleStep(
            module_id=db_module.id,
            title=step_data.title,
            content=step_data.content,
            media_url=step_data.media_url,
            step_type=step_data.step_type,
            order_index=step_data.order_index
        )
        db.add(db_step)
        db.commit()
        db.refresh(db_step)

        # 3. Create Assignment if exists
        if step_data.assignment:
            db_assign = models.AssignmentQuestion(
                step_id=db_step.id,
                question_text=step_data.assignment.question_text,
                correct_value=step_data.assignment.correct_value,
                tolerance=step_data.assignment.tolerance,
                unit=step_data.assignment.unit
            )
            db.add(db_assign)
            db.commit()
    
    return db_module

def get_module(db: Session, module_id: int):
    return db.query(models.Module).filter(models.Module.id == module_id).first()

def get_all_modules(db: Session):
    return db.query(models.Module).all()

def update_module(db: Session, module_id: int, module_update: schemas.ModuleCreate):
    db_module = get_module(db, module_id)
    if not db_module:
        return None
    
    # Update basic fields
    db_module.title = module_update.title
    db_module.description = module_update.description
    db_module.video_url = module_update.video_url
    db_module.objectives = module_update.objectives
    db_module.applications = module_update.applications
    db_module.quiz_data = module_update.quiz_data
    
    # Update steps (Full replacement strategy for simplicity, or smart update)
    # For now, we will delete existing steps and recreate them if provided
    # BUT, we need to be careful not to lose media_urls if not provided back
    # A better approach for the frontend is to send the full state.
    
    if module_update.steps:
        # Remove old steps
        db.query(models.ModuleStep).filter(models.ModuleStep.module_id == module_id).delete()
        
        # Add new steps
        for step_data in module_update.steps:
            db_step = models.ModuleStep(
                module_id=module_id,
                title=step_data.title,
                content=step_data.content,
                media_url=step_data.media_url,
                step_type=step_data.step_type,
                order_index=step_data.order_index
            )
            db.add(db_step)
            
            if step_data.assignment:
                db_assign = models.AssignmentQuestion(
                    step_id=db_step.id, # This ID won't be available until flush/commit if we don't flush
                    question_text=step_data.assignment.question_text,
                    correct_value=step_data.assignment.correct_value,
                    tolerance=step_data.assignment.tolerance,
                    unit=step_data.assignment.unit
                )
                # We need to flush to get the step ID? 
                # Actually, if we add db_step to session, we can access it after flush
                db.flush() 
                db_assign.step_id = db_step.id
                db.add(db_assign)
                
    db.commit()
    db.refresh(db_module)
    return db_module

# --- Progress & Validation ---
def get_user_progress(db: Session, user_id: int, module_id: int):
    return db.query(models.UserProgress).filter(
        models.UserProgress.user_id == user_id,
        models.UserProgress.module_id == module_id
    ).first()

def validate_step(step: models.ModuleStep, user_value: str) -> bool:
    if not step.assignment:
        return True # No assignment, just an instruction step
    
    correct = step.assignment.correct_value
    tolerance = step.assignment.tolerance
    
    if tolerance is not None:
        try:
            user_float = float(user_value)
            correct_float = float(correct)
            return (correct_float - tolerance) <= user_float <= (correct_float + tolerance)
        except ValueError:
            return False
    else:
        return user_value.strip().lower() == correct.strip().lower()

def update_progress(db: Session, user_id: int, module_id: int, step_index: int, passed: bool):
    progress = get_user_progress(db, user_id, module_id)
    if not progress:
        progress = models.UserProgress(user_id=user_id, module_id=module_id, current_step_index=0, status="In Progress")
        db.add(progress)
    
    if passed:
        # Move to next step if this was the current step
        # Note: Logic can be more complex (e.g. only advance if step_index == current)
        if step_index >= progress.current_step_index:
             progress.current_step_index = step_index + 1
    
    db.commit()
    db.refresh(progress)
    return progress

def assign_module_to_user(db: Session, user_id: int, module_id: int):
    # Check if already assigned
    existing = get_user_progress(db, user_id, module_id)
    if existing:
        return existing
    
    # Create new progress entry
    progress = models.UserProgress(
        user_id=user_id, 
        module_id=module_id, 
        current_step_index=0, 
        status="Not Started"
    )
    db.add(progress)
    db.commit()
    db.refresh(progress)
    return progress

# --- Comments ---
def create_comment(db: Session, comment: schemas.CommentCreate, user_id: int):
    db_comment = models.Comment(
        module_id=comment.module_id,
        user_id=user_id,
        text=comment.text,
        parent_id=comment.parent_id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

def get_comments_for_module(db: Session, module_id: int):
    # Fetch top-level comments (frontend can fetch replies recursively or we eager load)
    return db.query(models.Comment).filter(models.Comment.module_id == module_id, models.Comment.parent_id == None).all()

# --- Learning Resources ---
def get_all_resources(db: Session):
    return db.query(models.LearningResource).all()

def create_resource(db: Session, resource: schemas.LearningResourceCreate):
    db_resource = models.LearningResource(**resource.dict())
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource

# --- Quiz History ---
def create_quiz_attempt(db: Session, attempt: schemas.QuizAttemptCreate, user_id: int):
    db_attempt = models.QuizAttempt(
        user_id=user_id,
        module_id=attempt.module_id,
        score=attempt.score,
        max_score=attempt.max_score,
        passed=attempt.passed,
        attempt_data=attempt.attempt_data
    )
    db.add(db_attempt)
    db.commit()
    db.refresh(db_attempt)
    return db_attempt

def get_user_quiz_attempts(db: Session, user_id: int):
    return db.query(models.QuizAttempt).options(joinedload(models.QuizAttempt.module)).filter(models.QuizAttempt.user_id == user_id).order_by(models.QuizAttempt.created_at.desc()).all()

def get_quiz_attempt(db: Session, attempt_id: int):
    return db.query(models.QuizAttempt).options(joinedload(models.QuizAttempt.module)).filter(models.QuizAttempt.id == attempt_id).first()
