use std::collections::HashMap;
use rmcp::{
    service::{RunningService, RoleClient},
    model::{CallToolResult, Tool}
};
use serde::{Serialize, Deserialize};

#[derive(Default)]
pub struct ServiceManager {
    services: HashMap<String, RunningService<RoleClient, ()>>,
}

impl ServiceManager {
    pub fn add_service(&mut self, name: String, service: RunningService<RoleClient, ()>) {
        self.services.insert(name, service);
    }

    pub fn get_service(&self, name: &str) -> Option<&RunningService<RoleClient, ()>> {
        self.services.get(name)
    }

    pub fn list_services(&self) -> Vec<String> {
        self.services.keys().cloned().collect()
    }

    pub fn remove_service(&mut self, name: &str) -> Option<RunningService<RoleClient, ()>> { 
        self.services.remove(name)
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ServiceResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ToolsResponse {
    pub success: bool,
    pub tools: Vec<Tool>,
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ToolCallResponse {
    pub success: bool,
    pub result: Option<CallToolResult>,
    pub message: String,
} 