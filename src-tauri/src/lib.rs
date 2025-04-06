// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{Manager, State, Runtime};
use rmcp::{
    ServiceExt, 
    model::{CallToolRequestParam, CallToolResult, Tool},
    object,
    transport::TokioChildProcess,
    service::{RunningService, RoleClient, ServerSink},
};
use tokio::process::Command;
use serde::{Serialize, Deserialize};
use std::borrow::Cow;

// Structure to manage the state of MCP services
#[derive(Default)]
pub struct ServiceManager {
    services: HashMap<String, ServerSink>,
}

impl ServiceManager {
    // Add a new service to the manager
    pub fn add_service(&mut self, name: String, service: RunningService<RoleClient, ()>) {
        self.services.insert(name, service.peer().clone());
    }
    
    // Get a reference to a service
    pub fn get_service(&self, name: &str) -> Option<ServerSink> {
        self.services.get(name).cloned()
    }
    
    // List all active services
    pub fn list_services(&self) -> Vec<String> {
        self.services.keys().cloned().collect()
    }
    
    // Remove a service
    pub fn remove_service(&mut self, name: &str) -> Option<ServerSink> {
        self.services.remove(name)
    }
}

// Type for the state wrapper
type ServiceState<'a> = State<'a, Arc<Mutex<ServiceManager>>>;

// Response types for commands
#[derive(Serialize, Deserialize)]
pub struct ServiceResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Serialize, Deserialize)]
pub struct ToolsResponse {
    pub success: bool,
    pub tools: Vec<Tool>,
    pub message: String,
}

#[derive(Serialize, Deserialize)]
pub struct ToolCallResponse {
    pub success: bool,
    pub result: Option<String>,
    pub message: String,
}

// Command to start a new MCP service
#[tauri::command]
async fn start_service<R: Runtime>(
    app: tauri::AppHandle<R>,
    service_name: String,
    path: String
) -> Result<ServiceResponse, String> {
    let child_process = TokioChildProcess::new(
        Command::new("npx")
            .arg("-y")
            .arg("@modelcontextprotocol/server-filesystem")
            .arg(path),
    ).map_err(|e| e.to_string())?;

    let service = ().serve(child_process)
        .await
        .map_err(|e| e.to_string())?;

    let server_info = service.peer_info();
    println!("Server info for {}: {:?}", service_name, server_info);
    
    // Get the state and store the service
    let service_manager = app.state::<Arc<Mutex<ServiceManager>>>();
    {
        let mut state = service_manager.lock().unwrap();
        state.add_service(service_name.clone(), service);
    }
    
    Ok(ServiceResponse {
        success: true,
        message: format!("Service {} started successfully", service_name),
    })
}

// Command to list all tools for a service
#[tauri::command]
async fn list_tools(
    service_state: ServiceState<'_>,
    service_name: String,
) -> Result<ToolsResponse, String> {
    // Get the service from state
    let server = {
        let state = service_state.lock().unwrap();
        state.get_service(&service_name)
            .ok_or_else(|| format!("Service {} not found", service_name))?
    };
    
    // List available tools
    let tools = server.list_all_tools()
        .await
        .map_err(|e| e.to_string())?;
    
    let tools_count = tools.len();
    println!("Found {} tools for {}", tools_count, service_name);
    
    Ok(ToolsResponse {
        success: true,
        tools,
        message: format!("Found {} tools", tools_count),
    })
}

// Command to call a specific tool
#[tauri::command]
async fn call_tool(
    service_state: ServiceState<'_>,
    service_name: String,
    tool_name: String,
    arguments: serde_json::Value,
) -> Result<ToolCallResponse, String> {
    // Get the service from state
    let server = {
        let state = service_state.lock().unwrap();
        state.get_service(&service_name)
            .ok_or_else(|| format!("Service {} not found", service_name))?
    };
    
    // Convert arguments to the expected format
    let args = match arguments {
        serde_json::Value::Object(map) => Some(map),
        _ => return Err("Arguments must be a valid JSON object".to_string())
    };
    
    // Call the specified tool
    let tool_result = server
        .call_tool(CallToolRequestParam {
            name: Cow::Owned(tool_name.clone()),
            arguments: args,
        })
        .await
        .map_err(|e| e.to_string())?;
    
    // Convert result to string
    let result_str = serde_json::to_string(&tool_result)
        .map_err(|e| e.to_string())?;
    
    println!("Tool {} result: {}", tool_name, result_str);
    
    Ok(ToolCallResponse {
        success: true,
        result: Some(result_str),
        message: format!("Tool {} called successfully", tool_name),
    })
}

// Command to list active services
#[tauri::command]
fn get_services(service_state: ServiceState<'_>) -> Vec<String> {
    service_state.lock().unwrap().list_services()
}

// Command to stop a service
#[tauri::command]
fn stop_service(
    service_state: ServiceState<'_>,
    service_name: String,
) -> Result<ServiceResponse, String> {
    let mut service_manager = service_state.lock().unwrap();
    match service_manager.remove_service(&service_name) {
        Some(_) => Ok(ServiceResponse {
            success: true,
            message: format!("Service {} stopped successfully", service_name),
        }),
        None => Ok(ServiceResponse {
            success: false,
            message: format!("Service {} not found", service_name),
        }),
    }
}

// Legacy command for backward compatibility
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Arc::new(Mutex::new(ServiceManager::default())))
        .invoke_handler(tauri::generate_handler![
            greet,
            start_service,
            list_tools,
            call_tool,
            get_services,
            stop_service,
        ])
        .setup(|app| {
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
