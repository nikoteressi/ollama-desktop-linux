use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

// ── Domain type ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: MessageRole,
    pub content: String,
    /// Base64-encoded images (JSON array).
    pub images_json: String,
    /// File attachment metadata (JSON array).
    pub files_json: String,
    pub tokens_used: Option<i64>,
    pub generation_time_ms: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    User,
    Assistant,
    System,
}

impl MessageRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            MessageRole::User => "user",
            MessageRole::Assistant => "assistant",
            MessageRole::System => "system",
        }
    }
}

impl std::str::FromStr for MessageRole {
    type Err = AppError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "user" => Ok(MessageRole::User),
            "assistant" => Ok(MessageRole::Assistant),
            "system" => Ok(MessageRole::System),
            other => Err(AppError::Internal(format!("Unknown role: '{other}'"))),
        }
    }
}

/// Fields required to insert a new message.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewMessage {
    pub conversation_id: String,
    pub role: MessageRole,
    pub content: String,
    pub images_json: Option<String>,
    pub files_json: Option<String>,
    pub tokens_used: Option<i64>,
    pub generation_time_ms: Option<i64>,
}

// ── Mapping ────────────────────────────────────────────────────────────────────

fn row_to_message(row: &rusqlite::Row<'_>) -> rusqlite::Result<Message> {
    let role_str: String = row.get(2)?;
    let role = role_str
        .parse::<MessageRole>()
        .unwrap_or(MessageRole::User);

    Ok(Message {
        id: row.get(0)?,
        conversation_id: row.get(1)?,
        role,
        content: row.get(3)?,
        images_json: row.get(4)?,
        files_json: row.get(5)?,
        tokens_used: row.get(6)?,
        generation_time_ms: row.get(7)?,
        created_at: row.get(8)?,
    })
}

// ── CRUD ───────────────────────────────────────────────────────────────────────

/// Return all messages for a conversation in chronological order.
pub fn list_for_conversation(
    conn: &Connection,
    conversation_id: &str,
) -> Result<Vec<Message>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, conversation_id, role, content, images_json, files_json,
                tokens_used, generation_time_ms, created_at
         FROM messages
         WHERE conversation_id = ?1
         ORDER BY created_at ASC",
    )?;

    let rows = stmt.query_map(params![conversation_id], row_to_message)?;
    rows.map(|r| r.map_err(AppError::from))
        .collect::<Result<Vec<_>, _>>()
}

/// Insert a new message and return it.
pub fn create(conn: &Connection, new: NewMessage) -> Result<Message, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let images_json = new.images_json.unwrap_or_else(|| "[]".to_owned());
    let files_json = new.files_json.unwrap_or_else(|| "[]".to_owned());

    conn.execute(
        "INSERT INTO messages
             (id, conversation_id, role, content, images_json, files_json,
              tokens_used, generation_time_ms, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            id,
            new.conversation_id,
            new.role.as_str(),
            new.content,
            images_json,
            files_json,
            new.tokens_used,
            new.generation_time_ms,
            now,
        ],
    )?;

    conn.query_row(
        "SELECT id, conversation_id, role, content, images_json, files_json,
                tokens_used, generation_time_ms, created_at
         FROM messages WHERE id = ?1",
        params![id],
        row_to_message,
    )
    .map_err(AppError::from)
}

/// Delete all messages that belong to a conversation.
///
/// Normally triggered by CASCADE on conversation delete, but exposed for
/// explicit bulk-delete scenarios (e.g. "clear chat history").
pub fn delete_for_conversation(
    conn: &Connection,
    conversation_id: &str,
) -> Result<usize, AppError> {
    conn.execute(
        "DELETE FROM messages WHERE conversation_id = ?1",
        params![conversation_id],
    )
    .map_err(AppError::from)
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{conversations, migrations};

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

    fn make_conversation(conn: &Connection) -> String {
        conversations::create(
            conn,
            conversations::NewConversation {
                title: "Test".into(),
                model: "m".into(),
                system_prompt: None,
                settings_json: None,
                tags: None,
            },
        )
        .unwrap()
        .id
    }

    #[test]
    fn create_and_list_messages() {
        let conn = in_memory_conn();
        let cid = make_conversation(&conn);

        create(
            &conn,
            NewMessage {
                conversation_id: cid.clone(),
                role: MessageRole::User,
                content: "Hello".into(),
                images_json: None,
                files_json: None,
                tokens_used: None,
                generation_time_ms: None,
            },
        )
        .unwrap();

        create(
            &conn,
            NewMessage {
                conversation_id: cid.clone(),
                role: MessageRole::Assistant,
                content: "Hi there".into(),
                images_json: None,
                files_json: None,
                tokens_used: Some(10),
                generation_time_ms: Some(250),
            },
        )
        .unwrap();

        let msgs = list_for_conversation(&conn, &cid).unwrap();
        assert_eq!(msgs.len(), 2);
        assert_eq!(msgs[0].role, MessageRole::User);
        assert_eq!(msgs[1].tokens_used, Some(10));
    }

    #[test]
    fn delete_all_messages() {
        let conn = in_memory_conn();
        let cid = make_conversation(&conn);

        create(
            &conn,
            NewMessage {
                conversation_id: cid.clone(),
                role: MessageRole::User,
                content: "Bye".into(),
                images_json: None,
                files_json: None,
                tokens_used: None,
                generation_time_ms: None,
            },
        )
        .unwrap();

        let deleted = delete_for_conversation(&conn, &cid).unwrap();
        assert_eq!(deleted, 1);
        assert!(list_for_conversation(&conn, &cid).unwrap().is_empty());
    }
}
