"""
Run from the backend/ directory:
    python scripts/create_admin.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

import bcrypt
from config.database import init_pool, DB

def main():
    init_pool()
    print("\n=== Create Admin User ===\n")
    email = input("Admin email (@rosmini.school.nz): ").strip().lower()
    name = input("Full name: ").strip()
    password = input("Password (min 8 chars): ").strip()

    if len(password) < 8:
        print("Password too short."); sys.exit(1)

    domain = email.split("@")[-1] if "@" in email else ""

    with DB() as db:
        school = db.fetchone("SELECT id FROM schools WHERE email_domain = %s", [domain])
        if not school:
            print(f"School domain '{domain}' not found. Run database/seed.sql first.")
            sys.exit(1)

        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()
        user = db.fetchone(
            """INSERT INTO users (school_id, email, password_hash, full_name, role)
               VALUES (%s, %s, %s, %s, 'admin')
               ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = EXCLUDED.password_hash
               RETURNING id, email, full_name, role""",
            [school["id"], email, hashed, name],
        )
        print(f"\nAdmin created: {dict(user)}\n")

if __name__ == "__main__":
    main()
