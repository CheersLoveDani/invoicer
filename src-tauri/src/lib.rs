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
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                background::on_close_requested(window, api);
            }
        })
        .setup(|app| {
            // The window is created here, not from the config, so a sign-in
            // launch in background mode never loads the web view
            background::init(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            mail::smtp_save_password,
            mail::smtp_has_password,
            mail::smtp_delete_password,
            mail::smtp_send,
            background::set_background_mode,
            background::set_start_at_login,
            background::background_next_wake,
            background::background_pass_done,
        ]);

    #[cfg(mobile)]
    let builder = builder.invoke_handler(tauri::generate_handler![
        mail::smtp_save_password,
        mail::smtp_has_password,
        mail::smtp_delete_password,
        mail::smtp_send,
    ]);

    let app = builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|_app, _event| {
        #[cfg(desktop)]
        {
            use tauri::Manager;
            match _event {
                // Closing the last window leaves the tray process running;
                // Quit Invoicer (an explicit exit code) still quits
                tauri::RunEvent::ExitRequested { code: None, api, .. }
                    if _app.state::<background::Background>().enabled() =>
                {
                    api.prevent_exit();
                }
                #[cfg(target_os = "macos")]
                tauri::RunEvent::Reopen { .. } => background::show_main(_app),
                _ => {}
            }
        }
    });
}
