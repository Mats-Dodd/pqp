// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;
use rmcp::{
    ServiceExt,
    model::{CallToolRequestParam, GetPromptRequestParam, ReadResourceRequestParam},
    object,
    transport::TokioChildProcess,
};
use tokio::process::Command;
use std::error::Error;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn run_shell_command(app_handle: tauri::AppHandle) -> Result<String, String> {
    let child_process = TokioChildProcess::new(
        Command::new("npx")
            .arg("-y")
            .arg("@modelcontextprotocol/server-filesystem")
            .arg("/Users/matthewdodd/documents"),
    ).map_err(|e| e.to_string())?;

    let service = ().serve(child_process)
        .await
        .map_err(|e| e.to_string())?;

    // Initialize
    let server_info = service.peer_info();
    println!("Server info: {:?}", server_info);

    // List tools
    let tools = service.list_all_tools()
        .await
        .map_err(|e| e.to_string())?;
    println!("Tools: {:?}", tools);
    Ok(format!("Found {} tools", tools.len()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, run_shell_command])
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
