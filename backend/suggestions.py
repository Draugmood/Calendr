import sqlite3
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_db

router = APIRouter()


class SuggestionCreate(BaseModel):
    text: str


class SuggestionUpdate(BaseModel):
    done: bool


def normalize_text(value: str) -> str:
    text = value.strip()
    if not text:
        raise HTTPException(status_code=422, detail="text cannot be empty")
    return text


def row_to_suggestion(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "text": row["text"],
        "done": bool(row["done"]),
        "created_at": row["created_at"],
    }


def get_suggestion_by_id(cursor: sqlite3.Cursor, suggestion_id: int) -> sqlite3.Row:
    row = cursor.execute(
        "SELECT * FROM suggestions WHERE id = ?",
        (suggestion_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    return row


@router.get("/api/suggestions")
def list_suggestions():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM suggestions ORDER BY done, created_at DESC, id DESC"
    ).fetchall()
    conn.close()
    return [row_to_suggestion(row) for row in rows]


@router.post("/api/suggestions")
def create_suggestion(payload: SuggestionCreate):
    text = normalize_text(payload.text)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO suggestions (text) VALUES (?)", (text,))
    suggestion_id = cursor.lastrowid
    if suggestion_id is None:
        conn.close()
        raise HTTPException(
            status_code=500, detail="Failed to create suggestion")
    conn.commit()

    created = get_suggestion_by_id(cursor, suggestion_id)
    conn.close()
    return row_to_suggestion(created)


@router.patch("/api/suggestions/{suggestion_id}")
def update_suggestion(suggestion_id: int, payload: SuggestionUpdate):
    conn = get_db()
    cursor = conn.cursor()
    get_suggestion_by_id(cursor, suggestion_id)

    cursor.execute(
        "UPDATE suggestions SET done = ? WHERE id = ?",
        (int(payload.done), suggestion_id),
    )
    conn.commit()

    updated = get_suggestion_by_id(cursor, suggestion_id)
    conn.close()
    return row_to_suggestion(updated)


@router.delete("/api/suggestions/{suggestion_id}")
def delete_suggestion(suggestion_id: int):
    conn = get_db()
    cursor = conn.cursor()
    get_suggestion_by_id(cursor, suggestion_id)

    cursor.execute("DELETE FROM suggestions WHERE id = ?", (suggestion_id,))
    conn.commit()
    conn.close()
    return {"success": True, "id": suggestion_id}
