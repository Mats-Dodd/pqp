// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;


#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn run_shell_command(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_shell::{ShellExt, process::CommandEvent};
    
    // Start the MCP server process
    let (mut rx, _child) = app_handle.shell()
        .command("npx")
        .args(["-y", "@modelcontextprotocol/server-filesystem", "/Users/matthewdodd/documents"])
        .spawn()
        .map_err(|e| format!("Failed to start MCP server: {}", e))?;

    // Collect output
    let mut output = String::new();
    let mut success = true;
    
    // Process command events
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let line = String::from_utf8_lossy(&line);
                println!("stdout: {}", line);
                output.push_str(&line);
                output.push('\n');
            }
            CommandEvent::Stderr(line) => {
                let line = String::from_utf8_lossy(&line);
                println!("stderr: {}", line);
                output.push_str(&line);
                output.push('\n');
            }
            CommandEvent::Error(err) => {
                success = false;
                output.push_str(&format!("Error: {}\n", err));
            }
            CommandEvent::Terminated(payload) => {
                success = payload.code == Some(0);
            }
            _ => {}
        }
    }

    // Return result
    if success {
        Ok(output)
    } else {
        Err(format!("MCP server failed to start\nOutput: {}", output))
    }
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
