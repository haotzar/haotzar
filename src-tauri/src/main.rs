// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, GlobalShortcutManager};
use std::path::PathBuf;

// Command לקבלת נתיב AppData
#[tauri::command]
fn get_app_data_path(app: tauri::AppHandle) -> Result<String, String> {
    app.path_resolver()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Failed to get app data path".to_string())
}

// Command לקבלת נתיב books
#[tauri::command]
fn get_books_path(app: tauri::AppHandle) -> Result<String, String> {
    let app_data = app.path_resolver()
        .app_data_dir()
        .ok_or_else(|| "Failed to get app data path".to_string())?;
    
    let books_path = app_data.join("books");
    
    // צור את התיקייה אם היא לא קיימת
    if !books_path.exists() {
        std::fs::create_dir_all(&books_path)
            .map_err(|e| format!("Failed to create books directory: {}", e))?;
    }
    
    Ok(books_path.to_string_lossy().to_string())
}

// Command לסריקת קבצים בתיקייה
#[tauri::command]
fn scan_folder(path: String) -> Result<Vec<FileInfo>, String> {
    use std::fs;
    
    let mut files = Vec::new();
    let mut file_count = 0;
    const MAX_FILES: usize = 10000;
    
    fn scan_dir(dir: &PathBuf, files: &mut Vec<FileInfo>, file_count: &mut usize, depth: usize) -> Result<(), String> {
        if depth > 8 || *file_count >= MAX_FILES {
            return Ok(());
        }
        
        let entries = fs::read_dir(dir)
            .map_err(|e| format!("Failed to read directory: {}", e))?;
        
        for entry in entries {
            if *file_count >= MAX_FILES {
                break;
            }
            
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();
            
            // דלג על תיקיות מערכת
            if file_name.starts_with('.') || file_name == "node_modules" {
                continue;
            }
            
            if path.is_dir() {
                scan_dir(&path, files, file_count, depth + 1)?;
            } else if path.is_file() {
                if let Some(ext) = path.extension() {
                    let ext_str = ext.to_string_lossy().to_lowercase();
                    if ext_str == "pdf" || ext_str == "txt" {
                        let name = path.file_stem()
                            .map(|s| s.to_string_lossy().to_string())
                            .unwrap_or_default();
                        
                        files.push(FileInfo {
                            id: format!("file_{}", file_count),
                            name,
                            path: path.to_string_lossy().to_string(),
                            file_type: if ext_str == "pdf" { "pdf".to_string() } else { "text".to_string() },
                        });
                        
                        *file_count += 1;
                    }
                }
            }
        }
        
        Ok(())
    }
    
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    
    scan_dir(&path_buf, &mut files, &mut file_count, 0)?;
    
    Ok(files)
}

#[derive(serde::Serialize)]
struct FileInfo {
    id: String,
    name: String,
    path: String,
    #[serde(rename = "type")]
    file_type: String,
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_app_data_path,
            get_books_path,
            scan_folder
        ])
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
            println!("✅ Tauri commands registered: get_app_data_path, get_books_path, scan_folder");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
