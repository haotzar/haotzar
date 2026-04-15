# הגדרת דיבוג - Debugging Setup

## ✅ שינויים שבוצעו

### 1. Electron - תמיכה מלאה ב-DevTools

#### קיצורי מקלדת (עובד גם ב-production!)
- **F12** - פתיחה/סגירה של DevTools
- **Ctrl+Shift+I** - פתיחה/סגירה של DevTools
- **Ctrl+Shift+J** - פתיחה/סגירה של DevTools (Chrome style)

#### תפריט הקשר (Right-Click)
- **Inspect Element** - פתיחת DevTools במיקום מדויק
- **Open DevTools** - פתיחת DevTools
- **Reload** (Ctrl+R) - רענון האפליקציה

#### קוד שהתווסף ל-`electron/main.js`:

```javascript
// קיצורי מקלדת
mainWindow.webContents.on('before-input-event', (event, input) => {
  // F12
  if (input.key === 'F12') {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools();
    }
  }
  // Ctrl+Shift+I
  if (input.control && input.shift && input.key === 'I') {
    // ...
  }
  // Ctrl+Shift+J
  if (input.control && input.shift && input.key === 'J') {
    // ...
  }
});

// תפריט הקשר
mainWindow.webContents.on('context-menu', (event, params) => {
  const { Menu, MenuItem } = require('electron');
  const menu = new Menu();
  
  menu.append(new MenuItem({
    label: 'Inspect Element',
    click: () => {
      mainWindow.webContents.inspectElement(params.x, params.y);
    }
  }));
  
  menu.append(new MenuItem({
    label: 'Open DevTools',
    accelerator: 'F12',
    click: () => {
      mainWindow.webContents.openDevTools();
    }
  }));
  
  menu.popup();
});
```

### 2. Tauri - תמיכה מלאה ב-DevTools

#### קיצורי מקלדת (עובד גם ב-production!)
- **F12** - פתיחה/סגירה של DevTools
- **Ctrl+Shift+I** - פתיחה/סגירה של DevTools
- **Ctrl+Shift+J** - פתיחה/סגירה של DevTools (Chrome style)

#### עדכון `src-tauri/Cargo.toml`:
הוספנו features:
```toml
tauri = { 
  version = "1.6", 
  features = [
    "dialog-all", 
    "fs-all", 
    "path-all", 
    "protocol-asset", 
    "shell-open", 
    "devtools",           # ← חדש!
    "global-shortcut"     # ← חדש!
  ] 
}
```

#### קוד שהתווסף ל-`src-tauri/src/main.rs`:

```rust
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

            // רישום קיצורי מקלדת גלובליים
            let mut shortcut_manager = app.global_shortcut_manager();
            
            // F12
            let window_clone = window.clone();
            shortcut_manager
                .register("F12", move || {
                    if window_clone.is_devtools_open() {
                        window_clone.close_devtools();
                    } else {
                        window_clone.open_devtools();
                    }
                })
                .unwrap_or_else(|e| {
                    eprintln!("⚠️ Failed to register F12 shortcut: {}", e);
                });

            // Ctrl+Shift+I
            // ... (אותו דבר)
            
            // Ctrl+Shift+J
            // ... (אותו דבר)
            
            println!("✅ DevTools shortcuts registered");
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### עדכון `src-tauri/tauri.conf.json`:
הוספנו הרשאות:
```json
"globalShortcut": {
  "all": true
},
"window": {
  "all": false,
  "close": true,
  "hide": true,
  "show": true,
  "maximize": true,
  "minimize": true,
  "unmaximize": true,
  "unminimize": true,
  "startDragging": true
}
```

### 3. כלי עזר לדיבוג - `src/utils/devtools.js`

קובץ חדש עם פונקציות דיבוג שימושיות:

```javascript
// זמין דרך window.devtools
window.devtools = {
  open: openDevTools,              // פתיחת DevTools
  info: printDebugInfo,            // הדפסת מידע דיבוג
  verbose: enableVerboseLogging,   // לוגים מפורטים עם timestamps
  measure: measurePerformance,     // מדידת ביצועים
  logError,                        // הדפסת שגיאות מפורטת
  checkMemory,                     // בדיקת זיכרון
  monitor: startPerformanceMonitoring, // ניטור ביצועים רציף
  dumpStorage: dumpLocalStorage,   // הדפסת localStorage
  clearStorage: clearLocalStorage  // ניקוי localStorage
};
```

#### דוגמאות שימוש:

```javascript
// בקונסול של DevTools:

