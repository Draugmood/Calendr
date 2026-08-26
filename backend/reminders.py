import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, cast
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from dateutil.rrule import rrulestr
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing_extensions import TypedDict

from db import get_db

router = APIRouter()

VALID_REMINDER_STATUSES = {"pending", "snoozed", "completed"}
VALID_SNOOZE_MINUTES = {5, 10, 30}
VALID_RRULE_FREQUENCIES = {"DAILY", "WEEKLY", "MONTHLY", "YEARLY"}
WEEKDAY_TOKENS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]
WEEKDAY_LABELS = {
    "MO": "Monday",
    "TU": "Tuesday",
    "WE": "Wednesday",
    "TH": "Thursday",
    "FR": "Friday",
    "SA": "Saturday",
    "SU": "Sunday",
}


class ReminderCreate(BaseModel):
    title: str
    due_at_utc: str
    description: Optional[str] = None
    timezone: Optional[str] = None
    recurrence_rule: Optional[str] = None
    recurrence_end_utc: Optional[str] = None


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    due_at_utc: Optional[str] = None
    description: Optional[str] = None


class ReminderSnooze(BaseModel):
    snooze_minutes: int


class DeleteReminderResponse(TypedDict):
    success: bool
    id: int


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def format_utc(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_utc_timestamp(value: str) -> datetime:
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail="Invalid timestamp format") from exc

    if dt.tzinfo is None:
        raise HTTPException(
            status_code=400, detail="Timestamp must include timezone")

    if dt.utcoffset() != timedelta(0):
        raise HTTPException(status_code=400, detail="Timestamp must be UTC")

    return dt.astimezone(timezone.utc)


def normalize_title(value: str) -> str:
    trimmed = value.strip()
    if not trimmed:
        raise HTTPException(status_code=422, detail="title must not be empty")
    return trimmed


def parse_timezone_name(value: str) -> ZoneInfo:
    try:
        return ZoneInfo(value)
    except ZoneInfoNotFoundError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid timezone '{value}'. Install tzdata on Windows backends.",
        ) from exc


