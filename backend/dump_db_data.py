
import sys
import os
import json
from datetime import datetime

# Add the parent directory to sys.path to import app modules
sys.path.append(os.path.join(os.path.dirname(__file__)))

from app.database import SessionLocal, engine
from app import models
from sqlalchemy.orm import Session
from sqlalchemy.inspection import inspect


def object_as_dict(obj):
    return {c.key: getattr(obj, c.key)
            for c in inspect(obj).mapper.column_attrs}

def datetime_handler(x):
    if isinstance(x, datetime):
        return x.isoformat()
    raise TypeError("Unknown type")

def dump_table(db: Session, model_class):
    print(f"--- Data for table: {model_class.__tablename__} ---")
    records = db.query(model_class).all()
    if not records:
        print("No records found.")
        return

    data = [object_as_dict(record) for record in records]
    print(json.dumps(data, default=datetime_handler, indent=2))
    print("\n")

def main():
    db = SessionLocal()
    try:
        # List of models to dump
        models_to_dump = [
            models.Role,
            models.User,
            models.Module,
            models.ModuleStep,
            models.AssignmentQuestion,
            models.UserProgress,
            models.Comment,
            models.LearningResource,
            models.QuizAttempt
        ]

        for model in models_to_dump:
            dump_table(db, model)
            
    finally:
        db.close()

if __name__ == "__main__":
    main()
