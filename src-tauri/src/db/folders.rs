use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::DbConn;
use crate::error::AppError;
use rusqlite::OptionalExtension;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FolderContext {
    pub id: String,
    pub conversation_id: String,
    pub path: String,
    pub included_files_json: Option<String>,
    pub auto_refresh: bool,
    pub estimated_tokens: i64,
    pub created_at: String,
}

pub async fn add_folder_context(
    conn: DbConn,
    conversation_id: String,
    path: String,
    included_files_json: Option<String>,
    auto_refresh: bool,
    estimated_tokens: i64,
) -> Result<FolderContext, AppError> {
    tokio::task::spawn_blocking(move || {
        let lock = conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();

        lock.execute(
            "INSERT INTO folder_contexts (id, conversation_id, path, included_files_json, auto_refresh, estimated_tokens)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![id, conversation_id, path, included_files_json, auto_refresh, estimated_tokens],
        )?;

        lock.query_row(
            "SELECT id, conversation_id, path, included_files_json, auto_refresh, estimated_tokens, created_at
             FROM folder_contexts WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(FolderContext {
                    id: row.get(0)?,
                    conversation_id: row.get(1)?,
                    path: row.get(2)?,
                    included_files_json: row.get(3)?,
                    auto_refresh: row.get(4)?,
                    estimated_tokens: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        ).map_err(AppError::from)
    })
    .await?
}

pub async fn get_folder_contexts_for_conversation(
    conn: DbConn,
    conversation_id: String,
) -> Result<Vec<FolderContext>, AppError> {
    tokio::task::spawn_blocking(move || {
        let lock = conn.lock().unwrap();
        let mut stmt = lock.prepare(
            "SELECT id, conversation_id, path, included_files_json, auto_refresh, estimated_tokens, created_at
             FROM folder_contexts WHERE conversation_id = ?1 ORDER BY created_at ASC",
        )?;

        let iter = stmt.query_map(rusqlite::params![conversation_id], |row| {
            Ok(FolderContext {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                path: row.get(2)?,
                included_files_json: row.get(3)?,
                auto_refresh: row.get(4)?,
                estimated_tokens: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?;

        let mut contexts = Vec::new();
        for context_result in iter {
            contexts.push(context_result?);
        }
        Ok(contexts)
    })
    .await?
}

pub async fn remove_folder_context(
    conn: DbConn,
    id: String,
) -> Result<(), AppError> {
    tokio::task::spawn_blocking(move || {
        let lock = conn.lock().unwrap();
        lock.execute(
            "DELETE FROM folder_contexts WHERE id = ?1",
            rusqlite::params![id],
        )?;
        Ok(())
    })
    .await?
}
