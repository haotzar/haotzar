import { DocumentRegular, DocumentTextRegular, SearchRegular, PersonRegular, BookRegular } from '@fluentui/react-icons';
import './SearchAutocomplete.css';

const SearchAutocomplete = ({ suggestions, onSelect, searchQuery }) => {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  // בדיקה אם קטגוריה היא חיצונית (לא להציג את שמה)
  const isExternalCategory = (categoryTitle) => {
    if (!categoryTitle) return false;
    const title = categoryTitle.toLowerCase();
    return title.includes('hebrewbooks') || 
           title.includes('hebrew books') ||
           title.includes('היברו-בוקס') ||
           title.includes('היברו בוקס') ||
           title.includes('היברובוקס') ||
           title.includes('אוצר החכמה') ||
           title.includes('אוצר חכמה');
  };

  // זיהוי מקור הספר
  const getBookSource = (file) => {
    // ספרי אוצריא
    if (file.type === 'otzaria') {
      return 'otzaria';
    }
    
    // בדוק אם זה מ-HebrewBooks לפי הקטגוריה
    if (file.categoryTitle) {
      const category = file.categoryTitle.toLowerCase();
      if (category.includes('hebrewbooks') || 
          category.includes('hebrew books') ||
          category.includes('היברו-בוקס') ||
          category.includes('היברו בוקס') ||
          category.includes('היברובוקס')) {
        return 'hebrewbooks';
      }
    }
    
    // בדוק לפי נתיב הקובץ
    if (file.path) {
      const pathLower = file.path.toLowerCase();
      if (pathLower.includes('hebrewbooks') || pathLower.includes('hebrew-books')) {
        return 'hebrewbooks';
      }
      if (pathLower.includes('אוצריא') || pathLower.includes('otzaria')) {
        return 'otzaria';
      }
      if (pathLower.includes('עוז והדר') || pathLower.includes('oz vehadar') || pathLower.includes('ozvehadar')) {
        return 'ozvehadar';
      }
      if (pathLower.includes('מוסד הרב קוק') || pathLower.includes('kook')) {
        return 'kook';
      }
      if (pathLower.includes('האויצר') || pathLower.includes('ozer')) {
        return 'ozer';
      }
    }
    
    // ברירת מחדל - ספר מקומי
    return 'local';
  };

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

  // מציאת מיקומים בטקסט מקורי על בסיס טקסט מנורמל
  const findOriginalPositions = (originalText, normalizedText, normalizedStart, normalizedEnd) => {
    let origPos = 0;
    let normPos = 0;
    let origStart = -1;
    let origEnd = -1;
    
    const origLower = originalText.toLowerCase();
    
    while (origPos < originalText.length && normPos < normalizedText.length) {
      const origChar = origLower[origPos];
      const normChar = normalizedText[normPos];
      
      // בדוק אם התו הנוכחי במקור תואם לתו המנורמל
      const isMatch = origChar === normChar;
      
      // בדוק אם זה תו שהוסר בנרמול (גרשיים, אותיות שימוש וכו')
      const isRemovedChar = /['"״׳''""הוכלמשב]/.test(origChar);
      
      if (isMatch) {
        // אם הגענו להתחלת הטווח המנורמל
        if (normPos === normalizedStart) {
          origStart = origPos;
        }
        // אם הגענו לסוף הטווח המנורמל
        if (normPos === normalizedEnd - 1) {
          origEnd = origPos + 1;
        }
        
        origPos++;
        normPos++;
      } else if (isRemovedChar) {
        // דלג על תווים שהוסרו בנרמול
        origPos++;
      } else {
        // אם אין התאמה ולא תו שהוסר, התקדם בשניהם
        origPos++;
        normPos++;
      }
    }
    
    // אם לא מצאנו סוף, קח עד סוף הטקסט
    if (origStart !== -1 && origEnd === -1) {
      origEnd = originalText.length;
    }
    
    return { start: origStart, end: origEnd };
  };

  // הדגשת טקסט החיפוש - תיקון להתאמה בין טקסט מנורמל למקורי + תמיכה בראשי תיבות
  const highlightMatch = (text, query) => {
    if (!query) return text;
    
    const normalizedText = normalizeText(text);
    const normalizedQuery = normalizeText(query);
    
    if (!normalizedQuery) return text;
    
    // בדוק אם זה ראשי תיבות (ללא רווחים ו-2-4 תווים)
    const isAcronym = !normalizedQuery.includes(' ') && 
                      normalizedQuery.length >= 2 && 
                      normalizedQuery.length <= 4;
    
    if (isAcronym) {
      // הדגשת ראשי תיבות - הדגש את האותיות הראשונות של המילים
      const words = text.split(' ').filter(w => w.length > 0);
      const normalizedWords = normalizedText.split(' ').filter(w => w.length > 0);
      const acronymChars = normalizedQuery.split('');
      
      // בדוק אם זה פורמט 2+1
      const isTwoOne = acronymChars.length === 3;
      
      if (isTwoOne) {
        // פורמט 2+1: שתי אותיות ראשונות של מילה ראשונה + אות ראשונה של מילה שנייה
        const firstTwo = normalizedQuery.substring(0, 2);
        const lastOne = normalizedQuery.substring(2, 3);
        
        if (normalizedWords.length >= 2 && 
            normalizedWords[0].startsWith(firstTwo) && 
            normalizedWords[1].startsWith(lastOne)) {
          
          return (
            <>
              <strong className="match-highlight">{words[0].substring(0, 2)}</strong>
              {words[0].substring(2)}
              {' '}
              <strong className="match-highlight">{words[1].substring(0, 1)}</strong>
              {words[1].substring(1)}
              {words.slice(2).length > 0 && ' ' + words.slice(2).join(' ')}
            </>
          );
        }
      }
      
      // ראשי תיבות רגילים - אות אחת לכל מילה
      const parts = [];
      let charIndex = 0;
      let wordIndex = 0;
      
      for (let i = 0; i < words.length && charIndex < acronymChars.length; i++) {
        const word = words[i];
        const normalizedWord = normalizedWords[i];
        
        if (normalizedWord.startsWith(acronymChars[charIndex])) {
          // הדגש את האות הראשונה
          parts.push(
            <span key={`word-${i}`}>
              {i > 0 && ' '}
              <strong className="match-highlight">{word.substring(0, 1)}</strong>
              {word.substring(1)}
            </span>
          );
          charIndex++;
        } else {
          // מילה שלא מתאימה - הצג רגיל
          parts.push(
            <span key={`word-${i}`}>
              {i > 0 && ' '}
              {word}
            </span>
          );
        }
      }
      
      // הוסף את שאר המילים
      for (let i = parts.length; i < words.length; i++) {
        parts.push(
          <span key={`word-${i}`}>
            {' '}
            {words[i]}
          </span>
        );
      }
      
      if (parts.length > 0) {
        return <>{parts}</>;
      }
    }
    
    // חיפוש רגיל - הדגשה רגילה
    const queryWords = normalizedQuery.split(' ').filter(w => w.length > 0);
    
    // מצא את כל המיקומים של מילות החיפוש בטקסט המנורמל
    const normalizedHighlights = [];
    
    // ראשית, נסה למצוא את כל הביטוי ברצף
    let index = normalizedText.indexOf(normalizedQuery);
    if (index !== -1) {
      normalizedHighlights.push({ start: index, end: index + normalizedQuery.length });
    } else {
      // אם לא נמצא ברצף, חפש כל מילה בנפרד
      queryWords.forEach(word => {
        let pos = 0;
        while ((pos = normalizedText.indexOf(word, pos)) !== -1) {
          normalizedHighlights.push({ start: pos, end: pos + word.length });
          pos += word.length;
        }
      });
    }
    
    if (normalizedHighlights.length === 0) return text;
    
    // מיזוג הדגשות חופפות בטקסט המנורמל
    normalizedHighlights.sort((a, b) => a.start - b.start);
    const mergedNormalized = [];
    let current = normalizedHighlights[0];
    
    for (let i = 1; i < normalizedHighlights.length; i++) {
      if (normalizedHighlights[i].start <= current.end) {
        current.end = Math.max(current.end, normalizedHighlights[i].end);
      } else {
        mergedNormalized.push(current);
        current = normalizedHighlights[i];
      }
    }
    mergedNormalized.push(current);
    
    // המר את המיקומים מטקסט מנורמל לטקסט מקורי
    const originalHighlights = mergedNormalized.map(({ start, end }) => 
      findOriginalPositions(text, normalizedText, start, end)
    ).filter(({ start, end }) => start !== -1 && end !== -1);
    
    if (originalHighlights.length === 0) return text;
    
    // בנה את הטקסט המודגש
    const parts = [];
    let lastIndex = 0;
    
    originalHighlights.forEach(({ start, end }, idx) => {
      if (start > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, start)}</span>);
      }
      parts.push(
        <strong key={`highlight-${start}-${idx}`} className="match-highlight">
          {text.substring(start, end)}
        </strong>
      );
      lastIndex = end;
    });
    
    if (lastIndex < text.length) {
      parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
    }
    
    return <>{parts}</>;
  };

  return (
    <div className="search-autocomplete">
      {suggestions.map((file) => {
        // טיפול בפעולת חיפוש
        if (file.isSearchAction) {
          return (
            <div
              key={file.id}
              className="autocomplete-item search-action-item"
              onClick={() => onSelect(file)}
            >
              <div className="autocomplete-icon">
                <SearchRegular />
              </div>
              <div className="autocomplete-content">
                <div className="autocomplete-title search-action-text">
                  חפש את "{file.name}"
                </div>
              </div>
              <SearchRegular className="autocomplete-arrow" />
            </div>
          );
        }
        
        // אם יש tocEntry, הצג את הכותרת
        const hasTitle = file.matchType === 'book-with-title' && file.tocEntry;
        const bookSource = getBookSource(file);
        
        return (
          <div
            key={file.id}
            className="autocomplete-item"
            onClick={() => onSelect(file)}
          >
            <div className="autocomplete-icon">
              {file.type === 'otzaria' ? (
                <BookRegular />
              ) : file.type === 'pdf' ? (
                <DocumentRegular />
              ) : (
                <DocumentTextRegular />
              )}
            </div>
            <div className="autocomplete-content">
              <div className="autocomplete-title">
                {hasTitle ? (
                  <>
                    {highlightMatch(file.name, searchQuery.split(':')[0])}
                    <span className="title-separator"> → </span>
                    <span className="title-name">
                      {highlightMatch(file.tocEntry.label, searchQuery.split(':')[1] || '')}
                    </span>
                  </>
                ) : (
                  highlightMatch(file.name, searchQuery)
                )}
              </div>
            </div>
            
            {/* אייקון מקור הספר */}
            {bookSource === 'otzaria' && (
              <img 
                src="/otzaria-icon.png" 
                alt="אוצריא" 
                className="source-badge"
                title="ספר מאוצריא"
              />
            )}
            {bookSource === 'hebrewbooks' && (
              <img 
                src="/hebrew_books.png" 
                alt="HebrewBooks" 
                className="source-badge"
                title="ספר מ-HebrewBooks"
              />
            )}
            {bookSource === 'ozvehadar' && (
              <img 
                src="/Logo-ozveadar.png" 
                alt="עוז והדר" 
                className="source-badge"
                title="ספר מעוז והדר"
              />
            )}
            {bookSource === 'kook' && (
              <img 
                src="/logo-kook.png" 
                alt="מוסד הרב קוק" 
                className="source-badge"
                title="ספר ממוסד הרב קוק"
              />
            )}
            {bookSource === 'ozer' && (
              <img 
                src="/icon.png" 
                alt="האויצר" 
                className="source-badge"
                title="ספר מהאויצר"
              />
            )}
            
            <SearchRegular className="autocomplete-arrow" />
          </div>
        );
      })}
    </div>
  );
};

export default SearchAutocomplete;
