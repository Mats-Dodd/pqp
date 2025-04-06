use std::collections::HashMap;
use rmcp::service::{RunningService, RoleClient, ServerSink};
use serde::{Serialize, Deserialize};

#[derive(Default)]
pub struct ServiceManager {
    services: HashMap<String, ServerSink>,
}

impl ServiceManager {

    pub fn add_service(&mut self, name: String, service: RunningService<RoleClient, ()>) {
        self.services.insert(name, service.peer().clone());
    }
    
    pub fn get_service(&self, name: &str) -> Option<ServerSink> {
        self.services.get(name).cloned()
    }
    
    pub fn list_services(&self) -> Vec<String> {
        self.services.keys().cloned().collect()
    }
    
    pub fn remove_service(&mut self, name: &str) -> Option<ServerSink> {
        self.services.remove(name)
    }
}

#[derive(Serialize, Deserialize)]
pub struct ServiceResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Serialize, Deserialize)]
pub struct ToolsResponse {
    pub success: bool,
    pub tools: Vec<rmcp::model::Tool>,
    pub message: String,
}

#[derive(Serialize, Deserialize)]
pub struct ToolCallResponse {
    pub success: bool,
    pub result: Option<String>,
    pub message: String,
} 