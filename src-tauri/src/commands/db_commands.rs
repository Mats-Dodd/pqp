use dirs;

#[tauri::command]
pub fn get_db_path() -> String {
    let home_dir = dirs::home_dir().expect("Could not find home directory");
    let documents_dir = home_dir.join("Documents");
    let db_dir = documents_dir.join("pqp_data");
    let db_path = db_dir.join("pqp_chats.db");
    
    db_path.to_string_lossy().to_string()
} 