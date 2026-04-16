# בדיקת תיקון PDF.js

## בדיקות לביצוע

### 1. בדיקה בסיסית - Development

```bash
npm run tauri:dev
```

**מה לבדוק:**
- [ ] האפליקציה נפתחת ללא שגיאות
- [ ] אין שגיאות CSP בקונסול
- [ ] אין שגיאות MIME type בקונסול

### 2. בדיקה בסיסית - Production

```bash
npm run tauri:build
```

**מה לבדוק:**
- [ ] ה-build מסתיים בהצלחה
- [ ] האפליקציה המותקנת נפתחת
- [ ] אין שגיאות בקונסול

### 3. בדיקת PDF Viewer

**צעדים:**
1. פתח את האפליקציה
2. נווט לתיקיית ספרים
3. לחץ על קובץ PDF

**מה לבדוק:**
- [ ] ה-PDF נפתח בתוך האפליקציה
- [ ] העמודים מוצגים נכון
- [ ] אפשר לגלול בין עמודים
- [ ] תוכן העניינים (outline) עובד

**בקונסול (F12):**
```
✅ PDF.js loaded successfully
✅ Worker נטען בהצלחה מ: https://tauri.localhost/pdfjs/build/pdf.worker.mjs
```

### 4. בדיקת תמונות ממוזערות

**צעדים:**
1. פתח את האפליקציה
2. הסתכל על "ספרים אחרונים"

**מה לבדוק:**
- [ ] תמונות ממוזערות של PDFs מוצגות
- [ ] אין שגיאות worker בקונסול

**בקונסול:**
```
🔧 מנסה לאתחל PDF.js worker...
✅ Worker נטען בהצלחה מ: /pdfjs/build/pdf.worker.mjs
```

### 5. בדיקת חיפוש ב-PDF

**צעדים:**
1. פתח PDF
2. לחץ Ctrl+F
3. חפש מילה

**מה לבדוק:**
- [ ] תיבת החיפוש נפתחת
- [ ] החיפוש עובד
- [ ] התוצאות מסומנות

### 6. בדיקת שגיאות ידועות

**פתח DevTools (F12) וחפש:**

❌ **לא אמור להיות:**
```
Failed to load module script
MIME type of "text/html"
Applying inline style violates CSP
Cannot destructure property 'AbortException'
```

✅ **אמור להיות:**
```
✅ PDF.js loaded successfully
✅ Worker נטען בהצלחה
🦀 Tauri production mode - worker path: ...
```

## בדיקות מתקדמות

### בדיקת נתיבים

**בקונסול של viewer.html:**
```javascript
// בדוק את ה-origin
console.log('Origin:', window.location.origin);
// Expected: https://tauri.localhost

// בדוק את נתיב ה-worker
console.log('Worker:', window.AppOptions.workerSrc);
// Expected: https://tauri.localhost/pdfjs/build/pdf.worker.mjs

// בדוק אם pdfjsLib קיים
console.log('pdfjsLib:', typeof globalThis.pdfjsLib);
// Expected: object
```

### בדיקת קבצים

**וודא שהקבצים קיימים ב-dist:**
```
dist/
  pdfjs/
    build/
      pdf.mjs
      pdf.worker.mjs
    web/
      viewer.html
      viewer-config.js
      pdf-loader.js
  pdf.worker.min.mjs
```

### בדיקת CSP

**בקונסול הראשי:**
```javascript
// בדוק את ה-CSP
const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
console.log('CSP meta tag:', meta);
// Expected: null (אין meta tag, Tauri מנהל)
```

## תוצאות צפויות

### Development Mode
- Origin: `http://localhost:5173`
- Worker: `/pdfjs/build/pdf.worker.mjs`
- PDF.js: נטען מ-Vite dev server

### Production Mode
- Origin: `https://tauri.localhost`
- Worker: `https://tauri.localhost/pdfjs/build/pdf.worker.mjs`
- PDF.js: נטען מ-dist

## אם יש בעיות

### שגיאה: "Failed to load module script"

**פתרון:**
1. בדוק שקובץ pdf.mjs קיים ב-`dist/pdfjs/build/`
2. בדוק את הנתיב בקונסול
3. נסה לפתוח את הנתיב ישירות בדפדפן

### שגיאה: "Worker failed to load"

**פתרון:**
1. בדוק שקובץ pdf.worker.mjs קיים
2. בדוק את window.AppOptions.workerSrc
3. נסה את ה-fallback: `/pdf.worker.min.mjs`

### שגיאה: "CSP violation"

**פתרון:**
1. בדוק את src-tauri/tauri.conf.json
2. וודא שאין meta tag CSP ב-index.html
3. וודא שיש `https:` ב-CSP directives

## סיכום

אם כל הבדיקות עברו בהצלחה:
- ✅ PDF.js עובד ב-Tauri
- ✅ אין שגיאות CSP
- ✅ Worker נטען נכון
- ✅ PDFs נפתחים ומוצגים

**התיקון הושלם בהצלחה! 🎉**
