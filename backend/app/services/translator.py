"""
Hindi Translation Service using Groq LLM.
Translates English course content to Hindi while preserving Markdown formatting.
"""
import os
import json
import time
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

MAX_RETRIES = 3


TRANSLATION_MODEL = "llama-3.1-8b-instant"

TRANSLATE_PROMPT = """You are an expert English-to-Hindi translator for a factory worker training platform in India. The readers are CNC operators, spring makers, and quality inspectors who speak Hinglish on the shop floor.

RULES:
1. Write in SIMPLE, EVERYDAY Hindi (Devanagari script) — like a senior worker explaining to a new worker.
2. DO NOT use formal/literary Hindi. Avoid शुद्ध (pure) Hindi words that workers don't use daily.
3. TRANSLITERATE (write in Devanagari as they sound) these common workplace terms — DO NOT translate them:
   - Work order → वर्क ऑर्डर (NOT कार्य आदेश)
   - Rejection → रिजेक्शन (NOT अस्वीकृति)
   - Quality → क्वालिटी (NOT गुणवत्ता)
   - Inspection → इंस्पेक्शन (NOT निरीक्षण)
   - Drawing → ड्रॉइंग (NOT चित्र/रेखाचित्र)
   - Specification → स्पेसिफिकेशन (NOT विशिष्टता)
   - Report/Reporting → रिपोर्ट/रिपोर्टिंग
   - Process → प्रोसेस (NOT प्रक्रिया)
   - Scrap → स्क्रैप
   - Hold card → होल्ड कार्ड
   - Red tag → रेड टैग
   - Operator → ऑपरेटर
   - Material → मटेरियल (NOT सामग्री)
   - Customer → कस्टमर (NOT ग्राहक)
   - Parameter → पैरामीटर
   - Tolerance → टॉलरेंस
   - Dimension → डायमेंशन
   - Caliper → कैलिपर
   - Spring → स्प्रिंग
   - Wire diameter → वायर डायमीटर
   - Machine → मशीन
   - Form → फॉर्म
   - Tag → टैग
   - Module → मॉड्यूल
   - Production → प्रोडक्शन
   - Control → कंट्रोल
   - Document → डॉक्यूमेंट
   - Record → रिकॉर्ड
   - Corrective action → करेक्टिव एक्शन
   - Non-conformance / Non-conformity → नॉन-कन्फॉर्मेन्स
   - Defect → डिफेक्ट
   - QA / Quality Assurance → QA
4. PRESERVE all Markdown formatting exactly (##, -, **, *, bullet points, numbered lists).
5. Keep numbers, units (mm, cm, kg, etc.), and measurements in English/Arabic numerals.
6. Output ONLY the translated text. Do NOT add any explanation or preamble.
7. CRITICAL: Translate LITERALLY. Do NOT add extra content, do NOT elaborate, do NOT expand the text. If the input is a short phrase, the output must also be a short phrase.
8. CRITICAL: Preserve EVERY newline and blank line from the input EXACTLY. Each line in the input must be a separate line in the output. NEVER merge multiple lines into one paragraph.
"""

TRANSLATE_QUIZ_PROMPT = """You are an expert English-to-Hindi translator for factory worker training quizzes. Translate the following quiz JSON data to Hindi.

RULES:
1. CRITICAL: Keep ALL JSON keys exactly as-is in English: "question", "options", "correct_answer", "explanation", "type", "module_index", "tolerance". NEVER translate or rename any key.
2. Only translate the VALUES of "question", "options" (each array item), "correct_answer", and "explanation" to Hindi (Devanagari script).
3. Use SIMPLE everyday Hindi that factory workers understand. Write like a senior worker talking to a new worker.
4. TRANSLITERATE (write in Devanagari) common workplace terms — do NOT translate them into formal Hindi:
   Work order→वर्क ऑर्डर, Rejection→रिजेक्शन, Quality→क्वालिटी, Inspection→इंस्पेक्शन, Drawing→ड्रॉइंग,
   Specification→स्पेसिफिकेशन, Process→प्रोसेस, Scrap→स्क्रैप, Hold card→होल्ड कार्ड, Operator→ऑपरेटर,
   Material→मटेरियल, Customer→कस्टमर, Parameter→पैरामीटर, Tolerance→टॉलरेंस, Dimension→डायमेंशन,
   Caliper→कैलिपर, Spring→स्प्रिंग, Machine→मशीन, Report→रिपोर्ट, Defect→डिफेक्ट, QA→QA,
   Production→प्रोडक्शन, Control→कंट्रोल, Non-conformance→नॉन-कन्फॉर्मेन्स, Corrective action→करेक्टिव एक्शन.
5. Keep numbers and units in English.
6. The correct_answer MUST match exactly one of the translated options.
7. Return ONLY valid JSON — no markdown, no explanation.
"""


