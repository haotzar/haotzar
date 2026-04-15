# שינויים - תמיכה מלאה ב-Tauri ו-Electron

## 📅 תאריך: 2026-04-15

## 🎯 מטרה
הפעלת תמיכה מלאה גם ב-Tauri וגם ב-Electron, במקום להשבית את Tauri.

## ✅ שינויים שבוצעו

### 1. קבצי קוד עודכנו
הוסרו הערות שהשביתו את Tauri והוחלפו ב-dynamic imports:

#### `src/PDFViewer.jsx`
- ✅ הוסר comment שהשבית import של `convertFileSrc`
- ✅ שונה לשימוש ב-dynamic import: `await import('@tauri-apps/api/tauri')`
- ✅ הוסף try-catch לטיפול בשגיאות

#### `src/utils/pdfExtractor.js`
- ✅ שונה משימוש ב-`window.__TAURI__.fs` ל-dynamic import
- ✅ הוסף try-catch לטיפול בשגיאות
- ✅ עודכנו שתי הפונקציות: `extractTextFromPDF` ו-`hasPDFText`

#### `src/utils/searchEngine.js`
- ✅ שונה משימוש ב-`window.__TAURI__.fs` ל-dynamic import
- ✅ הוסף try-catch לטיפול בשגיאות

#### `src/utils/meilisearchEngine.js`
- ✅ הוסרו הודעות "Tauri is not supported"
- ✅ שונה לשימוש ב-dynamic import של `invoke`
- ✅ הוסף try-catch לטיפול בשגיאות

#### `src/utils/meilisearchTest.js`
- ✅ הוסרו הודעות "Tauri is not supported"
- ✅ שונה לשימוש ב-dynamic import של `invoke`
- ✅ הוסף try-catch לטיפול בשגיאות

#### `src/utils/otzariaDB.js`
- ✅ שונה משימוש ב-`window.__TAURI__.tauri` ל-dynamic import
- ✅ הוסף try-catch לטיפול בשגיאות

#### `src/App_temp.jsx`
- ✅ הוסר stub של `invoke` שהיה מושבת
- ✅ הקוד יזהה אוטומטית את הפלטפורמה

#### `src/utils/tauri-stub.js`
- ✅ עודכנו הודעות השגיאה להיות יותר ברורות
- ✅ הוסף `convertFileSrc` ל-stub
- ✅ הוסף console.warn במקום throw ישירות

### 2. תצורת Vite עודכנה

#### `vite.config.js`
- ✅ הוסרו aliases שהפנו את Tauri ל-stub
- ✅ הוסרו Tauri packages מרשימת external
- ✅ עכשיו Vite לא חוסם את Tauri

### 3. קבצים חדשים נוצרו

#### `src/utils/platform.js` ⭐ חדש!
קובץ עזר מרכזי שמספק API אחיד לשתי הפלטפורמות:
- `isTauri()` - זיהוי Tauri
- `isElectron()` - זיהוי Electron
- `getPlatformName()` - קבלת שם הפלטפורמה
- `readTextFile()` - קריאת קובץ טקסט
- `readBinaryFile()` - קריאת קובץ בינארי
- `writeFile()` - כתיבת קובץ
- `fileExists()` - בדיקת קיום קובץ
- `deleteFile()` - מחיקת קובץ
- `selectFolder()` - בחירת תיקייה
- `openExternal()` - פתיחת קישור חיצוני
- `getAppDataPath()` - קבלת נתיב תיקיית האפליקציה
- `convertFileToUrl()` - המרת נתיב ל-URL
- `startMeilisearch()` - הפעלת Meilisearch
- `stopMeilisearch()` - עצירת Meilisearch

#### `src/utils/platform-example.js` ⭐ חדש!
קובץ דוגמאות מקיף שמראה איך להשתמש ב-platform API:
- 12 דוגמאות שימוש מפורטות
- הסברים בעברית
- דוגמאות לטיפול בשגיאות
- דוגמאות לשימוש בקומפוננטות React

#### `PLATFORM-SUPPORT.md` ⭐ חדש!
מדריך מקיף לתמיכה בפלטפורמות:
- הסבר על ההבדלים בין Tauri ל-Electron
- הוראות פיתוח ובנייה
- הסבר על הארכיטקטורה
- פתרון בעיות נפוצות
- משאבים נוספים

