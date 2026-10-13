"""Small management CLI.

Create a bank-officer account (the password is prompted, never stored in the repository):

    python -m backend.manage create-officer --email officer@example.com --name "Loan Officer"

Create an ADMIN / technical account (separate role, used for the technical panel):

    python -m backend.manage create-admin --email admin@example.com --name "Technical Admin"
"""
from __future__ import annotations

import argparse
import getpass
import sys

from backend import store


def main() -> int:
    parser = argparse.ArgumentParser(description="FraudGuard management commands")
    sub = parser.add_subparsers(dest="command", required=True)
    officer = sub.add_parser("create-officer", help="Create a bank-officer account")
    officer.add_argument("--email", required=True)
    officer.add_argument("--name", default="Bank Officer")
    admin = sub.add_parser("create-admin", help="Create an ADMIN / technical account")
    admin.add_argument("--email", required=True)
    admin.add_argument("--name", default="Technical Admin")
    args = parser.parse_args()

    store.init_db()
    if args.command in {"create-officer", "create-admin"}:
        role = "officer" if args.command == "create-officer" else "admin"
        if store.get_user_by_email(args.email):
            print(f"An account for {args.email} already exists.")
            return 1
        password = getpass.getpass("Password (min 8 characters): ")
        if len(password) < 8 or password != getpass.getpass("Repeat password: "):
            print("Passwords must match and be at least 8 characters.")
            return 1
        store.create_user(args.email, args.name, password, role)
        print(f"{'Bank-officer' if role == 'officer' else 'Admin / technical'} account created for {args.email}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