class HindiTranslator:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is required for translation")
        self.client = Groq(api_key=self.api_key)

    def translate_title(self, title: str) -> str:
        """Translate a short title/heading to Hindi — output must be equally short."""
        if not title or not title.strip():
            return title
        try:
            completion = self.client.chat.completions.create(
                model=TRANSLATION_MODEL,
                messages=[
                    {"role": "system", "content": "Translate the following English title to Hindi (Devanagari script). Output ONLY the translated title — a short phrase, nothing else. Do NOT add explanations, bullet points, headings, or extra content."},
                    {"role": "user", "content": title}
                ],
                temperature=0.1,
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"❌ Title translation error: {e}")
            return title

    def _has_hindi(self, text: str) -> bool:
        """Check if text contains Devanagari characters (Hindi)."""
        return bool(re.search(r'[\u0900-\u097F]', text))

    def _wait_for_rate_limit(self, error_msg: str):
        """Extract wait time from rate limit error and sleep."""
        match = re.search(r'Please try again in (\d+)m([\d.]+)s', str(error_msg))
        if match:
            wait_seconds = int(match.group(1)) * 60 + float(match.group(2)) + 5  # Add 5s buffer
            print(f"   ⏳ Rate limited. Waiting {wait_seconds:.0f}s...")
            time.sleep(wait_seconds)
        else:
            print(f"   ⏳ Rate limited. Waiting 60s...")
            time.sleep(60)

    def translate_text(self, text: str) -> str | None:
        """Translate a block of English text/markdown to Hindi. Returns None on failure."""
        if not text or not text.strip():
            return None

        # If it's a very short text phrase, use the stricter title prompt to prevent AI from expanding it into a full definition
        if len(text.strip().split()) <= 5:
            return self.translate_title(text)

        for attempt in range(MAX_RETRIES):
            try:
                completion = self.client.chat.completions.create(
                    model=TRANSLATION_MODEL,
                    messages=[
                        {"role": "system", "content": TRANSLATE_PROMPT},
                        {"role": "user", "content": text}
                    ],
                    temperature=0.2,
                )
                result = completion.choices[0].message.content.strip()
                # Verify the result actually contains Hindi
                if self._has_hindi(result):
                    return result
                else:
                    print(f"   ⚠️ Translation returned non-Hindi text, retrying ({attempt+1}/{MAX_RETRIES})...")
                    continue
            except Exception as e:
                if '429' in str(e) or 'rate_limit' in str(e):
                    self._wait_for_rate_limit(e)
                    continue
                print(f"❌ Translation error: {e}")
                return None  # Don't return English fallback

        print(f"❌ Translation failed after {MAX_RETRIES} retries.")
        return None  # Don't return English fallback

    def translate_quiz_data(self, quiz_json_str: str) -> str:
        """Translate quiz JSON string (array of questions) to Hindi."""
        if not quiz_json_str or not quiz_json_str.strip():
            return quiz_json_str

        try:
            # Parse to validate it's proper JSON
            quiz_data = json.loads(quiz_json_str)
            if not isinstance(quiz_data, list) or len(quiz_data) == 0:
                return quiz_json_str

            # Translate in batches of 3-4 questions to stay within context limits
            translated_questions = []
            batch_size = 4

            for i in range(0, len(quiz_data), batch_size):
                batch = quiz_data[i:i + batch_size]
                batch_json = json.dumps(batch, ensure_ascii=False, indent=2)

                completion = self.client.chat.completions.create(
                    model=TRANSLATION_MODEL,
                    messages=[
                        {"role": "system", "content": TRANSLATE_QUIZ_PROMPT},
                        {"role": "user", "content": batch_json}
                    ],
                    temperature=0.2,
                    response_format={"type": "json_object"}
                )

                content = completion.choices[0].message.content.strip()
                content = content.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(content)

                # Handle if LLM wraps in an object
                if isinstance(parsed, dict):
                    for key, value in parsed.items():
                        if isinstance(value, list):
                            parsed = value
                            break
                    else:
                        if 'question' in parsed:
                            parsed = [parsed]

                if isinstance(parsed, list):
                    translated_questions.extend(parsed)

            return json.dumps(translated_questions, ensure_ascii=False)

        except Exception as e:
            print(f"❌ Quiz translation error: {e}")
            return quiz_json_str  # Fallback to English


def translate_module_content(module_id: int, force: bool = False):
    """
    Background task: Translate all English content for a module to Hindi and store in DB.
    If force=True, re-translate even if Hindi content already exists.
    Only saves when translation actually produces valid Hindi text.
    """
    from ..database import SessionLocal
    from .. import models

    print(f"🌐 Starting Hindi translation for Module {module_id} (force={force})...")
    db = SessionLocal()

    try:
        module = db.query(models.Module).filter(models.Module.id == module_id).first()
        if not module:
            print(f"❌ Module {module_id} not found for translation.")
            return

        translator = HindiTranslator()

        # 1. Translate module-level fields (only if needed)
        if module.objectives and (force or not translator._has_hindi(module.hindi_objectives or "")):
            print(f"   📝 Translating objectives...")
            result = translator.translate_text(module.objectives)
            if result:
                module.hindi_objectives = result

        if module.applications and (force or not translator._has_hindi(module.hindi_applications or "")):
            print(f"   📝 Translating applications...")
            result = translator.translate_text(module.applications)
            if result:
                module.hindi_applications = result

        if module.quiz_data and (force or not translator._has_hindi(module.hindi_quiz_data or "")):
            print(f"   📝 Translating quiz data...")
            result = translator.translate_quiz_data(module.quiz_data)
            if result and translator._has_hindi(result):
                module.hindi_quiz_data = result

        if module.description and (force or not translator._has_hindi(module.hindi_description or "")):
            print(f"   📝 Translating description...")
            result = translator.translate_text(module.description)
            if result:
                module.hindi_description = result

        db.commit()

        # 2. Translate step-level fields
        steps = db.query(models.ModuleStep).filter(
            models.ModuleStep.module_id == module_id
        ).all()

        for step in steps:
            needs_title = step.title and (force or not translator._has_hindi(step.hindi_title or ""))
            needs_content = step.content and (force or not translator._has_hindi(step.hindi_content or ""))

            if needs_title or needs_content:
                print(f"   📝 Translating step: {step.title}...")

            if needs_title:
                result = translator.translate_title(step.title)
                if result:
                    step.hindi_title = result

            if needs_content:
                result = translator.translate_text(step.content)
                if result:
                    step.hindi_content = result


            db.commit()

        print(f"✅ Hindi translation complete for Module {module_id}")

    except Exception as e:
        print(f"❌ Error in translate_module_content: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