// הדפסת מידע דיבוג
window.devtools.info();

// הפעלת לוגים מפורטים
window.devtools.verbose();

// בדיקת זיכרון
window.devtools.checkMemory();

// ניטור ביצועים (כל 5 שניות)
const stopMonitoring = window.devtools.monitor(5000);
// לעצירה:
stopMonitoring();

// הדפסת localStorage
window.devtools.dumpStorage();

// מדידת ביצועים של פונקציה
const myFunctionWithTiming = window.devtools.measure('myFunction', myFunction);
await myFunctionWithTiming();
```

### 4. מסמכים חדשים

#### `DEBUGGING.md`
מדריך מקיף לדיבוג:
- איך לפתוח DevTools
- טיפים לדיבוג
- פתרון בעיות נפוצות
- כלים מתקדמים

#### `DEBUGGING-SETUP.md` (קובץ זה)
תיעוד השינויים שבוצעו.

## 🚀 איך להשתמש

### בפיתוח (Development)

#### Electron:
```bash
npm run electron:dev
```
DevTools יהיה זמין דרך F12 או Ctrl+Shift+I

#### Tauri:
```bash
npm run tauri:dev
```
DevTools יפתח אוטומטית

### ב-Production Build

#### Electron:
```bash
npm run electron:build:win
```
אחרי ההתקנה, פתח את האפליקציה ולחץ **F12**

#### Tauri:
```bash
# בנייה רגילה (ללא DevTools)
npm run tauri:build

# בנייה עם DevTools (debug mode)
npm run tauri:build:debug
```

## 🎯 בדיקה מהירה

1. **בנה את האפליקציה:**
```bash
npm run electron:build:win
```

2. **התקן והרץ את האפליקציה**

3. **לחץ F12** - DevTools אמור להיפתח!

4. **בקונסול, הקלד:**
```javascript
window.devtools.info()
```

5. **אמור להדפיס מידע דיבוג מפורט** ✅

## 📝 הערות חשובות

### Electron
- ✅ DevTools עובד גם ב-production
- ✅ קיצורי מקלדת עובדים תמיד
- ✅ תפריט הקשר זמין תמיד

### Tauri
- ✅ DevTools עובד ב-development (נפתח אוטומטית)
- ✅ DevTools עובד ב-production (F12, Ctrl+Shift+I, Ctrl+Shift+J)
- ✅ קיצורי מקלדת גלובליים
- 💡 דורש `devtools` ו-`global-shortcut` features ב-Cargo.toml

### כלי הדיבוג (window.devtools)
- ✅ זמין בכל הפלטפורמות
- ✅ עובד גם ב-production
- ✅ לא משפיע על ביצועים (אלא אם מפעילים ניטור)

## 🐛 פתרון בעיות

### DevTools לא נפתח ב-Electron
1. וודא שבנית עם הקוד המעודכן
2. נסה Ctrl+Shift+I במקום F12
3. בדוק את הקונסול של הטרמינל לשגיאות

### DevTools לא נפתח ב-Tauri
1. וודא שאתה ב-development mode או debug build
2. ב-production, בנה עם: `npm run tauri:build:debug`
3. או השתמש ב-Electron לדיבוג

### window.devtools לא מוגדר
1. וודא ש-`src/utils/devtools.js` נטען
2. בדוק ב-`src/App.jsx` שיש: `import './utils/devtools';`
3. רענן את האפליקציה (Ctrl+R)

## 📚 קריאה נוספת

- [DEBUGGING.md](DEBUGGING.md) - מדריך דיבוג מקיף
- [PLATFORM-SUPPORT.md](PLATFORM-SUPPORT.md) - הבדלים בין פלטפורמות
- [Chrome DevTools Docs](https://developer.chrome.com/docs/devtools/)

---

**עכשיו אפשר לדבג בקלות! 🎉**
