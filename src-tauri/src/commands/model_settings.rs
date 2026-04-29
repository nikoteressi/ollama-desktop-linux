use tauri::{command, State};

use crate::db;
use crate::error::AppError;
use crate::ollama::types::ChatOptions;
use crate::state::AppState;

#[command]
pub async fn get_model_defaults(
    state: State<'_, AppState>,
    model_name: String,
) -> Result<Option<ChatOptions>, AppError> {
    db::model_settings::get_async(state.db.clone(), model_name).await
}

#[command]
pub async fn set_model_defaults(
    state: State<'_, AppState>,
    model_name: String,
    defaults: ChatOptions,
) -> Result<(), AppError> {
    db::model_settings::set_async(state.db.clone(), model_name, defaults).await
}
