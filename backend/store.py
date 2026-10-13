"""Persistent storage for users, sessions, portal loan applications and the audit trail.

The historical 5,000-row dataset in data/cleaned_dataset.csv is never written to.
Everything created through the web application (accounts, new applications, officer
decisions) lives in a local SQLite database (storage/fraudguard.db by default).
"""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterator

ROOT = Path(__file__).resolve().parents[1]


def load_env_file() -> None:
    """Load KEY=VALUE pairs from a local .env file without overriding real env vars."""
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_env_file()

DB_PATH = Path(os.getenv("FRAUDGUARD_DB_PATH", str(ROOT / "storage" / "fraudguard.db")))
SESSION_HOURS = int(os.getenv("FRAUDGUARD_SESSION_HOURS", "12"))
PBKDF2_ROUNDS = 200_000

_lock = threading.Lock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('customer', 'officer', 'admin')),
    customer_id TEXT UNIQUE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS applications (
    application_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    applicant_age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    number_dependents INTEGER NOT NULL,
    residential_address TEXT NOT NULL,
    employment_status TEXT NOT NULL,
    monthly_income REAL NOT NULL,
    existing_emis REAL NOT NULL,
    debt_to_income_ratio REAL NOT NULL,
    property_ownership TEXT NOT NULL,
    cibil_score INTEGER,
    loan_type TEXT NOT NULL,
    purpose_of_loan TEXT NOT NULL,
    loan_amount REAL NOT NULL,
    loan_tenure_months INTEGER NOT NULL,
    interest_rate REAL NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('NEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
    submitted_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    idempotency_key TEXT UNIQUE,
    analysis_status TEXT NOT NULL DEFAULT 'pending',
    analysis_error TEXT,
    fraud_probability REAL,
    fraud_prediction INTEGER,
    risk_level TEXT,
    model_name TEXT,
    decided_by TEXT,
    decided_at TEXT,
    decision_reason TEXT,
    decision_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE TABLE IF NOT EXISTS application_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id TEXT NOT NULL REFERENCES applications(application_id),
    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    reason TEXT,
    note TEXT,
    actor_id INTEGER,
    actor_name TEXT,
    actor_email TEXT,
    actor_role TEXT,
    customer_visible INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_application ON application_events(application_id);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def _migrate_admin_role() -> None:
    """Older databases only allowed the customer/officer roles. Rebuild the users table
    (keeping every row and id) so the separate ADMIN / technical role can be stored."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=10, isolation_level=None)
    try:
        row = connection.execute("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").fetchone()
        if not row or "'admin'" in row[0]:
            return
        connection.execute("PRAGMA foreign_keys = OFF")
        connection.execute("BEGIN")
        try:
            connection.execute(
                "CREATE TABLE users_new ("
                "id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, "
                "role TEXT NOT NULL CHECK (role IN ('customer', 'officer', 'admin')), customer_id TEXT UNIQUE, "
                "password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)"
            )
            connection.execute(
                "INSERT INTO users_new (id, email, name, role, customer_id, password_salt, password_hash, created_at) "
                "SELECT id, email, name, role, customer_id, password_salt, password_hash, created_at FROM users"
            )
            connection.execute("DROP TABLE users")
            connection.execute("ALTER TABLE users_new RENAME TO users")
            connection.execute("COMMIT")
        except Exception:
            connection.execute("ROLLBACK")
            raise
    finally:
        connection.close()


def init_db() -> None:
    _migrate_admin_role()
    with connect() as db:
        db.executescript(SCHEMA)


# ---------------------------------------------------------------- passwords / sessions

def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ROUNDS).hex()
    return salt, digest


def verify_password(password: str, salt: str, expected: str) -> bool:
    _, digest = hash_password(password, salt)
    return hmac.compare_digest(digest, expected)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def public_user(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    return {"id": row["id"], "email": row["email"], "name": row["name"], "role": row["role"], "customerId": row["customer_id"]}


def get_user_by_email(email: str) -> sqlite3.Row | None:
    with connect() as db:
        return db.execute("SELECT * FROM users WHERE email = ?", (email.strip().lower(),)).fetchone()


def create_user(email: str, name: str, password: str, role: str, customer_id: str | None = None) -> dict[str, Any]:
    salt, digest = hash_password(password)
    with connect() as db:
        cursor = db.execute(
            "INSERT INTO users (email, name, role, customer_id, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (email.strip().lower(), name.strip(), role, customer_id, salt, digest, now_iso()),
        )
        row = db.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return public_user(row)


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    created = datetime.now(timezone.utc)
    with connect() as db:
        db.execute("DELETE FROM sessions WHERE expires_at < ?", (created.isoformat(),))
        db.execute(
            "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (_token_hash(token), user_id, created.isoformat(), (created + timedelta(hours=SESSION_HOURS)).isoformat()),
        )
    return token


def user_for_token(token: str) -> dict[str, Any] | None:
    with connect() as db:
        row = db.execute(
            "SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?",
            (_token_hash(token), datetime.now(timezone.utc).isoformat()),
        ).fetchone()
    return public_user(row) if row else None


def delete_session(token: str) -> None:
    with connect() as db:
        db.execute("DELETE FROM sessions WHERE token_hash = ?", (_token_hash(token),))


def ensure_officer_from_env() -> str | None:
    """Create the bank-officer account from environment variables if it does not exist yet."""
    email = os.getenv("FRAUDGUARD_OFFICER_EMAIL", "").strip().lower()
    password = os.getenv("FRAUDGUARD_OFFICER_PASSWORD", "")
    name = os.getenv("FRAUDGUARD_OFFICER_NAME", "Bank Officer").strip() or "Bank Officer"
    if not email or not password:
        return None
    if get_user_by_email(email):
        return email
    create_user(email, name, password, "officer")
    return email


def ensure_admin_from_env() -> str | None:
    """Create the ADMIN / technical account from environment variables if it does not exist yet.

    The admin role is separate from the bank-officer role: an existing customer or officer
    account is never promoted, so the email must not already be in use."""
    email = os.getenv("FRAUDGUARD_ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("FRAUDGUARD_ADMIN_PASSWORD", "")
    name = os.getenv("FRAUDGUARD_ADMIN_NAME", "Technical Admin").strip() or "Technical Admin"
    if not email or not password:
        return None
    if get_user_by_email(email):
        return email
    create_user(email, name, password, "admin")
    return email


def role_counts() -> dict[str, int]:
    with connect() as db:
        rows = db.execute("SELECT role, COUNT(*) FROM users GROUP BY role").fetchall()
    counts = {"customer": 0, "officer": 0, "admin": 0}
    counts.update({row[0]: int(row[1]) for row in rows})
    return counts


def application_status_counts() -> dict[str, int]:
    with connect() as db:
        rows = db.execute("SELECT status, COUNT(*) FROM applications GROUP BY status").fetchall()
        events = int(db.execute("SELECT COUNT(*) FROM application_events").fetchone()[0])
    counts = {row[0]: int(row[1]) for row in rows}
    counts["_events"] = events
    return counts


def officer_count() -> int:
    with connect() as db:
        return int(db.execute("SELECT COUNT(*) FROM users WHERE role = 'officer'").fetchone()[0])


# ---------------------------------------------------------------- identifiers

def _max_numeric(db: sqlite3.Connection, column: str, table: str, prefix: str) -> int:
    values = [row[0] for row in db.execute(f"SELECT {column} FROM {table} WHERE {column} LIKE ?", (f"{prefix}%",))]
    numbers = [int(value[len(prefix):]) for value in values if value and value[len(prefix):].isdigit()]
    return max(numbers, default=0)


def next_identifier(prefix: str, dataset_max: int, table: str, column: str, db: sqlite3.Connection) -> str:
    return f"{prefix}{max(dataset_max, _max_numeric(db, column, table, prefix)) + 1}"


def create_customer(email: str, name: str, password: str, dataset_customer_max: int) -> dict[str, Any]:
    with _lock:
        with connect() as db:
            customer_id = next_identifier("CUST", dataset_customer_max, "users", "customer_id", db)
        return create_user(email, name, password, "customer", customer_id)


# ---------------------------------------------------------------- applications

def insert_application(values: dict[str, Any], dataset_app_max: int, actor: dict[str, Any]) -> tuple[str, bool]:
    """Insert a new application. Returns (application_id, created). Duplicate idempotency keys return the existing id."""
    with _lock:
        with connect() as db:
            key = values.get("idempotency_key")
            if key:
                existing = db.execute("SELECT application_id FROM applications WHERE idempotency_key = ? AND user_id = ?", (key, actor["id"])).fetchone()
                if existing:
                    return existing[0], False
            application_id = next_identifier("APP", dataset_app_max, "applications", "application_id", db)
            timestamp = now_iso()
            record = {**values, "application_id": application_id, "status": "NEW", "submitted_at": timestamp, "updated_at": timestamp}
            columns = ", ".join(record.keys())
            placeholders = ", ".join("?" for _ in record)
            db.execute(f"INSERT INTO applications ({columns}) VALUES ({placeholders})", tuple(record.values()))
            _insert_event(db, application_id, "SUBMITTED", None, "NEW", None, None, actor, True, timestamp)
    return application_id, True


def _insert_event(db: sqlite3.Connection, application_id: str, event_type: str, from_status: str | None, to_status: str | None,
                  reason: str | None, note: str | None, actor: dict[str, Any] | None, customer_visible: bool, created_at: str | None = None) -> None:
    db.execute(
        "INSERT INTO application_events (application_id, event_type, from_status, to_status, reason, note, actor_id, actor_name, actor_email, actor_role, customer_visible, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (application_id, event_type, from_status, to_status, reason, note,
         actor.get("id") if actor else None, actor.get("name") if actor else "System", actor.get("email") if actor else None,
         actor.get("role") if actor else "system", 1 if customer_visible else 0, created_at or now_iso()),
    )


def save_analysis(application_id: str, analysis: dict[str, Any] | None, error: str | None) -> None:
    timestamp = now_iso()
    with connect() as db:
        if analysis:
            db.execute(
                "UPDATE applications SET analysis_status = 'completed', analysis_error = NULL, fraud_probability = ?, fraud_prediction = ?, risk_level = ?, model_name = ?, updated_at = ? WHERE application_id = ?",
                (analysis["fraudProbability"], analysis["prediction"], analysis["riskLevel"], analysis["model"], timestamp, application_id),
            )
            _insert_event(db, application_id, "FRAUD_ANALYSIS_COMPLETED", None, None, None, None, None, True, timestamp)
        else:
            db.execute("UPDATE applications SET analysis_status = 'unavailable', analysis_error = ?, updated_at = ? WHERE application_id = ?", (error, timestamp, application_id))
            _insert_event(db, application_id, "FRAUD_ANALYSIS_UNAVAILABLE", None, None, None, error, None, False, timestamp)


def get_application(application_id: str) -> sqlite3.Row | None:
    with connect() as db:
        return db.execute("SELECT * FROM applications WHERE application_id = ?", (application_id,)).fetchone()


def list_applications(user_id: int | None = None) -> list[sqlite3.Row]:
    with connect() as db:
        if user_id is None:
            return db.execute("SELECT * FROM applications ORDER BY submitted_at DESC").fetchall()
        return db.execute("SELECT * FROM applications WHERE user_id = ? ORDER BY submitted_at DESC", (user_id,)).fetchall()


def list_events(application_id: str, customer_only: bool = False) -> list[sqlite3.Row]:
    query = "SELECT * FROM application_events WHERE application_id = ?"
    if customer_only:
        query += " AND customer_visible = 1"
    with connect() as db:
        return db.execute(query + " ORDER BY created_at, id", (application_id,)).fetchall()


class TransitionError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


ALLOWED_TRANSITIONS = {
    "approve": ({"NEW", "UNDER_REVIEW"}, "APPROVED", "APPROVED"),
    "reject": ({"NEW", "UNDER_REVIEW"}, "REJECTED", "REJECTED"),
    "review": ({"NEW"}, "UNDER_REVIEW", "SENT_FOR_REVIEW"),
}


def apply_decision(application_id: str, action: str, reason: str | None, note: str | None, expected_status: str | None, actor: dict[str, Any]) -> None:
    allowed_from, to_status, event_type = ALLOWED_TRANSITIONS[action]
    with _lock:
        with connect() as db:
            row = db.execute("SELECT status FROM applications WHERE application_id = ?", (application_id,)).fetchone()
            if not row:
                raise TransitionError(404, f"Application {application_id} was not found.")
            current = row["status"]
            if expected_status and current != expected_status:
                raise TransitionError(409, f"Application {application_id} is now {current.replace('_', ' ').title()}. Reload to see the latest status.")
            if current not in allowed_from:
                raise TransitionError(409, f"Cannot {action} an application that is {current.replace('_', ' ').title()}.")
            timestamp = now_iso()
            if action == "review":
                db.execute("UPDATE applications SET status = ?, updated_at = ? WHERE application_id = ?", (to_status, timestamp, application_id))
            else:
                db.execute(
                    "UPDATE applications SET status = ?, updated_at = ?, decided_by = ?, decided_at = ?, decision_reason = ?, decision_note = ? WHERE application_id = ?",
                    (to_status, timestamp, f"{actor['name']} ({actor['email']})", timestamp, reason, note, application_id),
                )
            _insert_event(db, application_id, event_type, current, to_status, reason, note, actor, True, timestamp)
