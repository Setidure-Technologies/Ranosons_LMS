from app.database import SessionLocal
from app.models import User, Module, ModuleStep, LearningResource

def cleanup():
    db = SessionLocal()
    try:
        # Delete test users
        users_to_delete = ["TEST001", "EMP002"]
        for code in users_to_delete:
            user = db.query(User).filter(User.employee_code == code).first()
            if user:
                db.delete(user)
                print(f"Deleted user {code}")
        
        # Delete test modules
        modules_to_delete = ["Spring Measurement Basics", "Visual Defect Scan"]
        for title in modules_to_delete:
            module = db.query(Module).filter(Module.title == title).first()
            if module:
                # Also delete associated steps
                steps = db.query(ModuleStep).filter(ModuleStep.module_id == module.id).all()
                for step in steps:
                    db.delete(step)
                db.delete(module)
                print(f"Deleted module {title}")
        
        # Delete learning resources
        resources_to_delete = ["What is a Spring?", "Types of Springs", "Ranoson Official Website"]
        for title in resources_to_delete:
            resource = db.query(LearningResource).filter(LearningResource.title == title).first()
            if resource:
                db.delete(resource)
                print(f"Deleted learning resource {title}")
                
        db.commit()
        print("Cleanup complete.")
    except Exception as e:
        print(f"Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup()
