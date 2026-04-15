/**
 * דוגמאות שימוש ב-Platform API
 * 
 * קובץ זה מכיל דוגמאות לשימוש ב-API האחיד שעובד
 * גם ב-Tauri וגם ב-Electron
 */

import {
  isTauri,
  isElectron,
  getPlatformName,
  readTextFile,
  readBinaryFile,
  writeFile,
  fileExists,
  deleteFile,
  selectFolder,
  openExternal,
  getAppDataPath,
  convertFileToUrl
} from './platform';

// ===== דוגמה 1: זיהוי פלטפורמה =====
export function detectPlatform() {
  console.log(`🚀 Running on: ${getPlatformName()}`);
  
  if (isTauri()) {
    console.log('✅ Tauri detected - lightweight and fast!');
  } else if (isElectron()) {
    console.log('✅ Electron detected - wide compatibility!');
  } else {
    console.log('🌐 Running in web browser');
  }
}

// ===== דוגמה 2: קריאת קובץ טקסט =====
export async function loadTextBook(bookPath) {
  try {
    console.log(`📖 Loading text book: ${bookPath}`);
    const content = await readTextFile(bookPath);
    console.log(`✅ Loaded ${content.length} characters`);
    return content;
  } catch (error) {
    console.error('❌ Error loading text book:', error);
    throw error;
  }
}

// ===== דוגמה 3: קריאת קובץ PDF =====
export async function loadPDFBook(pdfPath) {
  try {
    console.log(`📄 Loading PDF book: ${pdfPath}`);
    const arrayBuffer = await readBinaryFile(pdfPath);
    console.log(`✅ Loaded ${arrayBuffer.byteLength} bytes`);
    return arrayBuffer;
  } catch (error) {
    console.error('❌ Error loading PDF book:', error);
    throw error;
  }
}

// ===== דוגמה 4: המרת נתיב קובץ ל-URL =====
export async function getPDFUrl(pdfPath) {
  try {
    // בדוק אם הקובץ קיים
    const exists = await fileExists(pdfPath);
    if (!exists) {
      throw new Error(`File not found: ${pdfPath}`);
    }
    
    // המר לURL שניתן להשתמש בו ב-iframe או img
    const url = await convertFileToUrl(pdfPath);
    console.log(`✅ Converted to URL: ${url.substring(0, 50)}...`);
    return url;
  } catch (error) {
    console.error('❌ Error converting file to URL:', error);
    throw error;
  }
}

// ===== דוגמה 5: שמירת הערות =====
export async function saveNotes(bookId, notes) {
  try {
    const appDataPath = await getAppDataPath();
    const notesPath = `${appDataPath}/notes/${bookId}.json`;
    
    const notesData = JSON.stringify(notes, null, 2);
    await writeFile(notesPath, notesData);
    
    console.log(`✅ Notes saved to: ${notesPath}`);
    return true;
  } catch (error) {
    console.error('❌ Error saving notes:', error);
    return false;
  }
}

// ===== דוגמה 6: טעינת הערות =====
export async function loadNotes(bookId) {
  try {
    const appDataPath = await getAppDataPath();
    const notesPath = `${appDataPath}/notes/${bookId}.json`;
    
    // בדוק אם הקובץ קיים
    const exists = await fileExists(notesPath);
    if (!exists) {
      console.log('ℹ️ No notes found for this book');
      return [];
    }
    
    const notesData = await readTextFile(notesPath);
    const notes = JSON.parse(notesData);
    
    console.log(`✅ Loaded ${notes.length} notes`);
    return notes;
  } catch (error) {
    console.error('❌ Error loading notes:', error);
    return [];
  }
}

// ===== דוגמה 7: מחיקת הערות =====
export async function deleteNotes(bookId) {
  try {
    const appDataPath = await getAppDataPath();
    const notesPath = `${appDataPath}/notes/${bookId}.json`;
    
    await deleteFile(notesPath);
    console.log(`✅ Notes deleted: ${notesPath}`);
    return true;
  } catch (error) {
    console.error('❌ Error deleting notes:', error);
    return false;
  }
}

// ===== דוגמה 8: בחירת תיקיית ספרים =====
export async function selectBooksFolder() {
  try {
    console.log('📁 Opening folder selection dialog...');
    const folderPath = await selectFolder();
    
    if (folderPath) {
      console.log(`✅ Selected folder: ${folderPath}`);
      return folderPath;
    } else {
      console.log('ℹ️ User cancelled folder selection');
      return null;
    }
  } catch (error) {
    console.error('❌ Error selecting folder:', error);
    return null;
  }
}

// ===== דוגמה 9: פתיחת קישור חיצוני =====
export async function openWebsite(url) {
  try {
    console.log(`🔗 Opening external link: ${url}`);
    await openExternal(url);
    console.log('✅ Link opened successfully');
  } catch (error) {
    console.error('❌ Error opening link:', error);
  }
}

// ===== דוגמה 10: שימוש מותנה בפלטפורמה =====
export async function performPlatformSpecificAction() {
  if (isTauri()) {
    // פעולה ספציפית ל-Tauri
    console.log('🦀 Performing Tauri-specific action...');
    // כאן אפשר להשתמש ב-Tauri API ישירות אם צריך
    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const result = await invoke('some_rust_command');
      return result;
    } catch (error) {
      console.error('❌ Tauri command failed:', error);
    }
  } else if (isElectron()) {
    // פעולה ספציפית ל-Electron
    console.log('⚡ Performing Electron-specific action...');
    // כאן אפשר להשתמש ב-Electron API ישירות
    if (window.electron && window.electron.someElectronFunction) {
      return await window.electron.someElectronFunction();
    }
  } else {
    console.log('🌐 Web mode - limited functionality');
  }
}

// ===== דוגמה 11: טיפול בשגיאות =====
export async function safeFileOperation(filePath) {
  try {
    // נסה לקרוא את הקובץ
    const content = await readTextFile(filePath);
    return { success: true, content };
  } catch (error) {
    // טפל בשגיאה בצורה מסודרת
    console.error('❌ File operation failed:', error);
    
    // החזר אובייקט שגיאה ידידותי
    return {
      success: false,
      error: error.message,
      platform: getPlatformName()
    };
  }
}

// ===== דוגמה 12: בדיקת תאימות =====
export function checkPlatformCapabilities() {
  const capabilities = {
    platform: getPlatformName(),
    fileSystem: isTauri() || isElectron(),
    dialogs: isTauri() || isElectron(),
    externalLinks: true,
    nativeMenus: isTauri() || isElectron(),
    systemTray: isTauri() || isElectron()
  };
  
  console.log('🔍 Platform capabilities:', capabilities);
  return capabilities;
}

// ===== שימוש בדוגמאות =====
/*
// בקומפוננטה React:
import { loadTextBook, selectBooksFolder, openWebsite } from './utils/platform-example';

function MyComponent() {
  const handleLoadBook = async () => {
    const content = await loadTextBook('/path/to/book.txt');
    // עשה משהו עם התוכן
  };
  
  const handleSelectFolder = async () => {
    const folder = await selectBooksFolder();
    if (folder) {
      // שמור את הנתיב
    }
  };
  
  return (
    <div>
      <button onClick={handleLoadBook}>Load Book</button>
      <button onClick={handleSelectFolder}>Select Folder</button>
      <button onClick={() => openWebsite('https://example.com')}>
        Open Website
      </button>
    </div>
  );
}
*/
