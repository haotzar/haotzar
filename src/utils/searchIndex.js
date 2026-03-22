/**
 * אינדקס חיפוש מהיר לספרים
 * משתמש ב-Trie (עץ קידומות) לחיפוש יעיל
 */

// נרמול טקסט - הסרת גרשיים, סימני ציטוט ואותיות שימוש
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .replace(/['"״׳''""]/g, '') // הסרת כל סוגי הגרשיים והמרכאות
    .replace(/''/g, '') // הסרת שתי גרשיים בודדות ('')
    // הסרת אותיות שימוש בתחילת מילים (ה, ו, ב, כ, ל, מ, ש)
    .replace(/(^|[\s])([הוכלמשב])(?=[א-ת])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
};

// יצירת ראשי תיבות מטקסט
const createAcronym = (text) => {
  const words = text.split(' ').filter(w => w.length > 0);
  return words.map(w => w[0]).join('');
};

// יצירת ראשי תיבות בפורמט 2+1 (שתי אותיות ראשונות + אות ראשונה של מילה שנייה)
const createTwoOneAcronym = (text) => {
  const words = text.split(' ').filter(w => w.length > 0);
  if (words.length < 2) return null;
  return words[0].substring(0, 2) + words[1][0];
};

class SearchIndex {
  constructor() {
    this.books = new Map(); // מפה של ID -> ספר
    this.nameIndex = new Map(); // אינדקס לפי שם
    this.authorIndex = new Map(); // אינדקס לפי מחבר
    this.acronymIndex = new Map(); // אינדקס לראשי תיבות
    this.twoOneIndex = new Map(); // אינדקס לראשי תיבות 2+1
    this.tocIndex = new Map(); // אינדקס לתוכן עניינים
    this.wordIndex = new Map(); // אינדקס למילים בודדות
    this.isBuilt = false;
  }

  /**
   * בניית האינדקס מרשימת קבצים
   */
  buildIndex(files) {
    console.time('🔨 בניית אינדקס חיפוש');
    
    this.clear();
    
    files.forEach(file => {
      if (!file || !file.id) return;
      
      // שמור את הספר
      this.books.set(file.id, file);
      
      // אינדקס שם הספר
      const normalizedName = normalizeText(file.name);
      this._addToIndex(this.nameIndex, normalizedName, file.id);
      
      // אינדקס מילים בודדות מהשם
      const nameWords = normalizedName.split(' ').filter(w => w.length > 1);
      nameWords.forEach(word => {
        this._addToIndex(this.wordIndex, word, file.id);
      });
      
      // אינדקס ראשי תיבות
      const acronym = createAcronym(normalizedName);
      if (acronym.length >= 2) {
        this._addToIndex(this.acronymIndex, acronym, file.id);
      }
      
      // אינדקס ראשי תיבות 2+1
      const twoOne = createTwoOneAcronym(normalizedName);
      if (twoOne) {
        this._addToIndex(this.twoOneIndex, twoOne, file.id);
      }
      
      // אינדקס מחבר
      if (file.author) {
        const normalizedAuthor = normalizeText(file.author);
        this._addToIndex(this.authorIndex, normalizedAuthor, file.id);
        
        // מילים בודדות מהמחבר
        const authorWords = normalizedAuthor.split(' ').filter(w => w.length > 1);
        authorWords.forEach(word => {
          this._addToIndex(this.wordIndex, word, file.id);
        });
      }
      
      // אינדקס תוכן עניינים
      if (file.tableOfContents && Array.isArray(file.tableOfContents)) {
        file.tableOfContents.forEach(entry => {
          if (entry.label) {
            const normalizedLabel = normalizeText(entry.label);
            const key = `${file.id}:${normalizedLabel}`;
            this._addToIndex(this.tocIndex, normalizedLabel, key);
          }
        });
      }
    });
    
    this.isBuilt = true;
    console.timeEnd('🔨 בניית אינדקס חיפוש');
    console.log(`📊 סטטיסטיקות אינדקס:
  - ספרים: ${this.books.size}
  - ערכי שמות: ${this.nameIndex.size}
  - ערכי מחברים: ${this.authorIndex.size}
  - ראשי תיבות: ${this.acronymIndex.size}
  - ראשי תיבות 2+1: ${this.twoOneIndex.size}
  - מילים: ${this.wordIndex.size}
  - תוכן עניינים: ${this.tocIndex.size}`);
  }

  /**
   * הוספת ערך לאינדקס
   */
  _addToIndex(index, key, value) {
    if (!index.has(key)) {
      index.set(key, new Set());
    }
    index.get(key).add(value);
  }

  /**
   * חיפוש באינדקס
   */
  search(query, options = {}) {
    if (!this.isBuilt) {
      console.warn('⚠️ האינדקס לא נבנה עדיין');
      return [];
    }

    const {
      maxResults = 50,
      includeAcronyms = true,
      includeToc = true,
      includePartialMatch = true
    } = options;

    console.time(`🔍 חיפוש: "${query}"`);
    
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      console.timeEnd(`🔍 חיפוש: "${query}"`);
      return [];
    }

    const results = new Map(); // ID -> { book, score, matchType }
    
    // 1. חיפוש מדויק בשמות
    this._searchExact(this.nameIndex, normalizedQuery, results, 'name-exact', 100);
    
    // 2. חיפוש בתחילת שמות
    this._searchPrefix(this.nameIndex, normalizedQuery, results, 'name-prefix', 80);
    
    // 3. חיפוש במילים בודדות
    const queryWords = normalizedQuery.split(' ').filter(w => w.length > 1);
    queryWords.forEach(word => {
      this._searchExact(this.wordIndex, word, results, 'word-exact', 60);
      if (includePartialMatch) {
        this._searchPrefix(this.wordIndex, word, results, 'word-prefix', 40);
      }
    });
    
    // 4. חיפוש במחברים
    this._searchExact(this.authorIndex, normalizedQuery, results, 'author-exact', 70);
    this._searchPrefix(this.authorIndex, normalizedQuery, results, 'author-prefix', 50);
    
    // 5. חיפוש ראשי תיבות
    if (includeAcronyms && !normalizedQuery.includes(' ')) {
      const queryLength = normalizedQuery.length;
      
      // ראשי תיבות רגילים (2-5 תווים)
      if (queryLength >= 2 && queryLength <= 5) {
        this._searchExact(this.acronymIndex, normalizedQuery, results, 'acronym', 90);
        
        // חיפוש חלקי בראשי תיבות
        if (includePartialMatch) {
          this._searchPrefix(this.acronymIndex, normalizedQuery, results, 'acronym-prefix', 70);
        }
      }
      
      // ראשי תיבות 2+1 (3 תווים)
      if (queryLength === 3) {
        this._searchExact(this.twoOneIndex, normalizedQuery, results, 'two-one', 85);
      }
    }
    
    // 6. חיפוש בתוכן עניינים (אם מבוקש)
    if (includeToc) {
      // חפש ספרים שיש להם תוכן עניינים מתאים
      const colonIndex = query.indexOf(':');
      if (colonIndex > 0) {
        const bookPart = normalizeText(query.substring(0, colonIndex));
        const titlePart = normalizeText(query.substring(colonIndex + 1));
        
        // מצא ספרים שתואמים לחלק הראשון
        const matchingBooks = new Set();
        this._searchExact(this.nameIndex, bookPart, matchingBooks, 'temp', 0);
        this._searchPrefix(this.nameIndex, bookPart, matchingBooks, 'temp', 0);
        
        // חפש בתוכן העניינים של הספרים האלה
        matchingBooks.forEach(bookId => {
          const book = this.books.get(bookId);
          if (book && book.tableOfContents) {
            book.tableOfContents.forEach(entry => {
              const normalizedLabel = normalizeText(entry.label);
              if (normalizedLabel.includes(titlePart)) {
                const key = `${bookId}:${entry.label}`;
                if (!results.has(key)) {
                  results.set(key, {
                    book: book,
                    tocEntry: entry,
                    score: 95,
                    matchType: 'book-with-title'
                  });
                }
              }
            });
          }
        });
      }
    }
    
    // המרה למערך וסידור לפי ציון
    const sortedResults = Array.from(results.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(result => ({
        ...result.book,
        matchType: result.matchType,
        matchScore: result.score,
        tocEntry: result.tocEntry
      }));
    
    console.timeEnd(`🔍 חיפוש: "${query}"`);
    console.log(`   📊 נמצאו ${sortedResults.length} תוצאות`);
    
    return sortedResults;
  }

  /**
   * חיפוש מדויק
   */
  _searchExact(index, query, results, matchType, score) {
    if (index.has(query)) {
      index.get(query).forEach(id => {
        if (!results.has(id) || results.get(id).score < score) {
          const book = this.books.get(id);
          if (book) {
            results.set(id, { book, score, matchType });
          }
        }
      });
    }
  }

  /**
   * חיפוש קידומת (prefix)
   */
  _searchPrefix(index, query, results, matchType, score) {
    index.forEach((ids, key) => {
      if (key.startsWith(query) && key !== query) {
        ids.forEach(id => {
          if (!results.has(id) || results.get(id).score < score) {
            const book = this.books.get(id);
            if (book) {
              results.set(id, { book, score, matchType });
            }
          }
        });
      }
    });
  }

  /**
   * חיפוש מתקדם עם אופציות
   */
  searchAdvanced(query, options = {}) {
    // אם יש ":" בשאילתה, זה חיפוש ספר+כותרת
    if (query.includes(':')) {
      return this.search(query, { ...options, includeToc: true });
    }
    
    // אם השאילתה קצרה וללא רווחים, כנראה ראשי תיבות
    const normalizedQuery = normalizeText(query);
    const looksLikeAcronym = !normalizedQuery.includes(' ') && 
                             normalizedQuery.length >= 2 && 
                             normalizedQuery.length <= 5;
    
    if (looksLikeAcronym) {
      return this.search(query, { ...options, includeAcronyms: true });
    }
    
    // חיפוש רגיל
    return this.search(query, options);
  }

  /**
   * ניקוי האינדקס
   */
  clear() {
    this.books.clear();
    this.nameIndex.clear();
    this.authorIndex.clear();
    this.acronymIndex.clear();
    this.twoOneIndex.clear();
    this.tocIndex.clear();
    this.wordIndex.clear();
    this.isBuilt = false;
  }

  /**
   * עדכון ספר באינדקס
   */
  updateBook(file) {
    if (!file || !file.id) return;
    
    // הסר את הספר הישן
    this.removeBook(file.id);
    
    // הוסף את הספר החדש
    this.books.set(file.id, file);
    
    // עדכן את כל האינדקסים
    const normalizedName = normalizeText(file.name);
    this._addToIndex(this.nameIndex, normalizedName, file.id);
    
    const nameWords = normalizedName.split(' ').filter(w => w.length > 1);
    nameWords.forEach(word => {
      this._addToIndex(this.wordIndex, word, file.id);
    });
    
    const acronym = createAcronym(normalizedName);
    if (acronym.length >= 2) {
      this._addToIndex(this.acronymIndex, acronym, file.id);
    }
    
    const twoOne = createTwoOneAcronym(normalizedName);
    if (twoOne) {
      this._addToIndex(this.twoOneIndex, twoOne, file.id);
    }
    
    if (file.author) {
      const normalizedAuthor = normalizeText(file.author);
      this._addToIndex(this.authorIndex, normalizedAuthor, file.id);
      
      const authorWords = normalizedAuthor.split(' ').filter(w => w.length > 1);
      authorWords.forEach(word => {
        this._addToIndex(this.wordIndex, word, file.id);
      });
    }
  }

  /**
   * הסרת ספר מהאינדקס
   */
  removeBook(bookId) {
    this.books.delete(bookId);
    
    // הסר מכל האינדקסים
    [this.nameIndex, this.authorIndex, this.acronymIndex, 
     this.twoOneIndex, this.tocIndex, this.wordIndex].forEach(index => {
      index.forEach((ids, key) => {
        ids.delete(bookId);
        if (ids.size === 0) {
          index.delete(key);
        }
      });
    });
  }
}

// יצירת instance יחיד (singleton)
const searchIndex = new SearchIndex();

export default searchIndex;
export { normalizeText, createAcronym, createTwoOneAcronym };
