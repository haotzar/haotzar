# מדריך למפתחים - האוצר

## 📁 מבנה הפרויקט

```
src/
├── components/          # כל הקומפוננטות של האפליקציה
│   ├── LibraryHome.jsx  # דף הבית
│   ├── LibrarySidebar.jsx # סיידבר הספרייה
│   ├── ToolsPage.jsx    # דף הכלים
│   └── ...              # קומפוננטות נוספות
├── hooks/               # Custom Hooks
│   ├── useTabsManager.js    # ניהול כרטיסיות
│   ├── useWorkspaces.js     # ניהול שולחנות עבודה
│   ├── useSearch.js         # ניהול חיפוש
│   ├── useBooks.js          # ניהול ספרים
│   ├── useContextMenu.js    # ניהול תפריט הקשר
│   └── index.js             # ייצוא מרכזי
├── utils/               # פונקציות עזר
│   ├── settingsManager.js   # ניהול הגדרות
│   ├── searchEngine.js      # מנוע חיפוש FlexSearch
│   ├── meilisearchEngine.js # מנוע חיפוש Meilisearch
│   ├── otzariaDB.js         # מסד נתונים אוצריא
│   └── ...                  # עזרים נוספים
├── workers/             # Web Workers
│   └── searchWorker.js  # Worker לחיפוש
├── App.jsx              # קומפוננטה ראשית
├── App.refactored.jsx   # גרסה מרופקטרת (בפיתוח)
└── main.jsx             # נקודת כניסה

electron/                # קבצי Electron
public/                  # קבצים סטטיים
```

## 🎯 ארכיטקטורה

### Custom Hooks

האפליקציה משתמשת ב-Custom Hooks לניהול state ולוגיקה:

#### `useTabsManager`
מנהל את כל הלוגיקה של כרטיסיות:
- פתיחה וסגירה של כרטיסיות
- גרירה ושחרור (Drag & Drop)
- תצוגה מפוצלת (Split View)
- שכפול כרטיסיות

```javascript
const tabsManager = useTabsManager(workspaces, currentWorkspace);

// פתיחת כרטיסייה
await tabsManager.openTab(file, { replaceSearchTab: true });

// סגירת כרטיסייה
tabsManager.closeTab(tabId);
```


#### `useWorkspaces`
מנהל שולחנות עבודה:
- יצירה ומחיקה של שולחנות עבודה
- מעבר בין שולחנות עבודה
- שמירת כרטיסיות לכל שולחן עבודה

```javascript
const workspaceManager = useWorkspaces();

// יצירת שולחן עבודה חדש
const newId = workspaceManager.createWorkspace('שולחן עבודה חדש');

// מעבר לשולחן עבודה
workspaceManager.selectWorkspace(id, openTabs, setOpenTabs, setActiveTabId);
```

#### `useSearch`
מנהל חיפוש בתוכן:
- חיפוש בקבצים
- Autocomplete
- חיפוש מתקדם

```javascript
const searchManager = useSearch(allFiles);

// ביצוע חיפוש
const results = await searchManager.performSearch(query, advancedOptions);
```

#### `useBooks`
מנהל ספרים והיסטוריה:
- ספרים אחרונים
- ספרים מוצמדים
- תיקיות

```javascript
const booksManager = useBooks();

// הצמדת ספר
booksManager.pinBook(book);

// עדכון היסטוריה
booksManager.updateRecentBooks(file);
```

#### `useContextMenu`
מנהל תפריט הקשר:
- פתיחה וסגירה
- מיקום דינמי

```javascript
const contextMenuManager = useContextMenu();

// פתיחת תפריט
contextMenuManager.openContextMenu(event, target);
```

## 🔧 Conventions

### שמות קבצים
- קומפוננטות: `PascalCase.jsx` + `PascalCase.css`
- Hooks: `useCamelCase.js`
- Utils: `camelCase.js`

### מבנה קומפוננטה
```javascript
// 1. Imports
import { useState } from 'react';
import './Component.css';

// 2. קומפוננטה
function Component({ prop1, prop2 }) {
  // 3. State
  const [state, setState] = useState();
  
  // 4. Effects
  useEffect(() => {
    // ...
  }, []);
  
  // 5. Handlers
  const handleClick = () => {
    // ...
  };
  
  // 6. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

export default Component;
```

## 🚀 התחלת פיתוח

### התקנה
```bash
npm install
```

### הרצה במצב פיתוח
```bash
# Web
npm run dev

# Electron
npm run electron:dev

# Tauri
npm run tauri:dev
```

### בנייה לפרודקשן
```bash
# Web
npm run build

# Electron
npm run electron:build

# Tauri
npm run tauri:build
```

## 📝 הוספת תכונה חדשה

### 1. תכנון
- זהה איזה hook צריך לטפל בלוגיקה
- אם צריך hook חדש, צור אותו ב-`src/hooks/`

### 2. יישום
- צור קומפוננטה חדשה ב-`src/components/`
- הוסף CSS ב-`src/components/Component.css`
- השתמש ב-hooks קיימים

### 3. אינטגרציה
- הוסף את הקומפוננטה ל-`App.jsx`
- עדכן routing אם צריך

### 4. בדיקה
- בדוק ב-Electron
- בדוק ב-Tauri
- בדוק ב-Web

## 🐛 דיבוג

### כלי דיבוג
האפליקציה כוללת כלים מובנים:
```javascript
// בקונסול
window.devtools.clearCache();
window.testMeilisearch();
```

### Logs
- `console.log` עם אמוג'י לזיהוי מהיר
- `🔍` - חיפוש
- `📚` - ספרים
- `✅` - הצלחה
- `❌` - שגיאה
- `⚠️` - אזהרה

## 📚 משאבים

- [React Docs](https://react.dev)
- [Fluent UI](https://react.fluentui.dev)
- [Electron Docs](https://www.electronjs.org/docs)
- [Tauri Docs](https://tauri.app/v1/guides/)

## 🤝 תרומה

1. צור branch חדש
2. בצע שינויים
3. הרץ `npm run format` לפני commit
4. פתח Pull Request

## ❓ שאלות נפוצות

### איך מוסיפים כרטיסייה חדשה?
```javascript
const newTab = {
  id: `unique-${Date.now()}`,
  name: 'שם הכרטיסייה',
  type: 'custom', // pdf, text, search, history, split
  // ... שדות נוספים
};

await tabsManager.openTab(newTab);
```

### איך מוסיפים מנוע חיפוש חדש?
1. צור קובץ חדש ב-`src/utils/newSearchEngine.js`
2. יישם את ה-API: `search()`, `isReady()`, `loadIndex()`
3. הוסף ל-`useSearch` hook

### איך מוסיפים פלטפורמה חדשה?
1. עדכן `src/utils/platform.js`
2. הוסף תמיכה ב-`electron/` או `src-tauri/`
3. עדכן `package.json` scripts
