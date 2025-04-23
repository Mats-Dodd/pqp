// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use log::LevelFilter;
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

pub mod commands;
pub mod services;

use commands::mcp_commands::{call_tool, get_services, list_tools, start_service, stop_service};
use commands::proxy_commands::stream_api_request;
use commands::db_commands::get_db_path;
use services::mcp::ServiceManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger with appropriate level based on build configuration
    #[cfg(debug_assertions)]
    let log_level = LevelFilter::Debug;
    #[cfg(not(debug_assertions))]
    let log_level = LevelFilter::Info;

    // Simple logger setup - can be replaced with a more sophisticated logger if needed
    env_logger::Builder::new().filter_level(log_level).init();

    // Define migrations for chat database
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_conversations_table",
            sql: "CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_messages_table",
            sql: "CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                sender TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            )",
            kind: MigrationKind::Up,
        }
    ];

    // Get user's home directory and construct path to Documents
    let home_dir = dirs::home_dir().expect("Could not find home directory");
    let documents_dir = home_dir.join("Documents");
    let db_dir = documents_dir.join("pqp_data");
    
    // Create the directory if it doesn't exist
    std::fs::create_dir_all(&db_dir).expect("Failed to create database directory");
    
    let db_path = db_dir.join("pqp_chats.db");
    let db_url = format!("sqlite:{}", db_path.to_string_lossy());

    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default()
            .add_migrations(&db_url, migrations)
            .build())
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
            get_db_path,
        ])
        .setup(move |app| {
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }
            
            // Make the database path available to the frontend
            #[cfg(desktop)]
            {
                let db_path_str = db_path.to_string_lossy().to_string();
                app.manage(db_path_str);
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
