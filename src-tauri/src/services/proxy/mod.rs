use serde_json::Value;
use tauri::Window;
use thiserror::Error;
use reqwest;
use std::fmt;
use async_trait::async_trait;
use std::env;
use dotenv::dotenv;

// Event type constants
pub(crate) const EVT_CHUNK: &str = "ai-stream-chunk";
pub(crate) const EVT_ERROR: &str = "ai-stream-error";
pub(crate) const EVT_END: &str = "ai-stream-end";

/// Errors that can occur when working with API proxies
#[derive(Error, Debug)]
pub enum ProxyError {
    #[error("API key error: {0}")]
    ApiKey(String),
    
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    
    #[error("API returned status code {0}")]
    Status(u16),
    
    #[error("Failed to parse response: {0}")]
    Parse(#[from] serde_json::Error),
    
    #[error("Failed to emit event: {0}")]
    Emit(String),
}

/// Result type for proxy operations
pub type ProxyResult<T> = Result<T, ProxyError>;

/// Trait for API providers that can stream responses
#[async_trait]
pub trait ProxyProvider {
    /// Stream a response from the API provider
    async fn stream(&self, window: Window, body: Value) -> ProxyResult<()>;
}

/// Load an API key from environment variables for the given provider
pub fn load_api_key(provider: &str) -> ProxyResult<String> {
    dotenv().ok();
    let key_name = match provider {
        "anthropic" => "ANTHROPIC_API_KEY",
        "openai" => "OPENAI_API_KEY",
        _ => return Err(ProxyError::ApiKey(format!("Unsupported provider: {}", provider))),
    };
    
    println!("Attempting to load {} from environment/dotenv", key_name);
    
    match env::var(key_name) {
        Ok(key) => {
            // Redacted logging for security
            let key_len = key.len();
            let redacted_key = if key_len > 10 {
                format!("{}...{}", &key[..5], &key[key_len-5..])
            } else {
                "Key too short to redact safely".to_string()
            };
            println!("{} loaded successfully (redacted: {}).", key_name, redacted_key);
            Ok(key)
        },
        Err(e) => {
            let error_msg = format!("Failed to load {}: {}", key_name, e);
            println!("{}", error_msg);
            Err(ProxyError::ApiKey(error_msg))
        }
    }
}

/// Get a provider implementation based on the provider name
pub fn get_provider(provider: &str) -> ProxyResult<Box<dyn ProxyProvider + Send + Sync>> {
    match provider {
        "anthropic" => {
            // Forward declare the AnthropicProvider to avoid circular imports
            // Will be implemented in anthropic.rs
            Err(ProxyError::ApiKey(format!("AnthropicProvider not yet implemented")))
        },
        "openai" => {
            // Forward declare the OpenAIProvider to avoid circular imports
            // Will be implemented in openai.rs
            Err(ProxyError::ApiKey(format!("OpenAIProvider not yet implemented")))
        },
        _ => Err(ProxyError::ApiKey(format!("Unsupported provider: {}", provider))),
    }
}

// --- Event Emission Helpers ---

/// Emit an error event to the client
pub(crate) fn emit_error<S: Into<String>>(window: &Window, message: S) -> ProxyResult<()> {
    let msg = message.into();
    // Log before emitting
    println!("RUST -> FE: Emitting Error: {}", msg);
    window.emit(EVT_ERROR, &msg)
          .map_err(|e| ProxyError::Emit(format!("Failed to emit error event ({}): {}", msg, e)))
}

/// Emit a chunk of data to the client
pub(crate) fn emit_chunk<S: Into<String>>(window: &Window, data: S) -> ProxyResult<()> {
    let chunk_data = data.into();
    // Log before emitting - Use {:?} to see escape characters like \n clearly
    println!("RUST -> FE: Emitting Chunk: {:?}", chunk_data);
    window.emit(EVT_CHUNK, &chunk_data)
          .map_err(|e| ProxyError::Emit(format!("Failed to emit chunk event: {}", e)))
}

/// Emit an end event to the client
pub(crate) fn emit_end(window: &Window) -> ProxyResult<()> {
    // Log before emitting
    println!("RUST -> FE: Emitting End");
    window.emit(EVT_END, ())
          .map_err(|e| ProxyError::Emit(format!("Failed to emit end event: {}", e)))
} 