def to_rrule_until(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def parse_rrule_until(value: str) -> datetime:
    try:
        return datetime.strptime(value, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="RRULE UNTIL must use UTC format YYYYMMDDTHHMMSSZ",
        ) from exc


def parse_rrule_parts(recurrence_rule: str) -> dict[str, str]:
    text = recurrence_rule.strip()
    if text.upper().startswith("RRULE:"):
        text = text[6:]

    if not text:
        raise HTTPException(
            status_code=422, detail="recurrence_rule must not be empty")

    parts: dict[str, str] = {}
    for item in text.split(";"):
        if not item:
            continue
        if "=" not in item:
            raise HTTPException(
                status_code=422, detail="Invalid recurrence_rule")
        key, value = item.split("=", 1)
        key = key.strip().upper()
        value = value.strip().upper()
        if not key or not value:
            raise HTTPException(
                status_code=422, detail="Invalid recurrence_rule")
        parts[key] = value
    return parts


def canonicalize_rrule(parts: dict[str, str]) -> str:
    tokens = [f"FREQ={parts['FREQ']}"]
    if "BYDAY" in parts:
        tokens.append(f"BYDAY={parts['BYDAY']}")
    if "BYMONTHDAY" in parts:
        tokens.append(f"BYMONTHDAY={parts['BYMONTHDAY']}")
    if "UNTIL" in parts:
        tokens.append(f"UNTIL={parts['UNTIL']}")
    return ";".join(tokens)


def build_rrule_from_legacy_row(row: sqlite3.Row) -> tuple[Optional[str], Optional[str]]:
    frequency = row["recurrence_frequency"]
    if not frequency:
        return None, None

    frequency = str(frequency).strip().upper()
    if frequency not in VALID_RRULE_FREQUENCIES:
        return None, None

    parts: dict[str, str] = {"FREQ": frequency}
    timezone_name = row["timezone"] or "UTC"
    try:
        tz = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        tz = timezone.utc

    due_at_local = parse_utc_timestamp(row["due_at_utc"]).astimezone(tz)

    if frequency == "WEEKLY":
        days_csv = row["recurrence_days_of_week"]
        if days_csv:
            indices = [int(part)
                       for part in str(days_csv).split(",") if part != ""]
            indices = sorted({index for index in indices if 0 <= index <= 6})
        else:
            indices = [due_at_local.weekday()]
        if indices:
            parts["BYDAY"] = ",".join(WEEKDAY_TOKENS[index]
                                      for index in indices)
    elif frequency == "MONTHLY":
        day_of_month = row["recurrence_day_of_month"] or due_at_local.day
        day_of_month = max(1, min(31, day_of_month))
        parts["BYMONTHDAY"] = str(day_of_month)

    recurrence_end_utc = row["recurrence_end_utc"]
    normalized_end = None
    if recurrence_end_utc:
        end_dt = parse_utc_timestamp(recurrence_end_utc)
        parts["UNTIL"] = to_rrule_until(end_dt)
        normalized_end = format_utc(end_dt)

    return canonicalize_rrule(parts), normalized_end


def validate_recurrence(
    due_at: datetime,
    timezone_name: Optional[str],
    recurrence_rule: Optional[str],
    recurrence_end_utc: Optional[str],
) -> dict[str, Any]:
    if recurrence_rule is None:
        if recurrence_end_utc is not None:
            raise HTTPException(
                status_code=422, detail="recurrence_end_utc requires recurrence_rule")
        return {
            "timezone": None,
            "recurrence_rule": None,
            "recurrence_end_utc": None,
        }

    normalized_timezone = timezone_name or "UTC"
    tz = parse_timezone_name(normalized_timezone)
    local_due_at = due_at.astimezone(tz)

    parts = parse_rrule_parts(recurrence_rule)
    frequency = parts.get("FREQ")
    if frequency not in VALID_RRULE_FREQUENCIES:
        raise HTTPException(
            status_code=422, detail="recurrence_rule requires a valid FREQ")

    if frequency == "WEEKLY" and "BYDAY" not in parts:
        parts["BYDAY"] = WEEKDAY_TOKENS[local_due_at.weekday()]

    if frequency == "MONTHLY" and "BYMONTHDAY" not in parts:
        parts["BYMONTHDAY"] = str(local_due_at.day)

    if "BYDAY" in parts:
        day_tokens = [token.strip()
                      for token in parts["BYDAY"].split(",") if token.strip()]
        if not day_tokens or any(token not in WEEKDAY_LABELS for token in day_tokens):
            raise HTTPException(
                status_code=422, detail="recurrence_rule contains invalid BYDAY")
        parts["BYDAY"] = ",".join(day_tokens)

    if "BYMONTHDAY" in parts:
        try:
            day_of_month = int(parts["BYMONTHDAY"])
        except ValueError as exc:
            raise HTTPException(
                status_code=422, detail="recurrence_rule contains invalid BYMONTHDAY") from exc
        if day_of_month < 1 or day_of_month > 31:
            raise HTTPException(
                status_code=422, detail="recurrence_rule BYMONTHDAY must be between 1 and 31")
        parts["BYMONTHDAY"] = str(day_of_month)

    normalized_end_utc = None
    if recurrence_end_utc is not None:
        end_at = parse_utc_timestamp(recurrence_end_utc)
        if end_at <= due_at:
            raise HTTPException(
                status_code=422, detail="recurrence_end_utc must be after due_at_utc")
        parts["UNTIL"] = to_rrule_until(end_at)
        normalized_end_utc = format_utc(end_at)
    elif "UNTIL" in parts:
        until_dt = parse_rrule_until(parts["UNTIL"])
        if until_dt <= due_at:
            raise HTTPException(
                status_code=422, detail="recurrence_rule UNTIL must be after due_at_utc")
        normalized_end_utc = format_utc(until_dt)

    canonical_rule = canonicalize_rrule(parts)

    try:
        rule = rrulestr(f"RRULE:{canonical_rule}", dtstart=due_at)
        rule_any: Any = rule
        first = cast(Optional[datetime], rule_any.after(due_at, inc=True))
    except Exception as exc:
        raise HTTPException(
            status_code=422, detail="Invalid recurrence_rule") from exc

    if first is None:
        raise HTTPException(
            status_code=422, detail="recurrence_rule does not produce any occurrences")

    return {
        "timezone": normalized_timezone,
        "recurrence_rule": canonical_rule,
        "recurrence_end_utc": normalized_end_utc,
    }


def get_next_recurring_due_at(reminder_row: sqlite3.Row) -> Optional[str]:
    recurrence_rule = reminder_row["recurrence_rule"]
    if not recurrence_rule:
        return None

    current_due_utc = parse_utc_timestamp(reminder_row["due_at_utc"])
    try:
        rule = rrulestr(f"RRULE:{recurrence_rule}", dtstart=current_due_utc)
        rule_any: Any = rule
        next_due = cast(Optional[datetime], rule_any.after(
            current_due_utc, inc=False))
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail="Reminder recurrence_rule is invalid") from exc

    if next_due is None:
        return None

    if next_due.tzinfo is None:
        next_due = next_due.replace(tzinfo=timezone.utc)

    return format_utc(next_due)


