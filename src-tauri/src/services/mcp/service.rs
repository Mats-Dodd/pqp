use std::collections::HashMap;
use rmcp::{
    service::{RunningService, RoleClient, ServiceError as RmcpServiceError},
    model::{CallToolResult, Tool}, // Assuming CallToolResult derives Serialize
    Error as RmcpError,
};
use serde::{Serialize, Deserialize};
use std::sync::PoisonError;
use std::fmt; // Required for manual Display impl

#[derive(Default)]
pub struct ServiceManager {
    // Store the full RunningService
    services: HashMap<String, RunningService<RoleClient, ()>>,
}

impl ServiceManager {
    pub fn add_service(&mut self, name: String, service: RunningService<RoleClient, ()>) {
        // Insert the whole service
        self.services.insert(name, service);
    }

    // Return a reference
    pub fn get_service(&self, name: &str) -> Option<&RunningService<RoleClient, ()>> {
        self.services.get(name)
    }

    pub fn list_services(&self) -> Vec<String> {
        self.services.keys().cloned().collect()
    }

    // Remove async, just removes from map and returns the owned service
    pub fn remove_service(&mut self, name: &str) -> Option<RunningService<RoleClient, ()>> { 
        self.services.remove(name)
    }
}

// Add Debug and Clone to response structs
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ServiceResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ToolsResponse {
    pub success: bool,
    pub tools: Vec<Tool>, // Tool should derive Serialize/Deserialize from rmcp
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ToolCallResponse {
    pub success: bool,
    // Use the actual result type if it's serializable
    pub result: Option<CallToolResult>,
    pub message: String,
} 