# Custom Hooks - מדריך שימוש

## 📚 סקירה כללית

תיקייה זו מכילה את כל ה-Custom Hooks של האפליקציה. כל hook מנהל חלק ספציפי מהלוגיקה העסקית.

## 🎯 Hooks זמינים

### `useTabsManager`
**מטרה:** ניהול כרטיסיות

**שימוש:**
```javascript
import { useTabsManager } from './hooks';

function App() {
  const workspaceManager = useWorkspaces();
  const tabsManager = useTabsManager(
    workspaceManager.workspaces,
    workspaceManager.currentWorkspace
  );

  // פתיחת כרטיסייה
  await tabsManager.openTab({
    id: 'pdf-123',
    name: 'ספר חדש',
    type: 'pdf',
    path: '/path/to/file.pdf'
  });

  // סגירת כרטיסייה
  tabsManager.closeTab('pdf-123');

  // גרירה
  tabsManager.handleDragStart(tab);
  tabsManager.handleDrop(targetTab);

  // Split View
  tabsManager.addToSplitView(tab);
  tabsManager.selectSecondTabForSplit(secondTab);
}
```

**API:**
- `openTabs` - מערך כרטיסיות פתוחות
- `activeTabId` - ID של כרטיסייה פעילה
- `openTab(tab, options)` - פתיחת כרטיסייה
- `closeTab(tabId)` - סגירת כרטיסייה
- `duplicateTab(tab)` - שכפול כרטיסייה
- `updateTab(tabId, updates)` - עדכון כרטיסייה
- `addToSplitView(tab)` - הוספה לתצוגה מפוצלת

---

### `useWorkspaces`
**מטרה:** ניהול שולחנות עבודה

**שימוש:**
```javascript
import { useWorkspaces } from './hooks';

function App() {
  const workspaceManager = useWorkspaces();

  // יצירת שולחן עבודה
  const newId = workspaceManager.createWorkspace('פרויקט חדש');

  // מעבר לשולחן עבודה
  workspaceManager.selectWorkspace(
    newId,
    openTabs,
    setOpenTabs,
    setActiveTabId
  );

  // מחיקת שולחן עבודה
  workspaceManager.deleteWorkspace(id);

  // שינוי שם
  workspaceManager.renameWorkspace(id, 'שם חדש');
}
```

**API:**
- `workspaces` - מערך שולחנות עבודה
- `currentWorkspace` - ID של שולחן עבודה נוכחי
- `createWorkspace(name)` - יצירת שולחן עבודה
- `deleteWorkspace(id, ...)` - מחיקת שולחן עבודה
- `renameWorkspace(id, newName)` - שינוי שם
- `selectWorkspace(id, ...)` - מעבר לשולחן עבודה

---

### `useSearch`
**מטרה:** ניהול חיפוש

**שימוש:**
```javascript
import { useSearch } from './hooks';

function App() {
  const searchManager = useSearch(allFiles);

  // חיפוש פשוט
  const results = await searchManager.performSearch('תורה');

  // חיפוש מתקדם
  const results = await searchManager.performSearch('תורה', {
    fullSpelling: true,
    accuracy: 80,
    maxResults: 100
  });

  // סגירת autocomplete
  searchManager.closeHeaderAutocomplete();
}
```

**API:**
- `searchQuery` - שאילתת חיפוש נוכחית
- `searchResults` - תוצאות חיפוש
- `isSearching` - האם מחפש כרגע
- `performSearch(query, options)` - ביצוע חיפוש
- `handleContentSearch(query, options)` - חיפוש בתוכן
- `closeHeaderAutocomplete()` - סגירת autocomplete

---

### `useBooks`
**מטרה:** ניהול ספרים והיסטוריה

**שימוש:**
```javascript
import { useBooks } from './hooks';

function App() {
  const booksManager = useBooks();

  // עדכון היסטוריה
  booksManager.updateRecentBooks(file);

  // הצמדת ספר
  booksManager.pinBook(book);

  // ביטול הצמדה
  booksManager.unpinBook(bookId);

  // פתיחת תיקייה
  booksManager.openFolderPreview(folder);

  // ניקוי היסטוריה
  booksManager.clearHistory();
}
```

