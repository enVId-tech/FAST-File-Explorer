use tauri_plugin_shell::{ShellExt, process::CommandEvent};
use std::fs;

#[tauri::command]
pub async fn clone(app: tauri::AppHandle, source: &str, destination: &str) -> Result<(), String> {
    if !fs::metadata(source).is_ok() {
        return Err(format!("Source path does not exist: {}", source));
    }

    if source == destination {
        // return Err("Source and destination paths cannot be the same".to_string());
        let new_destination = format!("{} - Copy", destination);
        return Box::pin(clone(app, source, &new_destination)).await;
    }

    let sidecar_command = app
        .shell()
        .sidecar("rclone")
        .unwrap()
        .args(["copy", source, destination, "-P"]);

    println!("Starting rclone transfer from {} to {}", source, destination);

    let (mut rx, _child) = sidecar_command.spawn().map_err(|e| format!("Failed to spawn rclone: {}", e))?;

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stdout(line) = event {
                println!("Rclone Output: {:?}", String::from_utf8_lossy(&line));
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn cut(app: tauri::AppHandle, source: String, destination: String) -> Result<(), String> {
    fs::rename(&source, &destination)
        .map_err(|e| format!("Failed to move file: {}", e))?;
    
    if cfg!(target_os = "windows") {
        // On Windows, fs::rename may not work across different drives
        // Fallback to copy and delete
        clone(app, &source, &destination).await?;
        fs::remove_file(&source)
            .map_err(|e| format!("Failed to delete original file after copy: {}", e))?;
    }
    Ok(())
}