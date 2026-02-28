import sqlite3
import os

db_path = 'ranoson.db'

def fix_db_final():
    if not os.path.exists(db_path):
        print("DB not found")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Add media_url to module_steps
    try:
        cursor.execute("ALTER TABLE module_steps ADD COLUMN media_url VARCHAR")
        print("Added media_url column to module_steps")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("media_url column already exists in module_steps")
        else:
            print(f"Error adding media_url: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    fix_db_final()
