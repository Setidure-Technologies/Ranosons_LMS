# MOV Video Upload Support

This document explains all changes required to add `.MOV` video upload support (e.g. iPhone videos) to the Ranoson LMS.

---

## Problem

iPhone videos use the **HEVC (H.265) codec** inside a `.MOV` container. The app had two issues:

1. **Frontend** — the file picker's `accept` attribute only listed `video/mp4,video/webm`, so `.MOV` files were hidden/greyed out in the file chooser dialog.
2. **Backend** — `moviepy` cannot parse HEVC/H.265 video streams, causing the AI processing pipeline to fail with:
   ```
   Error passing `ffmpeg -i` command output: ... hevc (Main 10) ...
   ```

---

## Changes Made

### 1. Frontend — File Picker (`frontend/app/admin/modules/new/page.tsx`)

Updated the `<input type="file">` accept attribute to include MOV MIME type and explicit extensions:

```tsx
// Before
accept="video/mp4,video/webm"

// After
accept=".mp4,.mov,.MOV,video/mp4,video/quicktime,video/webm"
```

Also updated the label text:

```tsx
// Before
<span className="text-sm">Click to upload video (MP4)</span>

// After
<span className="text-sm">Click to upload video (MP4 / MOV)</span>
```

> **Why both MIME type and extensions?**
> On Linux (GTK file chooser), `video/quicktime` is not always mapped to `.mov` files. Adding explicit `.mov,.MOV` extensions ensures the files appear in the picker on all platforms.

---

### 2. Backend — HEVC-to-H.264 Conversion (`backend/app/api/tasks.py`)

Added a `convert_to_h264()` function that runs before `moviepy` processes the video. It uses `ffmpeg` (already installed in the Docker image) to transcode MOV/HEVC files to standard H.264 MP4.

```python
import subprocess

def convert_to_h264(abs_video_path):
    """Convert HEVC/MOV to H.264 MP4 so moviepy can process it."""
    ext = os.path.splitext(abs_video_path)[1].lower()
    if ext not in ['.mov', '.avi', '.mkv', '.wmv']:
        return abs_video_path, False

    converted_path = os.path.splitext(abs_video_path)[0] + '_converted.mp4'
    print(f"   🔄 Converting {ext.upper()} to H.264 MP4...")
    result = subprocess.run([
        'ffmpeg', '-i', abs_video_path,
        '-vcodec', 'libx264', '-crf', '23', '-preset', 'fast',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',  # ensure even dimensions
        '-acodec', 'aac', '-y', converted_path
    ], capture_output=True)

    if result.returncode == 0:
        return converted_path, True
    else:
        print(f"   ⚠️ Conversion failed: {result.stderr.decode()[-300:]}")
        return abs_video_path, False
```

Called inside `process_video_task()` before the AI analysis:

```python
abs_video_path = os.path.abspath(video_path)

# Convert HEVC/MOV to H.264 MP4 if needed (e.g. iPhone videos)
abs_video_path, was_converted = convert_to_h264(abs_video_path)
```

Converted file is cleaned up after processing:

```python
if was_converted and os.path.exists(abs_video_path):
    os.remove(abs_video_path)
```

---

## Prerequisites

`ffmpeg` must be installed in the backend environment. It is already included in the Dockerfile:

```dockerfile
RUN apt-get update && apt-get install -y libpq-dev gcc ffmpeg && rm -rf /var/lib/apt/lists/*
```

No additional dependencies are required.

---

## Supported Formats After This Change

| Format | Container | Codec | Supported |
|--------|-----------|-------|-----------|
| `.mp4` | MP4 | H.264 | ✅ Direct |
| `.mp4` | MP4 | H.265/HEVC | ✅ Via conversion |
| `.mov` | QuickTime | H.264 | ✅ Via conversion |
| `.mov` | QuickTime | H.265/HEVC (iPhone) | ✅ Via conversion |
| `.avi` | AVI | Any | ✅ Via conversion |
| `.mkv` | Matroska | Any | ✅ Via conversion |
| `.wmv` | WMV | Any | ✅ Via conversion |

---

## How It Works End-to-End

```
User selects .MOV file
        │
        ▼
Frontend file picker (accept includes .mov/.MOV/video/quicktime)
        │
        ▼
POST /api/v1/upload/video  ← saved as-is (e.g. abc123.MOV)
        │
        ▼
POST /api/v1/modules  ← background task triggered
        │
        ▼
convert_to_h264()  ← ffmpeg transcodes to abc123_converted.mp4
        │
        ▼
moviepy + Groq AI  ← processes the H.264 file normally
        │
        ▼
Segments cut + Notes generated + Quiz created
        │
        ▼
_converted.mp4 deleted  ← original .MOV kept in static/videos/
```
