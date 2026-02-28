import os
import sqlite3
from moviepy.video.io.VideoFileClip import VideoFileClip

def migrate():
    db_path = "ranoson.db"
    if not os.path.exists(db_path):
        print(f"❌ Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Add duration column if not exists
    try:
        cursor.execute("ALTER TABLE modules ADD COLUMN duration INTEGER;")
        print("✅ Added duration column to modules table.")
    except sqlite3.OperationalError:
        print("ℹ️ duration column already exists.")

    # 2. Populate durations
    cursor.execute("SELECT id, video_url FROM modules WHERE duration IS NULL;")
    modules = cursor.fetchall()
    
    print(f"🔄 Processing {len(modules)} modules for duration...")
    
    for module_id, video_url in modules:
        if not video_url:
            continue
            
        # Extract relative path
        # URL: http://localhost:8000/static/videos/xyz.mp4 -> static/videos/xyz.mp4
        if "static/videos" in video_url:
            rel_path = video_url.split("8000/")[-1]
            abs_path = os.path.abspath(rel_path)
            
            if os.path.exists(abs_path):
                try:
                    with VideoFileClip(abs_path) as video:
                        duration = int(video.duration)
                        cursor.execute("UPDATE modules SET duration = ? WHERE id = ?;", (duration, module_id))
                        print(f"   ✅ Module {module_id}: {duration} seconds")
                except Exception as e:
                    print(f"   ❌ Error processing {abs_path}: {e}")
            else:
                print(f"   ⚠️ File not found: {abs_path}")

    conn.commit()
    conn.close()
    print("✨ Migration complete.")

if __name__ == "__main__":
    migrate()
