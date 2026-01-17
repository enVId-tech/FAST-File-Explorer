use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter}; // For sending events to UI
use tauri_plugin_shell::ShellExt;

#[tauri::command]
async fn transfer_file(app: AppHandle, source: String, dest: String) {
    let sidecar =
        app.shell()
            .sidecar("rsync")
            .unwrap()
            .args(["-av", "--info=progress2", &source, &dest]);

    let (mut rx, mut _child) = sidecar.spawn().expect("Failed to spawn rsync");

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                    let output = String::from_utf8_lossy(&line).to_string();

                    app.emit("rsync-output", output).unwrap();
                }
                tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                    let error = String::from_utf8_lossy(&line).to_string();
                    app.emit("rsync-error", error).unwrap();
                }
                _ => {}
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![transfer_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
