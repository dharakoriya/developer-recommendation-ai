"""
DEVAlign AI — First Admin Provisioning & Safe Bootstrap Script

Usage:
    python backend/scripts/create_admin.py
    python backend/scripts/create_admin.py --name "System Admin" --email "admin@devalign.local" --password "admin123"
"""
import os
import sys
import subprocess

# Self-invocation check: Ensure script runs inside backend/venv
def ensure_venv():
    try:
        import sqlalchemy
    except ImportError:
        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
        if os.path.exists(venv_python):
            result = subprocess.run([venv_python, __file__] + sys.argv[1:])
            sys.exit(result.returncode)
        else:
            print("[ERROR] Could not find virtualenv Python at backend/venv/Scripts/python.exe")
            sys.exit(1)

ensure_venv()

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.scripts.create_admin import main

if __name__ == "__main__":
    main()
