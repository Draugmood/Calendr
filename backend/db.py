import os
import sqlite3


def get_db_file() -> str:
    return os.environ.get("CALENDR_DB_FILE", "/var/lib/calendr/calendr.db")


def get_db():
    conn = sqlite3.connect(get_db_file())
    conn.row_factory = sqlite3.Row
    return conn


def ensure_column(cursor: sqlite3.Cursor, table_name: str, column_name: str, column_sql: str):
    columns = {
        row["name"]
        for row in cursor.execute(f"PRAGMA table_info({table_name})").fetchall()
    }
    if column_name not in columns:
        cursor.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_sql}"
        )


def migrate_legacy_recurrence_rows(cursor: sqlite3.Cursor):
    rows = cursor.execute(
        """
        SELECT id, recurrence_frequency
        FROM reminders
        WHERE recurrence_rule IS NULL AND recurrence_frequency IS NOT NULL
        """
    ).fetchall()

    if not rows:
        return

    from reminders import build_rrule_from_legacy_row

    rows = cursor.execute(
        """
        SELECT id, due_at_utc, timezone, recurrence_frequency, recurrence_days_of_week,
               recurrence_day_of_month, recurrence_end_utc
        FROM reminders
        WHERE recurrence_rule IS NULL AND recurrence_frequency IS NOT NULL
        """
    ).fetchall()

    for row in rows:
        recurrence_rule, normalized_end = build_rrule_from_legacy_row(row)
        if recurrence_rule is None:
            continue
        cursor.execute(
            """
            UPDATE reminders
            SET recurrence_rule = ?,
                recurrence_end_utc = COALESCE(?, recurrence_end_utc),
                timezone = COALESCE(timezone, 'UTC')
            WHERE id = ?
            """,
            (recurrence_rule, normalized_end, row["id"]),
        )


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
            cadence TEXT NOT NULL,
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
            period_key TEXT NOT NULL,
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

        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            due_at_utc TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            snoozed_until_utc TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            CHECK(status IN ('pending', 'snoozed', 'completed'))
        );

        CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
        CREATE INDEX IF NOT EXISTS idx_reminders_due_at ON reminders(due_at_utc);
        CREATE INDEX IF NOT EXISTS idx_reminders_snoozed_until ON reminders(snoozed_until_utc);
    """)

    ensure_column(cursor, "reminders", "timezone", "TEXT")
    ensure_column(cursor, "reminders", "recurrence_frequency", "TEXT")
    ensure_column(cursor, "reminders", "recurrence_days_of_week", "TEXT")
    ensure_column(cursor, "reminders", "recurrence_day_of_month", "INTEGER")
    ensure_column(cursor, "reminders", "recurrence_end_utc", "TEXT")
    ensure_column(cursor, "reminders", "recurrence_rule", "TEXT")

    migrate_legacy_recurrence_rows(cursor)

    cursor.execute("SELECT count(*) as count FROM recurring_lists")
    if cursor.fetchone()["count"] == 0:
        cursor.execute(
            "INSERT INTO recurring_lists (name, cadence) VALUES (?, ?)",
            ("Daily Routine", "daily"),
        )
        list_id = cursor.lastrowid
        if list_id is None:
            conn.close()
            raise RuntimeError("Failed to create default recurring list")
        items = [
            ("Check emails", 1),
            ("Stand-up meeting", 2),
            ("Code review", 3),
        ]
        cursor.executemany(
            """
            INSERT INTO recurring_list_items (list_id, text, sort_order)
            VALUES (?, ?, ?)
            """,
            [(list_id, text, order) for text, order in items],
        )

    conn.commit()
    conn.close()
