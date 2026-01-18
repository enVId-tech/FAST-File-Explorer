use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::ShellExt;

#[tauri::command]
async fn transfer_file(app: AppHandle, source: String, dest: String) -> Result<(), String> {
    // Configure rsync command
    let sidecar = app
        .shell()
        .sidecar("rsync")
        .map_err(|e| format!("Failed to access rsync sidecar: {}", e))?
        .args(["-av", "--info=progress2", &source, &dest]);

    println!("Starting rsync from {} to {}", source, dest);

    // Spawn the process
    let (mut rx, child) = sidecar
        .spawn()
        .map_err(|e| format!("Failed to spawn rsync: {}", e))?;

    println!("rsync process started with PID: {}", child.pid());

    // Handle process events in a background task
    tauri::async_runtime::spawn(async move {
        // Keep child alive to prevent process termination
        let _child_guard = child;

        while let Some(event) = rx.recv().await {
            match event {
                tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                    let output = String::from_utf8_lossy(&line).to_string();
                    if let Err(e) = app.emit("rsync-output", output) {
                        eprintln!("Failed to emit rsync-output: {}", e);
                    }
                }
                tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                    let error = String::from_utf8_lossy(&line).to_string();
                    if let Err(e) = app.emit("rsync-error", error) {
                        eprintln!("Failed to emit rsync-error: {}", e);
                    }
                }
                tauri_plugin_shell::process::CommandEvent::Terminated(payload) => {
                    if payload.code == Some(0) {
                        let _ = app.emit("rsync-complete", "Transfer completed successfully");
                    } else {
                        let _ = app.emit(
                            "rsync-failed",
                            format!("Transfer failed with exit code: {:?}", payload.code),
                        );
                    }
                    break;
                }
                tauri_plugin_shell::process::CommandEvent::Error(error) => {
                    let _ = app.emit("rsync-failed", format!("Process error: {}", error));
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![transfer_file])
        .run(tauri::generate_context!("tauri.conf.json"))
        .expect("error while running tauri application");
}
