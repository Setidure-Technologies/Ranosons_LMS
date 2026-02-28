import os
import time
import json
import base64
import traceback
from io import BytesIO
from PIL import Image
from moviepy.video.io.VideoFileClip import VideoFileClip
from groq import Groq
import numpy as np

# --- CONFIGURATION ---
STRUCTURE_MODEL = "llama-3.3-70b-versatile"
WHISPER_MODEL = "whisper-large-v3"
VISION_MODEL_DEFAULT = "meta-llama/llama-4-maverick-17b-128e-instruct"  # Updated from decommissioned 90b model 

# --- PROMPTS ---
DISCOVERY_PROMPT = """
You are an expert Instructional Designer. Analyze the provided VIDEO TRANSCRIPT and identify the core learning modules.
The transcript is provided with exact timestamps in the format: `[start-end]: text`.
**NOTE:** The transcript may be in **Hindi, English, or a mix (Hinglish)**. You must process the content and output the structure **strictly in English**.

### CRITICAL PHILOSOPHY: BE A "LUMPER", NOT A "SPLITTER"
Your goal is to create the **FEWEST** number of modules necessary to cover the content effectively.
Avoid fragmentation. A module must be a **complete, standalone lesson**.

### RULES FOR SEGMENTATION:
1.  **CONCEPT COMPLETENESS**:
    - **BAD**: Mod 1: "Definition" (30s), Mod 2: "Types" (30s), Mod 3: "Example" (30s). -> *User is confused.*
    - **GOOD**: Mod 1: "Complete Guide to [Topic]" (90s). -> *Includes definition, types, and examples.*
    - **RULE**: Always MERGE "Introduction", "Definition", "Mechanism", "Types", "Advantages", and "Examples" of the same subject into ONE single module.

2.  **STRICT DURATION LOGIC**:
    - **Video < 5 Minutes**: Create exactly **ONE** module. (Unless there is a hard topic switch like "Sports" to "Cooking").
    - **Video > 5 Minutes**: Create modules that are **at least 2 minutes long** if possible.
    - If a potential segment is under 60 seconds, **IT IS TOO SHORT**. Merge it with the previous or next module.

3.  **PROCEDURAL FLOW**:
    - If the video is a step-by-step tutorial ("Step 1, Step 2, Step 3"), keep all steps in **ONE** module called "Process of X", unless the process is extremely long (>10 mins).

For each module:
1.  Identify the main topic being discussed (In English).
2.  **CRITICAL**: Use the provided timestamp ranges to determine the exact start and end time.
3.  Ensure modules do not overlap and cover the entire meaningful content.

Return ONLY a raw JSON array:
[
  {"topic_name": "Comprehensive Guide to React Components", "start_time": 0.0, "end_time": 180.5},
  ...
]
"""

CONTENT_PROMPT_TEMPLATE = """
You are an expert Professor creating a concise course module for the topic: "{topic}".
Focus on the provided video frames AND the following TRANSCRIPT SEGMENT:

<TRANSCRIPT_SEGMENT>
{transcript_segment}
</TRANSCRIPT_SEGMENT>

The segment corresponds to the time {start} seconds to {end} seconds.
Use the transcript as the PRIMARY source of information.

Output strictly in Markdown. Keep content clear, concise, and bite-sized (Cue Card style).
**IMPORTANT:** Write all content **strictly in English**.

## Notes
- Concise technical explanation.
- Bullet points for key concepts.
"""

INTRO_PROMPT = """
You are an expert Instructional Designer. Analyze the FULL COURSE TRANSCRIPT provided below.
Identify the 3-5 distinct learning objectives for this entire video course.

Output strictly in Markdown:
## Objectives
- Bullet point 1
- Bullet point 2...
"""

OUTRO_PROMPT = """
You are an expert Instructional Designer. Analyze the FULL COURSE TRANSCRIPT provided below.
Extract all key Definitions and specific Practical Applications mentioned or implied in the course.

Output strictly in Markdown:
## Definitions
- **Term**: Definition...

## Practical Application
- Real-world usage examples...
"""

QUIZ_PROMPT = """
You are an expert Examiner. Create a Final Assessment Quiz based on the provided course transcript/content.
Create 5-10 multiple choice questions that test deep understanding.

Return ONLY a raw JSON array:
[
  {
    "question": "What is the primary function of...",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correct_answer": "B) Option 2",
    "explanation": "Option 2 is correct because..."
  },
  ...
]
"""

