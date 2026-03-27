use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};
use serde_json::json;
use tokio::time::Instant;

use crate::db::{self, hosts::{Host, NewHost, PingStatus}};
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn list_hosts(state: State<'_, AppState>) -> Result<Vec<Host>, AppError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        db::hosts::list_all(&conn)
    })
    .await?
}

#[tauri::command]
pub async fn add_host(state: State<'_, AppState>, new_host: NewHost) -> Result<Host, AppError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        db::hosts::create(&conn, new_host)
    })
    .await?
}

#[tauri::command]
pub async fn update_host(
    state: State<'_, AppState>,
    id: String,
    name: String,
    url: String,
) -> Result<(), AppError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        db::hosts::update(&conn, &id, &name, &url)
    })
    .await?
}

#[tauri::command]
pub async fn delete_host(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        db::hosts::delete(&conn, &id)
    })
    .await?
}

#[tauri::command]
pub async fn set_active_host(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        db::hosts::set_active(&conn, &id)
    })
    .await?
}

pub async fn perform_ping(client: &reqwest::Client, url: &str) -> (PingStatus, Option<u128>) {
    let start = Instant::now();
    let endpoint = format!("{}/api/tags", url.trim_end_matches('/'));
    
    // graceful timeout (5s) without panicking
    match client.get(&endpoint).timeout(Duration::from_secs(5)).send().await {
        Ok(res) if res.status().is_success() => {
            (PingStatus::Online, Some(start.elapsed().as_millis()))
        }
        _ => (PingStatus::Offline, None),
    }
}

#[tauri::command]
pub async fn ping_host(state: State<'_, AppState>, id: String) -> Result<PingStatus, AppError> {
    let host = tokio::task::spawn_blocking({
        let db = state.db.clone();
        let id = id.clone();
        move || {
            let conn = db.lock().unwrap();
            db::hosts::get_by_id(&conn, &id)
        }
    })
    .await??;

    let (status, _latency) = perform_ping(&state.http_client, &host.url).await;
    
    tokio::task::spawn_blocking({
        let db = state.db.clone();
        let status = status.clone();
        move || {
            let conn = db.lock().unwrap();
            db::hosts::update_ping_status(&conn, &id, &status)
        }
    })
    .await??;

    Ok(status)
}

pub fn start_host_health_loop(app: AppHandle) {
    tokio::spawn(async move {
        // extract resources that we can move across thread bounds safely
        let db = {
            let state = app.state::<AppState>();
            state.db.clone()
        };
        let client = {
            let state = app.state::<AppState>();
            state.http_client.clone()
        };
        
        loop {
            let hosts = match tokio::task::spawn_blocking({
                let db = db.clone();
                move || {
                    let conn = db.lock().unwrap();
                    db::hosts::list_all(&conn)
                }
            }).await {
                Ok(Ok(h)) => h,
                _ => Vec::new(),
            };

            for host in hosts {
                let (status, latency_ms) = perform_ping(&client, &host.url).await;
                
                let _ = tokio::task::spawn_blocking({
                    let db = db.clone();
                    let id = host.id.clone();
                    let status = status.clone();
                    move || {
                        let conn = db.lock().unwrap();
                        db::hosts::update_ping_status(&conn, &id, &status)
                    }
                }).await;

                // emit event to frontend
                let _ = app.emit("host:status-change", json!({
                    "host_id": host.id,
                    "status": status.as_str(),
                    "latency_ms": latency_ms,
                }));
            }
            
            // interval
            tokio::time::sleep(Duration::from_secs(30)).await;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_perform_ping_timeout_does_not_panic() {
        let client = reqwest::Client::new();
        // A non-routable IP to ensure timeout or connection refused without panicking.
        let (status, latency) = perform_ping(&client, "http://192.0.2.1:11434").await;
        assert_eq!(status, PingStatus::Offline);
        assert!(latency.is_none());
    }

    #[tokio::test]
    async fn test_perform_ping_connection_refused_does_not_panic() {
        let client = reqwest::Client::new();
        // Nothing listening on this port usually
        let (status, latency) = perform_ping(&client, "http://127.0.0.1:49152").await;
        assert_eq!(status, PingStatus::Offline);
        assert!(latency.is_none());
    }
}
