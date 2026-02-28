from sqlalchemy.orm import Session
from app import models, schemas, crud
from app.database import SessionLocal, engine
import sys

# Create a test user if needed
db = SessionLocal()
user = db.query(models.User).first()
if not user:
    print("No user found, cannot test.")
    sys.exit(1)

print(f"Using user: {user.employee_code} (ID: {user.id})")

# Create sample module data
step_data = schemas.ModuleStepCreate(
    title="Test Step 1",
    content="This is a test step",
    step_type="instruction",
    order_index=1,
    assignment=None
)

module_data = schemas.ModuleCreate(
    title="Debug Module",
    description="Created to debug 500 failure",
    video_url="http://example.com/video.mp4",
    steps=[step_data]
)

print("Attempting to create module...")
try:
    crud.create_module_with_steps(db, module_data, user.id)
    print("Module created successfully!")
except Exception as e:
    print("\nXXX FAILED XXX")
    print(f"Error type: {type(e)}")
    print(f"Error message: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
