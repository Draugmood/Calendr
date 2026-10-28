import re
import sqlite3
from typing import Any, Iterable, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_db

router = APIRouter()

# Outermost first. A location may only sit inside a kind at or above its own rank.
KINDS = ("floor", "room", "furniture", "shelf", "box")
KIND_RANK = {kind: rank for rank, kind in enumerate(KINDS)}

INBOX_KEY = "storage_inbox_location_id"
SEARCH_LIMIT = 50

# (key, name, kind, parent key). Keys are the floor plan's room codes and only
# wire up parents; the inbox is the one parentless location that isn't a floor.
STORAGE_SEED = [
    ("K", "Underetasje", "floor", None),
    ("1", "Hovedetasje", "floor", None),
    ("2", "2. etasje", "floor", None),
    ("G", "Uthus", "floor", None),
    ("K1", "Rom K1", "room", "K"),
    ("K2", "Rom K2", "room", "K"),
    ("K3", "Gang underetasje", "room", "K"),
    ("K4", "Bod K4", "room", "K"),
    ("K5", "Rom K5", "room", "K"),
    ("K6", "Rom K6", "room", "K"),
    ("1.1", "Stue/kjøkken", "room", "1"),
    ("1.2", "Rom 1.2", "room", "1"),
    ("1.3", "WC", "room", "1"),
    ("1.4", "Gang", "room", "1"),
    ("1.5", "Bad/vaskerom 1.5", "room", "1"),
    ("1.6", "Bad 1.6", "room", "1"),
    ("1.7", "Rom 1.7", "room", "1"),
    ("2.1", "Allrom 2. etasje", "room", "2"),
    ("2.2", "Rom 2.2", "room", "2"),
    ("2.3", "Rom 2.3", "room", "2"),
    ("2.4", "Bod 2.4", "room", "2"),
    ("2.5", "Bad 2. etasje", "room", "2"),
    ("2.6", "Rom 2.6", "room", "2"),
    ("2.7", "Garderobe 2.7", "room", "2"),
    ("G1", "Uthus nede", "room", "G"),
    ("G2", "Uthus oppe", "room", "G"),
    ("INN", "Innboks", "room", None),
]


class LocationCreate(BaseModel):
    name: str
    kind: str
    parent_id: Optional[int] = None
    notes: Optional[str] = None
    sort_order: int = 0


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None


class ItemCreate(BaseModel):
    name: str
    location_id: int
    category: Optional[str] = None
    notes: Optional[str] = None


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    location_id: Optional[int] = None
    category: Optional[str] = None
    notes: Optional[str] = None


def seed_storage(cursor: sqlite3.Cursor):
    cursor.execute("SELECT count(*) AS count FROM storage_locations")
    if cursor.fetchone()["count"] > 0:
        return

    ids_by_key: dict[str, int] = {}
    for sort_order, (key, name, kind, parent_key) in enumerate(STORAGE_SEED):
        cursor.execute(
            """
            INSERT INTO storage_locations (name, kind, parent_id, sort_order)
            VALUES (?, ?, ?, ?)
            """,
            (name, kind, ids_by_key[parent_key] if parent_key else None, sort_order),
        )
        if cursor.lastrowid is None:
            raise RuntimeError("Failed to seed storage locations")
        ids_by_key[key] = cursor.lastrowid

    cursor.execute(
        """
        INSERT INTO system_kv (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        """,
        (INBOX_KEY, str(ids_by_key["INN"])),
    )


def normalize_name(value: str) -> str:
    name = value.strip()
    if not name:
        raise HTTPException(status_code=422, detail="name cannot be empty")
    return name


def normalize_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    return value.strip() or None


def validate_kind(value: str) -> str:
    if value not in KIND_RANK:
        raise HTTPException(
            status_code=422, detail=f"kind must be one of {', '.join(KINDS)}")
    return value


