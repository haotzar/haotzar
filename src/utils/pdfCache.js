/**
 * מערכת cache ו-indexing לספרי PDF
 * מאפשרת טעינה מהירה של ספרים שנפתחו בעבר
 */

const CACHE_VERSION = '1.0';
const CACHE_KEY_PREFIX = 'pdf_cache_';

/**
 * יצירת מפתח cache ייחודי לספר
 */
const getCacheKey = (filePath) => {
  return `${CACHE_KEY_PREFIX}${btoa(filePath)}`;
};

/**
 * שמירת אינדקס של ספר ל-localStorage
 */
export const savePDFIndex = async (filePath, pdfDoc) => {
  try {
    const index = {
      version: CACHE_VERSION,
      filePath,
      pageCount: pdfDoc.numPages,
      timestamp: Date.now(),
      fingerprint: pdfDoc.fingerprints?.[0] || null,
    };

    const cacheKey = getCacheKey(filePath);
    localStorage.setItem(cacheKey, JSON.stringify(index));
    
    console.log('💾 אינדקס נשמר:', filePath, `(${pdfDoc.numPages} עמודים)`);
    return true;
  } catch (err) {
    console.warn('⚠️ לא ניתן לשמור אינדקס:', err);
    return false;
  }
};

/**
 * טעינת אינדקס של ספר מ-localStorage
 */
export const loadPDFIndex = (filePath) => {
  try {
    const cacheKey = getCacheKey(filePath);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      return null;
    }

    const index = JSON.parse(cached);
    
    // בדיקת גרסה
    if (index.version !== CACHE_VERSION) {
      console.log('🔄 גרסת cache ישנה, מנקה...');
      localStorage.removeItem(cacheKey);
      return null;
    }

    console.log('✅ אינדקס נטען מ-cache:', filePath);
    return index;
  } catch (err) {
    console.warn('⚠️ שגיאה בטעינת אינדקס:', err);
    return null;
  }
};

/**
 * ניקוי cache ישן (מעל 30 יום)
 */
export const cleanOldCache = () => {
  try {
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 יום
    let cleaned = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          
          if (now - data.timestamp > maxAge) {
            localStorage.removeItem(key);
            cleaned++;
          }
        } catch (err) {
          // מחק ערכים פגומים
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 נוקו ${cleaned} ערכי cache ישנים`);
    }
  } catch (err) {
    console.warn('⚠️ שגיאה בניקוי cache:', err);
  }
};

/**
 * קבלת סטטיסטיקות cache
 */
export const getCacheStats = () => {
  let count = 0;
  let totalSize = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    
    if (key?.startsWith(CACHE_KEY_PREFIX)) {
      count++;
      const value = localStorage.getItem(key);
      totalSize += value?.length || 0;
    }
  }

  return {
    count,
    sizeKB: (totalSize / 1024).toFixed(2),
  };
};

// נקה cache ישן בטעינה
cleanOldCache();
