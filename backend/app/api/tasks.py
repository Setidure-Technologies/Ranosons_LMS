from sqlalchemy.orm import Session
from .. import crud, models, schemas
from ..database import SessionLocal
from ..services.video_segmentor import CourseGenerator
import os
import json
from dotenv import load_dotenv

load_dotenv()

def process_video_task(module_id: int, video_path: str, description: str = None):
    """
    Background task to process the video using AI.
    """
    print(f"🔄 Starting background processing for Module {module_id}...")
    db = SessionLocal()
    try:
        module = crud.get_module(db, module_id)
        if not module:
            print(f"❌ Module {module_id} not found.")
            return

        # Initialize Generator
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            print("❌ GROQ_API_KEY not found. Skipping AI processing.")
            module.is_processing = False
            db.commit()
            return

        generator = CourseGenerator(api_key=api_key)
        
        # 1. Analyze Structure & Generate Content
        # We need the absolute path for the segmentor
        # video_path is likely relative like "static/videos/..."
        abs_video_path = os.path.abspath(video_path)
        
        # Create output directory for segments
        output_dir = os.path.join("static", "courses", str(module_id))
        os.makedirs(output_dir, exist_ok=True)
        
        print(f"   📂 Output directory: {output_dir}")
        
        # Run the full processing pipeline
        # Note: We need to adapt the generator to return data instead of just writing files
        # Or we use the generator's methods directly here.
        
        # A. Analyze Structure
        modules_data, transcript_text = generator.analyze_structure(abs_video_path, description=description)
        
        if not modules_data:
            print("❌ No modules generated.")
            module.is_processing = False
            db.commit()
            return

        # B. Generate Intro/Outro
        objectives_md = generator.generate_course_intro(transcript_text)
        applications_md = generator.generate_course_outro(transcript_text)
        
        module.objectives = objectives_md
        module.applications = applications_md
        
        # C. Generate Quiz (with module references)
        quiz_data = generator.generate_quiz(transcript_text, modules_data=modules_data, description=description)
        module.quiz_data = json.dumps(quiz_data)
        
        db.commit() # Save progress
        
        # D. Process Segments (Cut Video & Generate Notes)
        from moviepy.video.io.VideoFileClip import VideoFileClip
        
        with VideoFileClip(abs_video_path) as video:
            for idx, mod_data in enumerate(modules_data):
                topic = mod_data['topic_name']
                start = float(mod_data['start_time'])
                end = float(mod_data['end_time'])
                
                print(f"   ✂️ Processing Segment {idx+1}: {topic}")
                
                # Cut Video
                # Clean filename
                safe_topic = "".join([c for c in topic if c.isalnum() or c in (' ', '-', '_')]).strip().replace(" ", "_")
                segment_filename = f"{idx+1}_{safe_topic}.mp4"
                segment_rel_path = os.path.join("static", "courses", str(module_id), segment_filename)
                segment_abs_path = os.path.abspath(segment_rel_path)
                
                if end > video.duration: end = video.duration
                
                if start < end:
                    new_clip = video.subclipped(start_time=start, end_time=end)
                    new_clip.write_videofile(segment_abs_path, codec="libx264", audio_codec="aac", logger=None)
                
                # Generate Notes
                notes_content = generator.generate_module_content(abs_video_path, topic, start, end, transcript_text, description)
                
                # Create ModuleStep in DB
                step = models.ModuleStep(
                    module_id=module.id,
                    order_index=idx + 1,
                    title=topic,
                    content=notes_content,
                    step_type="instruction",
                    media_url=f"http://localhost:8000/{segment_rel_path}" # TODO: Use proper base URL
                )
                db.add(step)
                db.commit()
        
        # Mark as done
        module.is_processing = False
        db.commit()
        print(f"✅ Processing complete for Module {module_id}")

    except Exception as e:
        print(f"❌ Error in process_video_task: {e}")
        import traceback
        traceback.print_exc()
        # Try to mark as failed
        try:
            module.is_processing = False
            db.commit()
        except:
            pass
    finally:
        db.close()
