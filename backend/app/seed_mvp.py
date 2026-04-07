from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from . import models, schemas, crud

def seed_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Create Roles
    roles = ["Admin", "Quality Check", "CNC Operator"]
    role_map = {}
    for r_name in roles:
        role = db.query(models.Role).filter(models.Role.name == r_name).first()
        if not role:
            role = models.Role(name=r_name, permissions="{}")
            db.add(role)
            db.commit()
            db.refresh(role)
        role_map[r_name] = role.id

    # 2. Create Admin User
    admin = crud.get_user_by_code(db, "ADMIN001")
    if not admin:
        admin = models.User(
            employee_code="ADMIN001",
            role_id=role_map["Admin"],
            is_registered=True,
            is_active=True
        )
        # Set password manually or via hash
        from .auth import get_password_hash
        admin.hashed_password = get_password_hash("admin123")
        db.add(admin)
        db.commit()
        db.refresh(admin)

    db.close()

if __name__ == "__main__":
    seed_data()
