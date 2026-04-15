# תיקון שגיאות Tauri

## 🐛 שגיאות שתוקנו

### 1. ❌ `not implemented` - פונקציות חסרות

**שגיאה:**
```
שגיאה בקבלת נתיב books: not implemented
שגיאה בטעינת קבצים מ-AppData: not implemented
```

**סיבה:**  
הקוד JavaScript קרא לפונקציות Tauri שלא היו מוגדרות ב-Rust.

**פתרון:**  
הוספתי Rust commands ב-`src-tauri/src/main.rs`:

```rust
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
    // ... (קוד מלא בקובץ)
}
```

ורישום ה-commands:
```rust
.invoke_handler(tauri::generate_handler![
    get_app_data_path,
    get_books_path,
    scan_folder
])
```

---

### 2. ❌ `port is not defined` - שגיאה ב-Meilisearch

**שגיאה:**
```
❌ Error starting Meilisearch via Tauri: ReferenceError: port is not defined
```

**סיבה:**  
בקוד `src/utils/meilisearchEngine.js` היה:
```javascript
const result = await invoke('start_meilisearch', { port });
```

אבל המשתנה `port` לא היה מוגדר - צריך היה `this.serverPort`.

**פתרון:**  
תיקנתי ל:
```javascript
const result = await invoke('start_meilisearch', { port: this.serverPort });
```

---

### 3. ⚠️ אוצריא לא נטען

**שגיאה:**
```
⚠️ שגיאה בטעינת אוצריא ברקע: undefined
⚠️ אין חיבור ל-DB של אוצריא וגם הקובץ לא קיים
```

**סיבה:**  
הקוד מנסה לטעון את מסד הנתונים של אוצריא, אבל הוא לא קיים או לא מוגדר.

**פתרון:**  
זו לא שגיאה קריטית - האפליקציה ממשיכה לעבוד בלי אוצריא.  
אם רוצים אוצריא, צריך:
1. להוריד את `seforim.db` מאוצריא
2. לשים אותו ב-`books/אוצריא/seforim.db`
3. להגדיר את הנתיב בהגדרות

---

## 🔧 איך לבדוק שהתיקונים עובדים

### שלב 1: נקה ובנה מחדש

```bash
cd src-tauri
cargo clean
cd ..
npm run tauri:dev
```

### שלב 2: בדוק בקונסול

אמורות להופיע הודעות:
```
✅ Tauri commands registered: get_app_data_path, get_books_path, scan_folder
✅ DevTools shortcuts registered: F12, Ctrl+Shift+I, Ctrl+Shift+J
```

### שלב 3: בדוק שהקבצים נטענים

בקונסול של DevTools (F12), הקלד:
```javascript
// בדוק שהפונקציות עובדות
window.__TAURI__.tauri.invoke('get_app_data_path')
  .then(path => console.log('✅ App Data Path:', path))
  .catch(err => console.error('❌ Error:', err));

window.__TAURI__.tauri.invoke('get_books_path')
  .then(path => console.log('✅ Books Path:', path))
  .catch(err => console.error('❌ Error:', err));
```

אמור להדפיס נתיבים תקינים!

---

## 📊 תוצאות צפויות

### ✅ לפני התיקון:
```
❌ שגיאה בקבלת נתיב books: not implemented
❌ Error starting Meilisearch via Tauri: ReferenceError: port is not defined
⚠️ שגיאה בטעינת אוצריא ברקע: undefined
```

### ✅ אחרי התיקון:
```
✅ Tauri commands registered
✅ DevTools shortcuts registered
📁 Total scan paths: ['D:\\ספרים', 'D:\\ספרים\\מוסד הרב קוק']
📖 ספרים: ['', 'ברכת מרדכי - חנוכה']
✅ מטא-דאטה נטענה ברקע
```

---

## 🚀 פונקציות Tauri שהוספתי

| פונקציה | תיאור | שימוש |
|---------|-------|-------|
| `get_app_data_path` | מחזיר נתיב AppData | `invoke('get_app_data_path')` |
| `get_books_path` | מחזיר נתיב books | `invoke('get_books_path')` |
| `scan_folder` | סורק קבצים בתיקייה | `invoke('scan_folder', { path: 'D:\\ספרים' })` |

---

## 💡 טיפים

1. **אם עדיין יש שגיאות**, הרץ:
```bash
cd src-tauri
cargo clean
cargo update
cd ..
npm run tauri:dev
```

2. **לבדיקת הפונקציות**, פתח DevTools (F12) והקלד:
```javascript
window.__TAURI__.tauri.invoke('get_books_path')
```

3. **לוגים מפורטים**, הרץ:
```bash
RUST_LOG=debug npm run tauri:dev
```

---

## 📚 קבצים שעודכנו

1. ✅ `src-tauri/src/main.rs` - הוספתי Rust commands
2. ✅ `src/utils/platform.js` - עדכנתי להשתמש ב-commands החדשים
3. ✅ `src/utils/meilisearchEngine.js` - תיקנתי שגיאת `port is not defined`

---

**עכשיו Tauri אמור לעבוד בלי שגיאות!** 🎉
