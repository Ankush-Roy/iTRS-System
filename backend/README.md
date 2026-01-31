# Backend Setup

This backend uses a dedicated virtual environment and pinned dependencies for reproducible installs.

## Prerequisites

- Python 3.11+ installed and available on PATH
- Windows PowerShell

## Quick Start (Windows)

```powershell
# From the repo root
python -m venv .venv
.venv\Scripts\Activate.ps1

# Install dependencies for the backend
pip install -r backend/requirements.txt

# Run the FastAPI server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## Notes

- The virtual environment is created at `.venv` in the repo root.
- Dependencies are pinned in `backend/requirements.txt` for consistency.
- Environment variables (e.g., Azure OpenAI, Qdrant) should be configured via a `.env` file at the repo root; the code uses `python-dotenv` to load it.
- Key runtime libraries used by the backend: FastAPI, Uvicorn, Pydantic, Python-Dotenv, OpenAI, Qdrant Client, Pandas, Tiktoken.


Create venv dir: python -m venv .venv
Activate venv: .venv\Scripts\activate.bat

Error: Python packaging tool setuptools not found:
Solution:
    1. .venv\Scripts\activate.bat
    2. python -m ensurepip --upgrade
    3. python -m pip install --upgrade pip setuptools wheel
    4. pip --version
    5. pip show setuptools

Run in local: uvicorn main:app --reload