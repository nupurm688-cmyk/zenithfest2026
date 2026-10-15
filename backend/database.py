import os
import shutil
import sqlite3
from pathlib import Path

# Resolve path to fest.db at the project root
BASE_DIR = Path(__file__).resolve().parent.parent


def get_db_path() -> Path:
    """Returns writable database path (uses /tmp on serverless environments like Vercel)."""
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        tmp_db = Path("/tmp/fest.db")
        if not tmp_db.exists():
            root_db = BASE_DIR / "fest.db"
            if root_db.exists():
                try:
                    shutil.copy2(root_db, tmp_db)
                except Exception as e:
                    print(f"Warning: Could not copy fest.db to /tmp: {e}")
        return tmp_db
    return BASE_DIR / "fest.db"


def get_db_connection() -> sqlite3.Connection:
    """Returns a SQLite connection with row_factory set to sqlite3.Row for dict-like access."""
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Initializes the database schema with events and registrations tables."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            event_date TEXT NOT NULL,
            event_time TEXT NOT NULL,
            venue TEXT NOT NULL,
            capacity INTEGER NOT NULL,
            fee INTEGER NOT NULL DEFAULT 0,
            icon TEXT
        );
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL REFERENCES events(id),
            student_name TEXT NOT NULL,
            roll_number TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            registered_at TEXT NOT NULL,
            UNIQUE(event_id, email)
        );
        """
    )

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print(f"Database schema initialized at: {DB_PATH}")
