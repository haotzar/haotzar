# תמיכה בפלטפורמות - Platform Support

האפליקציה תומכת בשתי פלטפורמות דסקטופ: **Tauri** ו-**Electron**.

## 🚀 הבדלים בין הפלטפורמות

### Tauri
- **יתרונות:**
  - גודל קובץ קטן יותר (~10-15 MB)
  - צריכת זיכרון נמוכה יותר
  - ביצועים מהירים יותר
  - אבטחה גבוהה יותר
- **חסרונות:**
  - דורש Rust מותקן לפיתוח
  - זמן build ארוך יותר
  - תמיכה מוגבלת יותר בפלטפורמות ישנות

### Electron
- **יתרונות:**
  - תמיכה רחבה בפלטפורמות
  - קל יותר לפיתוח
  - אקוסיסטם עשיר של plugins
- **חסרונות:**
  - גודל קובץ גדול יותר (~150-200 MB)
  - צריכת זיכרון גבוהה יותר
  - ביצועים איטיים יותר

## 📦 פיתוח (Development)

### Tauri
```bash
npm run tauri:dev
```

### Electron
```bash
npm run electron:dev
```

## 🏗️ בנייה (Build)

### Tauri
```bash
# בנייה רגילה
npm run tauri:build

# בנייה עם debug
npm run tauri:build:debug
```

הקובץ המבוצע יווצר ב: `src-tauri/target/release/bundle/`

### Electron
```bash
# בנייה רגילה
npm run electron:build

# בנייה ל-Windows בלבד
npm run electron:build:win

# בנייה כ-portable (ללא התקנה)
npm run electron:build:portable
```

הקובץ המבוצע יווצר ב: `release/`

## 🔧 ארכיטקטורה

### זיהוי פלטפורמה
הקוד מזהה אוטומטית את הפלטפורמה בזמן ריצה:

```javascript
import { isTauri, isElectron, getPlatformName } from './utils/platform';

if (isTauri()) {
  // קוד ספציפי ל-Tauri
} else if (isElectron()) {
  // קוד ספציפי ל-Electron
}
```

### API אחיד
הקובץ `src/utils/platform.js` מספק API אחיד לשתי הפלטפורמות:

```javascript
import { 
  readTextFile, 
  readBinaryFile, 
  writeFile, 
  fileExists,
  selectFolder,
  openExternal 
} from './utils/platform';

// הקוד יעבוד אוטומטית בשתי הפלטפורמות
const content = await readTextFile('path/to/file.txt');
```

### Dynamic Imports
הקוד משתמש ב-dynamic imports כדי לטעון את Tauri API רק כשהוא זמין:

```javascript
if (isTauri()) {
  const { readTextFile } = await import('@tauri-apps/api/fs');
  const content = await readTextFile(filePath);
}
```

## 🛠️ הגדרות נוספות

### Tauri Configuration
קובץ התצורה: `src-tauri/tauri.conf.json`

הרשאות מוגדרות:
- `fs.all: true` - גישה מלאה למערכת קבצים
- `dialog.all: true` - דיאלוגים לבחירת קבצים
- `shell.open: true` - פתיחת קישורים חיצוניים
- `protocol.asset: true` - גישה לקבצים דרך פרוטוקול asset

### Electron Configuration
קובץ התצורה: `electron/main.js`

API חשוף דרך: `electron/preload.js`

## 📝 הוספת פיצ'רים חדשים

כשמוסיפים פיצ'ר חדש שדורש גישה למערכת:

1. **הוסף ל-Tauri:**
   - עדכן `src-tauri/tauri.conf.json` עם הרשאות נדרשות
   - הוסף Rust command ב-`src-tauri/src/main.rs` אם נדרש

2. **הוסף ל-Electron:**
   - עדכן `electron/preload.js` עם הפונקציה החדשה
   - הוסף IPC handler ב-`electron/main.js` אם נדרש

3. **הוסף ל-platform.js:**
   - צור פונקציה אחידה ב-`src/utils/platform.js`
   - הפונקציה תזהה את הפלטפורמה ותקרא ל-API המתאים

## 🐛 בעיות נפוצות

### Tauri לא עובד
- וודא ש-Rust מותקן: `rustc --version`
- וודא ש-Tauri CLI מותקן: `cargo install tauri-cli`
- נקה את ה-cache: `cd src-tauri && cargo clean`

### Electron לא עובד
- נקה את node_modules: `rm -rf node_modules && npm install`
- בנה מחדש native modules: `npm rebuild`

### שתי הפלטפורמות לא עובדות
- וודא שהקוד משתמש ב-dynamic imports ולא static imports
- בדוק שהקוד בודק את הפלטפורמה לפני שימוש ב-API
- השתמש ב-`src/utils/platform.js` במקום גישה ישירה ל-API

## 📚 משאבים נוספים

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [קובץ platform.js](src/utils/platform.js) - API אחיד לשתי הפלטפורמות
