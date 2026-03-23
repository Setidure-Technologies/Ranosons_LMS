# Ranoson Springs LMS

## Overview
Ranoson Springs LMS is a Learning Management System designed to train factory operators (e.g., CNC Operators, Spring Makers, Quality Inspectors) on machine safety, operation, and maintenance. The system features a modern web interface with AI-powered course generation from uploaded videos, Hindi translation for regional workers, interactive learning steps, and a quiz engine.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (with SQLAlchemy ORM)
- **Authentication**: JWT (JSON Web Tokens)
- **Video Processing**: moviepy + ffmpeg
- **AI / LLM**: Groq API (llama-3.1-8b-instant for structure/translation, meta-llama/llama-4-scout for vision)
- **Speech-to-Text**: Groq Whisper (whisper-large-v3)

### Frontend
- **Framework**: Next.js 15 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Markdown Rendering**: react-markdown

### Infrastructure
- **Containerisation**: Docker + Docker Compose
- **Static File Serving**: FastAPI StaticFiles (`/static`)

---

## Project Structure

```
Ranosons_LMS/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints.py      # All REST API routes
│   │   │   └── tasks.py          # Background video processing task
│   │   ├── services/
│   │   │   ├── video_segmentor.py  # AI course generation pipeline
│   │   │   └── translator.py       # English → Hindi translation
│   │   ├── models.py             # SQLAlchemy DB models
│   │   ├── schemas.py            # Pydantic schemas
│   │   ├── crud.py               # DB operations
│   │   ├── auth.py               # JWT auth helpers
│   │   └── main.py               # App entry point
│   ├── static/
│   │   ├── videos/               # Uploaded source videos
│   │   └── courses/              # AI-segmented video clips per module
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── admin/                # Admin pages (courses, users, modules)
│   │   ├── modules/[id]/         # Learner module page
│   │   ├── learning/             # Learner dashboard
│   │   ├── history/              # Quiz history
│   │   └── login/                # Auth page
│   └── context/
│       └── AuthContext.tsx       # JWT auth context
├── docker-compose.yml
├── MOV_SUPPORT.md                # Guide for MOV/HEVC video support
└── README.md
```

---

## Setup & Running

### With Docker (Recommended)

1. Copy `.env.example` to `.env` and set your Groq API key:
   ```
   GROQ_API_KEY=your_key_here
   ```

2. Start all services:
   ```bash
   docker compose up --build
   ```

3. Access:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8001`
   - API Docs: `http://localhost:8001/docs`

### Manual Setup

**Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

### Windows Quick Start
Double-click `start_app.bat` from the project root to start both servers.

---

## Key Features

- **AI Course Generation**: Upload a video (MP4 or MOV) → the system auto-generates segmented modules, notes, objectives, applications, and a quiz using Groq LLMs + Whisper transcription.
- **Hindi Translation**: All course content (notes, quiz, objectives) is automatically translated to Hindi for non-admin (floor worker) users using Groq LLM.
- **Role-Based Views**: Admin sees English content + management tools; workers see Hindi content.
- **Interactive Steps**: Each AI-generated segment has a video clip + markdown notes.
- **Quiz Engine**: MCQ quiz with timer, randomised questions/options, partial credit for numerical answers, and per-question module review links.
- **Quiz History**: Workers can review past attempts with scores and correct answers.
- **User Management**: Admin can whitelist, assign modules, and delete users.
- **Video Upload**: Supports MP4 and MOV (including iPhone HEVC H.265 videos — auto-converted to H.264 before processing).

---

## Video Upload & Processing Pipeline

```
Admin uploads video (MP4 / MOV)
        │
        ▼
POST /api/v1/upload/video  → saved to static/videos/
        │
        ▼
POST /api/v1/modules  → background task triggered
        │
        ▼
[If MOV/HEVC] convert_to_h264()  → ffmpeg transcodes to H.264 MP4
        │
        ▼
Whisper transcription  → timestamped transcript
        │
        ▼
LLM structure analysis  → module segments (topic, start_time, end_time)
        │
        ▼
Per-segment: cut video clip + generate markdown notes (vision + transcript)
        │
        ▼
Generate objectives, applications, quiz
        │
        ▼
Hindi translation  → hindi_* fields saved in DB
        │
        ▼
Module marked is_processing = False → visible to learners
```

---

## Hindi Translation

Content is translated automatically after each course is processed. The translation uses `llama-3.1-8b-instant` via Groq.

- **Module fields**: `description`, `objectives`, `applications` → `hindi_*` equivalents
- **Step fields**: `title`, `content` → `hindi_title`, `hindi_content`
- **Quiz**: full MCQ JSON translated (keys preserved, only values translated)

Non-admin users automatically receive Hindi content via `_swap_hindi_fields_module()` in the API layer.

To manually re-trigger translation for a module:
```bash
docker exec ranoson_backend python3 -c "
from app.services.translator import translate_module_content
translate_module_content(<module_id>)
"
```

---

## MOV / iPhone Video Support

See [MOV_SUPPORT.md](MOV_SUPPORT.md) for full details.

**Summary**: iPhone videos use HEVC (H.265) which moviepy cannot process. The backend automatically converts `.mov`, `.avi`, `.mkv`, `.wmv` files to H.264 MP4 using ffmpeg before running the AI pipeline. No extra setup required — ffmpeg is included in the Docker image.

---

## AI Models Used

| Task | Model |
|------|-------|
| Audio transcription | `whisper-large-v3` (Groq) |
| Course structure analysis | `llama-3.1-8b-instant` (Groq) |
| Notes generation (vision) | `meta-llama/llama-4-scout-17b-16e-instruct` (Groq) |
| Hindi translation | `llama-3.1-8b-instant` (Groq) |
| Quiz generation | `llama-3.1-8b-instant` (Groq) |

> **Note**: Groq free tier has a daily token limit (100k TPD for some models). If processing fails with a 429 rate limit error, wait for the daily limit to reset or upgrade at console.groq.com/settings/billing.

---

## Default Credentials

| Role | Employee Code | Password |
|------|--------------|----------|
| Admin | `ADMIN001` | set during seed |
| Dev/Test User | `TEST001` | `test123` |
