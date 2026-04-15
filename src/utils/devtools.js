/**
 * DevTools Helper
 * כלי עזר לפתיחת DevTools מהקוד
 */

import { isTauri, isElectron } from './platform';

/**
 * פתיחת DevTools
 */
export function openDevTools() {
  if (isElectron()) {
    // ב-Electron, אין גישה ישירה ל-DevTools מה-renderer
    // אבל אפשר להשתמש ב-keyboard shortcuts
    console.log('💡 Press F12 or Ctrl+Shift+I to open DevTools');
  } else if (isTauri()) {
    // ב-Tauri, אפשר לפתוח DevTools רק ב-debug builds
    console.log('💡 DevTools available only in debug builds');
    console.log('💡 Run: npm run tauri:build:debug');
  } else {
    // ב-Web, DevTools זמין דרך הדפדפן
    console.log('💡 Press F12 to open browser DevTools');
  }
}

/**
 * הדפסת מידע דיבוג
 */
export function printDebugInfo() {
  console.group('🔍 Debug Information');
  
  // פלטפורמה
  console.log('Platform:', isTauri() ? 'Tauri' : isElectron() ? 'Electron' : 'Web');
  
  // User Agent
  console.log('User Agent:', navigator.userAgent);
  
  // גודל מסך
  console.log('Screen Size:', `${window.screen.width}x${window.screen.height}`);
  console.log('Window Size:', `${window.innerWidth}x${window.innerHeight}`);
  
  // זיכרון (אם זמין)
  if (performance.memory) {
    console.log('Memory Used:', `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('Memory Limit:', `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
  }
  
  // LocalStorage
  console.log('LocalStorage Items:', localStorage.length);
  
  // Cookies
  console.log('Cookies Enabled:', navigator.cookieEnabled);
  
  // Online Status
  console.log('Online:', navigator.onLine);
  
  console.groupEnd();
}

/**
 * הפעלת מצב דיבוג מתקדם
 * מדפיס לוגים מפורטים על כל פעולה
 */
export function enableVerboseLogging() {
  // שמור את console.log המקורי
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // עטוף את console.log עם timestamp
  console.log = function(...args) {
    const timestamp = new Date().toISOString();
    originalLog.apply(console, [`[${timestamp}]`, ...args]);
  };
  
  console.error = function(...args) {
    const timestamp = new Date().toISOString();
    originalError.apply(console, [`[${timestamp}] ❌`, ...args]);
  };
  
  console.warn = function(...args) {
    const timestamp = new Date().toISOString();
    originalWarn.apply(console, [`[${timestamp}] ⚠️`, ...args]);
  };
  
  console.log('✅ Verbose logging enabled');
}

/**
 * בדיקת ביצועים
 * מודד כמה זמן לוקחת פעולה
 */
export function measurePerformance(name, fn) {
  return async function(...args) {
    const start = performance.now();
    console.log(`⏱️ Starting: ${name}`);
    
    try {
      const result = await fn(...args);
      const end = performance.now();
      const duration = (end - start).toFixed(2);
      
      console.log(`✅ Completed: ${name} (${duration}ms)`);
      return result;
    } catch (error) {
      const end = performance.now();
      const duration = (end - start).toFixed(2);
      
      console.error(`❌ Failed: ${name} (${duration}ms)`, error);
      throw error;
    }
  };
}

/**
 * הדפסת מידע על שגיאה
 */
export function logError(error, context = '') {
  console.group(`❌ Error${context ? ` in ${context}` : ''}`);
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
  
  if (error.cause) {
    console.error('Cause:', error.cause);
  }
  
  console.groupEnd();
}

/**
 * בדיקת זיכרון
 */
export function checkMemory() {
  if (!performance.memory) {
    console.warn('⚠️ Memory API not available');
    return null;
  }
  
  const used = performance.memory.usedJSHeapSize;
  const total = performance.memory.totalJSHeapSize;
  const limit = performance.memory.jsHeapSizeLimit;
  
  const usedMB = (used / 1024 / 1024).toFixed(2);
  const totalMB = (total / 1024 / 1024).toFixed(2);
  const limitMB = (limit / 1024 / 1024).toFixed(2);
  const percentage = ((used / limit) * 100).toFixed(2);
  
  console.log(`💾 Memory: ${usedMB}MB / ${limitMB}MB (${percentage}%)`);
  
  if (percentage > 80) {
    console.warn('⚠️ High memory usage!');
  }
  
  return {
    used,
    total,
    limit,
    usedMB,
    totalMB,
    limitMB,
    percentage
  };
}

/**
 * ניטור ביצועים רציף
 */
export function startPerformanceMonitoring(interval = 5000) {
  console.log(`📊 Starting performance monitoring (every ${interval}ms)`);
  
  const monitoringInterval = setInterval(() => {
    console.group('📊 Performance Report');
    checkMemory();
    console.log('FPS:', Math.round(1000 / (performance.now() % 1000)));
    console.groupEnd();
  }, interval);
  
  // החזר פונקציה לעצירת הניטור
  return () => {
    clearInterval(monitoringInterval);
    console.log('🛑 Performance monitoring stopped');
  };
}

/**
 * הדפסת כל ה-localStorage
 */
export function dumpLocalStorage() {
  console.group('💾 LocalStorage Contents');
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    
    try {
      // נסה לפרסר כ-JSON
      const parsed = JSON.parse(value);
      console.log(key, ':', parsed);
    } catch {
      // אם זה לא JSON, הדפס כמו שהוא
      console.log(key, ':', value);
    }
  }
  
  console.groupEnd();
}

/**
 * ניקוי localStorage
 */
export function clearLocalStorage() {
  const count = localStorage.length;
  localStorage.clear();
  console.log(`🗑️ Cleared ${count} items from localStorage`);
}

// הוסף פונקציות ל-window לגישה קלה מה-console
if (typeof window !== 'undefined') {
  window.devtools = {
    open: openDevTools,
    info: printDebugInfo,
    verbose: enableVerboseLogging,
    measure: measurePerformance,
    logError,
    checkMemory,
    monitor: startPerformanceMonitoring,
    dumpStorage: dumpLocalStorage,
    clearStorage: clearLocalStorage
  };
  
  console.log('🔧 DevTools helper loaded. Use window.devtools for debugging utilities.');
  console.log('   window.devtools.open() - Open DevTools');
  console.log('   window.devtools.info() - Print debug info');
  console.log('   window.devtools.verbose() - Enable verbose logging');
  console.log('   window.devtools.checkMemory() - Check memory usage');
  console.log('   window.devtools.monitor() - Start performance monitoring');
  console.log('   window.devtools.dumpStorage() - Dump localStorage');
}
