import fs from 'fs';
import path from 'path';

// מפות ערכי גימטריה
const gematriaValues = {
  regular: {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
    'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200,
    'ש': 300, 'ת': 400
  },
  small: {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 1, 'כ': 2, 'ך': 2, 'ל': 3, 'מ': 4, 'ם': 4, 'נ': 5, 'ן': 5,
    'ס': 6, 'ע': 7, 'פ': 8, 'ף': 8, 'צ': 9, 'ץ': 9, 'ק': 1, 'ר': 2,
    'ש': 3, 'ת': 4
  },
  finalLetters: {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ך': 500, 'ל': 30, 'מ': 40, 'ם': 600, 'נ': 50, 'ן': 700,
    'ס': 60, 'ע': 70, 'פ': 80, 'ף': 800, 'צ': 90, 'ץ': 900, 'ק': 100, 'ר': 200,
    'ש': 300, 'ת': 400
  }
};

/**
 * חישוב ערך גימטריה של טקסט
 */
export function calculateGematria(text, method = 'regular', useKolel = false) {
  const values = gematriaValues[method] || gematriaValues.regular;
  let sum = 0;
  
  // ספירת מילים
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // חישוב סכום האותיות
  for (const char of text) {
    if (values[char]) {
      sum += values[char];
    }
  }

  // הוספת כולל אם נדרש
  if (useKolel && wordCount > 0) {
    sum += wordCount;
  }

  return sum;
}

/**
 * ניקוי תגיות HTML ו-HTML entities
 */
