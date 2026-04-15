// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, GlobalShortcutManager};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            
            // פתח DevTools אוטומטית בפיתוח
            #[cfg(debug_assertions)]
            {
                window.open_devtools();
                println!("🔧 DevTools opened automatically (debug mode)");
            }

            // רישום קיצורי מקלדת גלובליים ל-DevTools
            let mut shortcut_manager = app.global_shortcut_manager();
            
            // F12 - פתיחה/סגירה של DevTools
            let window_clone = window.clone();
            shortcut_manager
                .register("F12", move || {
                    if window_clone.is_devtools_open() {
                        window_clone.close_devtools();
                        println!("🔧 DevTools closed (F12)");
                    } else {
                        window_clone.open_devtools();
                        println!("🔧 DevTools opened (F12)");
                    }
                })
                .unwrap_or_else(|e| {
                    eprintln!("⚠️ Failed to register F12 shortcut: {}", e);
                });

            // Ctrl+Shift+I - פתיחה/סגירה של DevTools
            let window_clone = window.clone();
            shortcut_manager
                .register("Ctrl+Shift+I", move || {
                    if window_clone.is_devtools_open() {
                        window_clone.close_devtools();
                        println!("🔧 DevTools closed (Ctrl+Shift+I)");
                    } else {
                        window_clone.open_devtools();
                        println!("🔧 DevTools opened (Ctrl+Shift+I)");
                    }
                })
                .unwrap_or_else(|e| {
                    eprintln!("⚠️ Failed to register Ctrl+Shift+I shortcut: {}", e);
                });

            // Ctrl+Shift+J - פתיחה/סגירה של DevTools (Chrome style)
            let window_clone = window.clone();
            shortcut_manager
                .register("Ctrl+Shift+J", move || {
                    if window_clone.is_devtools_open() {
                        window_clone.close_devtools();
                        println!("🔧 DevTools closed (Ctrl+Shift+J)");
                    } else {
                        window_clone.open_devtools();
                        println!("🔧 DevTools opened (Ctrl+Shift+J)");
                    }
                })
                .unwrap_or_else(|e| {
                    eprintln!("⚠️ Failed to register Ctrl+Shift+J shortcut: {}", e);
                });

            println!("✅ DevTools shortcuts registered: F12, Ctrl+Shift+I, Ctrl+Shift+J");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
