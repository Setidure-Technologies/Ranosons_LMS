from app.database import SessionLocal, engine
from sqlalchemy import text

def add_columns():
    db = SessionLocal()
    try:
        with engine.connect() as conn:
            # Check if columns exist (sqlite specific, but works for postgres with slight mod)
            # For simplicity, we just try to add them and ignore errors if they exist
            
            columns = [
                "ALTER TABLE modules ADD COLUMN objectives TEXT",
                "ALTER TABLE modules ADD COLUMN applications TEXT",
                "ALTER TABLE modules ADD COLUMN quiz_data TEXT",
                "ALTER TABLE modules ADD COLUMN is_processing BOOLEAN DEFAULT 0"
            ]
            
            for cmd in columns:
                try:
                    conn.execute(text(cmd))
                    print(f"Executed: {cmd}")
                except Exception as e:
                    print(f"Skipped (probably exists): {cmd} - {e}")
            
            conn.commit()
            print("Schema update complete.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_columns()
