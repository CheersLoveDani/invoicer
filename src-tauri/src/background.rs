//! "Run in the background": closing the window leaves only this small Rust
//! process and a tray icon. The web view (the heavy part) is closed. When
//! something is due, the app is woken in a hidden window, does its work and
//! closes again.
//!
//! "Open at sign-in" is separate: it starts Invoicer when the user signs in,
//! straight to the tray when background mode is on.

use std::{
    fs,
    path::PathBuf,
    sync::Mutex,
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WebviewWindowBuilder,
};
use tauri_plugin_autostart::ManagerExt;

/// Passed when the app starts at sign-in.
pub const MINIMIZED_ARG: &str = "--minimized";
const TRAY_ID: &str = "main";
const MAIN: &str = "main";
const STATE_FILE: &str = "background.json";
/// How often the tray process checks whether anything is due.
const CHECK_EVERY: Duration = Duration::from_secs(20);
/// Never wake more often than this, even if the app asks to.
const MIN_GAP_MS: i64 = 60 * 1000;
/// A hidden run that has not finished by now is closed anyway.
const RUN_TIMEOUT_MS: i64 = 5 * 60 * 1000;

/// Kept on disk so a sign-in launch knows what to do before any web view loads.
#[derive(Default, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct Saved {
    enabled: bool,
    /// When the app next has something to do (ms since 1970).
    next_wake_ms: Option<i64>,
}

#[derive(Default)]
struct Inner {
    saved: Saved,
    path: Option<PathBuf>,
    /// Set while a hidden window is doing background work.
    hidden_run_since: Option<i64>,
    last_wake_ms: i64,
}

#[derive(Default)]
pub struct Background(Mutex<Inner>);

