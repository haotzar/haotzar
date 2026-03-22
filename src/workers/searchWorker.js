// Web Worker לחיפוש - לא חוסם את ה-UI!

// פונקציות עזר - העתקה מ-App.jsx
const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/['"״׳''""]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const matchesAcronym = (text, acronym) => {
  if (!text || !acronym) return false;
  
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const acronymChars = acronym.toLowerCase().split('');
  
  if (acronymChars.length > words.length) return false;
  
  let wordIndex = 0;
  for (let i = 0; i < acronymChars.length; i++) {
    const char = acronymChars[i];
    let found = false;
    
    while (wordIndex < words.length) {
      const word = words[wordIndex].toLowerCase();
      if (word.startsWith(char)) {
        found = true;
        wordIndex++;
        break;
      }
      wordIndex++;
    }
    
    if (!found) return false;
  }
  
  return true;
};

const calculateMatchScore = (fileName, query) => {
  const normalizedFileName = normalizeText(fileName);
  const normalizedQuery = normalizeText(query);
  
  if (!normalizedFileName || !normalizedQuery) return 0;
  
  let score = 0;
  
  if (normalizedFileName === normalizedQuery) {
    score += 10000;
  } else if (normalizedFileName.startsWith(normalizedQuery)) {
    score += 5000;
  } else if (normalizedFileName.includes(normalizedQuery)) {
    score += 2000;
  }
  
  const fileWords = normalizedFileName.split(' ');
  const queryWords = normalizedQuery.split(' ');
  
  queryWords.forEach(qWord => {
    fileWords.forEach(fWord => {
      if (fWord === qWord) {
        score += 500;
      } else if (fWord.startsWith(qWord)) {
        score += 300;
      } else if (fWord.includes(qWord)) {
        score += 100;
      }
    });
  });
  
  if (matchesAcronym(fileName, query)) {
    score += 1000;
  }
  
  const lengthDiff = Math.abs(normalizedFileName.length - normalizedQuery.length);
  if (lengthDiff > 20) {
    score -= 100;
  }
  
  return Math.max(0, score);
};

// מאזין להודעות מה-main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  if (type === 'SEARCH') {
    const { query, allFiles, queryVariants, normalizedQueries } = data;
    
    const results = [];
    const matchedFiles = new Set();
    let filesChecked = 0;
    let filesMatched = 0;
    
    const MAX_RESULTS = 20;
    const MAX_FILES_TO_CHECK = 500;
    
    // חיפוש בקבצים
    for (const file of allFiles) {
      if (filesMatched >= MAX_RESULTS || filesChecked >= MAX_FILES_TO_CHECK) {
        break;
      }
      
      if (!matchedFiles.has(file.id)) {
        filesChecked++;
        const normalizedFileName = normalizeText(file.name);
        const fileWords = normalizedFileName.split(' ').filter(w => w.length > 0);
        
        const anyVariantMatches = normalizedQueries.some((normalizedQuery, idx) => {
          const queryWords = normalizedQuery.split(' ').filter(w => w.length > 0);
          const originalQuery = queryVariants[idx] || normalizedQuery;
          
          const isShortQuery = normalizedQuery.length <= 4;
          
          if (isShortQuery) {
            const hasStartMatch = fileWords.some(fWord => fWord.startsWith(normalizedQuery));
            const hasExactMatch = normalizedFileName.includes(normalizedQuery);
            const isAcronymMatch = !originalQuery.includes(' ') && 
                                   originalQuery.length >= 2 && 
                                   matchesAcronym(file.name, originalQuery);
            
            return hasStartMatch || hasExactMatch || isAcronymMatch;
          } else {
            const meaningfulMatches = queryWords.filter(qWord => {
              return fileWords.some(fWord => 
                fWord.startsWith(qWord) || 
                fWord === qWord || 
                (qWord.length >= 3 && fWord.includes(qWord))
              );
            }).length;
            
            const meaningfulMatchRatio = meaningfulMatches / queryWords.length;
            
            if (meaningfulMatchRatio < 0.7) {
              return false;
            }
            
            const allWordsMatch = queryWords.every(qWord => 
              fileWords.some(fWord => fWord.includes(qWord))
            );
            
            const hasSequentialMatch = normalizedFileName.includes(normalizedQuery);
            const isAcronymMatch = !originalQuery.includes(' ') && 
                                   originalQuery.length >= 2 && 
                                   matchesAcronym(file.name, originalQuery);
            
            return allWordsMatch || hasSequentialMatch || isAcronymMatch;
          }
        });
        
        if (anyVariantMatches) {
          filesMatched++;
          matchedFiles.add(file.id);
          const score = Math.max(...queryVariants.map((variant) => calculateMatchScore(file.name, variant)));
          
          if (score > 0) {
            results.push({
              ...file,
              matchType: 'filename',
              matchScore: score
            });
          }
        }
      }
    }
    
    // מיון לפי ציון
    results.sort((a, b) => b.matchScore - a.matchScore);
    
    // שלח תוצאות חזרה
    self.postMessage({
      type: 'SEARCH_RESULTS',
      data: {
        results: results.slice(0, 20),
        filesChecked,
        filesMatched
      }
    });
  }
};
