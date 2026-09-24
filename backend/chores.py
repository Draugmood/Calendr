import sqlite3
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_db
from reminders import format_utc, now_utc

router = APIRouter()

VALID_PRIORITIES = {1, 2, 3}

CHORE_SELECT = """
    SELECT
        c.id,
        c.title,
        c.frequency_days,
        c.priority,
        c.created_at,
        (
            SELECT MAX(cc.completed_at_utc)
            FROM chore_completions cc
            WHERE cc.chore_id = c.id
        ) AS last_completed_at_utc
    FROM chores c
"""


class ChoreCreate(BaseModel):
    title: str
    frequency_days: int
    priority: int = 2


class ChoreUpdate(BaseModel):
    title: Optional[str] = None
    frequency_days: Optional[int] = None
    priority: Optional[int] = None


def normalize_title(value: str) -> str:
    title = value.strip()
    if not title:
        raise HTTPException(status_code=422, detail="title cannot be empty")
    return title


def validate_frequency_days(value: int) -> int:
    if value < 1:
        raise HTTPException(
            status_code=422, detail="frequency_days must be at least 1")
    return value


def validate_priority(value: int) -> int:
    if value not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=422, detail="priority must be 1, 2 or 3")
    return value


def row_to_chore(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "frequency_days": row["frequency_days"],
        "priority": row["priority"],
        "created_at": row["created_at"],
        "last_completed_at_utc": row["last_completed_at_utc"],
    }


def get_chore_by_id(cursor: sqlite3.Cursor, chore_id: int) -> sqlite3.Row:
    row = cursor.execute(
        f"{CHORE_SELECT} WHERE c.id = ?",
        (chore_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Chore not found")
    return row


@router.get("/api/chores")
def list_chores():
    conn = get_db()
    rows = conn.execute(f"{CHORE_SELECT} ORDER BY c.id").fetchall()
    conn.close()
    return [row_to_chore(row) for row in rows]


@router.post("/api/chores")
def create_chore(payload: ChoreCreate):
    title = normalize_title(payload.title)
    frequency_days = validate_frequency_days(payload.frequency_days)
    priority = validate_priority(payload.priority)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO chores (title, frequency_days, priority) VALUES (?, ?, ?)",
        (title, frequency_days, priority),
    )
    chore_id = cursor.lastrowid
    if chore_id is None:
        conn.close()
        raise HTTPException(status_code=500, detail="Failed to create chore")
    conn.commit()

    created = get_chore_by_id(cursor, chore_id)
    conn.close()
    return row_to_chore(created)


@router.patch("/api/chores/{chore_id}")
def update_chore(chore_id: int, payload: ChoreUpdate):
    updates: dict[str, Any] = {}
    if payload.title is not None:
        updates["title"] = normalize_title(payload.title)
    if payload.frequency_days is not None:
        updates["frequency_days"] = validate_frequency_days(
            payload.frequency_days)
    if payload.priority is not None:
        updates["priority"] = validate_priority(payload.priority)

    conn = get_db()
    cursor = conn.cursor()
    get_chore_by_id(cursor, chore_id)

    if updates:
        assignments = ", ".join(f"{column} = ?" for column in updates)
        cursor.execute(
            f"UPDATE chores SET {assignments} WHERE id = ?",
            (*updates.values(), chore_id),
        )
        conn.commit()

    updated = get_chore_by_id(cursor, chore_id)
    conn.close()
    return row_to_chore(updated)


@router.delete("/api/chores/{chore_id}")
def delete_chore(chore_id: int):
    conn = get_db()
    cursor = conn.cursor()
    get_chore_by_id(cursor, chore_id)

    # SQLite only honours ON DELETE CASCADE when PRAGMA foreign_keys is on.
    cursor.execute(
        "DELETE FROM chore_completions WHERE chore_id = ?", (chore_id,))
    cursor.execute("DELETE FROM chores WHERE id = ?", (chore_id,))
    conn.commit()
    conn.close()
    return {"success": True, "id": chore_id}


@router.post("/api/chores/{chore_id}/complete")
def complete_chore(chore_id: int):
    conn = get_db()
    cursor = conn.cursor()
    get_chore_by_id(cursor, chore_id)

    cursor.execute(
        "INSERT INTO chore_completions (chore_id, completed_at_utc) VALUES (?, ?)",
        (chore_id, format_utc(now_utc())),
    )
    conn.commit()

    updated = get_chore_by_id(cursor, chore_id)
    conn.close()
    return row_to_chore(updated)


@router.delete("/api/chores/{chore_id}/completions/latest")
def undo_latest_completion(chore_id: int):
    conn = get_db()
    cursor = conn.cursor()
    get_chore_by_id(cursor, chore_id)

    latest = cursor.execute(
        """
        SELECT id FROM chore_completions
        WHERE chore_id = ?
        ORDER BY completed_at_utc DESC, id DESC
        LIMIT 1
        """,
        (chore_id,),
    ).fetchone()
    if not latest:
        conn.close()
        raise HTTPException(
            status_code=404, detail="Chore has no completions to undo")

    cursor.execute("DELETE FROM chore_completions WHERE id = ?",
                   (latest["id"],))
    conn.commit()

    updated = get_chore_by_id(cursor, chore_id)
    conn.close()
    return row_to_chore(updated)