impl Background {
    pub fn enabled(&self) -> bool {
        self.0.lock().map(|s| s.saved.enabled).unwrap_or(false)
    }
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn persist(inner: &Inner) {
    let Some(path) = &inner.path else { return };
    if let Some(dir) = path.parent() {
        let _ = fs::create_dir_all(dir);
    }
    if let Ok(json) = serde_json::to_string(&inner.saved) {
        let _ = fs::write(path, json);
    }
}

/// Opens the main window, creating its web view if it was closed.
/// `visible: false` loads the app hidden, for background work.
fn open_main(app: &AppHandle, visible: bool) {
    if let Some(window) = app.get_webview_window(MAIN) {
        if visible {
            if let Ok(mut inner) = app.state::<Background>().0.lock() {
                inner.hidden_run_since = None;
            }
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
        return;
    }
    let Some(config) = app.config().app.windows.iter().find(|w| w.label == MAIN) else {
        return;
    };
    let built = WebviewWindowBuilder::from_config(app, config).and_then(|b| b.visible(visible).build());
    match built {
        Ok(window) if visible => {
            let _ = window.set_focus();
        }
        Ok(_) => {}
        Err(err) => eprintln!("Could not open the Invoicer window: {err}"),
    }
}

/// Shows the window. Safe to call from event handlers: building a window
/// there would deadlock on Windows, so a new one is built on another thread.
pub fn show_main(app: &AppHandle) {
    if app.get_webview_window(MAIN).is_some() {
        open_main(app, true);
    } else {
        let app = app.clone();
        thread::spawn(move || open_main(&app, true));
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

fn sync_tray(app: &AppHandle, enabled: bool) -> Result<(), String> {
    if enabled {
        if app.tray_by_id(TRAY_ID).is_none() {
            build_tray(app).map_err(|e| e.to_string())?;
        }
    } else {
        app.remove_tray_by_id(TRAY_ID);
    }
    Ok(())
}

/// What the tray process does every few seconds: wake the app when something
/// is due, and close a hidden run that never finished.
fn tick(app: &AppHandle) {
    let now = now_ms();
    let window = app.get_webview_window(MAIN);
    let state = app.state::<Background>();
    let wake = {
        let Ok(mut inner) = state.0.lock() else { return };
        if !inner.saved.enabled {
            return;
        }
        if let Some(window) = &window {
            let hidden = !window.is_visible().unwrap_or(true);
            if hidden && inner.hidden_run_since.is_some_and(|since| now - since > RUN_TIMEOUT_MS) {
                inner.hidden_run_since = None;
                let _ = window.destroy();
            }
            return;
        }
        inner.hidden_run_since = None;
        let due = inner
            .saved
            .next_wake_ms
            .is_some_and(|at| at <= now && now - inner.last_wake_ms >= MIN_GAP_MS);
        if due {
            inner.hidden_run_since = Some(now);
            inner.last_wake_ms = now;
            inner.saved.next_wake_ms = None;
        }
        due
    };
    if wake {
        open_main(app, false);
    }
}

/// Called from `setup`: loads the saved state, then either opens the window
/// or (a sign-in launch in background mode) stays in the tray.
pub fn init(app: &AppHandle) {
    let path = app.path().app_config_dir().ok().map(|dir| dir.join(STATE_FILE));
    let saved: Saved = path
        .as_ref()
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|json| serde_json::from_str(&json).ok())
        .unwrap_or_default();
    let enabled = saved.enabled;
    let minimized = std::env::args().any(|arg| arg == MINIMIZED_ARG);

    if let Ok(mut inner) = app.state::<Background>().0.lock() {
        inner.saved = saved;
        inner.path = path;
        // Catch up on anything that came due while the computer was off
        if enabled && minimized {
            inner.saved.next_wake_ms = Some(now_ms());
            inner.last_wake_ms = now_ms() - MIN_GAP_MS;
        }
    }
    let _ = sync_tray(app, enabled);

    if !(enabled && minimized) {
        open_main(app, true);
    }

    let app = app.clone();
    thread::spawn(move || loop {
        thread::sleep(CHECK_EVERY);
        tick(&app);
    });
}

#[tauri::command]
pub fn set_background_mode(app: AppHandle, enabled: bool) -> Result<(), String> {
    if let Ok(mut inner) = app.state::<Background>().0.lock() {
        if inner.saved.enabled != enabled {
            inner.saved.enabled = enabled;
            persist(&inner);
        }
    }
    sync_tray(&app, enabled)
}

#[tauri::command]
pub fn set_start_at_login(app: AppHandle, enabled: bool) -> Result<(), String> {
    let autostart = app.autolaunch();
    let registered = autostart.is_enabled().unwrap_or(false);
    if enabled && !registered {
        autostart.enable().map_err(|e| format!("Could not start Invoicer at sign-in: {e}"))?;
    } else if !enabled && registered {
        autostart.disable().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// The app says when it next has something to do.
#[tauri::command]
pub fn background_next_wake(app: AppHandle, at_ms: Option<i64>) {
    if let Ok(mut inner) = app.state::<Background>().0.lock() {
        if inner.saved.next_wake_ms != at_ms {
            inner.saved.next_wake_ms = at_ms;
            persist(&inner);
        }
    }
}

/// The app finished a background pass. A hidden run closes its web view.
#[tauri::command]
pub fn background_pass_done(app: AppHandle) {
    let Some(window) = app.get_webview_window(MAIN) else { return };
    let state = app.state::<Background>();
    let close = {
        let Ok(mut inner) = state.0.lock() else { return };
        let close = inner.hidden_run_since.is_some() && !window.is_visible().unwrap_or(true);
        if close {
            inner.hidden_run_since = None;
        }
        close
    };
    if close {
        let _ = window.destroy();
    }
}

/// Closing the window in background mode: if the app is busy (sending), hide
/// it and let it finish first; the app then calls `background_pass_done`.
pub fn on_close_requested(window: &tauri::Window, api: &tauri::CloseRequestApi) {
    use tauri::Emitter;
    let app = window.app_handle();
    let state = app.state::<Background>();
    let Ok(mut inner) = state.0.lock() else { return };
    if !inner.saved.enabled {
        return;
    }
    api.prevent_close();
    let _ = window.hide();
    inner.hidden_run_since = Some(now_ms());
    drop(inner);
    let _ = window.emit("background-closing", ());
}