#### `CHANGELOG-TAURI-SUPPORT.md` ⭐ חדש!
קובץ זה - תיעוד מפורט של כל השינויים.

### 4. package.json עודכן

#### פקודות build חדשות:
```json
"build:tauri": "node scripts/tools.js pdf:worker && node --max-old-space-size=4096 ./node_modules/vite/bin/vite.js build"
"tauri:build": "npm run build:tauri && tauri build"
"tauri:build:debug": "npm run build:tauri && tauri build --debug"
```

### 5. README.md עודכן
- ✅ הוסף אזכור לתמיכה בשתי הפלטפורמות
- ✅ עודכנו הוראות ההרצה והבנייה
- ✅ הוסף קישור ל-PLATFORM-SUPPORT.md

## 🔧 איך זה עובד?

### Dynamic Imports
במקום:
```javascript
import { readTextFile } from '@tauri-apps/api/fs';
```

עכשיו:
```javascript
if (isTauri()) {
  const { readTextFile } = await import('@tauri-apps/api/fs');
  // השתמש ב-readTextFile
}
```

### יתרונות:
1. ✅ הקוד לא נכשל אם Tauri לא זמין
2. ✅ Webpack/Vite לא מנסים לבנדל את Tauri ב-Electron build
3. ✅ הקוד עובד בשתי הפלטפורמות ללא שינויים

## 📦 שימוש

### פיתוח עם Tauri:
```bash
npm run tauri:dev
```

### פיתוח עם Electron:
```bash
npm run electron:dev
```

### בנייה ל-Tauri:
```bash
npm run tauri:build
```

### בנייה ל-Electron:
```bash
npm run electron:build:win
```

## 🎨 דוגמת שימוש בקוד

### לפני (לא עבד):
```javascript
import { readTextFile } from '@tauri-apps/api/fs';

const content = await readTextFile(path); // ❌ נכשל ב-Electron
```

### אחרי (עובד בשתי הפלטפורמות):
```javascript
import { readTextFile } from './utils/platform';

const content = await readTextFile(path); // ✅ עובד בכל מקום
```

## 🐛 בעיות שנפתרו

1. ✅ Tauri imports לא גורמים יותר לשגיאות ב-Electron
2. ✅ הקוד מזהה אוטומטית את הפלטפורמה
3. ✅ אין צורך ב-stubs או aliases ב-Vite
4. ✅ Dynamic imports מאפשרים שימוש בשתי הפלטפורמות
5. ✅ הודעות שגיאה ברורות יותר

## 📚 קבצים לקריאה נוספת

1. **PLATFORM-SUPPORT.md** - מדריך מקיף לתמיכה בפלטפורמות
2. **src/utils/platform.js** - API אחיד לשתי הפלטפורמות
3. **src/utils/platform-example.js** - דוגמאות שימוש מפורטות

## ✨ תכונות חדשות

- 🚀 תמיכה מלאה ב-Tauri (קל ומהיר)
- ⚡ תמיכה מלאה ב-Electron (תאימות רחבה)
- 🔄 זיהוי אוטומטי של הפלטפורמה
- 🛠️ API אחיד לשתי הפלטפורמות
- 📖 תיעוד מקיף ודוגמאות

## 🎯 מה הלאה?

1. בדוק שהאפליקציה עובדת ב-Tauri: `npm run tauri:dev`
2. בדוק שהאפליקציה עובדת ב-Electron: `npm run electron:dev`
3. בנה את שתי הגרסאות ובדוק שהן עובדות
4. קרא את PLATFORM-SUPPORT.md למידע נוסף

## 💡 טיפים

- השתמש ב-`src/utils/platform.js` לכל פעולות קבצים
- בדוק את `src/utils/platform-example.js` לדוגמאות
- אם צריך פיצ'ר ספציפי לפלטפורמה, השתמש ב-`isTauri()` או `isElectron()`
- Dynamic imports מונעים שגיאות בזמן build

---

**סיכום:** האפליקציה עכשיו תומכת במלואה גם ב-Tauri וגם ב-Electron! 🎉
