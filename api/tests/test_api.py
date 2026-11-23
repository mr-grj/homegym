import http.client
import sqlite3
from collections.abc import Iterator
from pathlib import Path
from typing import ClassVar

import pytest
from fastapi.testclient import TestClient

from app import main

SEED = (Path(main.__file__).with_name("seed.txt")).read_text(encoding="utf-8")


def session_body(**overrides: object) -> dict[str, object]:
    """A valid session payload with optional field overrides."""
    return {
        "title": "Core (10 min)",
        "started_at": "2026-11-01T07:00:00Z",
        "ended_at": "2026-11-01T07:10:00Z",
        "seconds": 600,
        "effort": 6,
        "notes": "",
        "blocks": [{"name": "Activation", "done": True}, {"name": "Circuit", "done": False}],
        **overrides,
    }


@pytest.fixture
def db_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "data" / "homegym.db"
    monkeypatch.setattr(main, "DB_PATH", path)
    return path


@pytest.fixture
def client(db_path: Path) -> Iterator[TestClient]:
    with TestClient(main.app) as client:
        yield client


def test_health(client: TestClient) -> None:
    assert client.get("/api/health").json() == {"status": "ok"}


def test_first_boot_seeds_one_routine_and_sets_schema_version(client: TestClient, db_path: Path) -> None:
    routines = client.get("/api/routines").json()
    assert [r["source"] for r in routines] == [SEED]
    with sqlite3.connect(db_path) as conn:
        assert conn.execute("PRAGMA user_version").fetchone()[0] == main.SCHEMA_VERSION


def test_restart_keeps_data_without_seeding_again(client: TestClient) -> None:
    client.delete("/api/routines/1")
    with TestClient(main.app) as again:
        assert again.get("/api/routines").json() == []


def test_routine_lifecycle(client: TestClient) -> None:
    created = client.post("/api/routines", json={"source": "# A\nPlank 45s\n"})
    assert created.status_code == 201
    routine = created.json()
    assert set(routine) == {"id", "source", "updated_at"}
    assert routine["source"] == "# A\nPlank 45s\n"

    updated = client.put(f"/api/routines/{routine['id']}", json={"source": "# B\nSquat 1m\n"})
    assert updated.status_code == 200
    assert updated.json()["source"] == "# B\nSquat 1m\n"

    ids = [r["id"] for r in client.get("/api/routines").json()]
    assert ids == sorted(ids) and ids[-1] == routine["id"]

    assert client.delete(f"/api/routines/{routine['id']}").status_code == 204
    assert routine["id"] not in [r["id"] for r in client.get("/api/routines").json()]


def test_routine_errors(client: TestClient) -> None:
    missing = client.put("/api/routines/999", json={"source": "x"})
    assert missing.status_code == 404
    assert missing.json() == {"detail": "Routine not found"}
    assert client.delete("/api/routines/999").status_code == 204
    assert client.post("/api/routines", json={"source": ""}).status_code == 422
    assert client.post("/api/routines", json={"source": "x" * 50_001}).status_code == 422
    assert client.post("/api/routines", json={"source": "x" * 50_000}).status_code == 201


def test_session_lifecycle(client: TestClient) -> None:
    created = client.post("/api/sessions", json=session_body())
    assert created.status_code == 201
    session = created.json()
    assert session["blocks"] == [
        {"name": "Activation", "done": True, "exercises": []},
        {"name": "Circuit", "done": False, "exercises": []},
    ]
    assert session["effort"] == 6

    assert client.get("/api/sessions").json() == [session]
    assert client.delete(f"/api/sessions/{session['id']}").status_code == 204
    assert client.get("/api/sessions").json() == []


def test_session_blocks_keep_their_exercises(client: TestClient, db_path: Path) -> None:
    block = {"name": "Circuit", "done": True, "exercises": ["Plank", "Side plank, left"]}
    saved = client.post("/api/sessions", json=session_body(blocks=[block])).json()
    assert saved["blocks"] == [block]

    with sqlite3.connect(db_path) as conn:
        conn.execute("UPDATE sessions SET blocks = ?", ('[{"name": "Circuit", "done": true}]',))
    assert client.get("/api/sessions").json()[0]["blocks"] == [{"name": "Circuit", "done": True, "exercises": []}]


def test_sessions_are_newest_first_and_limited(client: TestClient) -> None:
    for day in (3, 1, 2):
        client.post("/api/sessions", json=session_body(title=f"day {day}", started_at=f"2026-11-0{day}T07:00:00Z"))
    assert [s["title"] for s in client.get("/api/sessions").json()] == ["day 3", "day 2", "day 1"]
    assert [s["title"] for s in client.get("/api/sessions", params={"limit": 2}).json()] == ["day 3", "day 2"]


