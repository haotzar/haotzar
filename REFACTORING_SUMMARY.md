# סיכום רפקטורינג - App.jsx

## 🎯 מטרה
פיצול App.jsx (3,426 שורות) ל-hooks מאורגנים לשיפור תחזוקה וקריאות הקוד.

## ✅ מה נעשה

### 1. נוצרו Custom Hooks חדשים

#### `src/hooks/useTabsManager.js` (400+ שורות)
מנהל את כל הלוגיקה של כרטיסיות:
- ✅ פתיחה וסגירה של כרטיסיות
- ✅ גרירה ושחרור (Drag & Drop)
- ✅ תצוגה מפוצלת (Split View)
- ✅ שכפול וסגירה מרובה
- ✅ שמירה וטעינה מ-localStorage

**לפני:**
```javascript
// App.jsx - 200+ שורות של לוגיקת כרטיסיות מפוזרות
const [openTabs, setOpenTabs] = useState([]);
const handleCloseTab = (tabId) => { /* ... */ };
const handleDragStart = (e, tab) => { /* ... */ };
// ... עוד 20 פונקציות
```

**אחרי:**
```javascript
// App.jsx - שורה אחת!
const tabsManager = useTabsManager(workspaces, currentWorkspace);

// שימוש פשוט
tabsManager.openTab(file);
tabsManager.closeTab(tabId);
tabsManager.addToSplitView(tab);
```

#### `src/hooks/useWorkspaces.js` (100+ שורות)
מנהל שולחנות עבודה:
- ✅ יצירה, מחיקה, שינוי שם
- ✅ מעבר בין שולחנות עבודה
- ✅ שמירת כרטיסיות לכל שולחן

**לפני:**
```javascript
// App.jsx - לוגיקה מפוזרת
const createWorkspace = (name) => { /* ... */ };
const deleteWorkspace = (id) => { /* ... */ };
const selectWorkspace = (id) => { /* ... */ };
```

**אחרי:**
```javascript
const workspaceManager = useWorkspaces();

workspaceManager.createWorkspace('שולחן חדש');
workspaceManager.selectWorkspace(id);
```

#### `src/hooks/useSearch.js` (150+ שורות)
מנהל חיפוש:
- ✅ חיפוש בתוכן
- ✅ Autocomplete
- ✅ חיפוש מתקדם
- ✅ תמיכה ב-Meilisearch + FlexSearch

**לפני:**
```javascript
// App.jsx - לוגיקת חיפוש מורכבת
const handleContentSearch = async (query) => {
  // 80+ שורות של לוגיקה
};
```

**אחרי:**
```javascript
const searchManager = useSearch(allFiles);

const results = await searchManager.performSearch(query, options);
```

#### `src/hooks/useBooks.js` (100+ שורות)
מנהל ספרים:
- ✅ ספרים אחרונים
- ✅ ספרים מוצמדים
- ✅ תיקיות
- ✅ היסטוריה

**לפני:**
```javascript
// App.jsx - ניהול ספרים מפוזר
const [recentBooks, setRecentBooks] = useState([]);
const [pinnedBooks, setPinnedBooks] = useState([]);
const updateRecentBooks = (file) => { /* ... */ };
```

**אחרי:**
```javascript
const booksManager = useBooks();

booksManager.updateRecentBooks(file);
booksManager.pinBook(book);
booksManager.clearHistory();
```

#### `src/hooks/useContextMenu.js` (80+ שורות)
מנהל תפריט הקשר:
- ✅ פתיחה וסגירה
- ✅ מיקום דינמי
- ✅ סגירה אוטומטית

**לפני:**
```javascript
// App.jsx - לוגיקת תפריט הקשר
const [contextMenu, setContextMenu] = useState(null);
const handleContextMenu = (e, target) => { /* ... */ };
```

**אחרי:**
```javascript
const contextMenuManager = useContextMenu();

contextMenuManager.openContextMenu(event, target);
```

### 2. נוצר מדריך למפתחים
- ✅ `DEVELOPER_GUIDE.md` - מדריך מקיף
- ✅ הסבר על מבנה הפרויקט
- ✅ דוגמאות שימוש
- ✅ Conventions

