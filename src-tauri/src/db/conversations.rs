use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

// ── Domain type ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub model: String,
    pub system_prompt: String,
    pub settings_json: String,
    pub pinned: bool,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Fields required to create a new conversation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewConversation {
    pub title: String,
    pub model: String,
    pub system_prompt: Option<String>,
    pub settings_json: Option<String>,
    pub tags: Option<Vec<String>>,
}

// ── Mapping ────────────────────────────────────────────────────────────────────

fn row_to_conversation(row: &rusqlite::Row<'_>) -> rusqlite::Result<Conversation> {
    let tags_str: String = row.get(6)?;
    let tags = parse_tags(&tags_str);

    Ok(Conversation {
        id: row.get(0)?,
        title: row.get(1)?,
        model: row.get(2)?,
        system_prompt: row.get(3)?,
        settings_json: row.get(4)?,
        pinned: row.get::<_, i64>(5)? != 0,
        tags,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn parse_tags(raw: &str) -> Vec<String> {
    if raw.is_empty() {
        return Vec::new();
    }
    raw.split(',').map(|s| s.trim().to_owned()).collect()
}

fn serialize_tags(tags: &[String]) -> String {
    tags.join(",")
}

// ── CRUD ───────────────────────────────────────────────────────────────────────

/// Return all conversations ordered by pinned desc, then updated_at desc.
pub fn list_all(conn: &Connection) -> Result<Vec<Conversation>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, model, system_prompt, settings_json, pinned, tags, created_at, updated_at
         FROM conversations
         ORDER BY pinned DESC, updated_at DESC",
    )?;

    let rows = stmt.query_map([], row_to_conversation)?;
    rows.map(|r| r.map_err(AppError::from))
        .collect::<Result<Vec<_>, _>>()
}

/// Fetch a single conversation by its UUID.
pub fn get_by_id(conn: &Connection, id: &str) -> Result<Conversation, AppError> {
    conn.query_row(
        "SELECT id, title, model, system_prompt, settings_json, pinned, tags, created_at, updated_at
         FROM conversations WHERE id = ?1",
        params![id],
        row_to_conversation,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::NotFound(format!("Conversation '{id}' not found"))
        }
        other => AppError::from(other),
    })
}

/// Insert a new conversation and return it.
pub fn create(conn: &Connection, new: NewConversation) -> Result<Conversation, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let tags = serialize_tags(&new.tags.unwrap_or_default());
    let system_prompt = new.system_prompt.unwrap_or_default();
    let settings_json = new.settings_json.unwrap_or_else(|| "{}".to_owned());

    conn.execute(
        "INSERT INTO conversations
             (id, title, model, system_prompt, settings_json, pinned, tags, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?7)",
        params![id, new.title, new.model, system_prompt, settings_json, tags, now],
    )?;

    get_by_id(conn, &id)
}

/// Rename a conversation's title and bump updated_at.
pub fn update_title(conn: &Connection, id: &str, title: &str) -> Result<(), AppError> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let changed = conn.execute(
        "UPDATE conversations SET title = ?1, updated_at = ?2 WHERE id = ?3",
        params![title, now, id],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound(format!(
            "Conversation '{id}' not found"
        )));
    }
    Ok(())
}

/// Pin or un-pin a conversation.
pub fn set_pinned(conn: &Connection, id: &str, pinned: bool) -> Result<(), AppError> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let changed = conn.execute(
        "UPDATE conversations SET pinned = ?1, updated_at = ?2 WHERE id = ?3",
        params![pinned as i64, now, id],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound(format!(
            "Conversation '{id}' not found"
        )));
    }
    Ok(())
}

/// Touch updated_at whenever a new message arrives.
pub fn touch_updated_at(conn: &Connection, id: &str) -> Result<(), AppError> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    conn.execute(
        "UPDATE conversations SET updated_at = ?1 WHERE id = ?2",
        params![now, id],
    )?;
    Ok(())
}

/// Permanently delete a conversation and all its messages (cascade).
pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    let changed = conn.execute("DELETE FROM conversations WHERE id = ?1", params![id])?;
    if changed == 0 {
        return Err(AppError::NotFound(format!(
            "Conversation '{id}' not found"
        )));
    }
    Ok(())
}

/// Full-text search across title and a join on message content.
///
/// Searches titles first, then falls back to message content.
/// Deduplicated; limited to 50 results.
pub fn search(conn: &Connection, query: &str) -> Result<Vec<Conversation>, AppError> {
    let pattern = format!("%{query}%");
    let mut stmt = conn.prepare(
        "SELECT DISTINCT c.id, c.title, c.model, c.system_prompt,
                c.settings_json, c.pinned, c.tags, c.created_at, c.updated_at
         FROM conversations c
         LEFT JOIN messages m ON m.conversation_id = c.id
         WHERE c.title  LIKE ?1
            OR m.content LIKE ?1
         ORDER BY c.pinned DESC, c.updated_at DESC
         LIMIT 50",
    )?;

    let rows = stmt.query_map(params![pattern], row_to_conversation)?;
    rows.map(|r| r.map_err(AppError::from))
        .collect::<Result<Vec<_>, _>>()
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
    fn create_and_list() {
        let conn = in_memory_conn();
        let new = NewConversation {
            title: "Hello".into(),
            model: "llama3".into(),
            system_prompt: None,
            settings_json: None,
            tags: Some(vec!["test".into()]),
        };
        let conv = create(&conn, new).unwrap();
        assert_eq!(conv.title, "Hello");
        assert_eq!(conv.tags, vec!["test"]);

        let list = list_all(&conn).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, conv.id);
    }

    #[test]
    fn update_title_and_pin() {
        let conn = in_memory_conn();
        let conv = create(
            &conn,
            NewConversation {
                title: "Old".into(),
                model: "m".into(),
                system_prompt: None,
                settings_json: None,
                tags: None,
            },
        )
        .unwrap();

        update_title(&conn, &conv.id, "New").unwrap();
        set_pinned(&conn, &conv.id, true).unwrap();

        let updated = get_by_id(&conn, &conv.id).unwrap();
        assert_eq!(updated.title, "New");
        assert!(updated.pinned);
    }

    #[test]
    fn delete_conversation() {
        let conn = in_memory_conn();
        let conv = create(
            &conn,
            NewConversation {
                title: "Tmp".into(),
                model: "m".into(),
                system_prompt: None,
                settings_json: None,
                tags: None,
            },
        )
        .unwrap();

        delete(&conn, &conv.id).unwrap();
        assert!(list_all(&conn).unwrap().is_empty());
    }

    #[test]
    fn search_by_title() {
        let conn = in_memory_conn();
        create(
            &conn,
            NewConversation {
                title: "Rust programming".into(),
                model: "m".into(),
                system_prompt: None,
                settings_json: None,
                tags: None,
            },
        )
        .unwrap();

        let results = search(&conn, "Rust").unwrap();
        assert_eq!(results.len(), 1);

        let empty = search(&conn, "Python").unwrap();
        assert!(empty.is_empty());
    }
}
