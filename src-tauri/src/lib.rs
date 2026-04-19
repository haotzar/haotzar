// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use std::path::PathBuf;
use std::process::{Command, Child};
use std::sync::Mutex;

// מצב גלובלי לשמירת תהליך Meilisearch
struct MeilisearchState {
    process: Option<Child>,
}

// Command לקבלת נתיב AppData
#[tauri::command]
fn get_app_data_path(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Failed to get app data path: {}", e))
}

// Command לקבלת נתיב books
#[tauri::command]
fn get_books_path(app: tauri::AppHandle) -> Result<String, String> {
    let app_data = app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data path: {}", e))?;
    
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

// Command לסריקת מספר תיקיות בבת אחת
#[tauri::command]
fn scan_books_in_paths(paths: Vec<String>) -> Result<Vec<String>, String> {
    use std::fs;
    
    let mut all_files = Vec::new();
    let mut file_count = 0;
    const MAX_FILES: usize = 5000;
    
    fn scan_dir(dir: &PathBuf, files: &mut Vec<String>, file_count: &mut usize, depth: usize) -> Result<(), String> {
        if depth > 5 || *file_count >= MAX_FILES {
            return Ok(());
        }
        
        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return Ok(()), // דלג על תיקיות שאין גישה אליהן
        };
        
        for entry in entries {
            if *file_count >= MAX_FILES {
                break;
            }
            
            let entry = match entry {
                Ok(e) => e,
                Err(_) => continue,
            };
            
            let path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string().to_lowercase();
            
            // דלג על תיקיות מערכת
            if file_name.starts_with('.') || 
               file_name == "node_modules" || 
               file_name == "$recycle.bin" ||
               file_name == "system volume information" {
                continue;
            }
            
            if path.is_dir() {
                let _ = scan_dir(&path, files, file_count, depth + 1);
            } else if path.is_file() {
                if let Some(ext) = path.extension() {
                    let ext_str = ext.to_string_lossy().to_lowercase();
                    if ext_str == "pdf" || ext_str == "txt" {
                        files.push(path.to_string_lossy().to_string());
                        *file_count += 1;
                    }
                }
            }
        }
        
        Ok(())
    }
    
    let paths_count = paths.len(); // שמור את האורך לפני ה-move
    
    for path_str in paths {
        let path_buf = PathBuf::from(&path_str);
        if path_buf.exists() {
            let _ = scan_dir(&path_buf, &mut all_files, &mut file_count, 0);
        }
    }
    
    println!("📁 Scanned {} files from {} paths", all_files.len(), paths_count);
    
    Ok(all_files)
}

// Command להפעלת Meilisearch
#[tauri::command]
fn start_meilisearch(port: u16, app: tauri::AppHandle, state: tauri::State<Mutex<MeilisearchState>>) -> Result<serde_json::Value, String> {
    let mut meili_state = state.lock().unwrap();
    
    // בדוק אם כבר רץ
    if let Some(ref mut process) = meili_state.process {
        match process.try_wait() {
            Ok(None) => {
                // התהליך עדיין רץ
                return Ok(serde_json::json!({
                    "success": true,
                    "message": "Already running"
                }));
            }
            _ => {
                // התהליך נסגר
                meili_state.process = None;
            }
        }
    }
    
    // קבל נתיב AppData
    let app_data = app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data path: {}", e))?;
    
    let meili_dir = app_data.join("meilisearch");
    let meili_exe = meili_dir.join("meilisearch.exe");
    let db_path = meili_dir.join("data.ms");
    
    // אם הקובץ לא קיים ב-AppData, נסה למצוא אותו בתיקיית המקור
    let meili_exe_path = if meili_exe.exists() {
        meili_exe
    } else {
        // נסה למצוא את meilisearch.exe בתיקיית המקור (לפיתוח)
        let resource_dir = app.path()
            .resource_dir()
            .map_err(|e| format!("Failed to get resource dir: {}", e))?;
        
        let source_meili = resource_dir.join("meilisearch").join("meilisearch.exe");
        
        if source_meili.exists() {
            println!("📁 Using Meilisearch from resources: {}", source_meili.display());
            source_meili
        } else {
            return Err(format!("Meilisearch not found at: {} or {}", meili_exe.display(), source_meili.display()));
        }
    };
    
    // צור תיקיית data אם לא קיימת
    if !db_path.exists() {
        std::fs::create_dir_all(&db_path)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }
    
    // הפעל את Meilisearch
    let child = Command::new(&meili_exe_path)
        .arg("--db-path")
        .arg(&db_path)
        .arg("--http-addr")
        .arg(format!("127.0.0.1:{}", port))
        .arg("--no-analytics")
        .arg("--max-indexing-memory")
        .arg("1GB")
        .spawn()
        .map_err(|e| format!("Failed to start Meilisearch: {}", e))?;
    
    meili_state.process = Some(child);
    
    println!("✅ Meilisearch started on port {} from {}", port, meili_exe_path.display());
    
    Ok(serde_json::json!({
        "success": true,
        "message": "Started successfully"
    }))
}

