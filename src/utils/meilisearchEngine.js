import { MeiliSearch } from 'meilisearch';
import { extractTextFromPDF } from './pdfExtractor';

// מנוע חיפוש מקצועי עם Meilisearch (Rust)
class MeilisearchEngine {
  constructor() {
    this.client = null;
    this.index = null;
    this.isIndexing = false;
    this.indexProgress = 0;
    this.serverProcess = null;
    this.serverPort = 7700;
    this.masterKey = null; // לא משתמשים ב-master key - רק לשימוש מקומי
    this.filesCount = 0;
    this.serverReady = false; // אינדיקטור שהשרת מוכן
    this.cachedIndexes = null; // cache לרשימת אינדקסים
    this.indexesCacheTime = null; // זמן ה-cache
    this.pendingIndexesRequest = null; // בקשה פעילה לאינדקסים
    this.connectionAborted = false; // דגל לביטול התחברות ברקע
    this.lastIndexesRequestTime = null; // זמן הבקשה האחרונה לאינדקסים
    this.consecutiveFailures = 0; // מספר כשלונות רצופים
    this.circuitBreakerOpen = false; // האם circuit breaker פתוח
    this.circuitBreakerResetTime = null; // מתי לנסות שוב
    this.clientTimeout = 120000; // 120 שניות timeout - מספיק לאינדקסים גדולים
  }

  // קבלת רשימת כל האינדקסים הזמינים
  async getAvailableIndexes(forceRefresh = false) {
    // אם יש בקשה פעילה, המתן לה במקום ליצור בקשה חדשה
    if (this.pendingIndexesRequest) {
      console.log('⏳ ממתין לבקשת אינדקסים קיימת...');
      return this.pendingIndexesRequest;
    }
    
    // אם יש cache ולא מבקשים refresh, החזר מה-cache
    const CACHE_DURATION = 30000; // 30 שניות - 🎯 הקטן cache
    if (!forceRefresh && this.cachedIndexes && this.indexesCacheTime) {
      const cacheAge = Date.now() - this.indexesCacheTime;
      if (cacheAge < CACHE_DURATION) {
        console.log(`📦 משתמש ב-cache של אינדקסים (גיל: ${Math.round(cacheAge / 1000)}s)`);
        return this.cachedIndexes;
      }
    }
    
    // בדוק אם יש יותר מדי בקשות לאחרונה - החזר cache אם יש
    const now = Date.now();
    if (this.lastIndexesRequestTime && (now - this.lastIndexesRequestTime < 5000)) {
      console.warn('⚠️ יותר מדי בקשות - משתמש ב-cache');
      if (this.cachedIndexes && this.cachedIndexes.length > 0) {
        return this.cachedIndexes;
      }
      // אם אין cache, סמן שהשרת לא מוכן וזרוק שגיאה
      this.serverReady = false;
      throw new Error('Too many requests - please wait');
    }
    
    // צור בקשה חדשה ושמור אותה
    this.pendingIndexesRequest = this._fetchIndexes()
      .catch(error => {
        // אם יש שגיאת חיבור, סמן שהשרת לא מוכן
        if (error.message && (error.message.includes('Failed to fetch') || 
            error.message.includes('Network request failed') ||
            error.message.includes('has failed'))) {
          console.warn('⚠️ לא ניתן להתחבר ל-MeiliSearch - מסמן כלא מוכן');
          this.serverReady = false;
        }
        throw error;
      })
      .finally(() => {
        // נקה את הבקשה הפעילה גם במקרה של שגיאה
        this.pendingIndexesRequest = null;
      });
    
    return this.pendingIndexesRequest;
  }
  
