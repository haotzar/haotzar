/**
 * Platform Detection and Unified API
 * מזהה את הפלטפורמה (Tauri/Electron/Web) ומספק API אחיד
 */

// זיהוי פלטפורמה
export const isTauri = () => typeof window !== 'undefined' && window.__TAURI__ !== undefined;
export const isElectron = () => typeof window !== 'undefined' && window.electron !== undefined;
export const isWeb = () => !isTauri() && !isElectron();

// קבלת שם הפלטפורמה
export const getPlatformName = () => {
  if (isTauri()) return 'Tauri';
  if (isElectron()) return 'Electron';
  return 'Web';
};

/**
 * קריאת קובץ טקסט
 * @param {string} filePath - נתיב הקובץ
 * @returns {Promise<string>} - תוכן הקובץ
 */
export async function readTextFile(filePath) {
  if (isTauri()) {
    try {
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      return await readTextFile(filePath);
    } catch (error) {
      console.error('❌ Error reading text file via Tauri:', error);
      throw error;
    }
  } else if (isElectron()) {
    return window.electron.readFile(filePath);
  } else {
    const response = await fetch(filePath);
    return await response.text();
  }
}

/**
 * קריאת קובץ בינארי (למשל PDF)
 * @param {string} filePath - נתיב הקובץ
 * @returns {Promise<ArrayBuffer>} - תוכן הקובץ כ-ArrayBuffer
 */
export async function readBinaryFile(filePath) {
  if (isTauri()) {
    try {
      const { readBinaryFile } = await import('@tauri-apps/plugin-fs');
      return await readBinaryFile(filePath);
    } catch (error) {
      console.error('❌ Error reading binary file via Tauri:', error);
      throw error;
    }
  } else if (isElectron()) {
    return window.electron.readFileAsBuffer(filePath);
  } else {
    const response = await fetch(filePath);
    return await response.arrayBuffer();
  }
}

/**
 * המרת נתיב קובץ ל-URL שניתן להשתמש בו ב-src
 * @param {string} filePath - נתיב הקובץ
 * @returns {Promise<string>} - URL של הקובץ
 */
export async function convertFileToUrl(filePath) {
  if (isTauri()) {
    try {
      const { convertFileSrc } = await import('@tauri-apps/api/core');
      return convertFileSrc(filePath);
    } catch (error) {
      console.error('❌ Error converting file path via Tauri:', error);
      throw error;
    }
  } else if (isElectron()) {
    // ב-Electron, צור Blob URL
    const buffer = window.electron.readFileAsBuffer(filePath);
    const blob = new Blob([buffer]);
    return URL.createObjectURL(blob);
  } else {
    // ב-Web, החזר את הנתיב כמו שהוא
    return filePath;
  }
}

/**
 * בדיקה אם קובץ קיים
 * @param {string} filePath - נתיב הקובץ
 * @returns {Promise<boolean>} - האם הקובץ קיים
 */
export async function fileExists(filePath) {
  if (isTauri()) {
    try {
      const { exists } = await import('@tauri-apps/plugin-fs');
      return await exists(filePath);
    } catch (error) {
      console.error('❌ Error checking file existence via Tauri:', error);
      return false;
    }
  } else if (isElectron()) {
    return window.electron.fileExists(filePath);
  } else {
    try {
      const response = await fetch(filePath, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * כתיבת קובץ
 * @param {string} filePath - נתיב הקובץ
 * @param {string} content - תוכן הקובץ
 */
export async function writeFile(filePath, content) {
  if (isTauri()) {
    try {
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      await writeTextFile(filePath, content);
    } catch (error) {
      console.error('❌ Error writing file via Tauri:', error);
      throw error;
    }
  } else if (isElectron()) {
    window.electron.writeFile(filePath, content);
  } else {
    throw new Error('File writing not supported in web mode');
  }
}

/**
 * מחיקת קובץ
 * @param {string} filePath - נתיב הקובץ
 */
export async function deleteFile(filePath) {
  if (isTauri()) {
    try {
      const { removeFile } = await import('@tauri-apps/plugin-fs');
      await removeFile(filePath);
    } catch (error) {
      console.error('❌ Error deleting file via Tauri:', error);
      throw error;
    }
  } else if (isElectron()) {
    window.electron.deleteFile(filePath);
  } else {
    throw new Error('File deletion not supported in web mode');
  }
}

/**
 * בחירת תיקייה דרך dialog
 * @returns {Promise<string|null>} - נתיב התיקייה שנבחרה או null
 */
export async function selectFolder() {
  if (isTauri()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      return await open({
        directory: true,
        multiple: false
      });
    } catch (error) {
      console.error('❌ Error selecting folder via Tauri:', error);
      return null;
    }
  } else if (isElectron()) {
    return await window.electron.selectFolder();
  } else {
    throw new Error('Folder selection not supported in web mode');
  }
}

/**
 * פתיחת קישור חיצוני
 * @param {string} url - הקישור לפתיחה
 */
export async function openExternal(url) {
  if (isTauri()) {
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
    } catch (error) {
      console.error('❌ Error opening external link via Tauri:', error);
    }
  } else if (isElectron()) {
    await window.electron.openExternal(url);
  } else {
    window.open(url, '_blank');
  }
}

/**
 * קבלת נתיב תיקיית האפליקציה
 * @returns {Promise<string>} - נתיב תיקיית האפליקציה
 */
export async function getAppDataPath() {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke('get_app_data_path');
    } catch (error) {
      console.error('❌ Error getting app data path via Tauri:', error);
      throw error;
    }
  } else if (isElectron()) {
    return window.electron.getUserDataPath();
  } else {
    throw new Error('App data path not available in web mode');
  }
}

/**
 * קבלת נתיב תיקיית books
 * @returns {Promise<string>} - נתיב תיקיית books
 */
export async function getBooksPath() {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke('get_books_path');
    } catch (error) {
      console.error('❌ Error getting books path via Tauri:', error);
      throw error;
    }
  } else if (isElectron()) {
    return window.electron.getBooksPath();
  } else {
    throw new Error('Books path not available in web mode');
  }
}

/**
 * הפעלת Meilisearch
 * @param {Object} config - תצורת Meilisearch
 * @returns {Promise<Object>} - תוצאת ההפעלה
 */
export async function startMeilisearch(config) {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke('start_meilisearch', config);
    } catch (error) {
      console.error('❌ Error starting Meilisearch via Tauri:', error);
      return { success: false, error: error.message };
    }
  } else if (isElectron()) {
    return await window.electron.startMeilisearch(config);
  } else {
    throw new Error('Meilisearch not supported in web mode');
  }
}

/**
 * עצירת Meilisearch
 * @returns {Promise<void>}
 */
export async function stopMeilisearch() {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('stop_meilisearch');
    } catch (error) {
      console.error('❌ Error stopping Meilisearch via Tauri:', error);
    }
  } else if (isElectron()) {
    await window.electron.stopMeilisearch();
  } else {
    throw new Error('Meilisearch not supported in web mode');
  }
}

console.log(`🚀 Platform detected: ${getPlatformName()}`);