**API:**
- `allFiles` - כל הקבצים
- `recentBooks` - ספרים אחרונים
- `pinnedBooks` - ספרים מוצמדים
- `folderPreview` - תיקייה בתצוגה מקדימה
- `updateRecentBooks(file)` - עדכון היסטוריה
- `pinBook(book)` - הצמדת ספר
- `unpinBook(bookId)` - ביטול הצמדה
- `openFolderPreview(folder)` - פתיחת תיקייה
- `closeFolderPreview()` - סגירת תיקייה

---

### `useContextMenu`
**מטרה:** ניהול תפריט הקשר

**שימוש:**
```javascript
import { useContextMenu } from './hooks';

function App() {
  const contextMenuManager = useContextMenu();

  // פתיחת תפריט
  const handleRightClick = (e, target) => {
    contextMenuManager.openContextMenu(e, target);
  };

  // סגירת תפריט
  contextMenuManager.closeContextMenu();

  // גישה למטרה
  const target = contextMenuManager.contextMenuTarget;
}
```

**API:**
- `contextMenu` - מיקום התפריט `{ x, y }`
- `contextMenuTarget` - האובייקט שעליו נלחץ
- `openContextMenu(event, target)` - פתיחת תפריט
- `closeContextMenu()` - סגירת תפריט

---

## 🔧 יצירת Hook חדש

### תבנית בסיסית
```javascript
import { useState, useCallback } from 'react';
import { getSetting, updateSetting } from '../utils/settingsManager';

/**
 * Hook לניהול [תיאור]
 * [הסבר מפורט]
 */
export function useMyFeature() {
  // State
  const [myState, setMyState] = useState(() => getSetting('myKey', defaultValue));

  // Actions
  const doSomething = useCallback(() => {
    // לוגיקה
    updateSetting('myKey', newValue);
  }, []);

  return {
    // State
    myState,
    
    // Setters
    setMyState,
    
    // Actions
    doSomething,
  };
}
```

### הוספת ה-Hook לאפליקציה

1. **צור קובץ חדש:**
```bash
src/hooks/useMyFeature.js
```

2. **ייצא מ-index.js:**
```javascript
// src/hooks/index.js
export { useMyFeature } from './useMyFeature';
```

3. **השתמש ב-App.jsx:**
```javascript
import { useMyFeature } from './hooks';

function App() {
  const myFeature = useMyFeature();
  // ...
}
```

## 📝 Best Practices

### 1. שמות ברורים
```javascript
// ✅ טוב
const tabsManager = useTabsManager();
const booksManager = useBooks();

// ❌ לא טוב
const tabs = useTabsManager();
const b = useBooks();
```

### 2. Destructuring רק למה שצריך
```javascript
// ✅ טוב - שימוש במנהל שלם
const tabsManager = useTabsManager();
tabsManager.openTab(file);

// ⚠️ אפשרי אבל פחות מומלץ
const { openTab, closeTab } = useTabsManager();
```

### 3. תיעוד
```javascript
/**
 * Hook לניהול כרטיסיות
 * @param {Workspace[]} workspaces - רשימת שולחנות עבודה
 * @param {string} currentWorkspace - שולחן עבודה נוכחי
 * @returns {TabsManager} מנהל כרטיסיות
 */
export function useTabsManager(workspaces, currentWorkspace) {
  // ...
}
```

### 4. טיפול בשגיאות
```javascript
const doSomething = useCallback(async () => {
  try {
    // לוגיקה
  } catch (error) {
    console.error('❌ שגיאה:', error);
    // טיפול בשגיאה
  }
}, []);
```

## 🐛 דיבוג

### הדפסת State
```javascript
const tabsManager = useTabsManager();

// הדפס את כל ה-state
console.log('📊 Tabs Manager:', {
  openTabs: tabsManager.openTabs,
  activeTabId: tabsManager.activeTabId,
  draggedTab: tabsManager.draggedTab
});
```

### React DevTools
1. התקן React DevTools
2. בדוק את ה-hooks ב-Components tab
3. עקוב אחרי שינויים ב-state

## 🤝 תרומה

רוצה להוסיף hook חדש? מצוין!

1. צור את ה-hook
2. הוסף תיעוד
3. הוסף דוגמאות שימוש
4. עדכן את README זה
5. פתח Pull Request

## 📚 משאבים נוספים

- [React Hooks Documentation](https://react.dev/reference/react)
- [Custom Hooks Guide](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [DEVELOPER_GUIDE.md](../../DEVELOPER_GUIDE.md)