// Command לעצירת Meilisearch
#[tauri::command]
fn stop_meilisearch(state: tauri::State<Mutex<MeilisearchState>>) -> Result<serde_json::Value, String> {
    let mut meili_state = state.lock().unwrap();
    
    if let Some(mut process) = meili_state.process.take() {
        let _ = process.kill();
        println!("🛑 Meilisearch stopped");
        
        Ok(serde_json::json!({
            "success": true
        }))
    } else {
        Ok(serde_json::json!({
            "success": true,
            "message": "Not running"
        }))
    }
}

// Command לפתיחת תיקיית books
#[tauri::command]
fn open_books_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    println!("📂 Opened folder: {}", path);
    Ok(())
}

// Command לקבלת נתיב DB של אוצריא
#[tauri::command]
fn get_otzaria_db_path(app: tauri::AppHandle) -> Result<String, String> {
    let app_data = app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data path: {}", e))?;
    
    let otzaria_path = app_data
        .join("books")
        .join("אוצריא")
        .join("seforim.db");
    
    Ok(otzaria_path.to_string_lossy().to_string())
}

// Command לקריאת קובץ טקסט
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    use std::fs;
    
    // בדוק שהקובץ קיים
    let file_path = PathBuf::from(&path);
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }
    
    // קרא את הקובץ
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    println!("📖 Read text file: {} ({} bytes)", path, content.len());
    
    Ok(content)
}

// Command לקריאת קובץ PDF כ-bytes
#[tauri::command]
fn read_pdf_file(path: String) -> Result<Vec<u8>, String> {
    use std::fs;
    
    // בדוק שהקובץ קיים
    let file_path = PathBuf::from(&path);
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }
    
    // קרא את הקובץ
    let content = fs::read(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    println!("📄 Read PDF file: {} ({} bytes)", path, content.len());
    
    Ok(content)
}

#[derive(serde::Serialize)]
struct FileInfo {
    id: String,
    name: String,
    path: String,
    #[serde(rename = "type")]
    file_type: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(Mutex::new(MeilisearchState { process: None }))
        .invoke_handler(tauri::generate_handler![
            get_app_data_path,
            get_books_path,
            scan_folder,
            scan_books_in_paths,
            start_meilisearch,
            stop_meilisearch,
            open_books_folder,
            get_otzaria_db_path,
            read_text_file,
            read_pdf_file
        ])
        .setup(|app| {
            #[cfg(desktop)]
            {
                let window = app.get_webview_window("main").unwrap();
                
                // פתח DevTools אוטומטית בפיתוח
                #[cfg(debug_assertions)]
                {
                    window.open_devtools();
                    println!("🔧 DevTools opened automatically (debug mode)");
                }

                println!("✅ Tauri commands registered:");
                println!("   - get_app_data_path");
                println!("   - get_books_path");
                println!("   - scan_folder");
                println!("   - scan_books_in_paths");
                println!("   - start_meilisearch");
                println!("   - stop_meilisearch");
                println!("   - open_books_folder");
                println!("   - get_otzaria_db_path");
                println!("   - read_text_file");
                println!("   - read_pdf_file");
            }

            #[cfg(mobile)]
            {
                println!("✅ Tauri mobile app initialized");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
