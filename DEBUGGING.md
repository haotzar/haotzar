# מדריך דיבוג - Debugging Guide

## 🔍 איך לפתוח DevTools באפליקציה שנבנתה

### Electron

#### שיטה 1: קיצורי מקלדת (מומלץ)
- **F12** - פתיחה/סגירה של DevTools
- **Ctrl+Shift+I** - פתיחה/סגירה של DevTools
- **Ctrl+Shift+J** - פתיחה/סגירה של DevTools (Chrome style)

#### שיטה 2: תפריט הקשר (Right-Click)
1. לחץ ימני בכל מקום באפליקציה
2. בחר **"Inspect Element"** - יפתח את DevTools במיקום המדויק
3. או בחר **"Open DevTools"** - יפתח את DevTools

#### שיטה 3: Reload
- **Ctrl+R** - רענון האפליקציה (שימושי אחרי שינויים)

### Tauri

#### בפיתוח (Development)
DevTools נפתח אוטומטית כשמריצים:
```bash
npm run tauri:dev
```

#### ב-Production Build
**עכשיו זה עובד!** 🎉

קיצורי מקלדת:
- **F12** - פתיחה/סגירה של DevTools
- **Ctrl+Shift+I** - פתיחה/סגירה של DevTools
- **Ctrl+Shift+J** - פתיחה/סגירה של DevTools

בנה את האפליקציה:
```bash
npm run tauri:build
```

אחרי ההתקנה, פתח את האפליקציה ולחץ **F12** - DevTools יפתח!

## 🐛 טיפים לדיבוג

### 1. בדיקת Console Logs
```javascript
console.log('🔍 Debug info:', data);
console.error('❌ Error:', error);
console.warn('⚠️ Warning:', warning);
```

### 2. בדיקת Network Requests
1. פתח DevTools (F12)
2. עבור ל-**Network** tab
3. רענן את האפליקציה (Ctrl+R)
4. בדוק את כל הבקשות

### 3. בדיקת Elements/DOM
1. פתח DevTools (F12)
2. עבור ל-**Elements** tab
3. או לחץ ימני על אלמנט ובחר **"Inspect Element"**

### 4. בדיקת Storage/LocalStorage
1. פתח DevTools (F12)
2. עבור ל-**Application** tab (Electron) או **Storage** tab
3. בדוק את LocalStorage, SessionStorage, IndexedDB

### 5. בדיקת Performance
1. פתח DevTools (F12)
2. עבור ל-**Performance** tab
3. לחץ על Record
4. בצע פעולות באפליקציה
5. עצור את ה-Recording וניתח

## 🔧 דיבוג בעיות נפוצות

### בעיה: האפליקציה לא נטענת
**פתרון:**
1. פתח DevTools (F12)
2. בדוק את ה-Console לשגיאות
3. בדוק את ה-Network tab לבקשות כושלות

### בעיה: קבצים לא נטענים
**פתרון:**
1. פתח DevTools (F12)
2. בדוק את ה-Console לשגיאות CORS או 404
3. בדוק את ה-Network tab לראות את הנתיבים המבוקשים

### בעיה: Meilisearch לא עובד
**פתרון:**
1. פתח DevTools (F12)
2. בדוק את ה-Console לשגיאות חיבור
3. בדוק ב-Network tab אם יש בקשות ל-http://127.0.0.1:7700
4. הרץ בטרמינל:
```bash
curl http://127.0.0.1:7700/health
```

### בעיה: PDF לא נפתח
**פתרון:**
1. פתח DevTools (F12)
2. בדוק את ה-Console לשגיאות
3. בדוק ב-Network tab את הבקשה לקובץ ה-PDF
4. וודא שהנתיב נכון

## 📝 לוגים מתקדמים

### הוספת לוגים מפורטים
```javascript
// בתחילת הפונקציה
console.log('🚀 Function started:', functionName);

// לפני פעולה חשובה
console.log('📝 About to do something:', data);

// אחרי פעולה
console.log('✅ Operation completed:', result);

// במקרה של שגיאה
console.error('❌ Error occurred:', error);
console.error('Stack trace:', error.stack);
```

### שימוש ב-debugger
```javascript
function myFunction() {
  debugger; // האפליקציה תעצור כאן אם DevTools פתוח
  // ... קוד
}
```

## 🎯 דיבוג ספציפי לפלטפורמה

### Electron
```javascript
// בדיקה אם רצים ב-Electron
if (window.electron) {
  console.log('🔌 Running in Electron');
  console.log('User Data Path:', window.electron.getUserDataPath());
  console.log('App Path:', window.electron.getAppPath());
}
```

### Tauri
```javascript
// בדיקה אם רצים ב-Tauri
if (window.__TAURI__) {
  console.log('🦀 Running in Tauri');
  // השתמש ב-Tauri API
}
```

## 🛠️ כלים נוספים

### 1. React DevTools
אם DevTools פתוח, React DevTools יופיע אוטומטית (אם מותקן).

### 2. Redux DevTools
אם משתמשים ב-Redux, התקן את Redux DevTools Extension.

### 3. Network Throttling
1. פתח DevTools (F12)
2. עבור ל-**Network** tab
3. בחר **"Slow 3G"** או **"Fast 3G"** כדי לדמות חיבור איטי

### 4. Device Emulation
1. פתח DevTools (F12)
2. לחץ על **Toggle Device Toolbar** (Ctrl+Shift+M)
3. בחר מכשיר או גודל מסך מותאם

## 📚 משאבים נוספים

- [Chrome DevTools Documentation](https://developer.chrome.com/docs/devtools/)
- [Electron Debugging Guide](https://www.electronjs.org/docs/latest/tutorial/debugging-main-process)
- [Tauri Debugging Guide](https://tauri.app/v1/guides/debugging/)

## 💡 טיפים מתקדמים

### 1. שמירת לוגים לקובץ
```javascript
// ב-Electron
const fs = require('fs');
const logPath = window.electron.joinPath(
  window.electron.getUserDataPath(),
  'app.log'
);

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // הדפס לקונסול
  console.log(message);
  
  // שמור לקובץ
  window.electron.writeFile(logPath, logMessage);
}
```

### 2. בדיקת זיכרון
1. פתח DevTools (F12)
2. עבור ל-**Memory** tab
3. לחץ על **"Take snapshot"**
4. בצע פעולות באפליקציה
5. קח snapshot נוסף והשווה

### 3. בדיקת CPU Usage
1. פתח DevTools (F12)
2. עבור ל-**Performance** tab
3. לחץ על Record
4. בצע פעולות באפליקציה
5. עצור ובדוק את ה-flame chart

---

**זכור:** DevTools הוא החבר הכי טוב שלך בדיבוג! 🔍
