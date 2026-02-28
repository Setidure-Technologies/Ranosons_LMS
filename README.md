# Ranoson Springs LMS

## Overview
Ranoson Springs LMS is a Learning Management System designed to train factory operators (e.g., CNC Operators) on machine safety, operation, and maintenance. The system features a modern web interface with interactive 3D machine exploration and a robust backend for user and content management.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (with SQLAlchemy ORM)
- **Authentication**: JWT (JSON Web Tokens)
- **Migrations**: Alembic

### Frontend
- **Framework**: Next.js 15 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **3D Graphics**: React Three Fiber (Three.js)
- **Icons**: Lucide React

### Tools
- **Video Processing**: Python script (`video segmentor`) for processing training videos.

## Project Structure

```
/home/ashok/Ranoson/
├── backend/                # FastAPI application
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── models.py       # Database models
│   │   ├── schemas.py      # Pydantic schemas
│   │   └── ...
│   ├── alembic/            # Database migrations
│   └── requirements.txt    # Python dependencies
├── frontend/               # Next.js application
│   ├── app/                # App router pages
│   ├── components/         # Reusable UI components
│   └── ...
└── video segmentor/        # Video processing scripts
```

## Setup Instructions

### Prerequisites
- Node.js (v18+ recommended)
- Python (v3.8+ recommended)

### Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Create a virtual environment (optional but recommended):
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4.  Run the server:
    ```bash
    uvicorn app.main:app --reload
    ```
    The API will be available at `http://localhost:8000`. API Docs at `http://localhost:8000/docs`.

### Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

    The application will be available at `http://localhost:3000`.

### Windows Quick/One-Click Start

1.  Navigate to the root directory of the project.
2.  Double-click the `start_app.bat` file.
3.  This will automatically start both the backend and frontend servers in separate windows.

## Key Features

-   **Role-Based Dashboard**: Customized views for different roles (e.g., CNC Operator).
-   **Interactive 3D Explorer**: Explore machine parts (Feeder, Coiler) in 3D.
-   **Training Modules**: Track progress on assigned training modules.
-   **User Profile**: Manage user details.
-   **Admin API**: Endpoints for managing users and content.

## Video Segmentor
The `video segmentor` directory contains scripts to process raw video footage into training segments.
