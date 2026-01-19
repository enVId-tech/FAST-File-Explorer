use tauri_plugin_shell::{ShellExt, process::CommandEvent};

#[tauri::command]
pub async fn start_test_transfer(app: tauri::AppHandle, source: String, destination: String) {
    let sidecar_command = app
        .shell()
        .sidecar("rclone")
        .unwrap()
        .args(["copy", &source, &destination, "-P"]);

    println!("Starting rclone transfer from {} to {}", source, destination);

    let (mut rx, _child) = sidecar_command.spawn().expect("Failed to spawn rclone");

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stdout(line) = event {
                println!("Rclone Output: {:?}", String::from_utf8_lossy(&line));
            }
        }
    });
}