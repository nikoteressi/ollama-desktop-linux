use crate::error::AppError;
use std::process::Stdio;
use tokio::process::Command;

#[tauri::command]
pub async fn start_ollama() -> Result<(), AppError> {
    // Attempt 1: Start the user service first (no polkit needed)
    let user_status = Command::new("systemctl")
        .arg("--user")
        .arg("start")
        .arg("ollama")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .status()
        .await;

    if let Ok(status) = user_status {
        if status.success() {
            return Ok(());
        }
    }

    // Attempt 2: Fallback to system-level service manager
    // Systemd usually prompts with polkit if necessary for regular users.
    let sys_output = Command::new("systemctl")
        .arg("start")
        .arg("ollama")
        .output()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to execute systemctl: {}", e)))?;

    if sys_output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&sys_output.stderr);
        Err(AppError::Internal(format!(
            "Failed to start Ollama service. Service might not be installed, or permission was denied: {}",
            stderr.trim()
        )))
    }
}
