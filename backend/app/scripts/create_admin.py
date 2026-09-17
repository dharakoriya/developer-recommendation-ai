"""
DEVAlign AI — First Admin Provisioning & Safe Bootstrap CLI Script

Usage:
    python -m app.scripts.create_admin
    python -m app.scripts.create_admin --name "System Admin" --email "admin@devalign.local" --password "admin123"

Description:
    Safely creates the initial Administrator account on fresh or existing databases.
    Enforces email validation, duplicate prevention, and bcrypt password hashing.
"""
import argparse
import getpass
import re
import sys
from sqlalchemy import select, func
from app.database import SessionLocal
from app.models.user import User
from app.models.enums import UserRole
from app.core.security import get_password_hash

EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"


def validate_email_format(email: str) -> bool:
    return bool(re.match(EMAIL_REGEX, email.strip()))


def create_admin_user(name: str, email: str, password: str) -> bool:
    clean_name = name.strip()
    clean_email = email.strip().lower()

    if not clean_name:
        print("[!] ERROR: Admin name cannot be empty.")
        return False

    if not validate_email_format(clean_email):
        print(f"[!] ERROR: Invalid email format '{clean_email}'.")
        return False

    if len(password) < 6:
        print("[!] ERROR: Password must be at least 6 characters long.")
        return False

    db = SessionLocal()
    try:
        existing_user = db.execute(
            select(User).where(func.lower(User.email) == clean_email)
        ).scalar_one_or_none()

        if existing_user:
            if existing_user.role == UserRole.ADMIN:
                print(f"[i] INFO: Admin user '{clean_email}' already exists in DEVAlign AI. No changes made.")
                return True
            else:
                print(f"[!] ERROR: User '{clean_email}' already exists with role '{existing_user.role.value}'.")
                return False

        hashed_pw = get_password_hash(password)
        new_admin = User(
            name=clean_name,
            email=clean_email,
            password_hash=hashed_pw,
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)

        print("================================================================")
        print("  DEVAlign AI — Initial Administrator Successfully Provisioned")
        print("================================================================")
        print(f"  ID:       {new_admin.id}")
        print(f"  Name:     {new_admin.name}")
        print(f"  Email:    {new_admin.email}")
        print(f"  Role:     {new_admin.role.value}")
        print(f"  Status:   ACTIVE")
        print("================================================================")
        return True
    except Exception as e:
        db.rollback()
        print(f"[!] ERROR creating admin user: {e}")
        return False
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Create initial DEVAlign AI Administrator account.")
    parser.add_argument("--name", type=str, help="Admin full name", default=None)
    parser.add_argument("--email", type=str, help="Admin email address", default=None)
    parser.add_argument("--password", type=str, help="Admin password (min 6 chars)", default=None)

    args = parser.parse_args()

    name = args.name
    email = args.email
    password = args.password

    # If parameters were not passed via CLI flags, prompt interactively
    if not name or not email or not password:
        print("\n--- DEVAlign AI: Create Initial Administrator ---")
        if not name:
            name = input("Enter Admin Full Name [System Administrator]: ").strip() or "System Administrator"
        if not email:
            email = input("Enter Admin Email [admin@devalign.local]: ").strip() or "admin@devalign.local"
        if not password:
            while True:
                password = getpass.getpass("Enter Admin Password (min 6 chars): ")
                if len(password) >= 6:
                    confirm = getpass.getpass("Confirm Admin Password: ")
                    if password == confirm:
                        break
                    else:
                        print("[!] Passwords do not match. Please try again.")
                else:
                    print("[!] Password too short (minimum 6 characters).")

    success = create_admin_user(name, email, password)
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
