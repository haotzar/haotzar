// פונקציה גלובלית להצגת התראות מותאמות אישית
// משתמשת ב-CustomAlert component דרך callback

let showAlertCallback = null;

export const registerAlertCallback = (callback) => {
  showAlertCallback = callback;
};

export const customAlert = (message, options = {}) => {
  if (showAlertCallback) {
    return showAlertCallback(message, options);
  }
  // fallback לדפדפן רגיל
  return Promise.resolve(window.alert(message));
};

// ייצוא כ-default גם כן
export default customAlert;
