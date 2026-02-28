from app.database import SessionLocal
from app.models import Role, User

def seed_data():
    db = SessionLocal()
    
    # Create Roles
    roles = [
        {"name": "CNC Operator", "department": "Production"},
        {"name": "Quality Inspector", "department": "QC"},
        {"name": "Admin", "department": "Management"}
    ]
    
    for r_data in roles:
        role = db.query(Role).filter(Role.name == r_data["name"]).first()
        if not role:
            role = Role(**r_data)
            db.add(role)
    db.commit()
    
    # Create Users
    cnc_role = db.query(Role).filter(Role.name == "CNC Operator").first()
    
    users = [
        {"employee_code": "EMP001", "role_id": cnc_role.id, "phone_number": "555-0101"}
    ]
    
    for u_data in users:
        user = db.query(User).filter(User.employee_code == u_data["employee_code"]).first()
        if not user:
            user = User(**u_data)
            db.add(user)
    db.commit()
    db.close()
    print("Seed data created successfully.")

if __name__ == "__main__":
    seed_data()
