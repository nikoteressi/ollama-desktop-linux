use crate::commands::models::ModelInfo;
use crate::error::AppError;
use crate::ollama::client::OllamaClient;
use crate::state::AppState;
use tauri::State;

pub async fn core_get_modelfile(client: &OllamaClient, name: &str) -> Result<String, AppError> {
    let resp = client
        .post("/api/show")
        .json(&serde_json::json!({ "name": name, "verbose": false }))
        .send()
        .await?;

    if !resp.status().is_success() {
        return Err(AppError::Http(format!(
            "Failed to fetch modelfile for '{}': {}",
            name,
            resp.status()
        )));
    }

    let info: ModelInfo = resp.json().await?;
    Ok(info.modelfile.unwrap_or_default())
}

#[tauri::command]
pub async fn get_modelfile(state: State<'_, AppState>, name: String) -> Result<String, AppError> {
    let client = OllamaClient::from_state(state.http_client.clone(), state.db.clone()).await?;
    core_get_modelfile(&client, &name).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockito::Server;

    #[tokio::test]
    async fn test_get_modelfile_success() {
        let mut server = Server::new_async().await;
        let mock = server
            .mock("POST", "/api/show")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{"modelfile":"FROM llama3\nSYSTEM \"You are helpful.\"\n"}"#)
            .create_async()
            .await;

        let client = reqwest::Client::new();
        let ollama = OllamaClient::new(client, server.url(), None);
        let result = core_get_modelfile(&ollama, "llama3").await;
        mock.assert_async().await;

        assert!(result.is_ok());
        assert!(result.unwrap().contains("FROM llama3"));
    }

    #[tokio::test]
    async fn test_get_modelfile_missing_field_returns_empty() {
        let mut server = Server::new_async().await;
        let mock = server
            .mock("POST", "/api/show")
            .with_status(200)
            .with_body(r#"{"capabilities":[]}"#)
            .create_async()
            .await;

        let client = reqwest::Client::new();
        let ollama = OllamaClient::new(client, server.url(), None);
        let result = core_get_modelfile(&ollama, "llama3").await;
        mock.assert_async().await;

        assert_eq!(result.unwrap(), "");
    }

    #[tokio::test]
    async fn test_get_modelfile_http_error() {
        let mut server = Server::new_async().await;
        let mock = server
            .mock("POST", "/api/show")
            .with_status(404)
            .create_async()
            .await;

        let client = reqwest::Client::new();
        let ollama = OllamaClient::new(client, server.url(), None);
        let result = core_get_modelfile(&ollama, "missing").await;
        mock.assert_async().await;

        assert!(result.is_err());
    }
}
