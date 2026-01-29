mod funcs;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            funcs::copy::clone,
            funcs::copy::cut,
            // File functions
            funcs::files::list_files,
            funcs::files::get_home_dir,
            funcs::files::get_drives,
            funcs::files::open_file_in_explorer
        ])
        .run(tauri::generate_context!("tauri.conf.json"))
        .expect("error while running tauri application");
}