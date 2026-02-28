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

    # 3. Create Demo Module 1: Spring Measurement
    mod1 = db.query(models.Module).filter(models.Module.title == "Spring Measurement Basics").first()
    if not mod1:
        mod_create = schemas.ModuleCreate(
            title="Spring Measurement Basics",
            description="Learn how to accurately measure spring length using digital calipers.",
            video_url="https://example.com/spring_intro.mp4",
            steps=[
                schemas.ModuleStepCreate(
                    title="Prepare the Caliper",
                    content="Ensure the digital caliper is zeroed out before starting. Close the jaws completely and press the 'Zero' button.",
                    step_type="instruction",
                    order_index=0,
                    media_url="https://placehold.co/600x400/000000/FFF?text=Zero+Caliper"
                ),
                schemas.ModuleStepCreate(
                    title="Measure Free Length",
                    content="Place the spring between the jaws. Gently close the jaws until they touch the spring ends. Do not compress the spring.",
                    step_type="action",
                    order_index=1,
                    media_url="https://placehold.co/600x400/000000/FFF?text=Measure+Spring"
                ),
                schemas.ModuleStepCreate(
                    title="Record Measurement",
                    content="Read the value on the display.",
                    step_type="question",
                    order_index=2,
                    assignment=schemas.AssignmentQuestionCreate(
                        question_text="Enter the measured length:",
                        correct_value="15.0",
                        tolerance=0.2,
                        unit="cm"
                    )
                )
            ]
        )
        crud.create_module_with_steps(db, mod_create, admin.id)
        print("Created Module 1")

    # 4. Create Demo Module 2: Visual Inspection
    mod2 = db.query(models.Module).filter(models.Module.title == "Visual Defect Scan").first()
    if not mod2:
        mod_create = schemas.ModuleCreate(
            title="Visual Defect Scan",
            description="Identify common visual defects in coiled springs.",
            video_url="https://example.com/visual_scan.mp4",
            steps=[
                schemas.ModuleStepCreate(
                    title="Inspect Coil Spacing",
                    content="Check if the spacing between coils is uniform throughout the spring body.",
                    step_type="instruction",
                    order_index=0
                ),
                schemas.ModuleStepCreate(
                    title="Check for Burrs",
                    content="Inspect the cut ends for sharp burrs.",
                    step_type="question",
                    order_index=1,
                    assignment=schemas.AssignmentQuestionCreate(
                        question_text="Are there visible burrs on the ends?",
                        correct_value="No",
                        unit=""
                    )
                )
            ]
        )
        crud.create_module_with_steps(db, mod_create, admin.id)
        print("Created Module 2")

    # 5. Create Learning Resources
    if db.query(models.LearningResource).count() == 0:
        resources = [
            schemas.LearningResourceCreate(
                title="What is a Spring?",
                description="Understanding the physics and basic definition of a spring.",
                resource_type="article",
                content="""# What is a Spring?
A spring is an elastic object that stores mechanical energy. Springs are typically made of spring steel. There are many spring designs. In everyday use, the term often refers to coil springs.

## Physics
When a spring is compressed or extended from its resting position, it exerts an opposing force approximately proportional to its change in length (this approximation breaks down for larger deflections). The rate or spring constant of a spring is the change in the force it exerts, divided by the change in deflection of the spring.

## Hooke's Law
F = -kx
Where:
*   **F** is the force the spring exerts
*   **k** is the spring constant
*   **x** is the displacement from equilibrium
""",
                image_url="https://placehold.co/600x400/2563eb/FFF?text=Spring+Physics"
            ),
            schemas.LearningResourceCreate(
                title="Types of Springs",
                description="Overview of Compression, Extension, and Torsion springs.",
                resource_type="article",
                content="""# Types of Springs

## Compression Springs
Compression springs are open-coil helical springs that offer resistance to a compressive load applied axially. They are usually coiled as a constant diameter cylinder.
*   **Applications:** Automotive engines, large stamping presses, major appliances, lawn mowers.

## Extension Springs
Extension springs absorb and store energy as well as create a resistance to a pulling force. It is initial tension that determines how tightly together an extension spring is coiled.
*   **Applications:** Trampolines, garage doors, farm machinery.

## Torsion Springs
Torsion springs are helical springs that exert a torque or rotary force. The ends of a torsion spring are attached to other components, and when those components rotate around the center of the spring, the spring tries to push them back to their original position.
*   **Applications:** Clothespins, clipboards, swing-down tailgates.
""",
                image_url="https://placehold.co/600x400/16a34a/FFF?text=Spring+Types"
            ),
            schemas.LearningResourceCreate(
                title="Ranoson Official Website",
                description="Visit our official website for more product details.",
                resource_type="link",
                content="https://ranoson.in",
                image_url="https://placehold.co/600x400/ea580c/FFF?text=Ranoson+Website"
            )
        ]
        for res in resources:
            crud.create_resource(db, res)
        print("Created Learning Resources")

    db.close()

if __name__ == "__main__":
    seed_data()
