/**
 * אינטגרציה של אוצריא עם הספרייה הקיימת
 * יוצר "קבצים וירטואליים" מספרי אוצריא שנראים כמו קבצים רגילים
 */

import otzariaDB from './otzariaDB';

// Cache לעץ האוצריא - נבנה פעם אחת בלבד
let cachedOtzariaTree = null;
let isBuildingTree = false;

/**
 * בדיקה אם קטגוריה היא חיצונית (HebrewBooks או אוצר החכמה)
 * משמש לסינון קטגוריות חיצוניות מהעץ
 */
export function isExternalCategory(categoryTitle) {
  if (!categoryTitle) return false;
  
  const title = categoryTitle.toLowerCase();
  return title.includes('hebrewbooks') || 
         title.includes('hebrew books') ||
         title.includes('היברו-בוקס') ||
         title.includes('היברו בוקס') ||
         title.includes('היברובוקס') ||
         title.includes('אוצר החכמה') ||
         title.includes('אוצר חכמה');
}

/**
 * קבלת קטגוריה לפי נתיב
 */
export function getOtzariaCategoryByPath(path) {
  if (!cachedOtzariaTree) {
    console.warn('⚠️ אין cache של עץ אוצריא');
    return null;
  }
  
  // חיפוש רקורסיבי בעץ לפי נתיב
  const findByPath = (node) => {
    if (node.path === path) {
      return node;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const found = findByPath(child);
        if (found) return found;
      }
    }
    
    return null;
  };
  
  return findByPath(cachedOtzariaTree);
}

/**
 * קבלת תיקיית אוצריא הראשית (מה-cache)
 */
export function getOtzariaRootFolder() {
  return cachedOtzariaTree;
}

/**
 * קבלת קטגוריה ספציפית לפי ID
 */
export function getOtzariaCategoryById(categoryId) {
  if (!cachedOtzariaTree) {
    console.warn('⚠️ אין cache של עץ אוצריא');
    return null;
  }
  
  // חיפוש רקורסיבי בעץ
  const findCategory = (node) => {
    if (node.virtualType === 'otzaria-category' && node.categoryId === categoryId) {
      return node;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const found = findCategory(child);
        if (found) return found;
      }
    }
    
    return null;
  };
  
  return findCategory(cachedOtzariaTree);
}

/**
 * בניית עץ קבצים וירטואלי מקטגוריות וספרים של אוצריא
 * משתמש ב-cache כדי לא לבנות מחדש בכל פעם
 * תמיד מחזיר תיקייה, גם אם אין חיבור ל-DB
 */
