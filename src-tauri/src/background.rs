//! "Run in the background": starts Invoicer when the user signs in and keeps it
//! in the tray when the window is closed, so scheduled emails still go out.

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};
use tauri_plugin_autostart::ManagerExt;

/// Passed when the app starts at sign-in, so it opens straight to the tray.
pub const MINIMIZED_ARG: &str = "--minimized";
const TRAY_ID: &str = "main";

/// Whether closing the window hides it to the tray instead of quitting.
#[derive(Default)]
pub struct Background(AtomicBool);

impl Background {
    pub fn enabled(&self) -> bool {
        self.0.load(Ordering::Relaxed)
    }
}

pub fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open Invoicer", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Invoicer", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &quit])?;
    let mut tray = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("Invoicer")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

#[tauri::command]
pub fn set_background_mode(app: AppHandle, enabled: bool) -> Result<(), String> {
    app.state::<Background>().0.store(enabled, Ordering::Relaxed);

    let autostart = app.autolaunch();
    let registered = autostart.is_enabled().unwrap_or(false);
    if enabled && !registered {
        autostart.enable().map_err(|e| format!("Could not start Invoicer at sign-in: {e}"))?;
    } else if !enabled && registered {
        autostart.disable().map_err(|e| e.to_string())?;
    }

    if enabled {
        if app.tray_by_id(TRAY_ID).is_none() {
            build_tray(&app).map_err(|e| e.to_string())?;
        }
    } else {
        app.remove_tray_by_id(TRAY_ID);
    }
    Ok(())
}
