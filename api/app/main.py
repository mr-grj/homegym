"""homegym API: stores routines, the session log and synced settings."""

import http.client
import json
import os
import re
import sqlite3
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager, contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import Body, FastAPI, HTTPException, Path as Param, Query, Response
from pydantic import BaseModel, Field

DB_PATH = Path(os.environ.get("HOMEGYM_DB", "homegym.db"))
SEED = Path(__file__).with_name("seed.txt")
SCHEMA_VERSION = 2
MAX_SETTING_BYTES = 200_000
SHORT_LINK = re.compile(r"https://on\.soundcloud\.com/(\w+)")
FULL_LINK = re.compile(r"https://(?:www\.|m\.)?soundcloud\.com/\S+")

SCHEMA = """
CREATE TABLE IF NOT EXISTS routines (
    id INTEGER PRIMARY KEY,
    source TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL,
    seconds INTEGER NOT NULL,
    effort INTEGER,
    notes TEXT NOT NULL DEFAULT '',
    blocks TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"""


class RoutineIn(BaseModel):
    source: str = Field(min_length=1, max_length=50_000)


class Routine(RoutineIn):
    id: int
    updated_at: datetime


class Block(BaseModel):
    name: str
    done: bool


class SessionIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    started_at: datetime
    ended_at: datetime
    seconds: int = Field(ge=0)
    effort: int | None = Field(default=None, ge=1, le=10)
    notes: str = Field(default="", max_length=5_000)
    blocks: list[Block] = []


class Session(SessionIn):
    id: int


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    """Yield a connection that commits on success and always closes."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def utcnow() -> str:
    """Return the current UTC time in ISO 8601."""
    return datetime.now(UTC).isoformat(timespec="seconds")


def to_session(row: sqlite3.Row) -> Session:
    """Convert a sessions row into its API model."""
    return Session(**{**row, "blocks": json.loads(row["blocks"])})


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Create or migrate the schema and seed the starter routine on first boot."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db() as conn:
        version = conn.execute("PRAGMA user_version").fetchone()[0]
        conn.executescript(SCHEMA)
        if version == 0:
            conn.execute(
                "INSERT INTO routines (source, updated_at) VALUES (?, ?)",
                (SEED.read_text(encoding="utf-8"), utcnow()),
            )
        conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
    yield


app = FastAPI(title="homegym", lifespan=lifespan)


@app.get("/api/health")
def health() -> dict[str, str]:
    """Report liveness."""
    return {"status": "ok"}


@app.get("/api/routines")
def list_routines() -> list[Routine]:
    """List routines in creation order."""
    with db() as conn:
        rows = conn.execute("SELECT * FROM routines ORDER BY id").fetchall()
    return [Routine(**row) for row in rows]


@app.post("/api/routines", status_code=201)
def create_routine(body: RoutineIn) -> Routine:
    """Create a routine from its plain-text source."""
    with db() as conn:
        row = conn.execute(
            "INSERT INTO routines (source, updated_at) VALUES (?, ?) RETURNING *",
            (body.source, utcnow()),
        ).fetchone()
    return Routine(**row)


@app.put("/api/routines/{routine_id}")
def update_routine(routine_id: int, body: RoutineIn) -> Routine:
    """Replace a routine's source."""
    with db() as conn:
        row = conn.execute(
            "UPDATE routines SET source = ?, updated_at = ? WHERE id = ? RETURNING *",
            (body.source, utcnow(), routine_id),
        ).fetchone()
    if row is None:
        raise HTTPException(404, "Routine not found")
    return Routine(**row)


@app.delete("/api/routines/{routine_id}", status_code=204)
def delete_routine(routine_id: int) -> Response:
    """Delete a routine."""
    with db() as conn:
        conn.execute("DELETE FROM routines WHERE id = ?", (routine_id,))
    return Response(status_code=204)


@app.get("/api/sessions")
def list_sessions(limit: int = 500) -> list[Session]:
    """List logged sessions, newest first."""
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?", (limit,)
        ).fetchall()
    return [to_session(row) for row in rows]


@app.post("/api/sessions", status_code=201)
def create_session(body: SessionIn) -> Session:
    """Log a finished session."""
    with db() as conn:
        row = conn.execute(
            """
            INSERT INTO sessions (title, started_at, ended_at, seconds, effort, notes, blocks)
            VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *
            """,
            (
                body.title,
                body.started_at.isoformat(),
                body.ended_at.isoformat(),
                body.seconds,
                body.effort,
                body.notes,
                json.dumps([block.model_dump() for block in body.blocks]),
            ),
        ).fetchone()
    return to_session(row)


@app.get("/api/settings")
def get_settings() -> dict[str, Any]:
    """Return every stored setting by key."""
    with db() as conn:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
    return {row["key"]: json.loads(row["value"]) for row in rows}


@app.put("/api/settings/{key}", status_code=204)
def put_setting(
    key: str = Param(pattern=r"^[\w.-]{1,64}$"),
    value: Any = Body(),
) -> Response:
    """Create or replace one setting."""
    encoded = json.dumps(value, ensure_ascii=False)
    if len(encoded.encode()) > MAX_SETTING_BYTES:
        raise HTTPException(413, "Setting too large")
    with db() as conn:
        conn.execute(
            """
            INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
            """,
            (key, encoded, utcnow()),
        )
    return Response(status_code=204)


@app.get("/api/music/resolve")
def resolve_link(url: str = Query(max_length=200)) -> dict[str, str]:
    """Expand an on.soundcloud.com short link, which browsers cannot follow across origins."""
    match = SHORT_LINK.fullmatch(url)
    if not match:
        raise HTTPException(400, "Only on.soundcloud.com links")
    conn = http.client.HTTPSConnection("on.soundcloud.com", timeout=5)
    try:
        conn.request("HEAD", f"/{match[1]}")
        location = conn.getresponse().getheader("Location", "")
    except OSError as error:
        raise HTTPException(502, "SoundCloud is unreachable") from error
    finally:
        conn.close()
    if not FULL_LINK.fullmatch(location):
        raise HTTPException(404, "Unknown short link")
    return {"url": location}


@app.delete("/api/sessions/{session_id}", status_code=204)
def delete_session(session_id: int) -> Response:
    """Delete a logged session."""
    with db() as conn:
        conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    return Response(status_code=204)