export function buildOtzariaVirtualTree() {
  // אם יש cache, החזר אותו מיד
  if (cachedOtzariaTree) {
    return cachedOtzariaTree;
  }
  
  // אם כבר בתהליך בניה, החזר null
  if (isBuildingTree) {
    return null;
  }
  
  isBuildingTree = true;

  try {
    // בדוק אם קובץ ה-DB קיים בדיסק (לא רק אם יש חיבור פעיל)
    let dbFileExists = false;
    
    // נסה לבדוק אם הקובץ קיים
    if (typeof window !== 'undefined') {
      const otzariaPath = localStorage.getItem('otzariaDbPath');
      
      if (otzariaPath) {
        if (window.electron && window.electron.fileExists) {
          dbFileExists = window.electron.fileExists(otzariaPath);        } else if (window.__TAURI__) {
          // ב-Tauri נצטרך להוסיף בדיקה דומה
          dbFileExists = true; // נניח שקיים אם יש נתיב שמור
        }
      } else {
        // אם אין נתיב שמור, נסה את הנתיב הדיפולטיבי
        if (window.electron && window.electron.fileExists && window.electron.joinPath && window.electron.getAppPath) {
          const defaultPath = window.electron.joinPath(window.electron.getAppPath(), 'books', 'אוצריא', 'seforim.db');
          dbFileExists = window.electron.fileExists(defaultPath);        }
      }
    }
    
    // בניית תיקייה ראשית של אוצריא
    const otzariaRoot = {
      name: 'אוצריא',
      type: 'folder',
      path: 'virtual-otzaria',
      isVirtual: true,
      virtualType: 'otzaria',
      children: [],
      isEmpty: !otzariaDB.db && !dbFileExists // ריק רק אם אין חיבור וגם הקובץ לא קיים
    };

    // אם אין חיבור ל-DB, בדוק אם הקובץ קיים
    if (!otzariaDB.db) {
      if (dbFileExists) {
        console.warn('⚠️ קובץ DB קיים אבל אין חיבור פעיל - ייתכן שצריך לטעון מחדש');
        // הקובץ קיים אבל אין חיבור - לא מציג מסך הורדה
        otzariaRoot.isEmpty = false;
        otzariaRoot.needsReload = true; // סימון שצריך לטעון מחדש
      } else {
        console.warn('⚠️ אין חיבור ל-DB של אוצריא וגם הקובץ לא קיים - מציג תיקייה ריקה');
      }
      cachedOtzariaTree = otzariaRoot;
      isBuildingTree = false;
      return otzariaRoot;
    }

    // קבלת כל הקטגוריות הראשיות
    const rootCategories = otzariaDB.getRootCategories();

    // סנן קטגוריות חיצוניות מהעץ (לא יופיעו בספרייה)
    const filteredCategories = rootCategories.filter(category => {
      const isExternal = isExternalCategory(category.title);
      if (isExternal) {      }
      return !isExternal;
    });

    // בניית עץ לכל קטגוריה
    filteredCategories.forEach(category => {
      const categoryNode = buildCategoryNode(category);
      if (categoryNode) {
        otzariaRoot.children.push(categoryNode);
      }
    });    // שמור ב-cache
    cachedOtzariaTree = otzariaRoot;
    isBuildingTree = false;
    
    return otzariaRoot;
  } catch (error) {
    console.error('❌ שגיאה בבניית עץ אוצריא:', error);
    isBuildingTree = false;
    
    // גם במקרה של שגיאה, החזר תיקייה ריקה
    const emptyRoot = {
      name: 'אוצריא',
      type: 'folder',
      path: 'virtual-otzaria',
      isVirtual: true,
      virtualType: 'otzaria',
      children: [],
      isEmpty: true
    };
    cachedOtzariaTree = emptyRoot;
    return emptyRoot;
  }
}

/**
 * ניקוי cache של עץ האוצריא (למקרה שצריך לרענן)
 */
export function clearOtzariaTreeCache() {  cachedOtzariaTree = null;
  isBuildingTree = false;
}

/**
 * בניית תיקייה וירטואלית של HebrewBooks
 * תמיד מחזיר תיקייה, גם אם אין קבצים
 */
export function buildHebrewBooksVirtualTree(allFiles) {
  // מצא קבצים מתיקיית hebrewbooks
  const hebrewBooksFiles = allFiles.filter(file => {
    const normalizedPath = file.path.toLowerCase().replace(/\\/g, '/');
    return normalizedPath.includes('hebrewbooks') || 
           normalizedPath.includes('hebrew-books') ||
           normalizedPath.includes('hebrew_books');
  });

  const hebrewBooksRoot = {
    name: 'היברובוקס',
    type: 'folder',
    path: 'virtual-hebrewbooks',
    isVirtual: true,
    virtualType: 'hebrewbooks',
    children: [],
    isEmpty: hebrewBooksFiles.length === 0
  };

  // אם אין קבצים, החזר תיקייה ריקה
  if (hebrewBooksFiles.length === 0) {    return hebrewBooksRoot;
  }

  // בנה עץ מהקבצים שנמצאו
  // (הלוגיקה הקיימת של buildTree תטפל בזה)  return hebrewBooksRoot;
}

/**
 * בניית צומת קטגוריה (רקורסיבי)
 * @param {boolean} shallow - אם true, לא בונה תת-קטגוריות וספרים (רק placeholder)
 * @param {string} parentPath - הנתיב של ההורה (לבניית breadcrumb)
 */
