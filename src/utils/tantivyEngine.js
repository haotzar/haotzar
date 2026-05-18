// מנוע חיפוש מבוסס Tantivy (Rust) - מהיר ויעיל
// תומך בחיפוש מתקדם, fuzzy search, wildcards, ועוד

class TantivyEngine {
  constructor() {
    this.indexPath = null;
    this.cliPath = null; // יוגדר דינמית לפי הסביבה
    this.isIndexing = false;
    this.indexProgress = 0;
    this.filesCount = 0;
    this.serverReady = false;
    this.availableIndexes = [];
    this.currentIndex = null;
  }

  // אתחול המנוע - קביעת נתיבים
  async initialize() {
    try {
      const isElectron = window.electron !== undefined;
      const isTauri = window.__TAURI__ !== undefined;

      if (!isElectron && !isTauri) {
        console.warn('⚠️ Tantivy זמין רק באפליקציה דסקטופ');
        return false;
      }

      if (isElectron) {
        // קבל את נתיב ה-CLI מ-Electron
        const userDataPath = window.electron.getUserDataPath();
        this.cliPath = window.electron.joinPath(userDataPath, 'tantivy', 'tantivy_cli.exe');
        this.indexPath = window.electron.joinPath(userDataPath, 'tantivy', 'indexes');
        
        console.log('📂 Tantivy paths:', {
          cli: this.cliPath,
          indexes: this.indexPath
        });

        // בדוק אם ה-CLI קיים
        const cliExists = await window.electron.fileExists(this.cliPath);
        if (!cliExists) {
          console.warn('⚠️ Tantivy CLI לא נמצא ב:', this.cliPath);
          console.log('💡 מעתיק Tantivy CLI...');
          
          // העתק מ-public לתיקיית userData
          const result = await window.electron.copyTantivyCli();
          if (!result.success) {
            console.error('❌ שגיאה בהעתקת Tantivy CLI:', result.error);
            return false;
          }
        }

        this.serverReady = true;
        console.log('✅ Tantivy מוכן לשימוש');
        
        // טען רשימת אינדקסים זמינים
        await this.loadAvailableIndexes();
        
        return true;
      } else if (isTauri) {
        // TODO: תמיכה ב-Tauri
        console.warn('⚠️ Tauri עדיין לא נתמך');
        return false;
      }

      return false;
    } catch (error) {
      console.error('❌ שגיאה באתחול Tantivy:', error);
      return false;
    }
  }

  // טעינת רשימת אינדקסים זמינים
  async loadAvailableIndexes() {
    try {
      if (!window.electron) return [];

      // וודא שתיקיית האינדקסים קיימת
      const indexesPathExists = await window.electron.fileExists(this.indexPath);
      if (!indexesPathExists) {
        console.log('📂 תיקיית אינדקסים לא קיימת, יוצר...');
        await window.electron.createDir(this.indexPath);
        this.availableIndexes = [];
        return [];
      }

      // קבל רשימת תיקיות באינדקס
      const result = await window.electron.listTantivyIndexes(this.indexPath);
      
      if (result.success) {
        this.availableIndexes = result.indexes;
        console.log(`📚 נמצאו ${this.availableIndexes.length} אינדקסים:`, this.availableIndexes.map(i => i.name));
        
        // אם יש אינדקס, בחר את הראשון כברירת מחדל
        if (this.availableIndexes.length > 0 && !this.currentIndex) {
          this.currentIndex = this.availableIndexes[0].name;
        }
        
        return this.availableIndexes;
      } else {
        console.warn('⚠️ לא ניתן לטעון אינדקסים:', result.error);
        return [];
      }
    } catch (error) {
      console.error('❌ שגיאה בטעינת אינדקסים:', error);
      return [];
    }
  }

  // קבלת רשימת אינדקסים זמינים (תואם ל-API של Meilisearch)
  async getAvailableIndexes(forceRefresh = false) {
    if (forceRefresh || this.availableIndexes.length === 0) {
      await this.loadAvailableIndexes();
    }
    
    return this.availableIndexes.map(idx => ({
      uid: idx.name,
      primaryKey: 'id',
      createdAt: idx.createdAt || new Date().toISOString(),
      updatedAt: idx.updatedAt || new Date().toISOString(),
      numberOfDocuments: idx.documentsCount || 0,
      isIndexing: false
    }));
  }

