// Bridge לתקשורת עם WebView2

class WebView2Bridge {
  constructor() {
    this.isWebView2 = typeof window.chrome?.webview !== 'undefined';
    this.api = null;
    
    if (this.isWebView2) {
      // גישה ל-API של C#
      this.api = window.haotzarAPI;
    }
  }

  // בדיקה אם רצים ב-WebView2
  isAvailable() {
    return this.isWebView2 && this.api !== null;
  }

  // קבלת נתיב תיקיית הספרים
  getBooksPath() {
    if (!this.isAvailable()) return null;
    try {
      return this.api.GetBooksPath();
    } catch (error) {
      console.error('שגיאה בקבלת נתיב ספרים:', error);
      return null;
    }
  }

  // סריקת ספרים
  async scanBooks() {
    if (!this.isAvailable()) {
      console.warn('WebView2 API לא זמין');
      return [];
    }

    try {
      const result = this.api.ScanBooks();
      const books = JSON.parse(result);
      
      if (books.error) {
        console.error('שגיאה בסריקת ספרים:', books.error);
        return [];
      }
      
      return books;
    } catch (error) {
      console.error('שגיאה בסריקת ספרים:', error);
      return [];
    }
  }

  // פתיחת תיקיית הספרים
  openBooksFolder() {
    if (!this.isAvailable()) return;
    try {
      this.api.OpenBooksFolder();
    } catch (error) {
      console.error('שגיאה בפתיחת תיקייה:', error);
    }
  }

  // המרת נתיב לקובץ ל-URL שעובד ב-WebView2
  convertFilePath(filePath) {
    if (!this.isAvailable()) return filePath;
    
    // הקבצים כבר ממופים ל-https://books.local/
    // אז פשוט נחזיר את הנתיב כמו שהוא
    return filePath;
  }
}

// יצירת instance יחיד
const webview2Bridge = new WebView2Bridge();

export default webview2Bridge;
