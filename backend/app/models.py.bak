from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, Float, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    permissions = Column(Text, nullable=True) # JSON string of permissions
    
    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String, unique=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"))
    phone_number = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
    is_registered = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    role = relationship("Role", back_populates="users")
    progress = relationship("UserProgress", back_populates="user")
    comments = relationship("Comment", back_populates="user")

class Module(Base):
    __tablename__ = "modules"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    video_url = Column(String, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # New fields for AI Course Generation
    objectives = Column(Text, nullable=True) # JSON or Markdown
    applications = Column(Text, nullable=True) # JSON or Markdown
    quiz_data = Column(Text, nullable=True) # JSON string of quiz questions
    is_processing = Column(Boolean, default=False)
    
    steps = relationship("ModuleStep", back_populates="module", order_by="ModuleStep.order_index")
    progress = relationship("UserProgress", back_populates="module")
    comments = relationship("Comment", back_populates="module")

class ModuleStep(Base):
    __tablename__ = "module_steps"
    
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"))
    order_index = Column(Integer)
    title = Column(String)
    content = Column(Text) # Markdown instructions
    media_url = Column(String, nullable=True) # Optional image/video for this step
    step_type = Column(String, default="instruction") # instruction, action, question
    
    module = relationship("Module", back_populates="steps")
    assignment = relationship("AssignmentQuestion", uselist=False, back_populates="step")

class AssignmentQuestion(Base):
    __tablename__ = "assignment_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    step_id = Column(Integer, ForeignKey("module_steps.id"))
    question_text = Column(String)
    correct_value = Column(String) # Can be text or numeric string
    tolerance = Column(Float, nullable=True) # For numeric answers
    unit = Column(String, nullable=True) # e.g. "cm", "mm"
    
    step = relationship("ModuleStep", back_populates="assignment")

class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    module_id = Column(Integer, ForeignKey("modules.id"))
    current_step_index = Column(Integer, default=0)
    status = Column(String, default="Not Started") # "Not Started", "In Progress", "Completed", "Failed"
    score = Column(Float, default=0.0)
    
    user = relationship("User", back_populates="progress")
    module = relationship("Module", back_populates="progress")

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    
    module = relationship("Module", back_populates="comments")
    user = relationship("User", back_populates="comments")
    replies = relationship("Comment", back_populates="parent", remote_side=[id])
    parent = relationship("Comment", back_populates="replies", remote_side=[parent_id])

class LearningResource(Base):
    __tablename__ = "learning_resources"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    resource_type = Column(String) # "article", "video", "link"
    content = Column(Text) # Markdown content or URL
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
