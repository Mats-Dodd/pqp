use std::sync::{Arc, Mutex};
use tauri::{Manager, State, Runtime};
use rmcp::{
    ServiceExt,
    model::{CallToolRequestParam, CallToolResult, Tool},
    transport::TokioChildProcess,
    // RunningService and RoleClient are implicitly used via ServiceManager
};
use tokio::process::Command;
use std::borrow::Cow;
// Use the types defined in the service module
use crate::services::mcp::{ServiceManager, ServiceResponse, ToolsResponse, ToolCallResponse, McpError};

type ServiceState<'a> = State<'a, Arc<Mutex<ServiceManager>>>;

#[tauri::command]
pub async fn start_service<R: Runtime>(
    app: tauri::AppHandle<R>,
    service_name: String,
    executable: String, // Accept executable path
    args: Vec<String>, // Accept arguments
) -> Result<ServiceResponse, String> {
    let result = async {
        // Use provided executable and args
        let child_process = TokioChildProcess::new(
            Command::new(executable).args(args)
        ).map_err(McpError::from)?; // Convert IO Error using From

        // Serve the process
        let service = ().serve(child_process)
            .await
            .map_err(McpError::from)?; // Convert RmcpError/ServiceError using From

        let server_info = service.peer_info(); // peer_info should still be available
        println!("Server info for {}: {:?}", service_name, server_info);

        // Get the state and store the full service
        let service_manager = app.state::<Arc<Mutex<ServiceManager>>>();
        {
            let mut state = service_manager.lock()?; // Convert PoisonError using From
            state.add_service(service_name.clone(), service);
        }

        Ok(ServiceResponse {
            success: true,
            message: format!("Service {} started successfully", service_name),
        })
    }.await;

    result.map_err(|e: McpError| e.to_string())
}

#[tauri::command]
pub async fn list_tools(
    service_state: ServiceState<'_>,
    service_name: String,
) -> Result<ToolsResponse, String> {
    let result = async {
        // 1. Get the cloneable peer handle within the lock scope
        let peer = {
            let state = service_state.lock()?; // Handle lock error
            let server = state.get_service(&service_name)
                .ok_or_else(|| McpError::ServiceNotFound(service_name.clone()))?; // Handle not found
            server.peer().clone() // Clone the peer
            // state (MutexGuard) is dropped here, releasing the lock
        };

        // 2. Await using the cloned peer outside the lock scope
        let tools = peer.list_all_tools()
            .await
            .map_err(McpError::from)?; // Handle rmcp error

        let tools_count = tools.len();
        println!("Found {} tools for {}", tools_count, service_name);

        Ok(ToolsResponse {
            success: true,
            tools,
            message: format!("Found {} tools", tools_count),
        })
    }.await;

    result.map_err(|e: McpError| e.to_string())
}

#[tauri::command]
pub async fn call_tool(
    service_state: ServiceState<'_>,
    service_name: String,
    tool_name: String,
    arguments: serde_json::Value,
) -> Result<ToolCallResponse, String> {
    let result = async {
        let args = match arguments {
            serde_json::Value::Object(map) => Some(map),
            _ => return Err(McpError::InvalidArguments("Arguments must be a valid JSON object".to_string()))
        };

        // 1. Get the cloneable peer handle within the lock scope
        let peer = {
            let state = service_state.lock()?; // Handle lock error
            let server = state.get_service(&service_name)
                .ok_or_else(|| McpError::ServiceNotFound(service_name.clone()))?; // Handle not found
            server.peer().clone() // Clone the peer
             // state (MutexGuard) is dropped here
        };

        // 2. Await using the cloned peer outside the lock scope
        let tool_result = peer
            .call_tool(CallToolRequestParam {
                name: Cow::Owned(tool_name.clone()),
                arguments: args,
            })
            .await
            .map_err(McpError::from)?; // Handle rmcp error

        println!("Tool {} called successfully.", tool_name);

        Ok(ToolCallResponse {
            success: true,
            result: Some(tool_result),
            message: format!("Tool {} called successfully", tool_name),
        })
    }.await;

    result.map_err(|e: McpError| e.to_string())
}

#[tauri::command]
pub fn get_services(service_state: ServiceState<'_>) -> Result<Vec<String>, String> {
    let result = (|| { // Keep as sync closure
        let state = service_state.lock()?; // Handle lock error
        Ok(state.list_services())
    })();

    result.map_err(|e: McpError| e.to_string())
}

// Make stop_service async
#[tauri::command]
pub async fn stop_service(
    service_state: ServiceState<'_>,
    service_name: String,
) -> Result<ServiceResponse, String> {
    // 1. Lock, remove the service from the map, and unlock
    let maybe_service = {
        let mut service_manager = service_state.lock()
            .map_err(|e| McpError::LockError(e.to_string()))?; // Handle lock error
        service_manager.remove_service(&service_name) // This is now sync
        // service_manager (MutexGuard) is dropped here, releasing the lock
    };

    // 2. Check if a service was actually removed and await cancel outside the lock
    if let Some(service) = maybe_service {
        match service.cancel().await {
            Ok(_) => Ok(ServiceResponse {
                success: true,
                message: format!("Service {} stopped successfully", service_name),
            }),
            Err(e) => Err(McpError::from(e).to_string()), // Convert JoinError/ServiceError using From and then to String
        }
    } else {
        // Service was not found in the map
        Ok(ServiceResponse {
            success: false,
            message: format!("Service {} not found", service_name),
        })
    }
}

// Legacy command for backward compatibility
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
