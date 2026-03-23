"""
Re-trigger Hindi translation for all modules.
Skips content that already has valid Hindi translations.
Use force=True to re-translate everything.

Run inside the backend container: python retranslate_all.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.translator import translate_module_content
from app.database import SessionLocal
from app import models

db = SessionLocal()
modules = db.query(models.Module).all()
module_ids = [m.id for m in modules]
db.close()

print(f"Found {len(module_ids)} modules to translate.")
for mid in module_ids:
    print(f"\n{'='*50}")
    print(f"Translating Module {mid}")
    print(f"{'='*50}")
    try:
        translate_module_content(mid, force=True)
    except Exception as e:
        print(f"ERROR translating module {mid}: {e}")

print("\n✅ All modules processed.")
