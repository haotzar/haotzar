// מערכת לוגים מותנית - רק בפיתוח ורק אם מופעל

const LOGS_ENABLED = import.meta.env.VITE_DISABLE_LOGS !== 'true';

export const log = (...args) => {
  if (LOGS_ENABLED) {
    console.log(...args);
  }
};

export const warn = (...args) => {
  if (LOGS_ENABLED) {
    console.warn(...args);
  }
};

export const error = (...args) => {
  // שגיאות תמיד מוצגות
  console.error(...args);
};

export default { log, warn, error };
