from reminders import router as reminders_router
from db import get_db, init_db
import httpx
import os
import time
from datetime import datetime
from typing import Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv(".env.development")


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.environ.get(
    "GOOGLE_REDIRECT_URI", "http://localhost:5173")
init_db()

ACCESS_TOKEN_SKEW_SECONDS = 60
_access_token_cache: dict[str, Any] = {"token": None, "expires_at": 0.0}


def _cache_access_token(token: str | None, expires_in: Any):
    if not token:
        _access_token_cache.update({"token": None, "expires_at": 0.0})
        return
    try:
        lifetime = int(expires_in)
    except (TypeError, ValueError):
        lifetime = 3600
    _access_token_cache.update(
        {"token": token, "expires_at": time.monotonic() + lifetime}
    )


def _cached_access_token() -> tuple[str, int] | None:
    token = _access_token_cache["token"]
    remaining = int(_access_token_cache["expires_at"] - time.monotonic())
    if token and remaining > ACCESS_TOKEN_SKEW_SECONDS:
        return token, remaining
    return None


def _clear_stored_refresh_token():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM system_kv WHERE key = 'google_refresh_token'")
    conn.commit()
    conn.close()
    _cache_access_token(None, None)


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
            raise HTTPException(
                status_code=400,
                detail="Google did not return a refresh token. Revoke app access and authorize again."
            )

        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO system_kv (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """, ("google_refresh_token", refresh_token)
        )

        conn.commit()
        conn.close()

        _cache_access_token(data.get("access_token"), data.get("expires_in"))

    return {"success": True}


@app.get("/api/auth/google/token")
async def get_google_access_token():
    """Get access token using stored refresh token"""
    cached = _cached_access_token()
    if cached:
        token, expires_in = cached
        return {"access_token": token, "expires_in": expires_in}

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
        try:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                }
            )
        except httpx.HTTPError as error:
            raise HTTPException(
                status_code=502,
                detail=f"Could not reach Google token endpoint: {error}"
            )

        if response.status_code != 200:
            error_code = ""
            try:
                error_code = response.json().get("error", "")
            except ValueError:
                pass

            # invalid_grant means the refresh token is revoked/expired, so re-consent is required
            if error_code == "invalid_grant":
                _clear_stored_refresh_token()
                raise HTTPException(
                    status_code=401, detail="reauth_required")

            raise HTTPException(
                status_code=502,
                detail=f"Google Token Refresh Failed: {response.text}"
            )

        data = response.json()
        _cache_access_token(data.get("access_token"), data.get("expires_in"))

        return {
            "access_token": data.get("access_token"),
            "expires_in": data.get("expires_in"),
        }


app.include_router(reminders_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