function buildCategoryNode(category, depth = 0, shallow = false, parentPath = 'virtual-otzaria') {
  const indent = '  '.repeat(depth);
  
  const currentPath = `${parentPath}/${category.title}`;
  
  const node = {
    name: category.title,
    type: 'folder',
    path: currentPath,
    isVirtual: true,
    virtualType: 'otzaria-category',
    categoryId: category.id,
    categoryTitle: category.title,
    children: []
  };

  if (shallow) {
    // במצב shallow, רק מסמן שיש ילדים אבל לא בונה אותם
    const subCategoriesCount = otzariaDB.getSubCategories(category.id).length;
    const booksCount = otzariaDB.getBooksInCategory(category.id).length;
    
    if (subCategoriesCount > 0 || booksCount > 0) {
      // הוסף placeholder שיטען לפי דרישה
      node.children.push({
        name: '...',
        type: 'placeholder',
        path: `virtual-otzaria/placeholder-${category.id}`,
        isVirtual: true,
        virtualType: 'otzaria-placeholder',
        categoryId: category.id
      });
    }
    
    return node;
  }

  // הוסף תת-קטגוריות - סנן קטגוריות חיצוניות
  const subCategories = otzariaDB.getSubCategories(category.id);
  subCategories.forEach(subCat => {
    // דלג על קטגוריות חיצוניות
    if (isExternalCategory(subCat.title)) {      return;
    }
    
    const subNode = buildCategoryNode(subCat, depth + 1, false, currentPath); // תמיד מלא - לא shallow
    if (subNode) {
      node.children.push(subNode);
    }
  });

  // הוסף ספרים בקטגוריה זו (רק אם לא shallow)
  const books = otzariaDB.getBooksInCategory(category.id);
  books.forEach(book => {
    const bookName = book.title + (book.volume ? ` - ${book.volume}` : '');
    const bookNode = {
      name: bookName,
      type: 'file',
      path: `${currentPath}/${bookName}`,
      isVirtual: true,
      virtualType: 'otzaria-book',
      fullData: {
        id: `otzaria-${book.id}`,
        name: book.title,
        path: `${currentPath}/${bookName}`,
        type: 'otzaria',
        bookId: book.id,
        totalLines: book.totalLines,
        heShortDesc: book.heShortDesc,
        hasNekudot: book.hasNekudot,
        hasTeamim: book.hasTeamim,
        volume: book.volume
      }
    };
    node.children.push(bookNode);
  });

  return node;
}

/**
 * בדיקה אם קובץ הוא ספר אוצריא
 */
export function isOtzariaBook(file) {
  return file && file.type === 'otzaria';
}

/**
 * המרת ספר אוצריא לפורמט טקסט HTML
 */
export function convertOtzariaBookToText(bookId) {
  if (!otzariaDB.db) return null;
  
  try {
    const bookInfo = otzariaDB.getBookInfo(bookId);
    if (!bookInfo) return null;
    
    // קבל את כל השורות
    const lines = otzariaDB.getAllBookLines(bookId);
    
    // המר לפורמט HTML - ללא heRef (שם הספר ומספר)
    let html = '';
    lines.forEach(line => {
      // הסר את heRef - זה שם הספר ומספר שחוזר בכל שורה
      // רק תוכן השורה עצמה
      html += line.content + '<br>\n';
    });
    
    return {
      title: bookInfo.title,
      content: html,
      totalLines: bookInfo.totalLines
    };
  } catch (error) {
    console.error('שגיאה בהמרת ספר אוצריא:', error);
    return null;
  }
}

/**
 * קבלת תוכן ספר אוצריא כטקסט
 */
export function getOtzariaBookContent(bookId) {
  return convertOtzariaBookToText(bookId);
}

/**
 * חיפוש ספרים באוצריא
 * משתמש ב-cache פשוט לתוצאות חיפוש
 */
const searchCache = new Map();
const CACHE_SIZE_LIMIT = 100; // מקסימום 100 חיפושים ב-cache

export function searchOtzariaBooks(query) {
  if (!otzariaDB.db || !query) return [];
  
  // בדוק אם יש ב-cache
  const cacheKey = query.toLowerCase().trim();
  if (searchCache.has(cacheKey)) {    return searchCache.get(cacheKey);
  }  // בצע חיפוש
  const results = otzariaDB.searchBooks(query);  // שמור ב-cache (עם הגבלת גודל)
  if (searchCache.size >= CACHE_SIZE_LIMIT) {
    // מחק את הערך הראשון (הישן ביותר)
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  searchCache.set(cacheKey, results);
  
  return results;
}

/**
 * ניקוי cache של חיפוש
 */
export function clearSearchCache() {
  searchCache.clear();
}

export default {
  buildOtzariaVirtualTree,
  buildHebrewBooksVirtualTree,
  clearOtzariaTreeCache,
  isOtzariaBook,
  convertOtzariaBookToText,
  getOtzariaBookContent,
  searchOtzariaBooks,
  clearSearchCache,
  getOtzariaRootFolder,
  getOtzariaCategoryById,
  getOtzariaCategoryByPath,
  isExternalCategory
};
