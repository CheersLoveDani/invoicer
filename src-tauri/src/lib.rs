mod mail;

#[cfg(desktop)]
mod background;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // A second launch (for example from the Start menu while running in the
    // tray) brings the open window forward instead of starting another copy,
    // which could send the same scheduled email twice.
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            background::show_main(app)
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![background::MINIMIZED_ARG]),
        ))
        // Self-update from the latest GitHub release.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(background::Background::default())
        .on_window_event(|window, event| {
            use tauri::Manager;
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.app_handle().state::<background::Background>().enabled() {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .setup(|app| {
            // The window starts hidden so a sign-in launch can stay in the tray
            if !std::env::args().any(|arg| arg == background::MINIMIZED_ARG) {
                background::show_main(app.handle());
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            mail::smtp_save_password,
            mail::smtp_has_password,
            mail::smtp_delete_password,
            mail::smtp_send,
            background::set_background_mode,
        ]);

    #[cfg(mobile)]
    let builder = builder.invoke_handler(tauri::generate_handler![
        mail::smtp_save_password,
        mail::smtp_has_password,
        mail::smtp_delete_password,
        mail::smtp_send,
    ]);

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