class CourseGenerator:
    def __init__(self, api_key, model_name=None):
        self.api_key = api_key
        self.client = Groq(api_key=api_key)
        self.vision_model_name = model_name if model_name else VISION_MODEL_DEFAULT
        print(f"🌩️ Initialized. Structure: {STRUCTURE_MODEL}, Vision: {self.vision_model_name}")

    def extract_audio(self, video_path):
        """Extracts audio from video and saves as temp mp3."""
        print("   🔊 Extracting audio...")
        audio_path = f"{video_path}.mp3"
        with VideoFileClip(video_path) as clip:
            clip.audio.write_audiofile(audio_path, logger=None)
        return audio_path

    def extract_frames_base64(self, video_path, start_time=0, end_time=None, interval=None, max_frames=5):
        """
        Extracts frames from the video.
        """
        print(f"   🎞️  Extracting frames from {start_time}s to {end_time if end_time else 'end'} (Max: {max_frames})...")
        frames_b64 = []
        try:
            with VideoFileClip(video_path) as clip:
                duration = clip.duration
                if end_time is None:
                    end_time = duration
                
                if end_time > duration:
                    end_time = duration
                
                current_duration = end_time - start_time
                if current_duration <= 0: return []
                
                timestamps = np.linspace(start_time, end_time - 0.1, num=max_frames)
                
                for t in timestamps:
                    try:
                        frame_np = clip.get_frame(t)
                        img = Image.fromarray(frame_np)
                        img.thumbnail((640, 640)) 
                        buffered = BytesIO()
                        img.save(buffered, format="JPEG")
                        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
                        frames_b64.append(img_str)
                    except Exception as e:
                        print(f"Error extracting frame at {t}: {e}")
        except Exception as e:
            print(f"Error opening video for frames: {e}")
                
        return frames_b64

    def analyze_structure(self, video_file, description=None, hints=None):
        """Step 1: Get the timestamps via AUDIO TRANSCRIPTION."""
        print("🧠 Analyzing course structure (Audio-Based)...")
        
        try:
            audio_file = self.extract_audio(video_file)
            
            print("   🗣️  Transcribing audio with timestamps...")
            with open(audio_file, "rb") as file:
                transcription = self.client.audio.transcriptions.create(
                    file=(audio_file, file.read()),
                    model=WHISPER_MODEL,
                    response_format="verbose_json"
                )
            
            transcript_text = ""
            if hasattr(transcription, 'segments'):
                for segment in transcription.segments:
                    start = segment['start']
                    end = segment['end']
                    text = segment['text'].strip()
                    transcript_text += f"[{start:.2f}s - {end:.2f}s]: {text}\n"
            else:
                transcript_text = transcription.text

            print(f"   ✅ Interpretation complete. Transcript length: {len(transcript_text)} chars.")

            user_context = ""
            if description:
                user_context += f"\n\n**VIDEO CONTEXT PROVIDED BY USER:**\n{description}"
            if hints:
                user_context += f"\n\n**USER HINTS FOR MODULES:**\n{hints}\n(Use these hints to guide the topic creation)"

            completion = self.client.chat.completions.create(
                model=STRUCTURE_MODEL,
                messages=[
                    {"role": "system", "content": DISCOVERY_PROMPT},
                    {"role": "user", "content": f"Here is the timestamped video transcript:\n\n{transcript_text}{user_context}"}
                ],
                temperature=0.1,
                response_format={"type": "json_object"} 
            )
            
            content = completion.choices[0].message.content
            content = content.replace("```json", "").replace("```", "").strip()
            data = json.loads(content)
            
            if isinstance(data, dict):
                for key, value in data.items():
                    if isinstance(value, list):
                        data = value
                        break
            
            valid_modules = []
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and 'topic_name' in item and 'start_time' in item:
                        valid_modules.append(item)
            
            if os.path.exists(audio_file):
                os.remove(audio_file)

            print(f"   🧹 Post-processing: Merging short segments (under 60s)...")
            final_modules = self.smart_merge_modules(valid_modules, min_duration=60)
            print(f"   ✅ Merged {len(valid_modules)} -> {len(final_modules)} modules.")

            return final_modules, transcript_text
            
        except Exception as e:
            traceback.print_exc()
            print(f"❌ Error during analysis: {str(e)}")
            return [], ""

    def smart_merge_modules(self, modules, min_duration=60):
        if not modules: return []
        current_modules = modules.copy()
        
        while True:
            too_short_index = -1
            shortest_duration = float('inf')
            
            for i, mod in enumerate(current_modules):
                dur = mod['end_time'] - mod['start_time']
                if dur < min_duration:
                    if dur < shortest_duration:
                        shortest_duration = dur
                        too_short_index = i
            
            if too_short_index == -1 or len(current_modules) <= 1:
                break
                
            target_idx = too_short_index
            output_modules = []
            
            if target_idx > 0:
                prev_mod = current_modules[target_idx - 1]
                short_mod = current_modules[target_idx]
                prev_dur = prev_mod['end_time'] - prev_mod['start_time']
                short_dur = short_mod['end_time'] - short_mod['start_time']
                new_name = prev_mod['topic_name'] if prev_dur >= short_dur else short_mod['topic_name']
                merged_mod = {"topic_name": new_name, "start_time": prev_mod['start_time'], "end_time": short_mod['end_time']}
                output_modules = current_modules[:target_idx-1] + [merged_mod] + current_modules[target_idx+1:]
            else:
                short_mod = current_modules[0]
                next_mod = current_modules[1]
                short_dur = short_mod['end_time'] - short_mod['start_time']
                next_dur = next_mod['end_time'] - next_mod['start_time']
                new_name = next_mod['topic_name'] if next_dur >= short_dur else short_mod['topic_name']
                merged_mod = {"topic_name": new_name, "start_time": short_mod['start_time'], "end_time": next_mod['end_time']}
                output_modules = [merged_mod] + current_modules[2:]
            
            current_modules = output_modules
            
        return current_modules

    def generate_module_content(self, video_file, topic, start, end, transcript_text, description=None):
        print(f"   ✍️  Writing course content for: {topic}...")
        
        relevant_lines = []
        try:
            lines = transcript_text.split('\n')
            for line in lines:
                if "[" in line and "]" in line:
                    try:
                        time_part = line.split("]")[0].replace("[", "")
                        t_start, t_end = map(float, time_part.replace("s", "").split("-"))
                        if t_start >= start and t_start <= end:
                            relevant_lines.append(line)
                    except:
                        continue
        except:
            relevant_lines = [transcript_text]

        transcript_segment = "\n".join(relevant_lines)
        if not transcript_segment: description_text = "No speech detected in this segment."

        context_str = ""
        if description:
            context_str = f"\n\nContext about the video: {description}"

        specific_prompt = CONTENT_PROMPT_TEMPLATE.format(
            topic=topic, start=start, end=end, transcript_segment=transcript_segment
        ) + context_str
        
        frames = self.extract_frames_base64(video_file, start_time=start, end_time=end, max_frames=5)
        
        content_parts = [{"type": "text", "text": specific_prompt}]
        for b64 in frames:
             content_parts.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{b64}"
                }
            })
        
        try:
            completion = self.client.chat.completions.create(
                model=self.vision_model_name,
                messages=[{"role": "user", "content": content_parts}],
                temperature=0.7 
            )
            return completion.choices[0].message.content
        except Exception as e:
            if "content" in str(e) and "string" in str(e):
                try:
                    completion = self.client.chat.completions.create(
                        model=self.vision_model_name,
                        messages=[{"role": "user", "content": specific_prompt}],
                        temperature=0.7 
                    )
                    return completion.choices[0].message.content
                except Exception as e2:
                    return f"Error generating content: {e2}"
            return f"Error generating content: {e}"

    def generate_course_intro(self, transcript_text):
        print("   🚀 Generating Course Objectives...")
        try:
            return self._text_completion(INTRO_PROMPT, transcript_text)
        except Exception as e:
            return "## Objectives\n- content generation failed."

    def generate_course_outro(self, transcript_text):
        print("   🏁 Generating Course Outro...")
        try:
            return self._text_completion(OUTRO_PROMPT, transcript_text)
        except Exception as e:
            return "## Definitions\n- None\n\n## Practical Application\n- None"

    def _text_completion(self, system_prompt, user_content):
        completion = self.client.chat.completions.create(
            model=STRUCTURE_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.3
        )
        return completion.choices[0].message.content

    def generate_quiz(self, transcript_text, modules_data=None, description=None):
        """Generate quiz questions from module segments, tagging each with its source module."""
        print("   🎓 Generating Final Assessment...")
        
        all_questions = []
        
        if modules_data and len(modules_data) > 0:
            # Generate 1-2 questions per module
            for idx, module in enumerate(modules_data):
                topic = module.get('topic_name', 'Unknown')
                start = module.get('start_time', 0)
                end = module.get('end_time', 0)
                
                # Extract relevant transcript segment
                relevant_lines = []
                try:
                    lines = transcript_text.split('\n')
                    for line in lines:
                        if "[" in line and "]" in line:
                            try:
                                time_part = line.split("]")[0].replace("[", "")
                                t_start, t_end = map(float, time_part.replace("s", "").split("-"))
                                if t_start >= start and t_start <= end:
                                    relevant_lines.append(line)
                            except:
                                continue
                except:
                    relevant_lines = []
                
                segment_text = "\n".join(relevant_lines) if relevant_lines else transcript_text
                
                # Generate 3-4 questions for this module
                module_quiz_prompt = f"""Create 3-4 CHALLENGING multiple choice questions based ONLY on this specific topic: "{topic}"

Content excerpt:
{segment_text[:1500]}  

CRITICAL REQUIREMENTS:
1. Return ONLY a raw JSON array with 3-4 question objects. Do NOT wrap in an object.
2. Make questions DIFFICULT - test deep understanding, not just recall
3. Create PLAUSIBLE DISTRACTORS - all options should seem reasonable
4. Make incorrect options CLOSELY RELATED to the correct answer (e.g., similar numbers, related concepts, partial truths)
5. Avoid obvious wrong answers that are completely unrelated

Example of GOOD distractors (hard to distinguish):
- Correct: "B) 0.5mm tolerance"
- Distractor: "A) 0.3mm tolerance" (close number)
- Distractor: "C) 0.7mm tolerance" (close number)  
- Distractor: "D) 1.0mm tolerance" (plausible alternative)

Example of BAD distractors (too obvious):
- Correct: "B) Quality inspection"
- Bad: "A) Making coffee" (completely unrelated)

[
  {{
    "question": "Detailed question testing understanding...",
    "type": "mcq",
    "options": ["A) Plausible option 1", "B) Plausible option 2", "C) Correct answer", "D) Plausible option 4"],
    "correct_answer": "C) Correct answer",
    "explanation": "Brief explanation why this is correct..."
  }},
  {{
    "question": "Another challenging question...",
    "type": "mcq",
    "options": ["A) Close distractor", "B) Correct answer", "C) Close distractor", "D) Close distractor"],
    "correct_answer": "B) Correct answer",
    "explanation": "Brief explanation..."
  }}
]
"""
                
                try:
                    print(f"      Generating quiz for module {idx}: {topic}")
                    completion = self.client.chat.completions.create(
                        model=STRUCTURE_MODEL,
                        messages=[
                            {"role": "system", "content": "You are an expert quiz generator specializing in creating CHALLENGING assessments. Generate questions that test deep understanding with plausible, closely-related distractors. Avoid obvious incorrect options. Always return a JSON array of question objects."},
                            {"role": "user", "content": module_quiz_prompt}
                        ],
                        temperature=0.4  # Slightly higher for more creative distractors
                        # Removed response_format to allow array responses
                    )
                    content = completion.choices[0].message.content
                    content = content.replace("```json", "").replace("```", "").strip()
                    data = json.loads(content)
                    
                    print(f"      Raw data type: {type(data)}, keys: {data.keys() if isinstance(data, dict) else 'N/A'}")
                    
                    # Extract questions from response
                    questions = []
                    if isinstance(data, dict):
                        # Check if it's a single question object (has 'question' key)
                        if 'question' in data:
                            questions = [data]  # Wrap single question in array
                            print(f"      Data is a single question object, wrapped in array")
                        else:
                            # Look for a list of questions in the dict
                            for key, value in data.items():
                                if isinstance(value, list) and len(value) > 0 and isinstance(value[0], dict) and 'question' in value[0]:
                                    questions = value
                                    print(f"      Found questions list in key '{key}' with {len(value)} items")
                                    break
                    elif isinstance(data, list):
                        questions = data
                        print(f"      Data is already a list with {len(data)} items")
                    
                    print(f"      Generated {len(questions)} questions for module {idx}")
                    
                    # Tag each question with module_index
                    for q in questions:
                        if isinstance(q, dict):
                            q['module_index'] = idx
                            q['type'] = 'mcq'  # Ensure type is set
                            all_questions.append(q)
                            print(f"      Tagged question with module_index={idx}: {q.get('question', '')[:50]}...")
                    
                except Exception as e:
                    print(f"   ⚠️ Error generating quiz for module {idx}: {e}")
                    import traceback
                    traceback.print_exc()
                    continue
        
        # If no module-based questions or fallback
        if len(all_questions) < 3:
            print("   ⚠️ Few module questions generated, adding general questions...")
            context_str = ""
            if description:
                context_str = f"\n\nContext about the video: {description}"
            
            try:
                completion = self.client.chat.completions.create(
                    model=STRUCTURE_MODEL,
                    messages=[
                        {"role": "system", "content": QUIZ_PROMPT},
                        {"role": "user", "content": f"Generate quiz from this transcript:\n\n{transcript_text[:2000]}{context_str}"}
                    ],
                    temperature=0.2,
                    response_format={"type": "json_object"}
                )
                content = completion.choices[0].message.content
                content = content.replace("```json", "").replace("```", "").strip()
                data = json.loads(content)
                
                # Extract questions
                fallback_questions = []
                if isinstance(data, dict):
                    for key, value in data.items():
                        if isinstance(value, list):
                            fallback_questions = value
                            break
                elif isinstance(data, list):
                    fallback_questions = data
                
                # Tag fallback questions with module_index: 0
                for q in fallback_questions:
                    if isinstance(q, dict):
                        if 'module_index' not in q:
                            q['module_index'] = 0
                        all_questions.append(q)
                        
            except Exception as e:
                print(f"❌ Error generating fallback quiz: {e}")
        
        print(f"   ✅ Generated {len(all_questions)} quiz questions")
        return all_questions