function cleanHtml(text) {
  // הסרת תגיות HTML
  let cleaned = text.replace(/<[^>]*>/g, '');
  
  // הסרת HTML entities נפוצות
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&thinsp;/g, ' ')
    .replace(/&ensp;/g, ' ')
    .replace(/&emsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // הסרת כל HTML entities שנשארו
  cleaned = cleaned
    .replace(/&[a-zA-Z]+;/g, '')
    .replace(/&#\d+;/g, '')
    .replace(/&#x[0-9a-fA-F]+;/g, '');
  
  // ניקוי רווחים מיותרים
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * חילוץ נתיב היררכי (כותרות) מהשורות
 */
function extractPathFromLines(lines, currentIndex) {
  const lastHeaderByLevel = {};
  const hTagRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;

  // סריקה אחורה מהמיקום הנוכחי
  for (let i = currentIndex; i >= 0; i--) {
    // אם מצאנו כותרות מספיק, אפשר לעצור
    if (lastHeaderByLevel[1] && lastHeaderByLevel[2] && lastHeaderByLevel[3]) {
      break;
    }

    const line = lines[i];
    let match;
    while ((match = hTagRegex.exec(line)) !== null) {
      const level = parseInt(match[1]);
      const text = cleanHtml(match[2]);

      // שומרים רק את הכותרת הראשונה שנמצאה עבור כל רמה
      if (!lastHeaderByLevel[level] && text) {
        lastHeaderByLevel[level] = text;
      }
    }
  }

  if (Object.keys(lastHeaderByLevel).length === 0) return '';

  // הרכבת הנתיב לפי סדר הרמות
  const sortedLevels = Object.keys(lastHeaderByLevel).sort((a, b) => a - b);
  const parts = sortedLevels.map(level => lastHeaderByLevel[level]);

  return parts.join(', ');
}

/**
 * חיפוש בקבצי טקסט
 */
export async function searchGematriaInFiles(
  folder,
  targetValue,
  options = {}
) {
  const {
    method = 'regular',
    useKolel = false,
    wholeVerseOnly = false,
    maxPhraseWords = 8,
    fileLimit = 1000,
    maxResults = 500
  } = options;

  const results = [];
  
  try {
    // קבלת כל קבצי ה-TXT באופן רקורסיבי
    const files = await getAllTextFiles(folder);
    
    console.log(`Found ${files.length} text files to search`);
    
    for (const filePath of files) {
      if (results.length >= maxResults) break;

      try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          if (results.length >= maxResults) break;
          
          const line = lines[i];

          // דילוג על שורות כותרות
          if (/<h[1-6][^>]*>/.test(line)) {
            continue;
          }

          // חילוץ מספר הפסוק
          const verseMatch = line.match(/^\(([^\)]+)\)/);
          const verseNumber = verseMatch ? verseMatch[1] : '';

          // הסרת הסוגריים עם מספר הפסוק
          let cleanLine = line.replace(/^\([^\)]+\)\s*/, '');

          // הסרת סוגריים מסולסלות עם תוכן
          cleanLine = cleanLine.replace(/\{[^\}]*\}/g, '');

          // ניקוי תגיות HTML
          const lineWithoutHtml = cleanHtml(cleanLine);

          const words = lineWithoutHtml
            .split(/\s+/)
            .filter(w => w.trim().length > 0);

          if (words.length === 0) continue;

          // חיפוש פסוק שלם
          if (wholeVerseOnly) {
            const totalValue = calculateGematria(words.join(' '), method, useKolel);
            
            if (totalValue === targetValue) {
              const phrase = words.join(' ');
              const path = extractPathFromLines(lines, i);
              
              results.push({
                file: filePath,
                line: i + 1,
                text: phrase,
                path: path,
                verseNumber: verseNumber,
                contextBefore: '',
                contextAfter: ''
              });
            }
          } else {
            // חיפוש רגיל - כל קטע
            for (let start = 0; start < words.length; start++) {
              if (results.length >= maxResults) break;
              
              for (let offset = 0; offset < maxPhraseWords && start + offset < words.length; offset++) {
                const phrase = words.slice(start, start + offset + 1).join(' ');
                const phraseValue = calculateGematria(phrase, method, useKolel);
                
                if (phraseValue === targetValue) {
                  const path = extractPathFromLines(lines, i);
                  
                  // חילוץ הקשר
                  const contextWordsCount = 3;
                  const contextStart = Math.max(0, start - contextWordsCount);
                  const contextEnd = Math.min(words.length, start + offset + 1 + contextWordsCount);
                  
                  const contextBefore = start > contextStart
                    ? words.slice(contextStart, start).join(' ')
                    : '';
                  const contextAfter = start + offset + 1 < contextEnd
                    ? words.slice(start + offset + 1, contextEnd).join(' ')
                    : '';
                  
                  results.push({
                    file: filePath,
                    line: i + 1,
                    text: phrase,
                    path: path,
                    verseNumber: verseNumber,
                    contextBefore: contextBefore,
                    contextAfter: contextAfter
                  });
                  
                  if (results.length >= maxResults) break;
                } else if (phraseValue > targetValue) {
                  // אופטימיזציה - אם עברנו את הערך, אין טעם להמשיך
                  break;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        continue;
      }
    }
    
    console.log(`Search completed. Found ${results.length} results`);
  } catch (error) {
    console.error('Error searching gematria:', error);
  }

  return results;
}

/**
 * קבלת כל קבצי הטקסט באופן רקורסיבי
 */
async function getAllTextFiles(dir) {
  const files = [];
  
  async function scan(currentDir) {
    try {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.txt')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${currentDir}:`, error);
    }
  }
  
  await scan(dir);
  return files;
}


/**
 * חיפוש מהיר יותר עם מטמון
 */
class GematriaSearchCache {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 100;
  }

  getCacheKey(targetValue, method, useKolel, wholeVerseOnly, maxPhraseWords) {
    return `${targetValue}-${method}-${useKolel}-${wholeVerseOnly}-${maxPhraseWords}`;
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    // הגבלת גודל המטמון
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }
}

export const searchCache = new GematriaSearchCache();

/**
 * חיפוש עם מטמון
 */
export async function searchGematriaWithCache(folder, targetValue, options = {}) {
  const {
    method = 'regular',
    useKolel = false,
    wholeVerseOnly = false,
    maxPhraseWords = 8
  } = options;

  const cacheKey = searchCache.getCacheKey(
    targetValue,
    method,
    useKolel,
    wholeVerseOnly,
    maxPhraseWords
  );

  // בדיקה במטמון
  const cached = searchCache.get(cacheKey);
  if (cached) {
    console.log('Returning cached results');
    return cached;
  }

  // חיפוש חדש
  const results = await searchGematriaInFiles(folder, targetValue, options);
  
  // שמירה במטמון
  searchCache.set(cacheKey, results);
  
  return results;
}

/**
 * ניקוי מטמון החיפוש
 */
export function clearSearchCache() {
  searchCache.clear();
}
