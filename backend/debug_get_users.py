from sqlalchemy.orm import Session
from app import models, schemas, crud
from app.database import SessionLocal, engine
import sys

# Create a test user if needed
db = SessionLocal()

print("Attempting to fetch users...")
try:
    users = crud.get_users(db)
    print(f"Successfully fetched {len(users)} users.")
    for u in users:
        print(f" - {u.employee_code} (Role: {u.role_id})")
except Exception as e:
    print("\nXXX FAILED XXX")
    print(f"Error type: {type(e)}")
    print(f"Error message: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
