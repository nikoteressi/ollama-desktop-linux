use std::path::Path;
use tauri::{AppHandle, State, Runtime};
use tauri_plugin_dialog::DialogExt;
use crate::error::AppError;
use crate::state::AppState;
use rusqlite::Connection;
use serde_json::json;
use crate::db::{conversations, messages};

pub fn export_conversation_to_path(conn: &Connection, conversation_id: &str, path: &Path) -> Result<(), AppError> {
    let conv = conversations::get_by_id(conn, conversation_id)?;
    let msgs = messages::list_for_conversation(conn, conversation_id)?;
    
    let export_data = json!({
        "conversation": conv,
        "messages": msgs,
    });
    
    std::fs::write(path, serde_json::to_string_pretty(&export_data).unwrap()).map_err(AppError::from)?;
    Ok(())
}

pub fn backup_database_to_path(db_path: &Path, backup_path: &Path) -> Result<(), AppError> {
    std::fs::copy(db_path, backup_path).map_err(AppError::from)?;
    Ok(())
}

use base64::{Engine as _, engine::general_purpose};
use tauri::Manager;

#[tauri::command]
pub async fn send_message<R: Runtime>(
    state: State<'_, AppState>,
    app: AppHandle<R>,
    conversation_id: String,
    content: String,
    images: Option<Vec<Vec<u8>>>,
    model: String,
    folder_context: Option<String>,
) -> Result<(), AppError> {
    let base64_images = images.map(|imgs| {
        imgs.into_iter()
            .map(|bytes| general_purpose::STANDARD.encode(bytes))
            .collect::<Vec<String>>()
    });

    let db = state.db.clone();
    let conv_id = conversation_id.clone();
    let msg_content = content.clone();
    let imgs = base64_images.clone();

    let (history, conv) = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        
        let new_user_msg = messages::NewMessage {
            conversation_id: conv_id.clone(),
            role: messages::MessageRole::User,
            content: msg_content,
            images_json: imgs.map(|i| serde_json::to_string(&i).unwrap()),
            files_json: None,
            tokens_used: None,
            generation_time_ms: None,
        };
        messages::create(&conn, new_user_msg)?;
        
        let conv = conversations::get_by_id(&conn, &conv_id)?;
        let history = messages::list_for_conversation(&conn, &conv_id)?;
        
        Ok::<_, AppError>((history, conv))
    }).await??;

    let mut ollama_messages = Vec::new();
    
    let mut system_prompt = String::new();
    if let Some(ctx) = folder_context {
        system_prompt.push_str("Here is the context for this conversation:\n");
        system_prompt.push_str(&ctx);
        system_prompt.push_str("\n\n--- End of context ---\n\n");
    }
    if !conv.system_prompt.is_empty() {
        system_prompt.push_str(&conv.system_prompt);
    }
    if !system_prompt.is_empty() {
        ollama_messages.push(crate::ollama::types::Message {
            role: "system".to_string(),
            content: system_prompt,
            images: None,
        });
    }

    for msg in history {
        let msg_imgs = if msg.images_json != "[]" && !msg.images_json.is_empty() {
             serde_json::from_str(&msg.images_json).unwrap_or(None)
        } else {
             None
        };
        ollama_messages.push(crate::ollama::types::Message {
            role: msg.role.as_str().to_string(),
            content: msg.content,
            images: msg_imgs,
        });
    }

    let client = crate::ollama::client::OllamaClient::from_state(state.http_client.clone(), state.db.clone()).await?;

    let req = crate::ollama::types::ChatRequest {
        model,
        messages: ollama_messages,
        stream: true,
    };

    let (tx, rx) = tokio::sync::broadcast::channel(1);
    *state.cancel_tx.lock().unwrap() = Some(tx);

    crate::ollama::streaming::stream_chat(&app, &client, req, &conversation_id, rx).await?;

    Ok(())
}

#[tauri::command]
pub async fn export_conversation<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AppState>,
    conversation_id: String
) -> Result<(), AppError> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter("JSON", &["json"])
        .save_file(move |file_path| {
            let _ = tx.send(file_path);
        });

    let default_path = rx.await.map_err(|e| AppError::Internal(e.to_string()))?;
    
    if let Some(file_path) = default_path {
        let path = file_path.into_path().unwrap();
        let db = state.db.clone();
        tokio::task::spawn_blocking(move || {
            let conn = db.lock().unwrap();
            export_conversation_to_path(&conn, &conversation_id, &path)
        })
        .await??;
    }
    Ok(())
}

#[tauri::command]
pub async fn backup_database<R: Runtime>(
    app: AppHandle<R>,
    _state: State<'_, AppState>,
) -> Result<(), AppError> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter("SQLite Database", &["db", "sqlite3"])
        .save_file(move |file_path| {
            let _ = tx.send(file_path);
        });

    let default_path = rx.await.map_err(|e| AppError::Internal(e.to_string()))?;
    
    if let Some(file_path) = default_path {
        let backup_path = file_path.into_path().unwrap();
        let app_data_dir = app.path().app_data_dir().map_err(|e| AppError::Internal(e.to_string()))?;
        let db_path = app_data_dir.join("ollama-desktop.db");

        tokio::task::spawn_blocking(move || {
            backup_database_to_path(&db_path, &backup_path)
        })
        .await??;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use crate::db::conversations::NewConversation;
    use crate::db::messages::{NewMessage, MessageRole};
    use std::fs;
    use uuid::Uuid;

    #[test]
    fn test_export_conversation_to_path_red() {
        let dir = std::env::temp_dir().join(Uuid::new_v4().to_string());
        fs::create_dir_all(&dir).unwrap();
        let db_path = dir.join("test.db");
        let conn = Connection::open(&db_path).unwrap();
        db::migrations::run(&conn).unwrap();

        let conv = db::conversations::create(&conn, NewConversation {
            title: "Test".into(),
            model: "llama3".into(),
            system_prompt: None,
            settings_json: None,
            tags: None,
        }).unwrap();

        db::messages::create(&conn, NewMessage {
            conversation_id: conv.id.clone(),
            role: MessageRole::User,
            content: "Hello from test".into(),
            images_json: None,
            files_json: None,
            tokens_used: None,
            generation_time_ms: None,
        }).unwrap();

        let export_path = dir.join("export.json");
        export_conversation_to_path(&conn, &conv.id, &export_path).unwrap();

        // Should have created a file
        assert!(export_path.exists(), "Export file was not created");
        let content = fs::read_to_string(&export_path).unwrap();
        assert!(content.contains("Hello from test"), "Exported JSON does not contain the message");
    }

    #[test]
    fn test_backup_database_red() {
        let dir = std::env::temp_dir().join(Uuid::new_v4().to_string());
        fs::create_dir_all(&dir).unwrap();
        let db_path = dir.join("test_src.db");
        let backup_path = dir.join("backup.db");
        
        fs::write(&db_path, "fake db content").unwrap();

        backup_database_to_path(&db_path, &backup_path).unwrap();

        assert!(backup_path.exists(), "Backup file was not created");
        assert_eq!(fs::read_to_string(backup_path).unwrap(), "fake db content", "Backup content mismatch");
    }
}