def natural_key(value: str) -> list[Any]:
    # "Hylle 2" before "Hylle 10".
    return [
        int(part) if part.isdigit() else part.casefold()
        for part in re.split(r"(\d+)", value)
    ]


def escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def build_search_text(*parts: Optional[str]) -> str:
    return "\n".join(part.casefold() for part in parts if part)


def get_inbox_id(conn: sqlite3.Connection) -> Optional[int]:
    row = conn.execute(
        "SELECT value FROM system_kv WHERE key = ?", (INBOX_KEY,)
    ).fetchone()
    return int(row["value"]) if row else None


def build_path(index: dict[int, dict[str, Any]], location_id: int) -> list[dict[str, Any]]:
    path = []
    seen: set[int] = set()
    current = index.get(location_id)
    while current and current["id"] not in seen:
        seen.add(current["id"])
        path.append({"id": current["id"], "name": current["name"]})
        current = index.get(current["parent_id"])
    path.reverse()
    return path


def load_location_index(conn: sqlite3.Connection) -> dict[int, dict[str, Any]]:
    """Every location keyed by id, with its path and counts. The house is small
    enough that building this per request is cheaper than recursive SQL."""
    rows = conn.execute("SELECT * FROM storage_locations").fetchall()
    item_counts = {
        row["location_id"]: row["count"]
        for row in conn.execute(
            "SELECT location_id, COUNT(*) AS count FROM storage_items GROUP BY location_id"
        ).fetchall()
    }
    inbox_id = get_inbox_id(conn)

    index = {
        row["id"]: {
            "id": row["id"],
            "name": row["name"],
            "kind": row["kind"],
            "parent_id": row["parent_id"],
            "notes": row["notes"],
            "sort_order": row["sort_order"],
            "created_at": row["created_at"],
            "is_inbox": row["id"] == inbox_id,
            "item_count": item_counts.get(row["id"], 0),
            "child_count": 0,
            "total_item_count": item_counts.get(row["id"], 0),
        }
        for row in rows
    }

    for location in index.values():
        location["path"] = build_path(index, location["id"])
        parent = index.get(location["parent_id"])
        if parent:
            parent["child_count"] += 1

    for location in index.values():
        for ancestor in location["path"][:-1]:
            index[ancestor["id"]]["total_item_count"] += location["item_count"]

    return index


def sort_locations(locations: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        locations,
        key=lambda location: (
            location["sort_order"], natural_key(location["name"]), location["id"]
        ),
    )