def format_recurrence_text(recurrence_rule: Optional[str]) -> Optional[str]:
    if not recurrence_rule:
        return None

    try:
        parts = parse_rrule_parts(recurrence_rule)
    except HTTPException:
        return "Gjentas"

    frequency = parts.get("FREQ")
    if frequency == "DAILY":
        return "Gjentas daglig"
    if frequency == "WEEKLY":
        days = parts.get("BYDAY")
        if not days:
            return "Gjentas ukentlig"
        labels = [WEEKDAY_LABELS.get(day, day) for day in days.split(",")]
        return f"Gjentas ukentlig på {', '.join(labels)}"
    if frequency == "MONTHLY":
        day = parts.get("BYMONTHDAY")
        if day:
            return f"Gjentas månedlig på {day}er"
        return "Gjentas månedlig"
    if frequency == "YEARLY":
        return "Gjentas årlig"
    return "Gjentas"


def row_to_reminder(row: sqlite3.Row) -> dict[str, Any]:
    status = row["status"]
    effective = row["snoozed_until_utc"] if status == "snoozed" and row["snoozed_until_utc"] else row["due_at_utc"]
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "due_at_utc": row["due_at_utc"],
        "status": status,
        "snoozed_until_utc": row["snoozed_until_utc"],
        "timezone": row["timezone"],
        "recurrence_rule": row["recurrence_rule"],
        "recurrence_text": format_recurrence_text(row["recurrence_rule"]),
        "recurrence_end_utc": row["recurrence_end_utc"],
        "is_recurring": bool(row["recurrence_rule"]),
        "effective_trigger_utc": effective,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def get_reminder_by_id(cursor: sqlite3.Cursor, reminder_id: int) -> sqlite3.Row:
    row = cursor.execute(
        "SELECT * FROM reminders WHERE id = ?",
        (reminder_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return row


@router.post("/api/reminders")
def create_reminder(reminder: ReminderCreate):
    due_at = parse_utc_timestamp(reminder.due_at_utc)
    if due_at < now_utc():
        raise HTTPException(
            status_code=422, detail="due_at_utc cannot be in the past")

    title = normalize_title(reminder.title)
    now_iso = format_utc(now_utc())
    recurrence = validate_recurrence(
        due_at,
        reminder.timezone,
        reminder.recurrence_rule,
        reminder.recurrence_end_utc,
    )

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO reminders (
            title,
            description,
            due_at_utc,
            status,
            snoozed_until_utc,
            timezone,
            recurrence_rule,
            recurrence_end_utc,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, 'pending', NULL, ?, ?, ?, ?, ?)
        """,
        (
            title,
            reminder.description,
            format_utc(due_at),
            recurrence["timezone"],
            recurrence["recurrence_rule"],
            recurrence["recurrence_end_utc"],
            now_iso,
            now_iso,
        ),
    )
    reminder_id = cursor.lastrowid
    if reminder_id is None:
        conn.close()
        raise HTTPException(
            status_code=500, detail="Failed to create reminder")
    conn.commit()

    created = get_reminder_by_id(cursor, reminder_id)
    conn.close()
    return row_to_reminder(created)


@router.get("/api/reminders")
def list_reminders(status: Optional[str] = None):
    if status and status not in VALID_REMINDER_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status filter")

    conn = get_db()
    cursor = conn.cursor()

    base_sql = """
        SELECT *
        FROM reminders
    """
    params: list[Any] = []
    if status:
        base_sql += " WHERE status = ?"
        params.append(status)
    base_sql += """
        ORDER BY
            CASE
                WHEN status = 'snoozed' AND snoozed_until_utc IS NOT NULL THEN snoozed_until_utc
                ELSE due_at_utc
            END ASC,
            id ASC
    """

    rows = cursor.execute(base_sql, params).fetchall()
    conn.close()
    return [row_to_reminder(row) for row in rows]


@router.patch("/api/reminders/{reminder_id}")
def update_reminder(reminder_id: int, payload: ReminderUpdate):
    conn = get_db()
    cursor = conn.cursor()
    existing = get_reminder_by_id(cursor, reminder_id)

    new_title = existing["title"]
    new_description = existing["description"]
    new_due_at = existing["due_at_utc"]
    new_status = existing["status"]
    new_snoozed_until = existing["snoozed_until_utc"]

    if payload.title is not None:
        new_title = normalize_title(payload.title)

    if payload.description is not None:
        new_description = payload.description

    if payload.due_at_utc is not None:
        if existing["status"] == "completed":
            raise HTTPException(
                status_code=409, detail="Cannot change due_at_utc for completed reminder")

        parsed_due_at = parse_utc_timestamp(payload.due_at_utc)
        if parsed_due_at < now_utc():
            raise HTTPException(
                status_code=422, detail="due_at_utc cannot be in the past")

        new_due_at = format_utc(parsed_due_at)
        new_status = "pending"
        new_snoozed_until = None

    updated_at = format_utc(now_utc())
    cursor.execute(
        """
        UPDATE reminders
        SET title = ?, description = ?, due_at_utc = ?, status = ?, snoozed_until_utc = ?, updated_at = ?
        WHERE id = ?
        """,
        (new_title, new_description, new_due_at, new_status,
         new_snoozed_until, updated_at, reminder_id),
    )
    conn.commit()

    updated = get_reminder_by_id(cursor, reminder_id)
    conn.close()
    return row_to_reminder(updated)


@router.delete("/api/reminders/{reminder_id}")
def delete_reminder(reminder_id: int) -> DeleteReminderResponse:
    conn = get_db()
    cursor = conn.cursor()
    get_reminder_by_id(cursor, reminder_id)

    cursor.execute(
        "DELETE FROM reminders WHERE id = ?",
        (reminder_id,),
    )
    conn.commit()
    conn.close()
    return {"success": True, "id": reminder_id}


@router.post("/api/reminders/{reminder_id}/snooze")
def snooze_reminder(reminder_id: int, payload: ReminderSnooze):
    if payload.snooze_minutes not in VALID_SNOOZE_MINUTES:
        raise HTTPException(
            status_code=400, detail="Invalid snooze_minutes. Allowed values: 5, 10, 30")

    conn = get_db()
    cursor = conn.cursor()
    reminder = get_reminder_by_id(cursor, reminder_id)

    if reminder["status"] == "completed":
        raise HTTPException(
            status_code=409, detail="Cannot snooze a completed reminder")

    snoozed_until = format_utc(
        now_utc() + timedelta(minutes=payload.snooze_minutes))
    updated_at = format_utc(now_utc())

    cursor.execute(
        """
        UPDATE reminders
        SET status = 'snoozed', snoozed_until_utc = ?, updated_at = ?
        WHERE id = ?
        """,
        (snoozed_until, updated_at, reminder_id),
    )
    conn.commit()

    updated = get_reminder_by_id(cursor, reminder_id)
    conn.close()
    return row_to_reminder(updated)


@router.post("/api/reminders/{reminder_id}/complete")
def complete_reminder(reminder_id: int):
    conn = get_db()
    cursor = conn.cursor()
    reminder = get_reminder_by_id(cursor, reminder_id)

    if reminder["status"] != "completed" and reminder["recurrence_rule"]:
        next_due_at = get_next_recurring_due_at(reminder)
        updated_at = format_utc(now_utc())

        if next_due_at is None:
            cursor.execute(
                """
                UPDATE reminders
                SET status = 'completed', snoozed_until_utc = NULL, updated_at = ?
                WHERE id = ?
                """,
                (updated_at, reminder_id),
            )
        else:
            cursor.execute(
                """
                UPDATE reminders
                SET due_at_utc = ?, status = 'pending', snoozed_until_utc = NULL, updated_at = ?
                WHERE id = ?
                """,
                (next_due_at, updated_at, reminder_id),
            )
        conn.commit()
    elif reminder["status"] != "completed":
        cursor.execute(
            """
            UPDATE reminders
            SET status = 'completed', snoozed_until_utc = NULL, updated_at = ?
            WHERE id = ?
            """,
            (format_utc(now_utc()), reminder_id),
        )
        conn.commit()

    updated = get_reminder_by_id(cursor, reminder_id)
    conn.close()
    return row_to_reminder(updated)


@router.get("/api/reminders/due")
def get_due_reminders():
    now_iso = format_utc(now_utc())

    conn = get_db()
    cursor = conn.cursor()
    rows = cursor.execute(
        """
        SELECT *
        FROM reminders
        WHERE
            (status = 'pending' AND due_at_utc <= ?)
            OR (status = 'snoozed' AND snoozed_until_utc IS NOT NULL AND snoozed_until_utc <= ?)
        ORDER BY
            CASE
                WHEN status = 'snoozed' AND snoozed_until_utc IS NOT NULL THEN snoozed_until_utc
                ELSE due_at_utc
            END ASC,
            id ASC
        """,
        (now_iso, now_iso),
    ).fetchall()
    conn.close()

    return [row_to_reminder(row) for row in rows]
