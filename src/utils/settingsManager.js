// ניהול הגדרות אישיות בקובץ JSON

const SETTINGS_FILE_NAME = 'haotzer-settings.json';

// ברירות מחדל להגדרות
const DEFAULT_SETTINGS = {
  theme: 'light',
  openTabs: [],
  activeTabId: null,
  lastUpdated: null,
};

// טעינת הגדרות מ-localStorage (כגיבוי)
export const loadSettings = () => {
  try {
    const saved = localStorage.getItem('haotzer-settings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('שגיאה בטעינת הגדרות:', error);
  }
  return { ...DEFAULT_SETTINGS };
};

// שמירת הגדרות ל-localStorage
export const saveSettings = (settings) => {
  try {
    const settingsToSave = {
      ...settings,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem('haotzer-settings', JSON.stringify(settingsToSave));
    return true;
  } catch (error) {
    console.error('שגיאה בשמירת הגדרות:', error);
    return false;
  }
};

// ייצוא הגדרות לקובץ JSON
export const exportSettingsToFile = async () => {
  try {
    const settings = loadSettings();
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: 'application/json',
    });

    // יצירת קישור להורדה
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = SETTINGS_FILE_NAME;
    link.click();
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('שגיאה בייצוא הגדרות:', error);
    return false;
  }
};

// ייבוא הגדרות מקובץ JSON
export const importSettingsFromFile = () => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) {
          reject(new Error('לא נבחר קובץ'));
          return;
        }

        const text = await file.text();
        const settings = JSON.parse(text);

        // ולידציה בסיסית
        if (typeof settings !== 'object') {
          reject(new Error('קובץ לא תקין'));
          return;
        }

        // שמירת ההגדרות
        saveSettings(settings);
        resolve(settings);
      } catch (error) {
        reject(error);
      }
    };

    input.click();
  });
};

// מחיקת כל ההגדרות
export const clearAllSettings = () => {
  try {
    localStorage.removeItem('haotzer-settings');
    return true;
  } catch (error) {
    console.error('שגיאה במחיקת הגדרות:', error);
    return false;
  }
};

// עדכון הגדרה ספציפית
export const updateSetting = (key, value) => {
  const settings = loadSettings();
  settings[key] = value;
  return saveSettings(settings);
};

// קבלת הגדרה ספציפית
export const getSetting = (key, defaultValue = null) => {
  const settings = loadSettings();
  return settings[key] !== undefined ? settings[key] : defaultValue;
};
