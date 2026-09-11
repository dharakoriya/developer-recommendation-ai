import os
import sys
import subprocess

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    backend_reset_script = os.path.join(backend_dir, "reset_db.py")

    if not os.path.exists(backend_reset_script):
        print(f"[ERROR] Could not find backend reset script at {backend_reset_script}")
        sys.exit(1)

    python_exe = venv_python if os.path.exists(venv_python) else sys.executable
    print(f"[INFO] Executing database reset with: {python_exe}")
    
    result = subprocess.run([python_exe, backend_reset_script] + sys.argv[1:], cwd=backend_dir)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
