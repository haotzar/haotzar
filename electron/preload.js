const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// משתנה גלובלי לשמירת חיבור ל-DB של אוצריא
let otzariaDB = null;
// Cache של prepared statements לביצועים טובים יותר
const preparedStatementsCache = new Map();

// חשיפת API בטוח לדף
contextBridge.exposeInMainWorld('electron', {
  // פעולות חלון
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // קריאת קובץ
  readFile: (filePath) => {
    return fs.readFileSync(filePath, 'utf8');
  },
  
  // קריאת קובץ כ-ArrayBuffer (לשימוש עם PDF)
  readFileAsBuffer: (filePath) => {
    const buffer = fs.readFileSync(filePath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  },
  
  // כתיבת קובץ
  writeFile: (filePath, data) => {
    fs.writeFileSync(filePath, data, 'utf8');
  },
  
  // בדיקה אם קובץ קיים
  fileExists: (filePath) => {
    return fs.existsSync(filePath);
  },
  
  // מחיקת קובץ
  deleteFile: (filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  },
  
  // קבלת נתיב userData - דרך IPC
  getUserDataPath: () => {
    return ipcRenderer.sendSync('get-user-data-path');
  },
  
  // יצירת נתיב מלא
  joinPath: (...paths) => {
    return path.join(...paths);
  },
  
  // יצירת תיקייה
  createDir: (dirPath) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  },
  
  // העתקת קובץ
  copyFile: (source, destination) => {
    fs.copyFileSync(source, destination);
  },
  
  // קבלת נתיב האפליקציה - דרך IPC
  getAppPath: () => {
    return ipcRenderer.sendSync('get-app-path');
  },
  
  // סריקת קבצים בתיקיות - אסינכרונית ומהירה!
  // חשוב: פונקציה זו רק אוספת נתיבי קבצים (strings)
  // היא לא קוראת את תוכן הקבצים לזיכרון!
  // הקבצים נטענים רק כשהמשתמש פותח אותם, בצורה streaming דרך PDF.js
  scanBooksInPaths: (paths) => {
    const allFiles = [];
    const MAX_FILES = 5000; // הפחתה ל-5000 קבצים מקסימום
    let fileCount = 0;
    
    function scanDirectory(dir, depth = 0) {
      // הגבלת עומק למניעת recursion אינסופי
      if (depth > 5 || fileCount >= MAX_FILES) { // הפחתה לעומק 5
        return;
      }
      
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        // סנן תיקיות מיותרות מראש
        const filteredEntries = entries.filter(entry => {
          const name = entry.name.toLowerCase();
          // דלג על תיקיות מערכת ו-node_modules
          return !name.startsWith('.') && 
                 name !== 'node_modules' && 
                 name !== '$recycle.bin' &&
                 name !== 'system volume information' &&
                 name !== 'windows' &&
                 name !== 'program files' &&
                 name !== 'program files (x86)';
        });
        
        for (const entry of filteredEntries) {
          if (fileCount >= MAX_FILES) break;
          
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            // סרוק רקורסיבית
            scanDirectory(fullPath, depth + 1);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (ext === '.pdf' || ext === '.txt') {
              // שמור רק את הנתיב - לא קורא את הקובץ!
              allFiles.push(fullPath);
              fileCount++;
            }
          }
        }
      } catch (error) {
        // שקט - דלג על תיקיות שאין גישה אליהן
        if (error.code !== 'EACCES' && error.code !== 'EPERM') {
          // אל תדפיס שגיאות - זה מאט
        }
      }
    }
    
    // סרוק כל תיקייה
    const startTime = Date.now();
    for (const dirPath of paths) {
      if (fs.existsSync(dirPath)) {
        scanDirectory(dirPath);
      }
    }
    
    const scanTime = Date.now() - startTime;
    if (fileCount >= MAX_FILES) {
      console.warn(`⚠️ הגעת למגבלת ${MAX_FILES} קבצים`);
    }
    
    return allFiles;
  },
  
  // סריקת תיקייה ספציפית לבניית אינדקס - מחזיר מערך של אובייקטי קבצים
  scanFolder: (folderPath) => {
    try {
      const allFiles = [];
      let fileCount = 0;
      const MAX_FILES = 10000;

      function scanDir(dir, depth = 0) {
        if (depth > 8 || fileCount >= MAX_FILES) return;
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (fileCount >= MAX_FILES) break;
            const name = entry.name.toLowerCase();
            if (name.startsWith('.') || name === 'node_modules') continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              scanDir(fullPath, depth + 1);
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name).toLowerCase();
              if (ext === '.pdf' || ext === '.txt') {
                allFiles.push({
                  id: `file_${fileCount}`,
                  name: path.basename(entry.name, ext),
                  path: fullPath,
                  type: ext === '.pdf' ? 'pdf' : 'text',
                });
                fileCount++;
              }
            }
          }
        } catch (_) {}
      }

      if (!fs.existsSync(folderPath)) {
        return { success: false, error: 'תיקייה לא נמצאה' };
      }
      scanDir(folderPath);
      return { success: true, files: allFiles };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // קבלת נתיב תיקיית books - ב-userData ולא ב-app.asar
  getBooksPath: () => {
    const userDataPath = ipcRenderer.sendSync('get-user-data-path');
    const booksPath = path.join(userDataPath, 'books');
    
    // צור את התיקייה אם היא לא קיימת
    if (!fs.existsSync(booksPath)) {
      fs.mkdirSync(booksPath, { recursive: true });
      console.log('📁 נוצרה תיקיית books:', booksPath);
    }
    
    return booksPath;
  },
  
  // בחירת תיקייה דרך dialog
  selectFolder: async () => {
    return ipcRenderer.invoke('select-folder');
  },
  
  // פתיחת תיקיית books
  openBooksFolder: async () => {
    return ipcRenderer.invoke('open-books-folder');
  },
  
  // פתיחת קישור חיצוני
  openExternal: async (url) => {
    return ipcRenderer.invoke('open-external', url);
  },
  
  // חיפוש גימטריה
  searchGematria: async (options) => {
    return ipcRenderer.invoke('search-gematria', options);
  },
  
  // הרצת סקריפט Node.js
  runScript: async (scriptName) => {
    return ipcRenderer.invoke('run-script', scriptName);
  },
  
  // פתיחת מסד נתונים של אוצריא
  openOtzariaDB: async (dbPath) => {
    try {
      const Database = require('better-sqlite3');
      otzariaDB = new Database(dbPath, { readonly: true });
      return { success: true };
    } catch (error) {
      console.error('Error opening Otzaria DB:', error);
      
      // בדיקה אם זו שגיאת NODE_MODULE_VERSION
      if (error.message && error.message.includes('NODE_MODULE_VERSION')) {
        return { 
          success: false, 
          error: error.message,
          needsRebuild: true,
          solution: 'Run: npm rebuild better-sqlite3'
        };
      }
      
      return { success: false, error: error.message };
    }
  },
  
  // שאילתה למסד נתונים אוצריא (עם cache של prepared statements)
  queryOtzariaDB: (sql, params = []) => {
    if (!otzariaDB) {
      throw new Error('Otzaria DB is not open');
    }
    try {
      // בדוק אם יש prepared statement ב-cache
      let stmt = preparedStatementsCache.get(sql);
      
      if (!stmt) {
        // צור prepared statement חדש ושמור ב-cache
        stmt = otzariaDB.prepare(sql);
        preparedStatementsCache.set(sql, stmt);
        console.log('📝 Created and cached prepared statement for:', sql.substring(0, 50) + '...');
      }
      
      return stmt.all(...params);
    } catch (error) {
      console.error('Error querying Otzaria DB:', error);
      throw error;
    }
  },
  
  // סגירת מסד נתונים אוצריא
  closeOtzariaDB: () => {
    if (otzariaDB) {
      // נקה את cache של prepared statements
      preparedStatementsCache.clear();
      otzariaDB.close();
      otzariaDB = null;    }
  },
  
  // הפעלת Meilisearch
  startMeilisearch: async (config) => {
    return ipcRenderer.invoke('start-meilisearch', config);
  },
  
  // עצירת Meilisearch
  stopMeilisearch: async () => {
    return ipcRenderer.invoke('stop-meilisearch');
  },
  
  // הפעלה מחדש של Meilisearch
  restartMeilisearch: async () => {
    return ipcRenderer.invoke('restart-meilisearch');
  },
  
  // איפוס data directory של Meilisearch
  resetMeilisearchData: async () => {
    return ipcRenderer.invoke('reset-meilisearch-data');
  },
  
  // בדיקת סטטוס Meilisearch
  getMeilisearchStatus: async () => {
    return ipcRenderer.invoke('meilisearch-status');
  },
  
  // תיקון אוטומטי של Meilisearch
  fixMeilisearch: async () => {
    return ipcRenderer.invoke('fix-meilisearch');
  },
  
  // קבלת רשימת אינדקסים מ-Meilisearch
  getMeilisearchIndexes: async () => {
    return ipcRenderer.invoke('get-meilisearch-indexes');
  },

  // ניקוי data directory של Meilisearch (לתיקון בעיות auth)
  resetMeilisearchData: async () => {
    return ipcRenderer.invoke('reset-meilisearch-data');
  },

  // פעולות אינדקס דרך main process
  meilisearchCreateIndex: async (indexName) => {
    return ipcRenderer.invoke('meilisearch-create-index', { indexName });
  },
  meilisearchAddDocuments: async (indexName, documents) => {
    return ipcRenderer.invoke('meilisearch-add-documents', { indexName, documents });
  },
  meilisearchUpdateSettings: async (indexName, settings) => {
    return ipcRenderer.invoke('meilisearch-update-settings', { indexName, settings });
  },

  // בחירת קובץ
  selectFile: async (filters) => {
    return ipcRenderer.invoke('select-file', filters);
  },

  // הרצת indexer.exe
  runIndexer: async (command) => {
    return ipcRenderer.invoke('run-indexer', command);
  },
});
