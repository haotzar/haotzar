# בדיקת DevTools ב-Tauri

## 🧪 מדריך בדיקה מהיר

### שלב 1: וודא שהקוד מעודכן

בדוק ש-`src-tauri/Cargo.toml` מכיל:
```toml
[dependencies]
tauri = { 
  version = "1.6", 
  features = [
    "dialog-all", 
    "fs-all", 
    "path-all", 
    "protocol-asset", 
    "shell-open", 
    "devtools",           # ← חשוב!
    "global-shortcut"     # ← חשוב!
  ] 
}
```

### שלב 2: נקה ובנה מחדש

```bash
# נקה את ה-cache של Rust
cd src-tauri
cargo clean
cd ..

# בנה מחדש
npm run tauri:dev
```

### שלב 3: בדוק ב-Development

1. הרץ:
```bash
npm run tauri:dev
```

2. **DevTools אמור להיפתח אוטומטית!** ✅

3. אם לא נפתח, נסה:
   - לחץ **F12**
   - לחץ **Ctrl+Shift+I**
   - לחץ **Ctrl+Shift+J**

4. בדוק בטרמינל - אמורות להופיע הודעות:
```
🔧 DevTools opened automatically (debug mode)
✅ DevTools shortcuts registered: F12, Ctrl+Shift+I, Ctrl+Shift+J
```

### שלב 4: בדוק ב-Production

1. בנה את האפליקציה:
```bash
npm run tauri:build
```

2. המתן לסיום הבנייה (יכול לקחת כמה דקות)

3. הקובץ המבוצע יהיה ב:
```
src-tauri/target/release/bundle/msi/haotzar_1.0.0_x64_en-US.msi
```
או
```
src-tauri/target/release/bundle/nsis/haotzar_1.0.0_x64-setup.exe
```

4. התקן את האפליקציה

5. פתח את האפליקציה

6. **לחץ F12** - DevTools אמור להיפתח! ✅

### שלב 5: בדיקת קיצורי מקלדת

נסה את כל הקיצורים:

1. **F12** - אמור לפתוח/לסגור את DevTools
2. **Ctrl+Shift+I** - אמור לפתוח/לסגור את DevTools
3. **Ctrl+Shift+J** - אמור לפתוח/לסגור את DevTools

### שלב 6: בדיקת כלי הדיבוג

בקונסול של DevTools, הקלד:

```javascript
// בדוק שהכלים זמינים
window.devtools

// הדפס מידע דיבוג
window.devtools.info()

// בדוק זיכרון
window.devtools.checkMemory()
```

## 🐛 פתרון בעיות

### DevTools לא נפתח ב-Development

**בעיה:** DevTools לא נפתח אוטומטית

**פתרון:**
1. בדוק שאתה ב-debug mode (לא release)
2. בדוק בטרמינל אם יש שגיאות
3. נסה לנקות ולבנות מחדש:
```bash
cd src-tauri
cargo clean
cd ..
npm run tauri:dev
```

### קיצורי מקלדת לא עובדים

**בעיה:** F12 או Ctrl+Shift+I לא פותחים את DevTools

**פתרון:**
1. בדוק ב-`Cargo.toml` שיש `global-shortcut` feature
2. בדוק ב-`tauri.conf.json` שיש:
```json
"globalShortcut": {
  "all": true
}
```
3. בדוק בטרמינל אם יש הודעת שגיאה:
```
⚠️ Failed to register F12 shortcut: ...
```

### שגיאת Compilation

**בעיה:** שגיאה בזמן `cargo build`

**פתרון:**
1. וודא ש-Rust מעודכן:
```bash
rustup update
```

2. נקה את ה-cache:
```bash
cd src-tauri
cargo clean
cargo update
cd ..
```

3. נסה שוב:
```bash
npm run tauri:dev
```

### DevTools לא נפתח ב-Production

**בעיה:** DevTools לא נפתח באפליקציה שנבנתה

**אפשרויות:**

1. **וודא שבנית עם הקוד המעודכן:**
```bash
# נקה הכל
cd src-tauri
cargo clean
cd ..

# בנה מחדש
npm run tauri:build
```

2. **בדוק שה-features נכללו בבנייה:**
   - פתח את `src-tauri/target/release/haotzar.exe` בטרמינל
   - אמורות להופיע הודעות על רישום קיצורי מקלדת

3. **אם עדיין לא עובד, בנה עם debug:**
```bash
npm run tauri:build:debug
```

## 📊 תוצאות צפויות

### ✅ הצלחה

אם הכל עובד, אתה אמור לראות:

1. **ב-Development:**
   - DevTools נפתח אוטומטית
   - בטרמינל: `🔧 DevTools opened automatically`
   - בטרמינל: `✅ DevTools shortcuts registered`

2. **ב-Production:**
   - F12 פותח את DevTools
   - Ctrl+Shift+I פותח את DevTools
   - Ctrl+Shift+J פותח את DevTools

3. **בקונסול:**
   - `window.devtools` מוגדר
   - `window.devtools.info()` מדפיס מידע

### ❌ כישלון

אם משהו לא עובד:

1. בדוק את הלוגים בטרמינל
2. בדוק ש-`Cargo.toml` מעודכן
3. בדוק ש-`tauri.conf.json` מעודכן
4. נקה ובנה מחדש
5. פתח issue ב-GitHub עם הלוגים

## 💡 טיפים

1. **בזמן פיתוח**, DevTools נפתח אוטומטית - זה נורמלי!

2. **אם אתה לא רוצה שיפתח אוטומטית**, הסר את הקוד:
```rust
#[cfg(debug_assertions)]
{
    window.open_devtools();
}
```

3. **לדיבוג מתקדם**, השתמש ב:
```bash
RUST_LOG=debug npm run tauri:dev
```

4. **לבדיקת גודל הבנייה:**
```bash
cd src-tauri/target/release
ls -lh haotzar.exe
```

## 🎯 סיכום

אם עברת את כל השלבים והכל עובד - **מזל טוב!** 🎉

עכשיו יש לך DevTools מלא גם ב-Tauri, גם בפיתוח וגם ב-production!

---

**זכור:** אם משהו לא עובד, תמיד אפשר לחזור ל-Electron שבו DevTools עובד בוודאות.
