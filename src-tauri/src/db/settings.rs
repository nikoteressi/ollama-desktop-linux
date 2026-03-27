use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::error::AppError;

// ── Domain type ────────────────────────────────────────────────────────────────

/// A single key-value setting row.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Setting {
    pub key: String,
    /// JSON-encoded value — the caller decides the shape.
    pub value: String,
}

// ── CRUD ───────────────────────────────────────────────────────────────────────

/// Retrieve the raw JSON value for a setting key.
///
/// Returns `None` if the key does not exist.
pub fn get(conn: &Connection, key: &str) -> Result<Option<String>, AppError> {
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    )
    .map(Some)
    .or_else(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => Ok(None),
        other => Err(AppError::from(other)),
    })
}

/// Upsert a key-value pair.
///
/// The value should be JSON-encoded by the caller so that type information
/// is preserved without requiring an additional serialization layer here.
pub fn set(conn: &Connection, key: &str, value: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map(|_| ())
    .map_err(AppError::from)
}

/// Return all settings as a flat map of `key → raw JSON value`.
pub fn get_all(conn: &Connection) -> Result<HashMap<String, String>, AppError> {
    let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
    let pairs = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;

    pairs
        .map(|r| r.map_err(AppError::from))
        .collect::<Result<HashMap<_, _>, _>>()
}

/// Delete a single setting by key.
pub fn delete(conn: &Connection, key: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM settings WHERE key = ?1", params![key])?;
    Ok(())
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrations;

    fn in_memory_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA foreign_keys = ON;",
        )
        .unwrap();
        migrations::run(&conn).unwrap();
        conn
    }

    #[test]
    fn set_and_get() {
        let conn = in_memory_conn();
        set(&conn, "theme", "\"dark\"").unwrap();
        let val = get(&conn, "theme").unwrap();
        assert_eq!(val, Some("\"dark\"".to_owned()));
    }

    #[test]
    fn get_missing_returns_none() {
        let conn = in_memory_conn();
        assert_eq!(get(&conn, "nonexistent").unwrap(), None);
    }

    #[test]
    fn upsert_updates_existing() {
        let conn = in_memory_conn();
        set(&conn, "key", "\"v1\"").unwrap();
        set(&conn, "key", "\"v2\"").unwrap();
        let val = get(&conn, "key").unwrap().unwrap();
        assert_eq!(val, "\"v2\"");
    }

    #[test]
    fn get_all_returns_all_keys() {
        let conn = in_memory_conn();
        set(&conn, "a", "1").unwrap();
        set(&conn, "b", "2").unwrap();
        let all = get_all(&conn).unwrap();
        assert_eq!(all.len(), 2);
        assert_eq!(all["a"], "1");
        assert_eq!(all["b"], "2");
    }
}