  // פונקציה פנימית שמבצעת את הבקשה בפועל
  async _fetchIndexes() {
    // בדוק circuit breaker
    if (this.circuitBreakerOpen) {
      const now = Date.now();
      if (now < this.circuitBreakerResetTime) {
        const waitSeconds = Math.ceil((this.circuitBreakerResetTime - now) / 1000);
        console.warn(`🚫 Circuit breaker פתוח - ממתין ${waitSeconds}s לפני ניסיון נוסף`);
        throw new Error('Circuit breaker open - too many failures');
      } else {
        // נסה לאפס את ה-circuit breaker
        console.log('🔄 מנסה לאפס circuit breaker...');
        this.circuitBreakerOpen = false;
        this.consecutiveFailures = 0;
      }
    }
    
    try {
      // אם רצים ב-Electron, השתמש ב-IPC
      if (window.electron && window.electron.getMeilisearchIndexes) {
        // הוסף debounce - אל תבקש יותר מדי מהר
        const MIN_REQUEST_INTERVAL = 2000; // 2 שניות בין בקשות
        const now = Date.now();
        const timeSinceLastRequest = this.lastIndexesRequestTime ? now - this.lastIndexesRequestTime : MIN_REQUEST_INTERVAL;
        
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
          const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
          console.log(`⏳ ממתין ${waitTime}ms לפני בקשת אינדקסים...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastIndexesRequestTime = Date.now();
        
        const result = await window.electron.getMeilisearchIndexes();
        
        if (result.success) {
          this.serverReady = true; // עדכן את הסטטוס
          
          // שמור ב-cache
          this.cachedIndexes = result.indexes;
          this.indexesCacheTime = Date.now();
          
          // אפס מונה כשלונות
          this.consecutiveFailures = 0;
          this.circuitBreakerOpen = false;
          
          return result.indexes;
        } else {
          console.error('❌ שגיאה בקבלת אינדקסים דרך IPC:', result.error);
          
          // ספור כשלון
          this.consecutiveFailures++;
          
          // אם יש יותר מ-5 כשלונות רצופים, פתח circuit breaker
          if (this.consecutiveFailures >= 5) { // 🎯 הגדל ל-5 כשלונות
            this.circuitBreakerOpen = true;
            this.circuitBreakerResetTime = Date.now() + 15000; // 15 שניות
            console.warn(`🚫 פתיחת circuit breaker אחרי ${this.consecutiveFailures} כשלונות`);
          }
          
          // אם יש אי-התאמת auth - נקה data directory והפעל מחדש
          if (result.error === 'auth_mismatch') {
            console.warn('🔑 בעיית auth - מנקה data directory ומפעיל מחדש...');
            if (window.electron.resetMeilisearchData) {
              const resetResult = await window.electron.resetMeilisearchData();
              if (resetResult.success) {
                console.log('✅ data directory נוקה - מפעיל שרת מחדש...');
                const startResult = await window.electron.startMeilisearch({
                  port: this.serverPort,
                  masterKey: this.masterKey
                });
                if (startResult.success) {
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  const retryResult = await window.electron.getMeilisearchIndexes();
                  if (retryResult.success) {
                    this.serverReady = true;
                    this.cachedIndexes = retryResult.indexes;
                    this.indexesCacheTime = Date.now();
                    this.consecutiveFailures = 0;
                    return retryResult.indexes;
                  }
                }
              }
            }
          }
          
          // אם השגיאה היא timeout או server starting - פשוט זרוק שגיאה, ה-connectToServerInBackground יטפל בזה
          if (result.error === 'Server starting' || (result.error && result.error.includes('timed out'))) {
            console.warn('⚠️ השרת עדיין מתחיל...');
            throw new Error(result.error);
          }
          
          // זרוק שגיאה עם הודעה ברורה
          throw new Error(result.error);
        }
      }
      
      // אחרת, נסה גישה ישירה (לדפדפן)
      if (!this.client) {
        this.client = new MeiliSearch({
          host: `http://127.0.0.1:${this.serverPort}`,
          timeout: this.clientTimeout // 120 שניות - מספיק לאינדקסים גדולים
        });
      }      const indexes = await this.client.getIndexes();
      
      console.log(`📚 נמצאו ${indexes.results.length} אינדקסים:`, indexes.results.map(i => i.uid));
      this.serverReady = true; // עדכן את הסטטוס
      
      // החזר מערך של אינדקסים עם מידע נוסף
      const indexesWithStats = await Promise.all(
        indexes.results.map(async (index) => {
          try {
            const stats = await this.client.index(index.uid).getStats();
            
            return {
              uid: index.uid,
              primaryKey: index.primaryKey,
              createdAt: index.createdAt,
              updatedAt: index.updatedAt,
              numberOfDocuments: stats.numberOfDocuments,
              isIndexing: stats.isIndexing
            };
          } catch (error) {
            console.error(`❌ שגיאה בקבלת סטטיסטיקות עבור ${index.uid}:`, error);
            return {
              uid: index.uid,
              primaryKey: index.primaryKey,
              createdAt: index.createdAt,
              updatedAt: index.updatedAt,
              numberOfDocuments: 0,
              isIndexing: false
            };
          }
        })
      );

      // שמור ב-cache
      this.cachedIndexes = indexesWithStats;
      this.indexesCacheTime = Date.now();

      return indexesWithStats;
    } catch (error) {
      console.error('❌ שגיאה בקבלת רשימת אינדקסים:', error);
      console.error('📊 פרטי שגיאה:', {
        message: error.message,
        code: error.code,
        type: error.type
      });
      return [];
    }
  }

  // הפעלת שרת Meilisearch מקומי - גרסה אסינכרונית שלא חוסמת
  async startServer() {
    try {
      const isElectron = window.electron !== undefined;
      const isTauri = window.__TAURI__ !== undefined;
      
      if (!isElectron && !isTauri) {
        console.warn('⚠️ Meilisearch זמין רק באפליקציה דסקטופ');
        return false;
      }

      if (isElectron) {
        // הפעל את השרת דרך IPC
        const result = await window.electron.startMeilisearch({
          port: this.serverPort
        });

        if (!result.success) {
          console.error('❌ שגיאה בהפעלת Meilisearch:', result.error);
          
          // אל תציג alert - רק לוג
          if (result.error && result.error.includes('EFTYPE')) {
            console.error('💡 פתרון: ראה WHY_MEILISEARCH_FAILS.md');
          }
          
          return false;
        }

        // אם השרת כבר רץ - התחבר מיד
        if (result.message === 'Already running') {
          console.log('ℹ️ Meilisearch כבר רץ - מתחבר...');
          // נסה להתחבר מיד ללא המתנה
          return await this.connectToServer(0); // 0 = ללא המתנה
        } else {
          // השרת התחיל עכשיו - התחבר ברקע
          console.log('🔄 Meilisearch מתחיל - מתחבר ברקע...');
          // התחבר ברקע עם ניסיונות חוזרים
          this.connectToServerInBackground();
          return true; // החזר true מיד - ההתחברות תמשיך ברקע
        }
      } else if (isTauri) {
        // הפעל את השרת דרך Tauri
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const result = await invoke('start_meilisearch', { port: this.serverPort });
          if (result.success) {
            this.isRunning = true;
            console.log('✅ Meilisearch הופעל (Tauri)');
            return true;
          } else {
            console.error('❌ שגיאה בהפעלת Meilisearch (Tauri):', result.error);
            return false;
          }
        } catch (error) {
          console.error('❌ Error starting Meilisearch via Tauri:', error);
          return false;
        }
      }
    } catch (error) {
      console.error('❌ שגיאה בהפעלת Meilisearch:', error);
      return false;
    }
  }

  // התחברות לשרת ברקע - לא חוסם
  async connectToServerInBackground() {
    console.log('🔗 מתחבר ל-Meilisearch ברקע...');
    
    // שמור את ה-promise כדי שניתן יהיה לבטל
    this.connectionAborted = false;
    
    // המתן קצת לפני ניסיון ראשון
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // נסה להתחבר עד 10 פעמים (10 שניות)
    for (let attempt = 1; attempt <= 10; attempt++) {
      // בדוק אם בוטל
      if (this.connectionAborted) {
        console.log('🛑 התחברות בוטלה');
        return false;
      }
      
      try {
        if (!this.client) {
          this.client = new MeiliSearch({
            host: `http://127.0.0.1:${this.serverPort}`,
            timeout: this.clientTimeout // 120 שניות
          });
        }
        
        const health = await this.client.health();
        
        // הצלחנו להתחבר!
        this.serverReady = true;
        console.log(`✅ Meilisearch מוכן! (ניסיון ${attempt}/10)`);
        
        // טען אינדקסים דרך IPC בלבד (לא ישירות מה-renderer)
        try {
          if (window.electron && window.electron.getMeilisearchIndexes) {
            const result = await window.electron.getMeilisearchIndexes();
            if (result.success && result.indexes.length > 0) {
              const firstIndex = result.indexes[0];
              this.index = this.client.index(firstIndex.uid);
              this.filesCount = firstIndex.numberOfDocuments || 0;
              console.log(`📚 נמצאו ${result.indexes.length} אינדקסים, ${this.filesCount} מסמכים`);
            } else {
              console.log('ℹ️ אין אינדקסים - יש לבנות אינדקס');
            }
          }
        } catch (indexError) {
          console.warn('⚠️ לא ניתן לטעון אינדקסים:', indexError.message);
        }
        
        return true;
      } catch (error) {
        if (attempt < 10) {
          console.log(`⏳ ניסיון ${attempt}/10 נכשל, מנסה שוב בעוד שנייה...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.error('❌ לא ניתן להתחבר ל-Meilisearch אחרי 10 ניסיונות');
          this.serverReady = false;
          return false;
        }
      }
    }
    
    return false;
  }

  // התחברות לשרת עם המתנה (לשימוש כשהשרת כבר רץ)
  async connectToServer(maxWaitMs = 0) {
    try {
      if (!this.client) {
        this.client = new MeiliSearch({
          host: `http://127.0.0.1:${this.serverPort}`,
          timeout: this.clientTimeout // 120 שניות
        });
      }

      // אם לא צריך לחכות, נסה פעם אחת
      if (maxWaitMs === 0) {
        try {
          const health = await this.client.health();
          this.serverReady = true;
          
          // טען אינדקסים
          const indexes = await this.client.getIndexes();
          if (indexes.results.length > 0) {
            const firstIndex = indexes.results[0];
            this.index = this.client.index(firstIndex.uid);
            const stats = await this.index.getStats();
            this.filesCount = stats.numberOfDocuments;
          }
          
          return true;
        } catch (error) {
          console.warn('⚠️ לא ניתן להתחבר מיד - ינסה ברקע');
          // התחבר ברקע
          this.connectToServerInBackground();
          return true; // החזר true בכל זאת
        }
      }

      // אחרת, נסה עם timeout
      const startTime = Date.now();
      while (Date.now() - startTime < maxWaitMs) {
        try {
          const health = await this.client.health();
          this.serverReady = true;
          
          const indexes = await this.client.getIndexes();
          if (indexes.results.length > 0) {
            const firstIndex = indexes.results[0];
            this.index = this.client.index(firstIndex.uid);
            const stats = await this.index.getStats();
            this.filesCount = stats.numberOfDocuments;
          }
          
          return true;
        } catch (error) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ שגיאה בהתחברות:', error);
      return false;
    }
  }

  // בניית אינדקס
  async buildIndex(files, onProgress, indexName = null) {
    this.isIndexing = true;
    this.indexProgress = 0;

    const indexableFiles = files.filter(
      (f) => f.type === 'text' || f.type === 'pdf'
    );
    this.filesCount = indexableFiles.length;
    
    // קבע שם אינדקס - מהפרמטר, מה-index object, או ברירת מחדל
    const targetIndex = indexName || (this.index ? this.index.uid : 'books');
    
    console.log(`🚀 מתחיל אינדוקס ${indexableFiles.length} קבצים ב-Meilisearch (אינדקס: ${targetIndex})...`);
    
    const startTime = Date.now();
    const documents = [];

    // שלב 1: טעינת קבצים
    for (let i = 0; i < indexableFiles.length; i++) {
      const file = indexableFiles[i];
      
      try {        let content = '';
        
        // טעינת תוכן לפי סוג הקובץ
        if (file.type === 'text') {
          content = await this.loadFileContent(file.path);
        } else if (file.type === 'pdf') {          content = await extractTextFromPDF(file.path);
        }
        
        if (!content || content.length === 0) {
          console.warn(`⚠️ קובץ ריק או לא נמצא: ${file.name}`);
          continue;
        }

        // חלק לחלקים של 2000 תווים
        const chunks = this.splitIntoChunks(content, 2000);        chunks.forEach((chunk, chunkIndex) => {
          documents.push({
            id: `${file.id}_${chunkIndex}`,
            fileId: file.id,
            fileName: file.name,
            filePath: file.path,
            chunkIndex,
            content: chunk
          });
        });

        this.indexProgress = ((i + 1) / indexableFiles.length) * 100;

        if (onProgress) {
          onProgress({
            progress: this.indexProgress,
            currentFile: file.name,
            filesProcessed: i + 1,
            totalFiles: indexableFiles.length
          });
        }

        if ((i + 1) % 5 === 0) {
          console.log(`📊 התקדמות: ${i + 1}/${indexableFiles.length} (${this.indexProgress.toFixed(1)}%)`);
        }
      } catch (error) {
        console.error(`❌ שגיאה בעיבוד ${file.name}:`, error);
      }
    }

    // שלב 2: העלאה ל-Meilisearch
    try {
      const indexName = targetIndex;
      const isElectron = window.electron !== undefined;

      const indexSettings = {
        // 🎯 תואם לשדות שהפייתון יוצר: content, source_file, source_path, page
        searchableAttributes: ['content', 'source_file', 'title', 'heShortDesc'], 
        displayedAttributes: ['id', 'source_file', 'source_path', 'page', 'content', 'bookId', 'lineIndex', 'heRef', 'title', 'heShortDesc', 'volume'],
        filterableAttributes: ['source_file', 'bookId', 'page'],
        sortableAttributes: ['page', 'lineIndex'],
        separatorTokens: [
          '"', "'", '\u05F4', '\u05F3',
          '\u2018', '\u2019', '\u201C', '\u201D',
          '(', ')', '[', ']', '{', '}',
          ',', '.', '!', '?', ';', ':',
          '-', '–', '—', '/', '\\', '|'
        ],
        nonSeparatorTokens: [],
        rankingRules: ['words', 'exactness', 'typo', 'proximity', 'attribute', 'sort'],
        typoTolerance: {
          enabled: true,
          minWordSizeForTypos: { oneTypo: 5, twoTypos: 8 },
          disableOnWords: [],
          disableOnAttributes: []
        }
      };

      // עדכן הגדרות דרך IPC אם ב-Electron, אחרת ישירות
      if (isElectron && window.electron.meilisearchUpdateSettings) {
        await window.electron.meilisearchUpdateSettings(indexName, indexSettings);
      } else if (this.index) {
        await this.index.updateSettings(indexSettings);
      }

      // העלה מסמכים בקבוצות של 500
      const batchSize = 500;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        if (isElectron && window.electron.meilisearchAddDocuments) {
          const result = await window.electron.meilisearchAddDocuments(indexName, batch);
          if (!result.success) throw new Error(result.error);
        } else if (this.index) {
          await this.index.addDocuments(batch);
        }
        console.log(`📤 הועלו ${Math.min(i + batchSize, documents.length)}/${documents.length} מסמכים`);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ אינדוקס הושלם ב-${duration}s`);
      this.isIndexing = false;
      return true;
    } catch (error) {
      console.error('❌ שגיאה בהעלאת מסמכים:', error);
      this.isIndexing = false;
      return false;
    }
  }

  // חיפוש עם סינון חכם לפי רלוונטיות
  // מחזיר רק תוצאות עם ציון מעל סף מינימלי (MIN_SCORE)
  // ממוין לפי איכות ההתאמה
  async search(query, options = {}) {
    const { 
      maxResults = 200, 
      accuracy = 50,
      specificBook = '',
      matchingStrategy = 'last',
      cropLength = 200,
      selectedIndexes = [] // אינדקסים נבחרים לחיפוש
    } = options;
    
    console.log('🔍 Meilisearch search called with:', { 
      query, 
      selectedIndexes, 
      selectedCount: selectedIndexes.length 
    });
    
    if (!query || !this.client) {
      return [];
    }

    // בדוק אם השרת מוכן
    if (!this.serverReady) {
      console.warn('⚠️ MeiliSearch לא מוכן - השתמש ב-FlexSearch במקום');
      return [];
    }

    // אם לא נבחרו אינדקסים, קבל את כל האינדקסים הזמינים
    let indexesToSearch = selectedIndexes;
    if (selectedIndexes.length === 0) {
      console.log('ℹ️ לא נבחרו אינדקסים - מחפש בכל האינדקסים');
      try {
        const availableIndexes = await this.getAvailableIndexes();
        indexesToSearch = availableIndexes.map(idx => idx.uid);
      } catch (error) {
        console.error('❌ שגיאה בקבלת רשימת אינדקסים:', error);
        // אם השגיאה היא שהשרת עדיין עולה, תן הודעה ברורה
        if (error.message === 'Server starting' || error.message === 'Server not running') {
          console.warn('⚠️ השרת עדיין עולה - נסה שוב בעוד מספר שניות');
        }
        // סמן שהשרת לא מוכן
        this.serverReady = false;
        return [];
      }
    } else {
      console.log(`✅ מחפש רק באינדקסים נבחרים: ${indexesToSearch.join(', ')}`);
    }

    if (indexesToSearch.length === 0) {
      console.warn('⚠️ אין אינדקסים זמינים לחיפוש');
      // סמן שהשרת לא מוכן
      this.serverReady = false;
      return [];
    }
    
    console.log(`📊 מחפש ב-${indexesToSearch.length} אינדקסים: ${indexesToSearch.join(', ')}`);
    
    try {
      // הכן את אפשרויות החיפוש
      // 🎯 עבור אינדקסים גדולים (1M+ מסמכים), חשוב לחתוך את התוכן
      const searchParams = {
        limit: maxResults,
        attributesToCrop: ['content'], // 🔥 חתוך את content לחלק רלוונטי בלבד!
        cropLength: 50, // 🔥 רק 50 מילים סביב ההתאמה - מספיק להקשר
        attributesToHighlight: ['content'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
        showRankingScore: true,
        matchingStrategy: matchingStrategy
      };
      
      console.log(`⚙️ פרמטרי חיפוש: limit=${searchParams.limit}, cropLength=${searchParams.cropLength}`);      // חפש בכל האינדקסים הנבחרים במקביל
      const searchPromises = indexesToSearch.map(async (indexUid) => {
        try {
          console.log(`🔍 מחפש באינדקס "${indexUid}"...`);
          const searchStart = performance.now();
          
          let results;
          
          // אם ב-Electron, השתמש ב-IPC (מהיר יותר!)
          if (window.electron && window.electron.meilisearchSearch) {
            const response = await window.electron.meilisearchSearch(indexUid, query, searchParams);
            if (!response.success) {
              throw new Error(response.error);
            }
            results = response.results;
          } else {
            // fallback - גישה ישירה (לדפדפן)
            const index = this.client.index(indexUid);
            results = await index.search(query, searchParams);
          }
          
          const searchTime = (performance.now() - searchStart).toFixed(0);
          console.log(`✅ אינדקס "${indexUid}" החזיר ${results.hits?.length || 0} תוצאות ב-${searchTime}ms`);
          
          return { indexUid, ...results };
        } catch (error) {
          console.error(`❌ שגיאה בחיפוש באינדקס "${indexUid}":`, error.message);
          return { indexUid, hits: [], estimatedTotalHits: 0 };
        }
      });

      // המתן לכל החיפושים
      const allResults = await Promise.all(searchPromises);
      
      // בדוק אם היו אינדקסים שנכשלו
      const failedIndexes = allResults.filter(r => r.hits.length === 0 && r.estimatedTotalHits === 0);
      const successfulIndexes = allResults.filter(r => r.hits.length > 0 || r.estimatedTotalHits > 0);
      
      if (failedIndexes.length > 0 && successfulIndexes.length > 0) {
        console.warn(`⚠️ ${failedIndexes.length} אינדקסים נכשלו, אבל ${successfulIndexes.length} הצליחו`);
        console.log('✅ אינדקסים שהצליחו:', successfulIndexes.map(r => r.indexUid).join(', '));
        console.log('❌ אינדקסים שנכשלו:', failedIndexes.map(r => r.indexUid).join(', '));
      } else if (failedIndexes.length === allResults.length) {
        console.error('❌ כל האינדקסים נכשלו - אין תוצאות');
      }
      
      // איחוד כל התוצאות
      const searchResults = {
        hits: allResults.flatMap(r => r.hits),
        estimatedTotalHits: allResults.reduce((sum, r) => sum + (r.estimatedTotalHits || r.hits.length), 0)
      };      // סינון לפי ספר ספציפי (client-side) - Meilisearch לא תומך ב-CONTAINS
      let filteredHits = searchResults.hits;
      if (specificBook && specificBook.trim().length > 0) {
        const bookFilter = specificBook.trim().toLowerCase();
        filteredHits = searchResults.hits.filter(hit => 
          hit.fileId && hit.fileId.toLowerCase().includes(bookFilter)
        );      }
      
      // הצג דוגמה של תוצאות
      if (filteredHits.length > 0) {
      }

      // סינון תוצאות לפי ציון רלוונטיות
      // המרת accuracy (0-100) לסף ציון (0.1-0.7)
      // accuracy=0 (רחב) -> MIN_SCORE=0.1
      // accuracy=50 (בינוני) -> MIN_SCORE=0.4
      // accuracy=100 (מדויק) -> MIN_SCORE=0.7
      const MIN_SCORE = 0.1 + (accuracy / 100) * 0.6;
      
      console.log(`🎯 רמת דיוק: ${accuracy}% -> סף ציון: ${MIN_SCORE.toFixed(2)}`);
      
      const relevantHits = filteredHits.filter(hit => {
        const score = hit._rankingScore || 0;
        return score >= MIN_SCORE;
      });

      console.log(`🎯 ${relevantHits.length} תוצאות רלוונטיות (ציון מעל ${(MIN_SCORE * 100).toFixed(0)}%)`);
      
      // לוג לדיבוג - הצג את טווח הציונים
      if (filteredHits.length > 0) {
        const scores = filteredHits.map(h => h._rankingScore || 0).sort((a, b) => b - a);
        console.log(`📊 טווח ציונים: ${scores[0].toFixed(3)} (גבוה) - ${scores[scores.length - 1].toFixed(3)} (נמוך)`);      }
      // קיבוץ לפי קובץ
      const resultsMap = new Map();

      for (const hit of relevantHits) {
        // לוג לדיבוג - הצג את המסמך הראשון
        if (resultsMap.size === 0) {
          console.log('🔍 שדות זמינים:', Object.keys(hit));
          console.log('🔍 דוגמה למסמך:', {
            id: hit.id,
            source_file: hit.source_file,
            source_path: hit.source_path,
            page: hit.page,
            bookId: hit.bookId,
            title: hit.title,
            hasContent: !!hit.content,
            hasText: !!hit.text
          });
        }
        
        // 🎯 תמיכה בשני סוגי אינדקסים: PDF (source_file) ואוצריא (bookId/title)
        const fileId = hit.source_file || hit.bookId?.toString() || hit.title || hit.id;
        const filePath = hit.source_path || hit.href || '';
        const fileName = hit.source_file || hit.title || (hit.bookId ? `ספר ${hit.bookId}` : fileId);
        
        const score = hit._rankingScore || 0;

        if (!resultsMap.has(fileId)) {
          resultsMap.set(fileId, {
            file: {
              id: fileId,
              name: fileName,
              path: filePath,
              type: filePath.toLowerCase().endsWith('.pdf') ? 'pdf' : 'text'
            },
            matchCount: 0,
            contexts: [],
            maxScore: score,
            totalScore: 0
          });
        }

        const fileResult = resultsMap.get(fileId);
        
        // עדכן ציונים
        fileResult.maxScore = Math.max(fileResult.maxScore, score);
        fileResult.totalScore += score;
        
        // 🎯 חלץ הקשר מההדגשה - תמיכה בכל סוגי האינדקסים
        const highlighted = hit._formatted?.content ||  // PDF/lines אינדקס
                          hit.content ||                 // ללא הדגשה
                          hit._formatted?.heShortDesc || // books אינדקס
                          hit.heShortDesc ||
                          hit._formatted?.title ||
                          hit.title;
        
        // לוג לבדיקה - רק פעם אחת
        if (resultsMap.size === 1 && fileResult.contexts.length === 0) {
          console.log('🔍 Sample hit:', {
            hasFormatted: !!hit._formatted,
            hasContent: !!hit.content,
            hasText: !!hit.text,
            hasHeShortDesc: !!hit.heShortDesc,
            hasTitle: !!hit.title,
            highlightedPreview: highlighted?.substring(0, 200),
            hasMark: highlighted?.includes('<mark>')
          });
        }
        
        // אם אין תוכן בכלל, דלג על התוצאה הזו
        if (!highlighted) {
          console.warn(`⚠️ אין תוכן להצגה עבור: ${fileId}`);
          continue;
        }
        
        const context = this.extractContext(highlighted, query, cropLength);
        
        if (context) {
          context.chunkStart = hit.chunkStart || 0;
          context.chunkId = hit.chunkId || 0;
          context.pageNum = hit.page || hit.pageNum || 1; // השתמש ב-page מהמסמך
          context.score = score; // הוסף ציון להקשר
          
          fileResult.contexts.push(context);
          fileResult.matchCount++;
        }
      }

      // המר למערך וממיין לפי רלוונטיות
      let results = Array.from(resultsMap.values())
        .sort((a, b) => {
          // מיון לפי: 1) ציון מקסימלי 2) ציון כולל 3) מספר התאמות
          if (Math.abs(b.maxScore - a.maxScore) > 0.01) {
            return b.maxScore - a.maxScore;
          }
          if (Math.abs(b.totalScore - a.totalScore) > 0.1) {
            return b.totalScore - a.totalScore;
          }
          return b.matchCount - a.matchCount;
        });
      
      // אם יש יותר מדי קבצים, הגבל לפי ציון
      if (results.length > maxResults) {
        // מצא את הציון של התוצאה ה-maxResults
        const cutoffScore = results[maxResults - 1].maxScore;
        // הגבל רק לתוצאות מעל הציון הזה
        results = results.filter(r => r.maxScore >= cutoffScore).slice(0, maxResults);
        console.log(`✂️ הגבלה ל-${maxResults} קבצים הטובים ביותר (ציון מעל ${cutoffScore.toFixed(3)})`);
      }
      
      results = results.map(result => ({
        file: result.file,
        matchCount: result.matchCount,
        contexts: result.contexts
          .sort((a, b) => (b.score || 0) - (a.score || 0)) // מיין הקשרים לפי ציון
          .slice(0, 3), // רק 3 הקשרים הטובים ביותר לקובץ
        score: result.maxScore // הוסף ציון לתוצאה
      }));

      console.log(`✅ מחזיר ${results.length} קבצים עם תוצאות (מתוך ${resultsMap.size} קבצים)`);
      if (results.length > 0) {
        console.log(`📊 ציון גבוה: ${results[0].score.toFixed(3)}, נמוך: ${results[results.length-1].score.toFixed(3)}`);
      }
      
      // אם אין תוצאות אבל היו hits, זה אומר שהאינדקס לא מכיל תוכן
      if (results.length === 0 && filteredHits.length > 0) {
        console.warn('⚠️ נמצאו תוצאות אבל אין להן תוכן להצגה.');
        console.warn('💡 ייתכן שאתה משתמש באינדקס "books" (מטא-דאטה בלבד).');
        console.warn('💡 בנה אינדקס מסוג "lines" כדי לחפש בתוכן הספרים.');
      }
      
      return results;
    } catch (error) {
      console.error('❌ שגיאה בחיפוש:', error);
      return [];
    }
  }

  // חילוץ הקשר עם הדגשה חכמה - תמיכה במילים מרובות
  extractContext(text, query, cropLength = 200) {
    // בדיקת תקינות
    if (!text || typeof text !== 'string') {
      console.warn('⚠️ extractContext: text is not a valid string', text);
      return null;
    }
    
    // הגבלה מקסימלית - לא יותר מ-300 מילים בסה"כ
    const MAX_CONTEXT_WORDS = 300;
    const actualCropLength = Math.min(cropLength, MAX_CONTEXT_WORDS);
    
    // חישוב מספר מילים לפני ואחרי בהתבסס על cropLength
    // cropLength הוא סה"כ מילים, אז נחלק ל-2 (מחצית לפני, מחצית אחרי)
    const contextWords = Math.floor(actualCropLength / 2); // מחצית מהמילים לפני ומחצית אחרי
    
    // שלב 1: חפש את כל תגי ההדגשה של Meilisearch
    const highlightedWords = [];
    let searchFrom = 0;
    
    while (searchFrom < text.length) {
      const markIndex = text.indexOf('<mark>', searchFrom);
      if (markIndex === -1) break;
      
      const markEndIndex = text.indexOf('</mark>', markIndex);
      if (markEndIndex === -1) break;
      
      const highlightedWord = text.substring(markIndex + 6, markEndIndex); // +6 for '<mark>'
      highlightedWords.push({
        word: highlightedWord,
        start: markIndex,
        end: markEndIndex + 7 // +7 for '</mark>'
      });
      
      searchFrom = markEndIndex + 7;
    }
    
    if (highlightedWords.length > 0) {
      // יש הדגשות - השתמש בהן
      const firstMark = highlightedWords[0];
      
      // מצא את תחילת ההקשר - 100 מילים לפני
      let start = firstMark.start;
      let wordCount = 0;
      while (start > 0 && wordCount < contextWords) {
        start--;
        if (text[start] === ' ' || text[start] === '\n') {
          wordCount++;
        }
      }
      
      // מצא את סוף ההקשר - 100 מילים אחרי
      const lastMark = highlightedWords[highlightedWords.length - 1];
      let end = lastMark.end;
      wordCount = 0;
      while (end < text.length && wordCount < contextWords) {
        end++;
        if (text[end] === ' ' || text[end] === '\n') {
          wordCount++;
        }
      }

      let contextText = text.substring(start, end).trim();
      
      if (start > 0) contextText = '...' + contextText;
      if (end < text.length) contextText = contextText + '...';

      // הסר תגי HTML
      const cleanText = contextText.replace(/<\/?mark>/g, '');
      
      // מצא את המיקום של המילה הראשונה המודגשת בטקסט הנקי
      const firstWord = highlightedWords[0].word;
      const firstWordLower = firstWord.toLowerCase();
      const cleanTextLower = cleanText.toLowerCase();
      const matchIndex = cleanTextLower.indexOf(firstWordLower);

      return {
        text: cleanText,
        matchIndex: matchIndex >= 0 ? matchIndex : 0,
        matchLength: firstWord.length,
        highlightedWords: highlightedWords.map(h => h.word) // כל המילים המודגשות
      };
    }
    
    // שלב 2: אין הדגשה - חפש את המילים ידנית עם נרמול
    const normalizeText = (str) => {
      return str
        .replace(/['"״׳''""]/g, '') // הסר גרשיים
        .replace(/[.,!?;:\-–—()[\]{}]/g, '') // הסר סימני פיסוק
        .toLowerCase()
        .trim();
    };
    
    // פצל את השאילתה למילים
    const queryWords = query.trim().split(/\s+/);
    const normalizedText = normalizeText(text);
    
    // מצא את כל המילים בטקסט
    const foundWords = [];
    
    for (const queryWord of queryWords) {
      const normalizedQuery = normalizeText(queryWord);
      if (!normalizedQuery || normalizedQuery.length < 2) continue;
      
      // חפש התאמה מדויקת
      let foundIndex = normalizedText.indexOf(normalizedQuery);
      
      // אם לא נמצא - נסה חיפוש חלקי (fuzzy)
      if (foundIndex === -1 && normalizedQuery.length >= 3) {
        foundIndex = this.findFuzzyMatch(normalizedText, normalizedQuery);
      }
      
      if (foundIndex !== -1) {
        // מצא את המיקום האמיתי בטקסט המקורי
        const realPosition = this.mapNormalizedToReal(text, foundIndex, normalizedQuery.length);
        const matchedWord = text.substring(realPosition.start, realPosition.end);
        
        foundWords.push({
          word: matchedWord,
          start: realPosition.start,
          end: realPosition.end
        });
      }
    }
    
    if (foundWords.length > 0) {
      // מיין לפי מיקום
      foundWords.sort((a, b) => a.start - b.start);
      
      const firstWord = foundWords[0];
      const lastWord = foundWords[foundWords.length - 1];
      
      // חישוב אורך הקשר בתווים (בערך 5 תווים למילה)
      const contextLengthChars = contextWords * 5;
      const start = Math.max(0, firstWord.start - contextLengthChars);
      const end = Math.min(text.length, lastWord.end + contextLengthChars);

      let contextText = text.substring(start, end);
      
      if (start > 0) contextText = '...' + contextText;
      if (end < text.length) contextText = contextText + '...';

      return {
        text: contextText,
        matchIndex: firstWord.start - start + (start > 0 ? 3 : 0),
        matchLength: firstWord.word.length,
        highlightedWords: foundWords.map(w => w.word) // כל המילים שנמצאו
      };
    }
    
    // שלב 3: לא מצאנו כלום - החזר את ההתחלה של הטקסט
    console.warn('⚠️ לא נמצאה התאמה בטקסט:', { query, textPreview: text.substring(0, 100) });
    
    // השתמש ב-cropLength גם כאן (בתווים - בערך 5 תווים למילה)
    const fallbackLength = cropLength * 5;
    const contextText = text.substring(0, fallbackLength);
    return {
      text: contextText + (text.length > fallbackLength ? '...' : ''),
      matchIndex: 0,
      matchLength: 0,
      highlightedWords: null
    };
  }

  // חיפוש fuzzy - מוצא מילים דומות עם שגיאה של תו אחד
  findFuzzyMatch(text, query) {
    const words = text.split(/\s+/);
    const queryLen = query.length;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // בדוק אם המילה דומה (Levenshtein distance <= 1)
      if (Math.abs(word.length - queryLen) <= 1) {
        const distance = this.levenshteinDistance(word, query);
        if (distance <= 1) {
          // מצא את המיקום של המילה בטקסט
          const wordIndex = text.indexOf(word);
          if (wordIndex !== -1) {
            return wordIndex;
          }
        }
      }
    }
    
    return -1;
  }

  // חישוב Levenshtein distance (מרחק עריכה)
  levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // החלפה
            matrix[i][j - 1] + 1,     // הוספה
            matrix[i - 1][j] + 1      // מחיקה
          );
        }
      }
    }

    return matrix[len1][len2];
  }

  // מיפוי מיקום מטקסט מנורמל לטקסט מקורי
  mapNormalizedToReal(originalText, normalizedIndex, normalizedLength) {
    // regex מחוץ ללולאה לביצועים טובים יותר
    const punctuationRegex = /['"״׳''"".,!?;:\-–—()[\]{}]/;
    
    let realStart = 0;
    let normalizedCount = 0;
    
    // מצא את ההתחלה
    for (let i = 0; i < originalText.length && normalizedCount < normalizedIndex; i++) {
      const char = originalText[i];
      // דלג על תווים שהוסרו בנרמול
      if (!punctuationRegex.test(char) && char !== ' ') {
        normalizedCount++;
      }
      realStart = i + 1;
    }
    
    // מצא את הסוף
    let realEnd = realStart;
    normalizedCount = 0;
    
    for (let i = realStart; i < originalText.length && normalizedCount < normalizedLength; i++) {
      const char = originalText[i];
      if (!punctuationRegex.test(char) && char !== ' ') {
        normalizedCount++;
      }
      realEnd = i + 1;
    }
    
    return { start: realStart, end: realEnd };
  }

  // פונקציות עזר
  splitIntoChunks(text, size) {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.substring(i, i + size));
    }
    return chunks;
  }

  async loadFileContent(path) {
    try {
      if (window.electron?.readFile) {
        // המר נתיב יחסי לנתיב מוחלט
        let fullPath = path;
        if (path.startsWith('/books/')) {
          // במצב development, הנתיב הוא יחסי לפרויקט
          const appPath = window.electron.getAppPath();
          fullPath = window.electron.joinPath(appPath, path.substring(1)); // הסר את ה-/ הראשון
        }
        const content = await window.electron.readFile(fullPath);
        return content;
      } else {
        const response = await fetch(path);
        const content = await response.text();
        return content;
      }
    } catch (error) {
      console.error('❌ שגיאה בטעינת קובץ:', path, error.message);
      return '';
    }
  }

  // בדיקה אם מוכן
  isReady() {
    // השרת מוכן אם יש client וה-serverReady מסומן
    return this.serverReady && this.client !== null;
  }

  // המתנה עד שהשרת מוכן (עד maxMs מילישניות)
  async waitUntilReady(maxMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      if (this.isReady()) return true;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return this.isReady();
  }

  getProgress() {
    return this.indexProgress;
  }

  getFilesCount() {
    return this.filesCount;
  }

  // סגירת השרת
  async stopServer() {
    try {
      // בטל התחברות ברקע אם פעילה
      this.connectionAborted = true;
      
      if (window.electron?.stopMeilisearch) {
        await window.electron.stopMeilisearch();
        console.log('🛑 Meilisearch נסגר (Electron)');
      } else if (window.__TAURI__) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('stop_meilisearch');
          console.log('🛑 Meilisearch נסגר (Tauri)');
        } catch (error) {
          console.error('❌ Error stopping Meilisearch via Tauri:', error);
        }
      }
      
      // נקה משאבים
      this.serverReady = false;
      this.client = null;
      this.index = null;
    } catch (error) {
      console.error('שגיאה בסגירת Meilisearch:', error);
    }
  }
}

// יצירת instance יחיד
const meilisearchEngine = new MeilisearchEngine();

export default meilisearchEngine;

