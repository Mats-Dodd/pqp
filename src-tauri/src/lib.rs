// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::{Arc, Mutex};
use tauri::Manager;

pub mod commands;
pub mod services;

use commands::mcp_commands::{call_tool, get_services, list_tools, start_service, stop_service};
use commands::proxy_commands::stream_api_request;
use services::mcp::ServiceManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Arc::new(Mutex::new(ServiceManager::default())))
        .invoke_handler(tauri::generate_handler![
            start_service,
            list_tools,
            call_tool,
            get_services,
            stop_service,
            stream_api_request,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
