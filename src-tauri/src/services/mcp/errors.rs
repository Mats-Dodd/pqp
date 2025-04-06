use std::fmt;
use std::error::Error;
use std::io;
use rmcp::{
    ServiceError,
    model::{JsonRpcError, ErrorCode},
};

#[derive(Debug)]
pub enum McpError {
    ServiceNotFound(String),
    LockError(String),
    IoError(String),
    RmcpError(ServiceError),
    SerializationError(String),
    InvalidArguments(String),
    JsonRpcError(JsonRpcError),
}

impl fmt::Display for McpError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            McpError::ServiceNotFound(name) => write!(f, "Service not found: {}", name),
            McpError::LockError(msg) => write!(f, "Failed to acquire lock: {}", msg),
            McpError::IoError(msg) => write!(f, "IO error: {}", msg),
            McpError::RmcpError(err) => write!(f, "RMCP service error: {}", err),
            McpError::SerializationError(msg) => write!(f, "Serialization error: {}", msg),
            McpError::InvalidArguments(msg) => write!(f, "Invalid arguments: {}", msg),
            McpError::JsonRpcError(err) => write!(f, "JSON-RPC error: {:?}", err),
        }
    }
}

impl Error for McpError {}

// Conversion from JsonRpcError
impl From<JsonRpcError> for McpError {
    fn from(err: JsonRpcError) -> Self {
        McpError::JsonRpcError(err)
    }
}

// Conversion from Mutex poison error
impl<T> From<std::sync::PoisonError<T>> for McpError {
    fn from(err: std::sync::PoisonError<T>) -> Self {
        McpError::LockError(err.to_string())
    }
}

// Conversion from IO error
impl From<io::Error> for McpError {
    fn from(err: io::Error) -> Self {
        McpError::IoError(err.to_string())
    }
}

// Conversion from RMCP service error
impl From<ServiceError> for McpError {
    fn from(err: ServiceError) -> Self {
        McpError::RmcpError(err)
    }
}

// Conversion from serde_json error
impl From<serde_json::Error> for McpError {
    fn from(err: serde_json::Error) -> Self {
        McpError::SerializationError(err.to_string())
    }
}

// For Tauri compatibility
impl From<McpError> for String {
    fn from(err: McpError) -> Self {
        err.to_string()
    }
} 