  // בניית אינדקס מתיקייה
  async buildIndex(files, onProgress, indexName = 'books') {
    try {
      this.isIndexing = true;
      this.indexProgress = 0;

      const indexableFiles = files.filter(
        (f) => f.type === 'text' || f.type === 'pdf'
      );
      this.filesCount = indexableFiles.length;

      console.log(`🚀 מתחיל אינדוקס ${indexableFiles.length} קבצים ב-Tantivy (אינדקס: ${indexName})...`);

      if (!window.electron) {
        throw new Error('Tantivy זמין רק ב-Electron');
      }

      const startTime = Date.now();
      const targetIndexPath = window.electron.joinPath(this.indexPath, indexName);

      // שלב 1: יצירת אינדקס ריק
      console.log('📝 יוצר אינדקס חדש...');
      const createResult = await window.electron.tantivyCreateIndex({
        indexPath: targetIndexPath,
        indexName: indexName
      });

      if (!createResult.success) {
        throw new Error(`שגיאה ביצירת אינדקס: ${createResult.error}`);
      }

      // שלב 2: אינדוקס קבצים באצווה
      const batchSize = 10; // 10 קבצים בכל פעם
      let processedFiles = 0;

      for (let i = 0; i < indexableFiles.length; i += batchSize) {
        const batch = indexableFiles.slice(i, i + batchSize);
        
        console.log(`📦 מעבד אצווה ${Math.floor(i / batchSize) + 1}/${Math.ceil(indexableFiles.length / batchSize)}`);

        // אינדקס כל קובץ באצווה
        for (const file of batch) {
          try {
            const indexResult = await window.electron.tantivyIndexFile({
              indexPath: targetIndexPath,
              filePath: file.path,
              fileId: file.id,
              fileName: file.name,
              fileType: file.type
            });

            if (indexResult.success) {
              processedFiles++;
              this.indexProgress = (processedFiles / indexableFiles.length) * 100;

              if (onProgress) {
                onProgress({
                  progress: this.indexProgress,
                  currentFile: file.name,
                  filesProcessed: processedFiles,
                  totalFiles: indexableFiles.length
                });
              }

              if (processedFiles % 10 === 0) {
                console.log(`📊 התקדמות: ${processedFiles}/${indexableFiles.length} (${this.indexProgress.toFixed(1)}%)`);
              }
            } else {
              console.warn(`⚠️ שגיאה באינדוקס ${file.name}:`, indexResult.error);
            }
          } catch (error) {
            console.error(`❌ שגיאה בעיבוד ${file.name}:`, error);
          }
        }
      }

      // שלב 3: commit האינדקס
      console.log('💾 שומר אינדקס...');
      const commitResult = await window.electron.tantivyCommitIndex({
        indexPath: targetIndexPath
      });

      if (!commitResult.success) {
        console.warn('⚠️ שגיאה ב-commit:', commitResult.error);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ אינדוקס הושלם ב-${duration}s`);
      
      this.isIndexing = false;
      this.currentIndex = indexName;
      
      // רענן רשימת אינדקסים
      await this.loadAvailableIndexes();
      
      return true;
    } catch (error) {
      console.error('❌ שגיאה בבניית אינדקס:', error);
      this.isIndexing = false;
      return false;
    }
  }

  // חיפוש באינדקס
  async search(query, options = {}) {
    const {
      maxResults = 20,
      limit, // תמיכה גם ב-limit
      accuracy = 50,
      specificBook = '',
      matchingStrategy = 'last',
      cropLength = 200,
      selectedIndexes = [],
      offset = 0,
      fuzzy = false,
      fuzzyDistance = 1,
      fields = ['content', 'title']
    } = options;
    
    // אם יש limit, השתמש בו במקום maxResults
    const resultLimit = limit || maxResults;

    console.log('🔍 Tantivy search called with:', {
      query,
      selectedIndexes,
      offset,
      limit: resultLimit,
      fuzzy,
      fuzzyDistance,
      matchingStrategy,
      cropLength,
      specificBook,
      accuracy
    });

    if (!query || !this.serverReady) {
      console.warn('⚠️ Tantivy לא מוכן או שאילתה ריקה');
      return { results: [], estimatedTotalHits: 0 };
    }

    if (!window.electron) {
      console.error('❌ Tantivy זמין רק ב-Electron');
      return { results: [], estimatedTotalHits: 0 };
    }

    try {
      // קבע אילו אינדקסים לחפש
      let indexesToSearch = selectedIndexes;
      if (selectedIndexes.length === 0) {
        // אם לא נבחרו אינדקסים, חפש בכולם
        const availableIndexes = await this.getAvailableIndexes();
        indexesToSearch = availableIndexes.map(idx => idx.uid);
      }

      if (indexesToSearch.length === 0) {
        console.warn('⚠️ אין אינדקסים זמינים לחיפוש');
        return { results: [], estimatedTotalHits: 0 };
      }

      console.log(`📊 מחפש ב-${indexesToSearch.length} אינדקסים: ${indexesToSearch.join(', ')}`);

      // חפש בכל האינדקסים במקביל
      const searchPromises = indexesToSearch.map(async (indexName) => {
        try {
          const indexPath = window.electron.joinPath(this.indexPath, indexName);
          
          console.log(`🔍 מחפש באינדקס "${indexName}"...`);
          const searchStart = performance.now();

          const searchResult = await window.electron.tantivySearch({
            indexPath: indexPath,
            query: query,
            limit: resultLimit,
            offset: offset,
            fields: fields,
            fuzzy: true, // תמיד מופעל
            fuzzyDistance: 1, // מרחק 1 - מאוזן יותר
            fuzzyPrefix: true, // דרוש התאמת תחילית
            conjunction: matchingStrategy === 'all'
          });

          const searchTime = (performance.now() - searchStart).toFixed(0);

          if (searchResult.success) {
            console.log(`✅ אינדקס "${indexName}" החזיר ${searchResult.hits?.length || 0} תוצאות ב-${searchTime}ms`);
            return {
              indexName,
              hits: searchResult.hits || [],
              totalHits: searchResult.totalHits || 0
            };
          } else {
            console.error(`❌ שגיאה בחיפוש באינדקס "${indexName}":`, searchResult.error);
            return { indexName, hits: [], totalHits: 0 };
          }
        } catch (error) {
          console.error(`❌ שגיאה בחיפוש באינדקס "${indexName}":`, error);
          return { indexName, hits: [], totalHits: 0 };
        }
      });

      // המתן לכל החיפושים
      const allResults = await Promise.all(searchPromises);

      // איחוד תוצאות
      const allHits = allResults.flatMap(r => r.hits);
      const totalHits = allResults.reduce((sum, r) => sum + r.totalHits, 0);

      console.log(`📊 סה"כ ${allHits.length} תוצאות מ-${totalHits} התאמות`);

      // סינון לפי ספר ספציפי
      let filteredHits = allHits;
      if (specificBook && specificBook.trim().length > 0) {
        const bookFilter = specificBook.trim().toLowerCase();
        filteredHits = allHits.filter(hit => {
          const hitFile = hit.source_file || hit.title || hit.fileName || '';
          return hitFile.toLowerCase().includes(bookFilter);
        });
        console.log(`🔍 סינון לפי "${specificBook}": ${filteredHits.length} תוצאות`);
      }

      // סינון לפי רמת דיוק (score)
      // אם אין score בתוצאות, לא נסנן לפי score
      const minScore = 0.1 + (accuracy / 100) * 0.6; // 0.1-0.7
      const relevantHits = filteredHits.filter(hit => {
        const score = hit.score;
        // אם אין score, נכלול את התוצאה
        if (score === undefined || score === null) return true;
        return score >= minScore;
      });

      console.log(`🎯 ${relevantHits.length} תוצאות רלוונטיות (ציון מעל ${(minScore * 100).toFixed(0)}%)`);

      // המרה לפורמט של האפליקציה
      const results = relevantHits.map(hit => {
        // Tantivy CLI מחזיר שדות שונים תלוי בסוג האינדקס
        // PDF indexes: text, heRef, title, heShortDesc
        // Text indexes: content, source_file, etc.
        const fileId = hit.source_file || hit.title || hit.fileName || hit.id || 'unknown';
        const filePath = hit.source_path || hit.filePath || '';
        const fileName = hit.source_file || hit.title || hit.fileName || fileId;
        const fileType = fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'text';

        // חלץ הקשר עם הדגשה
        let content = hit.text || hit.content || '';
        
        // חתוך את התוכן לפי cropLength (אם מוגדר)
        if (cropLength && content.length > cropLength) {
          // מצא את המילה הראשונה של החיפוש בתוכן
          const queryWords = query.trim().split(/\s+/);
          const firstWord = queryWords[0];
          const matchIndex = content.toLowerCase().indexOf(firstWord.toLowerCase());
          
          if (matchIndex !== -1) {
            // חתוך סביב ההתאמה
            const start = Math.max(0, matchIndex - Math.floor(cropLength / 2));
            const end = Math.min(content.length, start + cropLength);
            content = (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
          } else {
            // אם לא נמצאה התאמה, חתוך מההתחלה
            content = content.substring(0, cropLength) + '...';
          }
        }
        
        const highlightedContent = this.highlightMatches(content, query);

        // חלץ מספר עמוד מ-heRef או page
        let pageNum = hit.page || 1;
        if (hit.heRef) {
          // heRef בפורמט: "שם הספר עמוד X"
          const pageMatch = hit.heRef.match(/עמוד\s+(\d+)/);
          if (pageMatch) {
            pageNum = parseInt(pageMatch[1], 10);
          }
        }

        const context = {
          text: highlightedContent,
          matchIndex: 0,
          matchLength: query.length,
          highlightedWords: query.trim().split(/\s+/),
          pageNum: pageNum,
          score: hit.score || 0,
          heRef: hit.heRef || '', // שמור את ההפניה העברית
          heShortDesc: hit.heShortDesc || '' // תיאור קצר
        };

        return {
          file: {
            id: fileId,
            name: fileName,
            path: filePath,
            type: fileType
          },
          matchCount: 1,
          contexts: [context],
          score: hit.score || 0
        };
      });

      console.log(`✅ מחזיר ${results.length} תוצאות`);

      return {
        results,
        estimatedTotalHits: totalHits
      };
    } catch (error) {
      console.error('❌ שגיאה בחיפוש:', error);
      return { results: [], estimatedTotalHits: 0 };
    }
  }

  // הדגשת מילות חיפוש בתוכן
  highlightMatches(text, query) {
    if (!text || !query) return text;

    const words = query.trim().split(/\s+/);
    let highlightedText = text;

    // הדגש כל מילה
    words.forEach(word => {
      const regex = new RegExp(`(${this.escapeRegex(word)})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });

    return highlightedText;
  }

  // escape תווים מיוחדים ב-regex
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // בדיקה אם המנוע מוכן
  isReady() {
    return this.serverReady;
  }

  // המתנה עד שהמנוע מוכן
  async waitUntilReady(maxMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      if (this.isReady()) return true;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.isReady();
  }

  // קבלת התקדמות אינדוקס
  getProgress() {
    return this.indexProgress;
  }

  // קבלת מספר קבצים
  getFilesCount() {
    return this.filesCount;
  }

  // סטטיסטיקות אינדקס
  async getIndexStats(indexName) {
    try {
      if (!window.electron) return null;

      const indexPath = window.electron.joinPath(this.indexPath, indexName);
      const result = await window.electron.tantivyStats({ indexPath });

      if (result.success) {
        return result.stats;
      } else {
        console.error('❌ שגיאה בקבלת סטטיסטיקות:', result.error);
        return null;
      }
    } catch (error) {
      console.error('❌ שגיאה בקבלת סטטיסטיקות:', error);
      return null;
    }
  }

  // מחיקת אינדקס
  async deleteIndex(indexName) {
    try {
      if (!window.electron) return false;

      const indexPath = window.electron.joinPath(this.indexPath, indexName);
      const result = await window.electron.tantivyDeleteIndex({ indexPath });

      if (result.success) {
        console.log(`✅ אינדקס "${indexName}" נמחק`);
        await this.loadAvailableIndexes();
        return true;
      } else {
        console.error('❌ שגיאה במחיקת אינדקס:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ שגיאה במחיקת אינדקס:', error);
      return false;
    }
  }

  // אין צורך ב-startServer/stopServer - Tantivy הוא ספרייה מקומית
  async startServer() {
    // Tantivy לא צריך שרת - פשוט אתחל
    return await this.initialize();
  }

  async stopServer() {
    // אין מה לעצור - Tantivy הוא ספרייה מקומית
    console.log('ℹ️ Tantivy לא דורש עצירת שרת');
    return true;
  }
}

// יצירת instance יחיד
const tantivyEngine = new TantivyEngine();

export default tantivyEngine;
