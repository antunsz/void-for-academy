"""
Session memory configuration.

Agno's built-in session management handles per-session chat history
via the db parameter on agents/teams. This module provides helpers
for session lifecycle management.
"""

from agno.db.sqlite import SqliteDb

from acad.config import AGNO_DB_URL

session_db = SqliteDb(db_file="acad.db") if AGNO_DB_URL.startswith("sqlite") else None


def get_session_db():
    """Return the session database instance."""
    return session_db
