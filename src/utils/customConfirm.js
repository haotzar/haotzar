// פונקציה גלובלית להצגת דיאלוגי אישור מותאמים אישית
// משתמשת ב-CustomConfirm component דרך callback

let showConfirmCallback = null;

export const registerConfirmCallback = (callback) => {
  showConfirmCallback = callback;
};

export const customConfirm = (message, options = {}) => {
  if (showConfirmCallback) {
    return showConfirmCallback(message, options);
  }
  // fallback לדפדפן רגיל
  return Promise.resolve(window.confirm(message));
};

// ייצוא כ-default גם כן
export default customConfirm;
