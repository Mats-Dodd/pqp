use std::sync::{Arc, Mutex};
use tauri::{Manager, State, Runtime};
use rmcp::{
    ServiceExt, 
    model::{CallToolRequestParam, Tool},

    transport::TokioChildProcess,
    service::{RunningService, RoleClient},
};
use tokio::process::Command;
use std::borrow::Cow;
use crate::services::mcp::{ServiceManager, ServiceResponse, ToolsResponse, ToolCallResponse, McpError};

type ServiceState<'a> = State<'a, Arc<Mutex<ServiceManager>>>;

// Helper function to convert McpError to String for Tauri IPC
fn to_string_error<T>(result: Result<T, McpError>) -> Result<T, String> {
    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_service<R: Runtime>(
    app: tauri::AppHandle<R>,
    service_name: String,
    path: String
) -> Result<ServiceResponse, String> {
    let result = async {
        let child_process = TokioChildProcess::new(
            Command::new("npx")
                .arg("-y")
                .arg("@modelcontextprotocol/server-filesystem")
                .arg(path),
        ).map_err(McpError::from)?;

        let service = ().serve(child_process)
            .await
            .map_err(McpError::from)?;

        let server_info = service.peer_info();
        println!("Server info for {}: {:?}", service_name, server_info);
        
        // Get the state and store the service
        let service_manager = app.state::<Arc<Mutex<ServiceManager>>>();
        {
            let mut state = service_manager.lock()?;
            state.add_service(service_name.clone(), service);
        }
        
        Ok::<_, McpError>(ServiceResponse {
            success: true,
            message: format!("Service {} started successfully", service_name),
        })
    }.await;
    
    to_string_error(result)
}

#[tauri::command]
pub async fn list_tools(
    service_state: ServiceState<'_>,
    service_name: String,
) -> Result<ToolsResponse, String> {
    let result = async {
        // Get the service from state
        let server = {
            let state = service_state.lock()?;
            state.get_service(&service_name)
                .ok_or_else(|| McpError::ServiceNotFound(service_name.clone()))?
        };
        
        let tools = server.list_all_tools()
            .await
            .map_err(McpError::from)?;
        
        let tools_count = tools.len();
        println!("Found {} tools for {}", tools_count, service_name);
        
        Ok::<_, McpError>(ToolsResponse {
            success: true,
            tools,
            message: format!("Found {} tools", tools_count),
        })
    }.await;
    
    to_string_error(result)
}

#[tauri::command]
pub async fn call_tool(
    service_state: ServiceState<'_>,
    service_name: String,
    tool_name: String,
    arguments: serde_json::Value,
) -> Result<ToolCallResponse, String> {
    let result = async {
        // Get the service from state
        let server = {
            let state = service_state.lock()?;
            state.get_service(&service_name)
                .ok_or_else(|| McpError::ServiceNotFound(service_name.clone()))?
        };
        
        let args = match arguments {
            serde_json::Value::Object(map) => Some(map),
            _ => return Err(McpError::InvalidArguments("Arguments must be a valid JSON object".to_string()))
        };
        
        let tool_result = server
            .call_tool(CallToolRequestParam {
                name: Cow::Owned(tool_name.clone()),
                arguments: args,
            })
            .await
            .map_err(McpError::from)?;
        
        let result_str = serde_json::to_string(&tool_result)
            .map_err(McpError::from)?;
        
        println!("Tool {} result: {}", tool_name, result_str);
        
        Ok::<_, McpError>(ToolCallResponse {
            success: true,
            result: Some(result_str),
            message: format!("Tool {} called successfully", tool_name),
        })
    }.await;
    
    to_string_error(result)
}

#[tauri::command]
pub fn get_services(service_state: ServiceState<'_>) -> Result<Vec<String>, String> {
    let result = (|| {
        let state = service_state.lock()?;
        Ok::<_, McpError>(state.list_services())
    })();
    
    to_string_error(result)
}

#[tauri::command]
pub fn stop_service(
    service_state: ServiceState<'_>,
    service_name: String,
) -> Result<ServiceResponse, String> {
    let result = (|| {
        let mut service_manager = service_state.lock()?;
        match service_manager.remove_service(&service_name) {
            Some(_) => Ok::<_, McpError>(ServiceResponse {
                success: true,
                message: format!("Service {} stopped successfully", service_name),
            }),
            None => Ok(ServiceResponse {
                success: false,
                message: format!("Service {} not found", service_name),
            }),
        }
    })();
    
    to_string_error(result)
}

// Legacy command for backward compatibility
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
