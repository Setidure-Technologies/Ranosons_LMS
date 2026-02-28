from pydantic import BaseModel
from typing import List, Optional, Union
from datetime import datetime

# --- Role ---
class RoleBase(BaseModel):
    name: str
    permissions: Optional[str] = None

class Role(RoleBase):
    id: int
    class Config:
        from_attributes = True

# --- Comments ---
class CommentBase(BaseModel):
    text: str
    parent_id: Optional[int] = None

class CommentCreate(CommentBase):
    module_id: int

class Comment(CommentBase):
    id: int
    user_id: int
    module_id: int
    created_at: datetime
    class Config:
        from_attributes = True

# --- Assignment ---
class AssignmentQuestionBase(BaseModel):
    question_text: str
    correct_value: str
    tolerance: Optional[float] = None
    unit: Optional[str] = None

class AssignmentQuestionCreate(AssignmentQuestionBase):
    pass

class AssignmentQuestion(AssignmentQuestionBase):
    id: int
    step_id: int
    class Config:
        from_attributes = True

# --- Module Steps ---
class ModuleStepBase(BaseModel):
    title: str
    content: str
    media_url: Optional[str] = None
    step_type: str = "instruction"
    order_index: int

class ModuleStepCreate(ModuleStepBase):
    assignment: Optional[AssignmentQuestionCreate] = None

class ModuleStep(ModuleStepBase):
    id: int
    module_id: int
    assignment: Optional[AssignmentQuestion] = None
    class Config:
        from_attributes = True

# --- Modules ---
class ModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    video_url: Optional[str] = None

class ModuleCreate(ModuleBase):
    steps: List[ModuleStepCreate] = []
    objectives: Optional[str] = None
    applications: Optional[str] = None
    quiz_data: Optional[str] = None

class Module(ModuleBase):
    id: int
    created_by_id: Optional[int] = None
    steps: List[ModuleStep] = []
    
    # New fields
    objectives: Optional[str] = None
    applications: Optional[str] = None
    quiz_data: Optional[str] = None
    is_processing: bool = False
    
    class Config:
        from_attributes = True

# --- User Progress ---
class UserProgressBase(BaseModel):
    module_id: Optional[int] = None
    current_step_index: int
    status: str
    score: float

class UserProgress(UserProgressBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True

class StepSubmission(BaseModel):
    step_id: int
    value: str # User's answer

class SubmissionResult(BaseModel):
    passed: bool
    message: str
    correct_value: Optional[str] = None

# --- User ---
class UserBase(BaseModel):
    employee_code: str
    phone_number: Optional[str] = None

class UserCreate(UserBase):
    role_id: int
    password: Optional[str] = None

class UserRegister(BaseModel):
    employee_code: str
    password: str

class UserLogin(BaseModel):
    employee_code: str
    password: str

class UserUpdate(BaseModel):
    phone_number: Optional[str] = None

class User(UserBase):
    id: int
    role_id: Optional[int] = None
    is_active: bool
    is_registered: bool
    role: Optional[Role] = None
    progress: List[UserProgress] = []
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# --- Learning Resources ---
class LearningResourceBase(BaseModel):
    title: str
    description: Optional[str] = None
    resource_type: str
    content: str
    image_url: Optional[str] = None

class LearningResourceCreate(LearningResourceBase):
    pass

class LearningResource(LearningResourceBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# --- Improved Progress Schemas ---
class UserProgressWithModule(UserProgress):
    module: Optional[Module] = None
    class Config:
        from_attributes = True

class AssignModuleRequest(BaseModel):
    user_id: int
    module_id: int

class UserMe(User):
    progress: List[UserProgressWithModule] = []
    class Config:
        from_attributes = True
