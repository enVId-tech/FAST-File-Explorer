use tauri::{AppHandle, Emitter}; // For sending events to UI
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn transfer_file(
    app: AppHandle,
    source: String,
    dest: String
) -> Result<String, String> {
    if source.is_empty() || dest.is_empty() {
        return Err("Source and destination paths must be provided".to_string());
    }

    let mut child = Command::new("rsync")
        .args(["-av", "--info=progress2", &source, &dest])
        .stdout(Stdio::piped()) // Capture the output
        .spawn()
        .map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let reader = BufReader::new(stdout);

    // 2. Read the rsync output line by line in real-time
    for line in reader.lines() {
        if let Ok(content) = line {
            app.emit("rsync-progress", content).ok();
        }
    }

    Ok("Transfer Complete".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, transfer_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
