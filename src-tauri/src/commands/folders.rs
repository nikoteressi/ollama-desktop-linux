use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, command, Runtime};
use tokio::task;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FolderContextPayload {
    pub path: String,
    pub content: String,
    pub token_estimate: usize,
}

fn is_text_file(path: &Path) -> Result<bool, std::io::Error> {
    use std::fs::File;
    use std::io::Read;

    let mut file = File::open(path)?;
    let mut buffer = [0; 1024];
    let n = file.read(&mut buffer)?;

    if n == 0 {
        return Ok(true); // empty files aren't binary
    }

    if buffer[..n].contains(&0) {
        return Ok(false); // contains null byte, likely binary
    }

    Ok(true)
}

/// Recursively reads a directory, ignoring hidden files, `.git`,
/// and binary files. Extracts text from supported file types.
pub fn read_folder_context(folder_path: &Path) -> Result<FolderContextPayload, AppError> {
    let mut content = String::new();

    let walker = ignore::WalkBuilder::new(folder_path)
        .hidden(true)
        .git_ignore(true)
        .require_git(false)
        .build();

    for result in walker {
        let entry = match result {
            Ok(e) => e,
            Err(_) => continue,
        };

        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let is_text = match is_text_file(path) {
            Ok(b) => b,
            Err(_) => continue,
        };

        if !is_text {
            continue;
        }

        if let Ok(file_content) = std::fs::read_to_string(path) {
            let relative_path = path.strip_prefix(folder_path).unwrap_or(path);
            content.push_str(&format!("\n--- File: {} ---\n{}\n", relative_path.display(), file_content));
        }
    }

    let token_estimate = content.chars().count() / 4;
    Ok(FolderContextPayload {
        path: folder_path.to_string_lossy().to_string(),
        content,
        token_estimate,
    })
}

#[command]
pub async fn link_folder<R: Runtime>(
    _app: AppHandle<R>,
    path: String,
) -> Result<FolderContextPayload, AppError> {
    let path_buf = std::path::PathBuf::from(path);
    // Use spawn_blocking since reading large folders is CPU and I/O bound
    tokio::task::spawn_blocking(move || {
        read_folder_context(&path_buf)
    })
    .await?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_read_folder_context_excludes_hidden_and_binary() {
        let dir = tempdir().unwrap();
        let base_path = dir.path();

        // 1. Valid text file
        let file1_path = base_path.join("file1.rs");
        fs::write(&file1_path, "fn main() { println!(\"Hello\"); }").unwrap();

        // 2. Another valid text file in a sub-directory
        let subdir = base_path.join("src");
        fs::create_dir(&subdir).unwrap();
        let file2_path = subdir.join("app.js");
        fs::write(&file2_path, "console.log('world');").unwrap();

        // 3. Hidden directory (should be ignored)
        let git_dir = base_path.join(".git");
        fs::create_dir(&git_dir).unwrap();
        let hidden_file = git_dir.join("config");
        fs::write(&hidden_file, "secret").unwrap();

        // 4. Binary file (should be ignored)
        let bin_file = base_path.join("image.png");
        let mut f = fs::File::create(&bin_file).unwrap();
        // Write some null bytes to simulate a binary file
        f.write_all(&[0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02, 0x03]).unwrap();

        let result = read_folder_context(base_path).unwrap();

        assert_eq!(result.path, base_path.to_string_lossy().to_string());
        
        // Assert content contains the valid files
        assert!(result.content.contains("fn main()"));
        assert!(result.content.contains("console.log('world');"));
        
        // Assert content DOES NOT contain the hidden or binary files
        assert!(!result.content.contains("secret"));

        // Assuming 1 token ≈ 4 characters
        let char_count = result.content.chars().count();
        assert_eq!(result.token_estimate, char_count / 4);
    }
}
