import FlexSearch from 'flexsearch';
import { extractTextFromPDF } from './pdfExtractor';

// מנוע חיפוש מקצועי עם FlexSearch - הכי מהיר שיש!
class SearchEngine {
  constructor() {
    this.flexIndex = null;
    this.documentsMap = new Map(); // מפת מסמכים מלאים
    this.isIndexing = false;
    this.indexProgress = 0;
    this.chunkSize = 2000; // גודל חלק (תווים)
  }

  // בניית אינדקס FlexSearch מלא (כולל PDF)
  async buildIndex(files, onProgress) {
    this.isIndexing = true;
    this.indexProgress = 0;
    this.documentsMap.clear();
    
    // כולל גם קבצי טקסט וגם PDF
    const indexableFiles = files.filter(file => file.type === 'text' || file.type === 'pdf');
    
    console.log(`🚀 מתחיל בניית אינדקס FlexSearch עבור ${indexableFiles.length} קבצים (טקסט + PDF)...`);
    const startTime = Date.now();
    
    // יצירת אינדקס FlexSearch עם הגדרות אופטימליות
    this.flexIndex = new FlexSearch.Document({
      document: {
        id: 'id',
        index: ['fileName', 'content'],
        store: ['fileId', 'fileName', 'chunkIndex']
      },
      tokenize: 'forward', // חיפוש חלקי מהתחלה
      resolution: 9, // רזולוציה גבוהה = דיוק טוב יותר
      context: {
        depth: 2,
        bidirectional: true
      }
    });
    
    // שלב 1: טעינת קבצים והוספה לאינדקס
    for (let i = 0; i < indexableFiles.length; i++) {
      const file = indexableFiles[i];
      
      try {
        let content = '';
        
        // טעינת תוכן לפי סוג הקובץ
        if (file.type === 'text') {
          content = await this.loadFileContent(file.path);
        } else if (file.type === 'pdf') {
          console.log(`📄 מעבד PDF: ${file.name}`);
          content = await extractTextFromPDF(file.path);
        }
        
        if (!content) {
          console.warn(`⚠️ לא נמצא תוכן ב-${file.name}`);
          continue;
        }
        
        // חלק את הקובץ לחלקים
        const chunks = this.splitIntoChunks(content, this.chunkSize);
        
        // שמור את המסמך המלא
        this.documentsMap.set(file.id, {
          file,
          content,
          chunks
        });
        
        // הוסף כל חלק לאינדקס
        chunks.forEach((chunk, chunkIndex) => {
          this.flexIndex.add({
            id: `${file.id}_${chunkIndex}`,
            fileId: file.id,
            fileName: file.name,
            chunkIndex,
            content: chunk
          });
        });
        
        this.indexProgress = ((i + 1) / indexableFiles.length) * 100;
        
        // עדכון התקדמות
        if (onProgress) {
          onProgress({
            progress: this.indexProgress,
            currentFile: file.name,
            filesProcessed: i + 1,
            totalFiles: indexableFiles.length
          });
        }
        
        if ((i + 1) % 5 === 0) {
          console.log(`📊 עיבוד: ${i + 1}/${indexableFiles.length} קבצים`);
        }
      } catch (error) {
        console.error(`❌ שגיאה בעיבוד ${file.name}:`, error);
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    this.isIndexing = false;
    
    console.log(`✅ אינדקס FlexSearch הושלם ב-${duration} שניות`);
    console.log(`📚 ${indexableFiles.length} קבצים, ${this.documentsMap.size} מסמכים`);
    
    // שמירת האינדקס לקובץ פיזי
    await this.saveIndexToFile();
  }

  // טעינת תוכן קובץ
  async loadFileContent(path) {
    try {
      // בדיקה אם אנחנו ב-Tauri
      const isTauri = window.__TAURI__ !== undefined;
      
      if (isTauri) {
        try {
          const { readTextFile } = await import('@tauri-apps/plugin-fs');
          return await readTextFile(path);
        } catch (error) {
          console.error('❌ Error reading file via Tauri:', error);
          throw error;
        }
      } else {
        const response = await fetch(path);
        return await response.text();
      }
    } catch (error) {
      console.error('שגיאה בטעינת קובץ:', error);
      return '';
    }
  }

  // חלוקת טקסט לחלקים (לפי תווים)
  splitIntoChunks(text, charsPerChunk) {
    const chunks = [];
    
    for (let i = 0; i < text.length; i += charsPerChunk) {
      const chunk = text.substring(i, i + charsPerChunk);
      chunks.push(chunk);
    }
    
    return chunks;
  }

  // חיפוש מהיר עם FlexSearch
  async search(query, options = {}) {
    const {
      maxResults = 50,
      contextLength = 150,
    } = options;

    if (!query || query.trim().length === 0 || !this.flexIndex) {
      return [];
    }

    try {
      // חיפוש באינדקס FlexSearch
      const flexResults = await this.flexIndex.search(query, {
        limit: maxResults * 3,
        enrich: true
      });
      
      console.log(`🔍 FlexSearch מצא ${flexResults.length} שדות עם תוצאות`);
      
      // עיבוד תוצאות
      const resultsMap = new Map();
      
      // FlexSearch מחזיר מערך של שדות, כל שדה עם תוצאות
      for (const fieldResult of flexResults) {
        for (const result of fieldResult.result) {
          const [fileId, chunkIndex] = result.id.split('_');
          
          if (!resultsMap.has(fileId)) {
            const docData = this.documentsMap.get(fileId);
            if (!docData) continue;
            
            resultsMap.set(fileId, {
              file: docData.file,
              matchCount: 0,
              contexts: []
            });
          }
          
          const fileResult = resultsMap.get(fileId);
          const docData = this.documentsMap.get(fileId);
          const chunkIndexNum = parseInt(chunkIndex);
          const chunkContent = docData.chunks[chunkIndexNum];
          
          // מצא את ההקשר של המילה בחלק
          const contexts = this.extractContexts(chunkContent, query, contextLength, chunkIndexNum);
          
          fileResult.contexts.push(...contexts);
          fileResult.matchCount += contexts.length;
        }
      }
      
      // המר למערך וממיין
      const results = Array.from(resultsMap.values())
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, maxResults)
        .map(result => ({
          ...result,
          contexts: result.contexts.slice(0, 3) // רק 3 הקשרים ראשונים
        }));
      
      console.log(`✅ מחזיר ${results.length} תוצאות`);
      return results;
    } catch (error) {
      console.error('❌ שגיאה בחיפוש FlexSearch:', error);
      return [];
    }
  }

  // חילוץ הקשרים של מילת החיפוש
  extractContexts(text, query, contextLength, chunkIndex = 0) {
    const contexts = [];
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // חישוב מספר עמוד משוער
    // נניח בממוצע 1500 תווים לעמוד PDF (כולל רווחים)
    const charsPerPage = 1500;
    const chunkStart = chunkIndex * this.chunkSize;
    
    let index = 0;
    while (index < lowerText.length && contexts.length < 3) {
      const foundIndex = lowerText.indexOf(lowerQuery, index);
      if (foundIndex === -1) break;
      
      const start = Math.max(0, foundIndex - contextLength);
      const end = Math.min(text.length, foundIndex + query.length + contextLength);
      
      let contextText = text.substring(start, end);
      
      if (start > 0) contextText = '...' + contextText;
      if (end < text.length) contextText = contextText + '...';
      
      // חישוב מיקום מדויק בקובץ
      const absolutePosition = chunkStart + foundIndex;
      const estimatedPage = Math.floor(absolutePosition / charsPerPage) + 1;
      
      contexts.push({
        text: contextText,
        matchIndex: foundIndex - start + (start > 0 ? 3 : 0),
        matchLength: query.length,
        chunkId: chunkIndex,
        chunkStart: chunkStart,
        pageNum: estimatedPage // הוסף מספר עמוד משוער
      });
      
      index = foundIndex + 1;
    }
    
    return contexts;
  }

  // שמירת אינדקס לקובץ פיזי
  async saveIndexToFile() {
    try {
      const isElectron = window.electron !== undefined;
      
      // ייצוא האינדקס - FlexSearch מחזיר Promise עם callback
      const exportedIndex = await new Promise((resolve, reject) => {
        try {
          const result = this.flexIndex.export((key, data) => {
            // FlexSearch קורא ל-callback הזה עבור כל חלק של האינדקס
            return data;
          });
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      const documentsData = Array.from(this.documentsMap.entries());
      
      const indexData = {
        flexIndex: exportedIndex,
        documents: documentsData,
        timestamp: Date.now(),
        version: '1.0'
      };
      
      const jsonData = JSON.stringify(indexData);
      const sizeInMB = (jsonData.length / 1024 / 1024).toFixed(2);
      console.log(`💾 גודל אינדקס: ${sizeInMB}MB`);
      
      if (isElectron) {
        // שמירה לקובץ פיזי באלקטרון דרך preload API
        const userDataPath = window.electron.getUserDataPath();
        const indexPath = window.electron.joinPath(userDataPath, 'flexsearch-index.json');
        
        window.electron.writeFile(indexPath, jsonData);
        console.log(`✅ אינדקס נשמר בקובץ: ${indexPath}`);
        return true;
      } else {
        // fallback ל-IndexedDB אם לא באלקטרון
        await this.saveToIndexedDB(indexData);
        console.log('✅ אינדקס נשמר ב-IndexedDB');
        return true;
      }
    } catch (error) {
      console.error('❌ שגיאה בשמירת אינדקס:', error);
      return false;
    }
  }

  // שמירה ב-IndexedDB (ללא הגבלת גודל)
  async saveToIndexedDB(data) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SearchIndexDB', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('indexes')) {
          db.createObjectStore('indexes');
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['indexes'], 'readwrite');
        const store = transaction.objectStore('indexes');
        
        store.put(data, 'flexsearch');
        
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }

  // טעינת אינדקס מקובץ פיזי
  async loadIndexFromFile() {
    try {
      const isElectron = window.electron !== undefined;
      let indexData;
      
      if (isElectron) {
        // טעינה מקובץ באלקטרון דרך preload API
        const userDataPath = window.electron.getUserDataPath();
        const indexPath = window.electron.joinPath(userDataPath, 'flexsearch-index.json');
        
        // בדוק אם הקובץ קיים
        if (!window.electron.fileExists(indexPath)) {
          console.log('ℹ️ לא נמצא אינדקס קיים');
          return false;
        }
        
        const content = window.electron.readFile(indexPath);
        indexData = JSON.parse(content);
        console.log(`📂 אינדקס נטען מקובץ: ${indexPath}`);
      } else {
        // טעינה מ-IndexedDB
        indexData = await this.loadFromIndexedDB();
        if (!indexData) return false;
        console.log('📂 אינדקס נטען מ-IndexedDB');
      }
      
      // בדיקת תקינות (לא ישן מדי - 30 יום)
      const daysSinceCreation = (Date.now() - indexData.timestamp) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 30) {
        console.log('⚠️ אינדקס ישן מדי (יותר מ-30 יום), יש לבנות מחדש');
        return false;
      }
      
      // שחזור האינדקס
      this.flexIndex = new FlexSearch.Document({
        document: {
          id: 'id',
          index: ['fileName', 'content'],
          store: ['fileId', 'fileName', 'chunkIndex']
        },
        tokenize: 'forward',
        resolution: 9,
        context: {
          depth: 2,
          bidirectional: true
        }
      });
      
      // ייבוא האינדקס - FlexSearch מצפה ל-callback
      await new Promise((resolve, reject) => {
        try {
          this.flexIndex.import(indexData.flexIndex, (key) => {
            // FlexSearch קורא ל-callback הזה עבור כל חלק של האינדקס
            return indexData.flexIndex[key];
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
      this.documentsMap = new Map(indexData.documents);
      
      console.log(`✅ אינדקס נטען בהצלחה (${this.documentsMap.size} קבצים)`);
      return true;
    } catch (error) {
      console.log('ℹ️ לא נמצא אינדקס קיים או שגיאה בטעינה:', error.message);
      return false;
    }
  }

  // טעינה מ-IndexedDB
  async loadFromIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SearchIndexDB', 1);
      
      request.onerror = () => resolve(null);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('indexes')) {
          db.close();
          resolve(null);
          return;
        }
        
        const transaction = db.transaction(['indexes'], 'readonly');
        const store = transaction.objectStore('indexes');
        const getRequest = store.get('flexsearch');
        
        getRequest.onsuccess = () => {
          db.close();
          resolve(getRequest.result);
        };
        
        getRequest.onerror = () => {
          db.close();
          resolve(null);
        };
      };
    });
  }

  // בדיקה אם האינדקס מוכן
  isReady() {
    return !this.isIndexing && this.flexIndex !== null;
  }

  // קבלת התקדמות האינדקס
  getProgress() {
    return this.indexProgress;
  }

  // קבלת מספר הקבצים
  getFilesCount() {
    return this.documentsMap.size;
  }

  // מחיקת אינדקס (לבנייה מחדש)
  async clearIndex() {
    try {
      const isElectron = window.electron !== undefined;
      
      if (isElectron) {
        // מחיקת קובץ באלקטרון דרך preload API
        const userDataPath = window.electron.getUserDataPath();
        const indexPath = window.electron.joinPath(userDataPath, 'flexsearch-index.json');
        
        window.electron.deleteFile(indexPath);
        console.log('🗑️ אינדקס נמחק מהדיסק');
      } else {
        // מחיקה מ-IndexedDB
        await new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase('SearchIndexDB');
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        console.log('🗑️ אינדקס נמחק מ-IndexedDB');
      }
      
      // נקה זיכרון
      this.flexIndex = null;
      this.documentsMap.clear();
      
      return true;
    } catch (error) {
      console.error('❌ שגיאה במחיקת אינדקס:', error);
      return false;
    }
  }
}

// יצירת instance יחיד
const searchEngine = new SearchEngine();

export default searchEngine;