def get_indexed_location(index: dict[int, dict[str, Any]], location_id: int) -> dict[str, Any]:
    location = index.get(location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


def validate_parent(
    index: dict[int, dict[str, Any]],
    kind: str,
    parent_id: Optional[int],
    moving_id: Optional[int] = None,
):
    if kind == "floor":
        if parent_id is not None:
            raise HTTPException(
                status_code=422, detail="a floor cannot have a parent")
        return

    if parent_id is None:
        raise HTTPException(status_code=422, detail="parent_id is required")
    parent = index.get(parent_id)
    if parent is None:
        raise HTTPException(
            status_code=422, detail="parent location not found")
    if KIND_RANK[parent["kind"]] > KIND_RANK[kind]:
        raise HTTPException(
            status_code=422,
            detail=f"a {kind} cannot be placed inside a {parent['kind']}",
        )
    # The parent's path includes the parent itself, so this also catches parent == self.
    if moving_id is not None and any(entry["id"] == moving_id for entry in parent["path"]):
        raise HTTPException(
            status_code=422, detail="a location cannot be moved inside itself")


def row_to_item(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "category": row["category"],
        "location_id": row["location_id"],
        "notes": row["notes"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def sort_items(rows: Iterable[sqlite3.Row]) -> list[dict[str, Any]]:
    return sorted(
        (row_to_item(row) for row in rows),
        key=lambda item: (natural_key(item["name"]), item["id"]),
    )


def get_item_by_id(cursor: sqlite3.Cursor, item_id: int) -> sqlite3.Row:
    row = cursor.execute(
        "SELECT * FROM storage_items WHERE id = ?", (item_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    return row


def ensure_location_exists(cursor: sqlite3.Cursor, location_id: int):
    row = cursor.execute(
        "SELECT id FROM storage_locations WHERE id = ?", (location_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=422, detail="location not found")


@router.get("/api/storage/locations")
def list_locations():
    conn = get_db()
    index = load_location_index(conn)
    conn.close()
    return sort_locations(index.values())


@router.get("/api/storage/locations/{location_id}")
def get_location(location_id: int):
    conn = get_db()
    index = load_location_index(conn)
    location = get_indexed_location(index, location_id)
    items = conn.execute(
        "SELECT * FROM storage_items WHERE location_id = ?", (location_id,)
    ).fetchall()
    conn.close()

    children = [child for child in index.values()
                if child["parent_id"] == location_id]
    return {
        **location,
        "children": sort_locations(children),
        "items": sort_items(items),
    }


@router.post("/api/storage/locations")
def create_location(payload: LocationCreate):
    name = normalize_name(payload.name)
    kind = validate_kind(payload.kind)
    notes = normalize_optional_text(payload.notes)

    conn = get_db()
    cursor = conn.cursor()
    validate_parent(load_location_index(conn), kind, payload.parent_id)

    cursor.execute(
        """
        INSERT INTO storage_locations (name, kind, parent_id, notes, sort_order)
        VALUES (?, ?, ?, ?, ?)
        """,
        (name, kind, payload.parent_id, notes, payload.sort_order),
    )
    location_id = cursor.lastrowid
    if location_id is None:
        conn.close()
        raise HTTPException(
            status_code=500, detail="Failed to create location")
    conn.commit()

    created = load_location_index(conn)[location_id]
    conn.close()
    return created


@router.patch("/api/storage/locations/{location_id}")
def update_location(location_id: int, payload: LocationUpdate):
    updates: dict[str, Any] = {}
    if payload.name is not None:
        updates["name"] = normalize_name(payload.name)
    if payload.notes is not None:
        updates["notes"] = normalize_optional_text(payload.notes)
    if payload.sort_order is not None:
        updates["sort_order"] = payload.sort_order

    conn = get_db()
    cursor = conn.cursor()
    index = load_location_index(conn)
    location = get_indexed_location(index, location_id)

    if payload.parent_id is not None and payload.parent_id != location["parent_id"]:
        if location["is_inbox"]:
            raise HTTPException(
                status_code=422, detail="the inbox cannot be moved")
        validate_parent(index, location["kind"],
                        payload.parent_id, moving_id=location_id)
        updates["parent_id"] = payload.parent_id

    if updates:
        assignments = ", ".join(f"{column} = ?" for column in updates)
        cursor.execute(
            f"UPDATE storage_locations SET {assignments} WHERE id = ?",
            (*updates.values(), location_id),
        )
        conn.commit()

    updated = load_location_index(conn)[location_id]
    conn.close()
    return updated


@router.delete("/api/storage/locations/{location_id}")
def delete_location(location_id: int):
    conn = get_db()
    cursor = conn.cursor()
    location = get_indexed_location(load_location_index(conn), location_id)

    if location["is_inbox"]:
        conn.close()
        raise HTTPException(
            status_code=409, detail="The inbox cannot be deleted")
    if location["child_count"] or location["item_count"]:
        conn.close()
        # Counts rather than prose, so the frontend can word the message itself.
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Location is not empty",
                "child_count": location["child_count"],
                "item_count": location["item_count"],
            },
        )

    cursor.execute("DELETE FROM storage_locations WHERE id = ?", (location_id,))
    conn.commit()
    conn.close()
    return {"success": True, "id": location_id}


@router.get("/api/storage/items")
def list_items(location_id: int):
    conn = get_db()
    location = conn.execute(
        "SELECT id FROM storage_locations WHERE id = ?", (location_id,)
    ).fetchone()
    if not location:
        conn.close()
        raise HTTPException(status_code=404, detail="Location not found")

    rows = conn.execute(
        "SELECT * FROM storage_items WHERE location_id = ?", (location_id,)
    ).fetchall()
    conn.close()
    return sort_items(rows)


@router.post("/api/storage/items")
def create_item(payload: ItemCreate):
    name = normalize_name(payload.name)
    category = normalize_optional_text(payload.category)
    notes = normalize_optional_text(payload.notes)

    conn = get_db()
    cursor = conn.cursor()
    ensure_location_exists(cursor, payload.location_id)

    cursor.execute(
        """
        INSERT INTO storage_items (name, category, location_id, notes, search_text)
        VALUES (?, ?, ?, ?, ?)
        """,
        (name, category, payload.location_id, notes,
         build_search_text(name, category, notes)),
    )
    item_id = cursor.lastrowid
    if item_id is None:
        conn.close()
        raise HTTPException(status_code=500, detail="Failed to create item")
    conn.commit()

    created = get_item_by_id(cursor, item_id)
    conn.close()
    return row_to_item(created)


@router.patch("/api/storage/items/{item_id}")
def update_item(item_id: int, payload: ItemUpdate):
    conn = get_db()
    cursor = conn.cursor()
    current = get_item_by_id(cursor, item_id)

    # Merge with the stored row so search_text always covers every field.
    name = normalize_name(
        payload.name) if payload.name is not None else current["name"]
    category = (
        normalize_optional_text(payload.category)
        if payload.category is not None
        else current["category"]
    )
    notes = (
        normalize_optional_text(payload.notes)
        if payload.notes is not None
        else current["notes"]
    )
    location_id = current["location_id"]
    if payload.location_id is not None:
        ensure_location_exists(cursor, payload.location_id)
        location_id = payload.location_id

    cursor.execute(
        """
        UPDATE storage_items
        SET name = ?, category = ?, notes = ?, location_id = ?, search_text = ?,
            updated_at = datetime('now')
        WHERE id = ?
        """,
        (name, category, notes, location_id,
         build_search_text(name, category, notes), item_id),
    )
    conn.commit()

    updated = get_item_by_id(cursor, item_id)
    conn.close()
    return row_to_item(updated)


@router.delete("/api/storage/items/{item_id}")
def delete_item(item_id: int):
    conn = get_db()
    cursor = conn.cursor()
    get_item_by_id(cursor, item_id)

    cursor.execute("DELETE FROM storage_items WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"success": True, "id": item_id}


@router.get("/api/storage/categories")
def list_categories():
    conn = get_db()
    rows = conn.execute(
        """
        SELECT DISTINCT category FROM storage_items
        WHERE category IS NOT NULL
        ORDER BY category COLLATE NOCASE
        """
    ).fetchall()
    conn.close()
    return [row["category"] for row in rows]


@router.get("/api/storage/search")
def search_storage(q: str = ""):
    # casefold on both sides, since SQLite's LIKE only ignores case for ASCII ("øl" vs "Øl").
    query = q.strip().casefold()
    if not query:
        return {"locations": [], "items": []}

    conn = get_db()
    index = load_location_index(conn)
    locations = sort_locations(
        location for location in index.values()
        if query in location["name"].casefold()
    )[:SEARCH_LIMIT]

    rows = []
    remaining = SEARCH_LIMIT - len(locations)
    if remaining > 0:
        rows = conn.execute(
            """
            SELECT * FROM storage_items
            WHERE search_text LIKE ? ESCAPE '\\'
            ORDER BY name COLLATE NOCASE, id
            LIMIT ?
            """,
            (f"%{escape_like(query)}%", remaining),
        ).fetchall()
    conn.close()

    items = [
        {
            **row_to_item(row),
            "path": index[row["location_id"]]["path"] if row["location_id"] in index else [],
        }
        for row in rows
    ]
    return {"locations": locations, "items": items}
