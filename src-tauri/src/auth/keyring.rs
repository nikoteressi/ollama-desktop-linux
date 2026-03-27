use crate::error::AppError;
use keyring::Entry;

pub const SERVICE_NAME: &str = "ollama-desktop";

/// Sets a bearer token in the system's secure credential store (keyring).
///
/// Under Linux, this uses the Secret Service API.
pub fn set_token(host_id: &str, token: &str) -> Result<(), AppError> {
    let entry = Entry::new(SERVICE_NAME, host_id)?;
    entry.set_password(token)?;
    Ok(())
}

/// Retrieves a bearer token from the system's secure credential store.
///
/// Returns `Ok(None)` if no token was found for this host.
pub fn get_token(host_id: &str) -> Result<Option<String>, AppError> {
    let entry = Entry::new(SERVICE_NAME, host_id)?;
    match entry.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::from(e)),
    }
}

/// Deletes a bearer token from the system's secure credential store.
///
/// Returns `Ok(())` even if the token did not exist.
pub fn delete_token(host_id: &str) -> Result<(), AppError> {
    let entry = Entry::new(SERVICE_NAME, host_id)?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(AppError::from(e)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn test_set_and_get_token_happy_path() {
        // Use a random UUID so tests don't collide or mess up user state
        let host_id = Uuid::new_v4().to_string();
        let test_token = "ollama_test_token_123";

        // In headless CI/environments, keyring might not be available,
        // so we tolerate NoBackend errors gracefully in tests or assert explicitly.
        let set_res = set_token(&host_id, test_token);
        
        if let Err(AppError::Auth(msg)) = &set_res {
            if msg.contains("No secret-service") || msg.contains("NoBackend") || msg.contains("locked") {
                // CI environment without a valid keyring daemon, pass gracefully
                return;
            }
        }
        
        // Assert we could set it
        assert!(set_res.is_ok(), "Setting token should succeed");

        // Assert we can read it back
        let retrieved = get_token(&host_id).expect("Should read back the token");
        assert_eq!(retrieved, Some(test_token.to_string()));

        // Delete it
        let del_res = delete_token(&host_id);
        assert!(del_res.is_ok(), "Deleting token should succeed");

        // Assert it's gone
        let retrieved_after = get_token(&host_id).expect("Should not fail when querying missing token");
        assert_eq!(retrieved_after, None);
    }

    #[test]
    fn test_get_nonexistent_token() {
        let host_id = Uuid::new_v4().to_string();
        
        let retrieved = get_token(&host_id);
        match retrieved {
            Ok(None) => (), // Expected
            Err(AppError::Auth(msg)) if msg.contains("No secret-service") || msg.contains("NoBackend") || msg.contains("locked") => (),
            Ok(Some(_)) => panic!("Token shouldn't exist"),
            Err(e) => panic!("Unexpected error: {:?}", e),
        }
    }
    
    #[test]
    fn test_delete_nonexistent_token() {
        let host_id = Uuid::new_v4().to_string();
        
        let del_res = delete_token(&host_id);
        match del_res {
            Ok(_) => (), // Expected, should silently succeed
            Err(AppError::Auth(msg)) if msg.contains("No secret-service") || msg.contains("NoBackend") || msg.contains("locked") => (),
            Err(e) => panic!("Unexpected error: {:?}", e),
        }
    }
}
