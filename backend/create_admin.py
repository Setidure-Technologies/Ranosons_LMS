from app.database import SessionLocal
from app.models import Role, User
from app.auth import get_password_hash

def create_admin():
    db = SessionLocal()
    
    # helper to print
    def log(msg):
        print(f"[create_admin] {msg}")

    # Find Admin Role
    admin_role = db.query(Role).filter(Role.name == "Admin").first()
    if not admin_role:
        log("Admin role not found! Run seed.py first.")
        # Try to creat it if missing (just in case)
        try:
            admin_role = Role(name="Admin", department="Management")
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)
            log("Created Admin role.")
        except Exception as e:
            log(f"Error creating role: {e}")
            return

    # Check if Admin User exists
    admin_code = "ADMIN001"
    admin_user = db.query(User).filter(User.employee_code == admin_code).first()
    
    if admin_user:
        log(f"User {admin_code} already exists.")
        # Determine if we should rest password? Let's just update it to be sure.
        admin_user.hashed_password = get_password_hash("admin123")
        admin_user.is_registered = True
        admin_user.role_id = admin_role.id
        db.commit()
        log(f"Updated {admin_code} password to 'admin123'")
    else:
        # Create Admin User
        admin_user = User(
            employee_code=admin_code,
            role_id=admin_role.id,
            phone_number="000-0000",
            hashed_password=get_password_hash("admin123"),
            is_registered=True,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        log(f"Created user {admin_code} with password 'admin123'")

    db.close()

if __name__ == "__main__":
    create_admin()