### 3. נוצר קובץ ייצוא מרכזי
```javascript
// src/hooks/index.js
export { useTabsManager } from './useTabsManager';
export { useWorkspaces } from './useWorkspaces';
export { useSearch } from './useSearch';
export { useBooks } from './useBooks';
export { useContextMenu } from './useContextMenu';
```

## 📊 השוואה

### לפני הרפקטורינג
```
App.jsx: 3,426 שורות
├── State: 25+ משתנים
├── Functions: 50+ פונקציות
├── useEffect: 15+ hooks
└── JSX: 1,500+ שורות
```

### אחרי הרפקטורינג
```
App.jsx: ~800 שורות (צפוי)
├── Hooks: 5 custom hooks
├── Functions: 10-15 פונקציות
├── useEffect: 5-7 hooks
└── JSX: 500+ שורות

src/hooks/:
├── useTabsManager.js: 400+ שורות
├── useWorkspaces.js: 100+ שורות
├── useSearch.js: 150+ שורות
├── useBooks.js: 100+ שורות
└── useContextMenu.js: 80+ שורות
```

## 🎉 יתרונות

### 1. קריאות משופרת
- קוד מאורגן לפי אחריות
- קל למצוא לוגיקה ספציפית
- שמות ברורים ותיאוריים

### 2. תחזוקה קלה יותר
- שינויים בכרטיסיות? רק `useTabsManager.js`
- שינויים בחיפוש? רק `useSearch.js`
- בדיקות יחידה קלות יותר

### 3. שימוש חוזר
- Hooks ניתנים לשימוש חוזר
- קל להוסיף תכונות חדשות
- הפרדה ברורה בין לוגיקה ל-UI

### 4. למידה מהירה יותר
- מפתח חדש יכול להתמקד ב-hook אחד
- דוגמאות שימוש ב-DEVELOPER_GUIDE.md
- מבנה אינטואיטיבי

## 🚀 השלבים הבאים

### שלב 1: השלמת הרפקטורינג ✅
- [x] יצירת hooks
- [x] מדריך למפתחים
- [ ] העברת כל הלוגיקה מ-App.jsx
- [ ] העברת כל ה-JSX

### שלב 2: בדיקות
- [ ] בדיקה ידנית של כל התכונות
- [ ] בדיקה ב-Electron
- [ ] בדיקה ב-Tauri
- [ ] בדיקה ב-Web

### שלב 3: החלפה
- [ ] שינוי שם `App.jsx` ל-`App.old.jsx`
- [ ] שינוי שם `App.refactored.jsx` ל-`App.jsx`
- [ ] מחיקת `App.old.jsx` אחרי אישור

### שלב 4: ניקיון
- [ ] מחיקת `App_temp.jsx`
- [ ] מחיקת `src/src/hooks/`
- [ ] החלטה לגבי `SearchResults.jsx` vs `SearchResultsNew.jsx`

## 💡 המלצות נוספות

### 1. TypeScript (אופציונלי)
```typescript
// useTabsManager.ts
interface Tab {
  id: string;
  name: string;
  type: 'pdf' | 'text' | 'search' | 'history' | 'split';
  // ...
}

export function useTabsManager(
  workspaces: Workspace[],
  currentWorkspace: string
): TabsManager {
  // ...
}
```

### 2. בדיקות יחידה
```javascript
// useTabsManager.test.js
import { renderHook, act } from '@testing-library/react-hooks';
import { useTabsManager } from './useTabsManager';

test('should open tab', () => {
  const { result } = renderHook(() => useTabsManager([], 'default'));
  
  act(() => {
    result.current.openTab({ id: '1', name: 'Test' });
  });
  
  expect(result.current.openTabs).toHaveLength(1);
});
```

### 3. תיעוד JSDoc
```javascript
/**
 * Hook לניהול כרטיסיות
 * @param {Workspace[]} workspaces - רשימת שולחנות עבודה
 * @param {string} currentWorkspace - שולחן עבודה נוכחי
 * @returns {TabsManager} מנהל כרטיסיות
 * @example
 * const tabsManager = useTabsManager(workspaces, 'default');
 * await tabsManager.openTab(file);
 */
export function useTabsManager(workspaces, currentWorkspace) {
  // ...
}
```

## 📞 צור קשר

יש שאלות? פתח issue או שלח PR!
