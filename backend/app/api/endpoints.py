import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from .. import crud, models, schemas
from ..database import get_db
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from ..auth import SECRET_KEY, ALGORITHM

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        employee_code: str = payload.get("sub")
        if employee_code is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_code(db, employee_code=employee_code)
    if user is None:
        raise credentials_exception
    return user

# --- Auth & User Management ---

@router.post("/auth/register")
def register(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    user = crud.get_user_by_code(db, employee_code=user_data.employee_code)
    if not user:
        raise HTTPException(status_code=400, detail="User not recognized (Ask Admin to whitelist)")
    if user.is_registered:
        raise HTTPException(status_code=400, detail="User already registered")
    
    crud.register_user(db, user, user_data.password)
    return {"message": "Registration successful"}

@router.post("/auth/login", response_model=schemas.Token)
def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    from ..auth import verify_password, create_access_token
    user = crud.get_user_by_code(db, employee_code=user_data.employee_code)
    if not user or not user.hashed_password:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user.employee_code})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/auth/me", response_model=schemas.UserMe)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# --- Admin: User Management ---

@router.post("/assignments", response_model=schemas.UserProgress)
def assign_module(request: schemas.AssignModuleRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # TODO: Check if current_user is Admin
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return crud.assign_module_to_user(db, request.user_id, request.module_id)

# --- Admin: User Management ---

@router.post("/users", response_model=schemas.User)
def create_user_whitelist(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # TODO: Check if current_user is Admin
    existing = crud.get_user_by_code(db, user.employee_code)
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    return crud.create_user(db, user)

@router.get("/users", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # TODO: Check if current_user is Admin
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # TODO: Check if current_user is Admin
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        deleted = crud.delete_user(db, user_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "User deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Admin: Role Management ---

@router.get("/roles", response_model=List[schemas.Role])
def read_roles(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.get_roles(db)

@router.post("/roles", response_model=schemas.Role)
def create_role(role: schemas.RoleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing = db.query(models.Role).filter(models.Role.name == role.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Role already exists")
    
    return crud.create_role(db, role)

# --- Modules & Learning ---

from .tasks import process_video_task

@router.post("/modules", response_model=schemas.Module)
def create_module(module: schemas.ModuleCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # TODO: Check permissions
    
    # Create module in DB first
    db_module = crud.create_module_with_steps(db, module, current_user.id)
    
    # If video_url is present (and it's a local file we uploaded), trigger processing
    if module.video_url and "static/videos" in module.video_url:
        # Extract relative path from URL (naive approach)
        # URL: http://localhost:8000/static/videos/xyz.mp4 -> static/videos/xyz.mp4
        try:
            video_path = module.video_url.split("8000/")[-1]
            
            # Set processing flag
            db_module.is_processing = True
            db.commit()
            
            # Add to background tasks
            background_tasks.add_task(process_video_task, db_module.id, video_path, module.description)
        except Exception as e:
            print(f"Error triggering background task: {e}")
            
    return db_module

@router.get("/modules", response_model=List[schemas.Module])
def read_modules(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_all_modules(db)

@router.get("/modules/{module_id}", response_model=schemas.Module)
def read_module(module_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    module = crud.get_module(db, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    return module

@router.put("/modules/{module_id}", response_model=schemas.Module)
def update_module(module_id: int, module: schemas.ModuleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # TODO: Check admin permissions
    db_module = crud.update_module(db, module_id, module)
    if not db_module:
        raise HTTPException(status_code=404, detail="Module not found")
    return db_module

@router.delete("/modules/{module_id}")
def delete_module(module_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # TODO: Check admin permissions
    db_module = crud.get_module(db, module_id)
    if not db_module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    # Cleanup Files
    if db_module.video_url and "static/videos" in db_module.video_url:
        try:
            # URL: http://localhost:8000/static/videos/xyz.mp4 -> static/videos/xyz.mp4
            video_path = db_module.video_url.split("8000/")[-1]
            if os.path.exists(video_path):
                os.remove(video_path)
                print(f"🗑️ Deleted original video: {video_path}")
        except Exception as e:
            print(f"⚠️ Error deleting original video: {e}")

    # Delete segmented videos directory
    course_dir = os.path.join("static", "courses", str(module_id))
    if os.path.exists(course_dir):
        try:
            shutil.rmtree(course_dir)
            print(f"🗑️ Deleted course directory: {course_dir}")
        except Exception as e:
            print(f"⚠️ Error deleting course directory: {e}")

    # Delete user progress (unassign from all users)
    db.query(models.UserProgress).filter(models.UserProgress.module_id == module_id).delete()
    # Delete associated steps
    db.query(models.ModuleStep).filter(models.ModuleStep.module_id == module_id).delete()
    # Delete quiz attempts
    db.query(models.QuizAttempt).filter(models.QuizAttempt.module_id == module_id).delete()
    # Delete the module
    db.delete(db_module)
    db.commit()
    
    return {"message": "Module deleted successfully"}

@router.post("/steps/{step_id}/submit", response_model=schemas.SubmissionResult)
def submit_step(step_id: int, submission: schemas.StepSubmission, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    step = db.query(models.ModuleStep).filter(models.ModuleStep.id == step_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    
    passed = crud.validate_step(step, submission.value)
    
    # Update progress
    crud.update_progress(db, current_user.id, step.module_id, step.order_index, passed)
    
    msg = "Correct!" if passed else "Incorrect. Please try again."
    if not passed and step.assignment and step.assignment.tolerance:
         msg += f" (Expected {step.assignment.correct_value} ± {step.assignment.tolerance})"

    return {"passed": passed, "message": msg, "correct_value": step.assignment.correct_value if step.assignment else None}

# --- Comments ---

@router.post("/comments", response_model=schemas.Comment)
def add_comment(comment: schemas.CommentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_comment(db, comment, current_user.id)

@router.get("/modules/{module_id}/comments", response_model=List[schemas.Comment])
def read_comments(module_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_comments_for_module(db, module_id)

# --- Learning Resources ---

@router.get("/resources", response_model=List[schemas.LearningResource])
def read_resources(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_all_resources(db)

@router.post("/resources", response_model=schemas.LearningResource)
def create_resource(resource: schemas.LearningResourceCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # TODO: Check admin permissions
    return crud.create_resource(db, resource)

# --- File Upload ---

@router.post("/upload/video")
async def upload_video(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    # TODO: Check admin permissions
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = f"static/videos/{unique_filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"http://localhost:8000/{file_path}"}

# --- Quiz History ---

@router.post("/quiz/attempts", response_model=schemas.QuizAttempt)
def create_quiz_attempt_endpoint(attempt: schemas.QuizAttemptCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_quiz_attempt(db, attempt, current_user.id)

@router.get("/quiz/history", response_model=List[schemas.QuizAttempt])
def read_quiz_history(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_user_quiz_attempts(db, current_user.id)

@router.get("/quiz/history/{attempt_id}", response_model=schemas.QuizAttempt)
def read_quiz_attempt(attempt_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    attempt = crud.get_quiz_attempt(db, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")
    # Verify ownership or admin
    if attempt.user_id != current_user.id and current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Not authorized")
    return attempt
