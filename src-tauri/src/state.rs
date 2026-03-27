use std::sync::Mutex;

use tokio::sync::broadcast;

use crate::db::DbConn;

// ── Application state ──────────────────────────────────────────────────────────

/// Shared state injected into every Tauri command via `State<'_, AppState>`.
///
/// Constructed once in `lib.rs` and registered with `tauri::Builder::manage()`.
pub struct AppState {
    /// Cloneable, thread-safe SQLite connection handle.
    /// Wrap DB calls in `tokio::task::spawn_blocking` to avoid blocking the async runtime.
    pub db: DbConn,

    /// Shared HTTP client with connection pooling (used by the Ollama API client).
    pub http_client: reqwest::Client,

    /// Send on this channel to interrupt an in-progress generation.
    /// Set to `None` when no generation is running.
    pub cancel_tx: Mutex<Option<broadcast::Sender<()>>>,
}

impl AppState {
    pub fn new(db: DbConn) -> Self {
        Self {
            db,
            http_client: reqwest::Client::builder()
                .use_rustls_tls()
                .build()
                .expect("Failed to build HTTP client"),
            cancel_tx: Mutex::new(None),
        }
    }
}