def test_session_defaults_and_validation(client: TestClient) -> None:
    minimal = {k: v for k, v in session_body().items() if k in {"title", "started_at", "ended_at", "seconds"}}
    saved = client.post("/api/sessions", json=minimal).json()
    assert (saved["effort"], saved["notes"], saved["blocks"]) == (None, "", [])
    for bad in ({"effort": 0}, {"effort": 11}, {"title": ""}, {"seconds": -1}, {"notes": "x" * 5_001}):
        assert client.post("/api/sessions", json=session_body(**bad)).status_code == 422, bad


def test_settings_round_trip(client: TestClient) -> None:
    assert client.get("/api/settings").json() == {}
    value = {"sound": True, "voice": False, "list": [1, "ă"], "nested": {"a": None}}
    assert client.put("/api/settings/homegym.prefs", json=value).status_code == 204
    assert client.put("/api/settings/homegym.recent", json=["25m", "5m"]).status_code == 204
    assert client.put("/api/settings/homegym.recent", json=["1:30"]).status_code == 204
    assert client.get("/api/settings").json() == {"homegym.prefs": value, "homegym.recent": ["1:30"]}


def test_setting_scalars(client: TestClient) -> None:
    values: tuple[object, ...] = (True, 0, "text", [])
    for value in values:
        assert client.put("/api/settings/homegym.x", json=value).status_code == 204
        assert client.get("/api/settings").json()["homegym.x"] == value
    null = client.put("/api/settings/homegym.x", content="null", headers={"Content-Type": "application/json"})
    assert null.status_code == 204
    assert client.get("/api/settings").json()["homegym.x"] is None


def test_setting_errors(client: TestClient) -> None:
    assert client.put("/api/settings/bad key", json=1).status_code == 422
    assert client.put(f"/api/settings/{'k' * 65}", json=1).status_code == 422
    assert client.put("/api/settings/homegym.big", json="x" * 200_000).status_code == 413
    assert client.get("/api/settings").json() == {}


class FakeConnection:
    location: ClassVar[str] = ""
    error: ClassVar[OSError | None] = None
    requested: ClassVar[list[tuple[str, str, str]]] = []

    def __init__(self, host: str, timeout: float) -> None:
        self.host = host

    def request(self, method: str, path: str) -> None:
        if self.error:
            raise self.error
        self.requested.append((self.host, method, path))

    def getresponse(self) -> FakeConnection:
        return self

    def getheader(self, name: str, default: str) -> str:
        return self.location or default

    def close(self) -> None:
        pass


@pytest.fixture
def soundcloud(monkeypatch: pytest.MonkeyPatch) -> type[FakeConnection]:
    FakeConnection.location = ""
    FakeConnection.error = None
    FakeConnection.requested = []
    monkeypatch.setattr(http.client, "HTTPSConnection", FakeConnection)
    return FakeConnection


def test_resolve_short_link(client: TestClient, soundcloud: type[FakeConnection]) -> None:
    soundcloud.location = "https://soundcloud.com/artist/sets/mix?si=abc"
    response = client.get("/api/music/resolve", params={"url": "https://on.soundcloud.com/AbC123"})
    assert response.json() == {"url": "https://soundcloud.com/artist/sets/mix?si=abc"}
    assert soundcloud.requested == [("on.soundcloud.com", "HEAD", "/AbC123")]


def test_resolve_rejects_other_links(client: TestClient, soundcloud: type[FakeConnection]) -> None:
    for url in ("https://soundcloud.com/artist", "https://on.soundcloud.com/a/b", "http://on.soundcloud.com/x"):
        assert client.get("/api/music/resolve", params={"url": url}).status_code == 400
    assert client.get("/api/music/resolve", params={"url": "https://on.soundcloud.com/" + "a" * 200}).status_code == 422
    assert soundcloud.requested == []


def test_resolve_failures(client: TestClient, soundcloud: type[FakeConnection]) -> None:
    params = {"url": "https://on.soundcloud.com/x"}
    soundcloud.location = "https://evil.example/soundcloud.com"
    assert client.get("/api/music/resolve", params=params).status_code == 404
    soundcloud.location = ""
    assert client.get("/api/music/resolve", params=params).status_code == 404
    soundcloud.error = OSError("down")
    response = client.get("/api/music/resolve", params=params)
    assert response.status_code == 502
    assert response.json() == {"detail": "SoundCloud is unreachable"}
