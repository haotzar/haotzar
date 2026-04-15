/**
 * מודול לקריאה ממסד נתונים של אוצריא
 * מטפל בקריאת קטגוריות, ספרים ותוכן מקובץ seforim.db
 */

class OtzariaDB {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.isElectron = typeof window !== 'undefined' && window.electron !== undefined;
    this.isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
  }

  /**
   * פתיחת חיבור למסד הנתונים
   */
  async open(dbPath) {
    try {
      this.dbPath = dbPath;
      
      if (this.isElectron) {        // ב-Electron נשתמש ב-better-sqlite3 דרך preload
        // נשמור את הנתיב ונשתמש בו לקריאות
        if (!window.electron.fileExists(dbPath)) {
          console.warn('⚠️ קובץ מסד נתונים לא קיים:', dbPath);
          return false;
        }        // פתיחת ה-DB תעשה דרך IPC handler שנוסיף
        const result = await window.electron.openOtzariaDB(dbPath);        if (result.success) {
          this.db = true; // סימן שיש חיבור          return true;
        } else {
          console.error('❌ Failed to open DB:', result.error);
        }
        return false;
      } else if (this.isTauri) {
        // ב-Tauri נשתמש ב-invoke לפתיחת DB
        try {
          const { invoke } = await import('@tauri-apps/api/tauri');
          const result = await invoke('open_otzaria_db', { path: dbPath });
          if (result.success) {
            this.db = true;
            console.log('✅ מסד נתונים אוצריא נפתח בהצלחה (Tauri)');
            return true;
          } else {
            console.error('❌ שגיאה בפתיחת DB (Tauri):', result.error);
            return false;
          }
        } catch (error) {
          console.error('❌ Error opening Otzaria DB via Tauri:', error);
          return false;
        }
        return false;
      }
      
      console.warn('⚠️ Not in Electron or Tauri environment');
      return false;
    } catch (error) {
      console.error('❌ שגיאה בפתיחת מסד נתונים אוצריא:', error);
      return false;
    }
  }

  /**
   * טעינת מסד נתונים חדש
   * @param {string} dbPath - נתיב למסד הנתונים
   * @returns {Promise<{success: boolean, booksCount?: number, error?: string}>}
   */
  async loadDatabase(dbPath) {
    try {
      // סגור את ה-DB הקודם אם יש
      if (this.db) {
        this.close();
      }
      
      // פתח את ה-DB החדש
      const opened = await this.open(dbPath);
      
      if (!opened) {
        return { success: false, error: 'לא הצלחתי לפתוח את מסד הנתונים' };
      }
      
      // ספור כמה ספרים יש
      try {
        const result = window.electron.queryOtzariaDB('SELECT COUNT(*) as count FROM books');
        const booksCount = result[0]?.count || 0;
        
        return { success: true, booksCount };
      } catch (error) {
        return { success: true, booksCount: 0 };
      }
    } catch (error) {
      console.error('❌ שגיאה בטעינת מסד נתונים:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * סגירת החיבור למסד הנתונים
   */
  close() {
    if (this.db && this.isElectron) {
      try {
        window.electron.closeOtzariaDB();
        this.db = null;
        this.dbPath = null;      } catch (error) {
        console.error('❌ שגיאה בסגירת מסד נתונים:', error);
      }
    }
  }

  /**
   * קבלת כל הקטגוריות הראשיות (ללא הורה)
   */
  getRootCategories() {
    if (!this.db) return [];
    
    try {
      if (this.isElectron) {
        const result = window.electron.queryOtzariaDB(
          'SELECT * FROM category WHERE parentId IS NULL ORDER BY orderIndex, title'
        );
        return result;
      }
      return [];
    } catch (error) {
      console.error('❌ שגיאה בקריאת קטגוריות ראשיות:', error);
      return [];
    }
  }

  /**
   * קבלת תת-קטגוריות של קטגוריה מסוימת
   */
  getSubCategories(parentId) {
    if (!this.db) return [];
    
    try {
      if (this.isElectron) {
        return window.electron.queryOtzariaDB(
          'SELECT * FROM category WHERE parentId = ? ORDER BY orderIndex, title',
          [parentId]
        );
      }
      return [];
    } catch (error) {
      console.error('שגיאה בקריאת תת-קטגוריות:', error);
      return [];
    }
  }

  /**
   * קבלת ספרים בקטגוריה מסוימת
   */
  getBooksInCategory(categoryId) {
    if (!this.db) return [];
    
    try {
      if (this.isElectron) {
        return window.electron.queryOtzariaDB(
          `SELECT id, title, heShortDesc, totalLines, 
                  hasNekudot, hasTeamim, volume
           FROM book 
           WHERE categoryId = ? 
           ORDER BY orderIndex, title`,
          [categoryId]
        );
      }
      return [];
    } catch (error) {
      console.error('שגיאה בקריאת ספרים:', error);
      return [];
    }
  }

  /**
   * קבלת מידע על ספר לפי ID
   */
  getBookInfo(bookId) {
    if (!this.db) return null;
    
    try {
      if (this.isElectron) {
        const results = window.electron.queryOtzariaDB(
          'SELECT * FROM book WHERE id = ?',
          [bookId]
        );
        return results.length > 0 ? results[0] : null;
      }
      return null;
    } catch (error) {
      console.error('שגיאה בקריאת מידע ספר:', error);
      return null;
    }
  }

  /**
   * קבלת תוכן עניינים (TOC) של ספר
   */
  getBookTOC(bookId) {
    if (!this.db) return [];
    
    try {
      if (this.isElectron) {
        const toc = window.electron.queryOtzariaDB(
          `SELECT te.*, tt.text as title
           FROM tocEntry te
           JOIN tocText tt ON te.textId = tt.id
           WHERE te.bookId = ?
           ORDER BY te.lineIndex`,
          [bookId]
        );
        
        // בניית עץ היררכי
        return this.buildTOCTree(toc);
      }
      return [];
    } catch (error) {
      console.error('שגיאה בקריאת תוכן עניינים:', error);
      return [];
    }
  }

  /**
   * בניית עץ היררכי מרשימת TOC שטוחה
   */
  buildTOCTree(flatTOC) {
    const map = {};
    const roots = [];
    
    // יצירת מפה של כל הפריטים
    flatTOC.forEach(item => {
      map[item.id] = { ...item, children: [] };
    });
    
    // בניית העץ
    flatTOC.forEach(item => {
      if (item.parentId === null) {
        roots.push(map[item.id]);
      } else if (map[item.parentId]) {
        map[item.parentId].children.push(map[item.id]);
      }
    });
    
    return roots;
  }

  /**
   * קבלת שורות טקסט של ספר (עם פגינציה)
   */
  getBookLines(bookId, startLine = 0, limit = 100) {
    if (!this.db) return [];
    
    try {
      if (this.isElectron) {
        return window.electron.queryOtzariaDB(
          `SELECT id, lineIndex, content, heRef
           FROM line
           WHERE bookId = ?
           ORDER BY lineIndex
           LIMIT ? OFFSET ?`,
          [bookId, limit, startLine]
        );
      }
      return [];
    } catch (error) {
      console.error('שגיאה בקריאת שורות:', error);
      return [];
    }
  }

  /**
   * קבלת כל שורות הספר (זהירות - יכול להיות גדול!)
   */
  getAllBookLines(bookId) {
    if (!this.db) return [];
    
    try {
      if (this.isElectron) {
        return window.electron.queryOtzariaDB(
          `SELECT id, lineIndex, content, heRef
           FROM line
           WHERE bookId = ?
           ORDER BY lineIndex`,
          [bookId]
        );
      }
      return [];
    } catch (error) {
      console.error('שגיאה בקריאת כל השורות:', error);
      return [];
    }
  }

  /**
   * חיפוש ספרים לפי שם
   * מחפש רק בקטגוריות פנימיות (לא חיצוניות)
   */
  searchBooks(query) {
    if (!this.db || !query) {
      return [];
    }
    
    try {
      if (this.isElectron) {
        
        // חיפוש עם סינון קטגוריות חיצוניות ישירות ב-SQL
        const sqlQuery = `
          SELECT b.id, b.title, b.heShortDesc, b.totalLines, b.volume,
                 c.title as categoryTitle
          FROM book b
          JOIN category c ON b.categoryId = c.id
          WHERE (b.title LIKE ? OR c.title LIKE ?)
            AND c.title NOT LIKE '%hebrewbooks%'
            AND c.title NOT LIKE '%hebrew books%'
            AND c.title NOT LIKE '%היברו-בוקס%'
            AND c.title NOT LIKE '%היברו בוקס%'
            AND c.title NOT LIKE '%היברובוקס%'
            AND c.title NOT LIKE '%אוצר החכמה%'
            AND c.title NOT LIKE '%אוצר חכמה%'
          ORDER BY b.title
          LIMIT 100
        `;
        
        const searchPattern = `%${query}%`;
        
        const results = window.electron.queryOtzariaDB(
          sqlQuery,
          [searchPattern, searchPattern]
        );
        
        // נקה רווחים מיותרים משמות הספרים
        return results.map(book => ({
          ...book,
          title: book.title?.trim() || book.title,
          heShortDesc: book.heShortDesc?.trim() || book.heShortDesc,
          volume: book.volume?.trim() || book.volume,
          categoryTitle: book.categoryTitle?.trim() || book.categoryTitle
        }));
      }
      return [];
    } catch (error) {
      console.error('❌ שגיאה בחיפוש ספרים:', error);
      return [];
    }
  }

  /**
   * חיפוש טקסט בתוך ספר
   */
  searchInBook(bookId, query) {
    if (!this.db || !query) return [];
    
    try {
      if (this.isElectron) {
        return window.electron.queryOtzariaDB(
          `SELECT id, lineIndex, content, heRef
           FROM line
           WHERE bookId = ? AND content LIKE ?
           ORDER BY lineIndex
           LIMIT 100`,
          [bookId, `%${query}%`]
        );
      }
      return [];
    } catch (error) {
      console.error('שגיאה בחיפוש בספר:', error);
      return [];
    }
  }

  /**
   * קבלת כל הספרים (מוגבל למספר מסוים)
   * משמש לחיפוש ראשי תיבות
   */
  getAllBooks(limit = 500) {    if (!this.db) {      return [];
    }
    
    try {
      if (this.isElectron) {
        const sqlQuery = `
          SELECT b.id, b.title, b.heShortDesc, b.totalLines, b.volume,
                 c.title as categoryTitle
          FROM book b
          JOIN category c ON b.categoryId = c.id
          WHERE c.title NOT LIKE '%hebrewbooks%'
            AND c.title NOT LIKE '%hebrew books%'
            AND c.title NOT LIKE '%היברו-בוקס%'
            AND c.title NOT LIKE '%היברו בוקס%'
            AND c.title NOT LIKE '%היברובוקס%'
            AND c.title NOT LIKE '%אוצר החכמה%'
            AND c.title NOT LIKE '%אוצר חכמה%'
          ORDER BY b.title
          LIMIT ?
        `;        const results = window.electron.queryOtzariaDB(sqlQuery, [limit]);        // נקה רווחים מיותרים משמות הספרים
        const cleanedResults = results.map(book => ({
          ...book,
          title: book.title?.trim() || book.title,
          heShortDesc: book.heShortDesc?.trim() || book.heShortDesc,
          volume: book.volume?.trim() || book.volume,
          categoryTitle: book.categoryTitle?.trim() || book.categoryTitle
        }));
        
        if (cleanedResults.length > 0) {
          console.log('📖 דוגמאות לספרים:', cleanedResults.slice(0, 3).map(b => b.title));
        }
        
        return cleanedResults;
      }      return [];
    } catch (error) {
      console.error('❌ שגיאה בקבלת כל הספרים:', error);
      return [];
    }
  }

  /**
   * קבלת סטטיסטיקות על מסד הנתונים
   */
  getStats() {
    if (!this.db) return null;
    
    try {
      if (this.isElectron) {
        const categories = window.electron.queryOtzariaDB('SELECT COUNT(*) as count FROM category');
        const books = window.electron.queryOtzariaDB('SELECT COUNT(*) as count FROM book');
        const lines = window.electron.queryOtzariaDB('SELECT COUNT(*) as count FROM line');
        
        return {
          totalCategories: categories[0].count,
          totalBooks: books[0].count,
          totalLines: lines[0].count,
        };
      }
      return null;
    } catch (error) {
      console.error('שגיאה בקריאת סטטיסטיקות:', error);
      return null;
    }
  }

  /**
   * קבלת מפרשים וקישורים לשורה ספציפית בספר
   * @param {number} bookId - מזהה הספר
   * @param {number} lineIndex - מספר השורה
   * @returns {Array} רשימת מפרשים וקישורים לשורה זו
   */
  getLineLinks(bookId, lineIndex) {
    if (!this.db || !bookId || lineIndex === null || lineIndex === undefined) {
      return [];
    }
    
    try {
      if (this.isElectron) {        // שאילתה לקבלת קישורים לשורה ספציפית
        // צריך לעשות JOIN לטבלת line כדי לקבל את lineIndex האמיתי
        const links = window.electron.queryOtzariaDB(
          `SELECT 
            l.targetBookId as bookId,
            targetLine.lineIndex as targetLineIndex,
            l.connectionTypeId as linkTypeId,
            ct.name as linkType
           FROM link l
           JOIN connection_type ct ON l.connectionTypeId = ct.id
           JOIN line sourceLine ON l.sourceLineId = sourceLine.id
           JOIN line targetLine ON l.targetLineId = targetLine.id
           WHERE l.sourceBookId = ? AND sourceLine.lineIndex = ?
           ORDER BY ct.id`,
          [bookId, lineIndex]
        );        if (links.length > 0) {        }
        
        if (links.length === 0) {
          return [];
        }
        
        // קבל את פרטי הספרים המקושרים
        const bookIds = [...new Set(links.map(l => l.bookId))];
        const placeholders = bookIds.map(() => '?').join(',');
        
        const books = window.electron.queryOtzariaDB(
          `SELECT id, title, heShortDesc, volume
           FROM book
           WHERE id IN (${placeholders})`,
          bookIds
        );
        
        // צור מפה של ספרים
        const booksMap = {};
        books.forEach(book => {
          booksMap[book.id] = {
            bookTitle: book.title?.trim() || book.title,
            heShortDesc: book.heShortDesc?.trim() || book.heShortDesc,
            volume: book.volume?.trim() || book.volume
          };
        });
        
        // שלב את הנתונים
        const result = links.map(link => ({
          bookId: link.bookId,
          targetLineIndex: link.targetLineIndex,
          linkType: link.linkType,
          linkTypeId: link.linkTypeId,
          ...booksMap[link.bookId]
        }));        return result;
      }
      return [];
    } catch (error) {
      console.error('❌ שגיאה בקבלת קישורי שורה:', error);
      return [];
    }
  }

  /**
   * קבלת מפרשים וקישורים לספר (כל הספר)
   * @param {number} bookId - מזהה הספר
   * @returns {Array} רשימת מפרשים וקישורים
   */
  getBookLinks(bookId) {
    if (!this.db || !bookId) {
      return [];
    }
    
    try {
      if (this.isElectron) {
        // שאילתה מהירה יותר - רק הנתונים הדרושים
        const links = window.electron.queryOtzariaDB(
          `SELECT 
            l.targetBookId as bookId,
            l.connectionTypeId as linkTypeId,
            ct.name as linkType
           FROM link l
           JOIN connection_type ct ON l.connectionTypeId = ct.id
           WHERE l.sourceBookId = ?
           GROUP BY l.targetBookId, l.connectionTypeId
           ORDER BY ct.id`,
          [bookId]
        );
        
        if (links.length === 0) {
          return [];
        }
        
        // עכשיו קבל את פרטי הספרים רק עבור הספרים שנמצאו
        const bookIds = [...new Set(links.map(l => l.bookId))];
        const placeholders = bookIds.map(() => '?').join(',');
        
        const books = window.electron.queryOtzariaDB(
          `SELECT id, title, heShortDesc, volume
           FROM book
           WHERE id IN (${placeholders})`,
          bookIds
        );
        
        // צור מפה של ספרים
        const booksMap = {};
        books.forEach(book => {
          booksMap[book.id] = {
            bookTitle: book.title?.trim() || book.title,
            heShortDesc: book.heShortDesc?.trim() || book.heShortDesc,
            volume: book.volume?.trim() || book.volume
          };
        });
        
        // שלב את הנתונים
        return links.map(link => ({
          bookId: link.bookId,
          linkType: link.linkType,
          linkTypeId: link.linkTypeId,
          ...booksMap[link.bookId]
        }));
      }
      return [];
    } catch (error) {
      console.error('❌ שגיאה בקבלת קישורי ספר:', error);
      return [];
    }
  }

  /**
   * בדיקה אם לספר יש קישורים
   * @param {number} bookId - מזהה הספר
   * @returns {Object} מידע על קישורים זמינים
   */
  checkBookHasLinks(bookId) {
    if (!this.db || !bookId) {
      return null;
    }
    
    try {
      if (this.isElectron) {
        const result = window.electron.queryOtzariaDB(
          'SELECT * FROM book_has_links WHERE bookId = ?',
          [bookId]
        );
        return result.length > 0 ? result[0] : null;
      }
      return null;
    } catch (error) {
      console.error('❌ שגיאה בבדיקת קישורי ספר:', error);
      return null;
    }
  }

  /**
   * סגירת החיבור למסד הנתונים
   */
  close() {
    if (this.db) {
      try {
        if (this.isElectron) {
          window.electron.closeOtzariaDB();
        }
        this.db = null;
      } catch (error) {
        console.error('שגיאה בסגירת מסד הנתונים:', error);
      }
    }
  }
}

// יצירת instance יחיד (singleton)
const otzariaDB = new OtzariaDB();

export default otzariaDB;
