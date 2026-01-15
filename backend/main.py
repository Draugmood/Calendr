import os
import sqlite3
import httpx
from datetime import datetime
from typing import Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv(".env.development")

DB_FILE = os.environ.get("CALENDR_DB_FILE", "/var/lib/calendr/calendr.db")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.environ.get(
    "GOOGLE_REDIRECT_URI", "http://localhost:5173")


def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS system_kv (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS recurring_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            cadence TEXT NOT NULL, -- 'daily', 'weekly'
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS recurring_list_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            list_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY(list_id) REFERENCES recurring_lists(id)
        );

        CREATE TABLE IF NOT EXISTS recurring_instances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            list_id INTEGER NOT NULL,
            period_key TEXT NOT NULL, -- e.g. '2026-01-07' for daily, '2026-W01' for weekly
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(list_id, period_key)
        );

        CREATE TABLE IF NOT EXISTS recurring_instance_item_state (
            instance_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            completed BOOLEAN DEFAULT 0,
            completed_at TIMESTAMP,
            PRIMARY KEY (instance_id, item_id),
            FOREIGN KEY(instance_id) REFERENCES recurring_instances(id),
            FOREIGN KEY(item_id) REFERENCES recurring_list_items(id)
        );
    """)

    cursor.execute("SELECT count(*) as count FROM recurring_lists")
    if cursor.fetchone()['count'] == 0:
        print("Seeding empty database...")
        cursor.execute(
            "INSERT INTO recurring_lists (name, cadence) VALUES (?, ?)", (
                "Daily Routine", "daily")
        )
        list_id = cursor.lastrowid
        items = [
            ("Check emails", 1),
            ("Stand-up meeting", 2),
            ("Code review", 3)
        ]
        cursor.executemany("""
            INSERT INTO recurring_list_items (list_id, text, sort_order)
            VALUES (?, ?, ?)
        """, [(list_id, text, order) for text, order in items]
        )
        conn.commit()
    conn.close()


init_db()


def get_period_key(cadence: str) -> str:
    now = datetime.now()
    if cadence == 'weekly':
        year, week, _ = now.isocalendar()
        return f"{year}-W{week:02d}"
    return now.strftime("%Y-%m-%d")


class ItemUpdate(BaseModel):
    completed: bool


@app.get("/api/lists/{list_id}/current")
def get_current_list_instance(list_id: int) -> Any:
    conn = get_db()
    cursor = conn.cursor()

    list_def = cursor.execute(
        "SELECT * FROM recurring_lists WHERE id = ?",
        (list_id,)
    ).fetchone()
    if not list_def:
        raise HTTPException(status_code=404, detail="List not found")

    period_key = get_period_key(list_def['cadence'])

    instance = cursor.execute(
        "SELECT * FROM recurring_instances WHERE list_id = ? AND period_key = ?",
        (list_id, period_key)
    ).fetchone()

    if not instance:
        cursor.execute(
            "INSERT INTO recurring_instances (list_id, period_key) VALUES (?, ?)",
            (list_id, period_key)
        )
        conn.commit()
        instance = cursor.execute(
            "SELECT * FROM recurring_instances WHERE list_id = ? AND period_key = ?",
            (list_id, period_key)
        ).fetchone()

    items = cursor.execute("""
        SELECT
            i.id as item_id,
            i.text,
            COALESCE(s.completed, 0) as completed
        FROM recurring_list_items i
        LEFT JOIN recurring_instance_item_state s
            ON s.item_id = i.id AND s.instance_id = ?
        WHERE i.list_id = ?
        ORDER BY i.sort_order
    """, (instance['id'], list_id)
    ).fetchall()

    conn.close()

    return {
        "list": dict(list_def),
        "instance": dict(instance),
        "items": [dict(row) for row in items]
    }


@app.put("/api/instances/{instance_id}/items/{item_id}")
def update_item_state(instance_id: int, item_id: int, update: ItemUpdate):
    conn = get_db()
    cursor = conn.cursor()

    completed_at = datetime.now() if update.completed else None

    cursor.execute("""
        INSERT INTO recurring_instance_item_state (
            instance_id, item_id, completed, completed_at
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(instance_id, item_id) DO UPDATE SET
            completed = excluded.completed,
            completed_at = excluded.completed_at
    """, (instance_id, item_id, update.completed, completed_at)
    )

    conn.commit()
    conn.close()
    return {"success": True}


@app.get("/api/auth/google/status")
def get_google_auth_status():
    """Check for stored refresh token"""
    conn = get_db()
    cursor = conn.cursor()
    token = cursor.execute(
        "SELECT value FROM system_kv WHERE key = 'google_refresh_token'"
    ).fetchone()
    conn.close()
    return {"isAuthenticated": token is not None}


@app.post("/api/auth/google/exchange")
async def exchange_google_code(code_data: dict[str, str]):
    """Exchange auth code for refresh token and store it"""
    code = code_data.get("code")

    redirect_uri = code_data.get("redirect_uri") or GOOGLE_REDIRECT_URI

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            }
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=400, detail=f"Google Auth Failed: {response.text}"
            )

        data = response.json()
        refresh_token = data.get("refresh_token")

        if not refresh_token:
            pass  # TODO?

        conn = get_db()
        cursor = conn.cursor()

        if refresh_token:
            cursor.execute("""
                INSERT INTO system_kv (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """, ("google_refresh_token", refresh_token)
            )

        conn.commit()
        conn.close()

    return {"success": True}


@app.get("/api/auth/google/token")
async def get_google_access_token():
    """Get access token using stored refresh token"""
    conn = get_db()
    cursor = conn.cursor()
    token_row = cursor.execute(
        "SELECT value FROM system_kv WHERE key = 'google_refresh_token'"
    ).fetchone()
    conn.close()

    if not token_row:
        raise HTTPException(
            status_code=401,
            detail="No refresh token found, could not authenticate"
        )

    refresh_token = token_row['value']

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            }
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Google Token Refresh Failed: {response.text}"
            )

        data = response.json()
        return {
            "access_token": data.get("access_token"),
            "expires_in": data.get("expires_in"),
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
