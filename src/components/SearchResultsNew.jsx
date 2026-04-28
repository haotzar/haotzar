import { useState, useMemo, useEffect, memo, useCallback, useRef } from 'react';
import { DocumentRegular, DocumentTextRegular, ChevronDownRegular, ChevronUpRegular, DismissRegular, EyeRegular } from '@fluentui/react-icons';
import { Spinner } from '@fluentui/react-components';
import PDFViewer from '../PDFViewer';
import TextViewer from '../TextViewer';
import './SearchResultsNew.css';

// קומפוננטה ממוזערת לתוצאה בודדת - תמנע רינדור מחדש מיותר
const BookResult = memo(({ 
  bookGroup, 
  isExpanded, 
  onToggleExpand, 
  onFileClick, 
  onShowPreview, 
  searchQuery,
  highlightSearchTerm,
  compactView = false
}) => {
  const firstContext = bookGroup.contexts[0];

  return (
    <div className="book-group">
      {/* כותרת הספר */}
      <div className="result-header-new">
        <div className="result-icon-small">
          {bookGroup.file.type === 'pdf' ? (
            <DocumentRegular />
          ) : (
            <DocumentTextRegular />
          )}
        </div>
        <div 
          className="result-title-new" 
          onClick={() => {
            // פתיחה בלשונית חדשה עם הקשר החיפוש
            const contextData = firstContext ? {
              searchQuery: searchQuery,
              context: firstContext,
              replaceSearchTab: false // פתח בטאב חדש
            } : null;
            
            onFileClick(bookGroup.file, contextData);
          }}
        >
          {bookGroup.file.name}
          {bookGroup.totalMatches > 1 && (
            <span className="match-count-inline"> ({bookGroup.totalMatches} התאמות)</span>
          )}
        </div>
        
        {/* כפתור הרחבה */}
        {bookGroup.totalMatches > 1 && (
          <button 
            className="expand-btn"
            onClick={() => onToggleExpand(bookGroup.file.id)}
            title={isExpanded ? 'כווץ' : 'הרחב'}
          >
            {isExpanded ? <ChevronUpRegular /> : <ChevronDownRegular />}
          </button>
        )}
      </div>

      {/* תצוגה מקדימה ראשונה - רק אם לא במצב compact */}
      {!compactView && firstContext && (
        <div 
          className="result-snippet"
          onClick={() => onShowPreview(bookGroup.file, firstContext)}
          style={{ cursor: 'pointer' }}
        >
          <EyeRegular className="snippet-preview-icon" />
          {highlightSearchTerm(firstContext.text, firstContext)}
        </div>
      )}

      {/* תוצאות נוספות (כשמורחב) - רק אם לא במצב compact */}
      {!compactView && isExpanded && bookGroup.contexts.length > 1 && (
        <div className="expanded-results">
          {bookGroup.contexts.slice(1).map((context, index) => (
            <div 
              key={`${bookGroup.file.id}-context-${index + 1}`}
              className="result-snippet expanded-snippet"
              onClick={() => onShowPreview(bookGroup.file, context)}
              style={{ cursor: 'pointer' }}
            >
              <EyeRegular className="snippet-preview-icon" />
              {highlightSearchTerm(context.text, context)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // רינדר מחדש רק אם ה-bookGroup reference השתנה או אם compactView השתנה
  return (
    prevProps.bookGroup === nextProps.bookGroup &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.compactView === nextProps.compactView
  );
});

BookResult.displayName = 'BookResult';

const SearchResultsNew = ({ results, onFileClick, isSearching, searchQuery, bookNameFilter = '', compactView = false, onPreviewChange, onLoadMore }) => {
  const [expandedBooks, setExpandedBooks] = useState(new Set());
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // שמור את התוצאות המלאות ואת מספר התוצאות המוצגות
  const [allResults, setAllResults] = useState([]);
  const [displayedCount, setDisplayedCount] = useState(20);
  const lastResultsLengthRef = useRef(0);
  
  // Cache של קבוצות - שומר על same reference לקבוצות קיימות
  const groupsCacheRef = useRef(new Map());
  
  const estimatedTotal = results.estimatedTotalHits || results.length;
  const resultsPerPage = 20;
  
  // עדכן את התוצאות המלאות כשמגיעות תוצאות חדשות
  useEffect(() => {
    // אם זה חיפוש חדש (פחות תוצאות מהפעם הקודמת), אפס
    if (results.length < lastResultsLengthRef.current) {
      console.log('🔄 חיפוש חדש - מאפס תוצאות');
      setAllResults(results);
      setDisplayedCount(20); // התחל עם 20 תוצאות
      groupsCacheRef.current.clear();
    } 
    // אם יש יותר תוצאות, הוסף רק את החדשות
    else if (results.length > lastResultsLengthRef.current) {
      console.log(`➕ מוסיף ${results.length - lastResultsLengthRef.current} תוצאות חדשות`);
      setAllResults(results);
    }
    
    lastResultsLengthRef.current = results.length;
  }, [results]);
  
  // הצג תוצאות בהדרגה - 20 כל 500ms
  useEffect(() => {
    if (displayedCount < allResults.length) {
      const timer = setTimeout(() => {
        const nextCount = Math.min(displayedCount + resultsPerPage, allResults.length);
        console.log(`📊 מציג ${nextCount} מתוך ${allResults.length} תוצאות`);
        setDisplayedCount(nextCount);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [displayedCount, allResults.length, resultsPerPage]);
  
  // התוצאות שמוצגות כרגע
  const displayedResults = allResults.slice(0, displayedCount);
  const groupedResults = useMemo(() => {
    if (!displayedResults || displayedResults.length === 0) {
      return [];
    }
    
    // שלב 1: אסוף את כל ה-contexts לכל ספר
    const bookContextsMap = new Map();
    
    displayedResults.forEach(result => {
      const bookId = result.file.id;
      
      if (!bookContextsMap.has(bookId)) {
        bookContextsMap.set(bookId, {
          file: result.file,
          contexts: []
        });
      }
      
      const bookData = bookContextsMap.get(bookId);
      
      // הוסף contexts
      if (result.contexts && result.contexts.length > 0) {
        bookData.contexts.push(...result.contexts);
      }
    });
    
    // שלב 2: בנה קבוצות - שמור על reference אם התוכן זהה
    const nextGroups = new Map();
    
    for (const [bookId, bookData] of bookContextsMap.entries()) {
      const cachedGroup = groupsCacheRef.current.get(bookId);
      
      // בדוק אם הקבוצה המטמונת זהה לחדשה
      if (cachedGroup && 
          cachedGroup.contexts.length === bookData.contexts.length &&
          cachedGroup.totalMatches === bookData.contexts.length) {
        // שמור על אותו reference - אין שינוי!
        nextGroups.set(bookId, cachedGroup);
      } else {
        // צור קבוצה חדשה - יש שינוי
        const newGroup = {
          file: bookData.file,
          contexts: bookData.contexts,
          totalMatches: bookData.contexts.length
        };
        nextGroups.set(bookId, newGroup);
      }
    }
    
    // עדכן את ה-cache
    groupsCacheRef.current = nextGroups;
    
    return Array.from(nextGroups.values());
  }, [displayedResults]);

  // פונקציה להרחבה/כיווץ של ספר
  const toggleBookExpansion = useCallback((bookId) => {
    setExpandedBooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
  }, []);

  // פונקציה להצגת תצוגה מקדימה
  const showPreview = useCallback((file, context) => {
    if (onPreviewChange) {
      onPreviewChange(file, context);
    }
  }, [onPreviewChange]);

  if (isSearching) {
    return (
      <div className="search-loading">
        <Spinner size="large" />
        <div className="loading-text">מחפש בקבצים...</div>
      </div>
    );
  }

  if (!displayedResults || displayedResults.length === 0 || groupedResults.length === 0) {
    return null;
  }

  // סימון מילות החיפוש באדום - משופר עם תמיכה בוריאציות ומילים מרובות
  const highlightSearchTerm = (text, context) => {
    if (!text) return text;
    
    // הסר כל תגיות HTML שמגיעות מ-Meilisearch (em, mark, וכו')
    const cleanText = text.replace(/<\/?[^>]+(>|$)/g, '');
    
    // נרמול - הסרת גרשיים וסימני ציטוט
    const normalizeForMatch = (str) => {
      return str
        .replace(/['"״׳''""]/g, '')
        .replace(/[.,!?;:\-–—()[\]{}]/g, '')
        .toLowerCase();
    };
    
    // פיצול שאילתת החיפוש למילים
    const queryWords = searchQuery ? searchQuery.trim().split(/\s+/) : [];
    
    // אם אין מילים לחיפוש, החזר את הטקסט כמו שהוא
    if (queryWords.length === 0) {
      return cleanText;
    }
    
    // מצא את כל המיקומים שצריך להדגיש
    const highlights = [];
    
    // שלב 1: אם יש highlightedWords מההקשר - הוסף אותם
    if (context && context.highlightedWords && Array.isArray(context.highlightedWords)) {
      for (const word of context.highlightedWords) {
        const wordLower = word.toLowerCase();
        const textLower = cleanText.toLowerCase();
        
        let searchFrom = 0;
        while (searchFrom < cleanText.length) {
          const index = textLower.indexOf(wordLower, searchFrom);
          if (index === -1) break;
          
          highlights.push({
            start: index,
            end: index + word.length,
            word: cleanText.substring(index, index + word.length)
          });
          
          searchFrom = index + word.length;
        }
      }
    }
    // תמיכה לאחור - אם יש highlightedWord בודד (ישן)
    else if (context && context.highlightedWord) {
      const word = context.highlightedWord;
      const wordLower = word.toLowerCase();
      const textLower = cleanText.toLowerCase();
      
      let searchFrom = 0;
      while (searchFrom < cleanText.length) {
        const index = textLower.indexOf(wordLower, searchFrom);
        if (index === -1) break;
        
        highlights.push({
          start: index,
          end: index + word.length,
          word: cleanText.substring(index, index + word.length)
        });
        
        searchFrom = index + word.length;
      }
    }
    
    // שלב 2: חפש כל מילה מהשאילתה בטקסט
    for (const queryWord of queryWords) {
      const normalizedQuery = normalizeForMatch(queryWord);
      if (!normalizedQuery || normalizedQuery.length < 2) continue;
      
      const normalizedText = normalizeForMatch(cleanText);
      const textWords = cleanText.split(/\s+/);
      
      let currentPos = 0;
      for (const textWord of textWords) {
        const wordStart = cleanText.indexOf(textWord, currentPos);
        if (wordStart === -1) {
          currentPos += textWord.length + 1;
          continue;
        }
        
        const normalizedTextWord = normalizeForMatch(textWord);
        
        // בדוק התאמה מדויקת
        if (normalizedTextWord === normalizedQuery) {
          // בדוק אם כבר מודגש
          const alreadyHighlighted = highlights.some(h => 
            h.start <= wordStart && h.end >= wordStart + textWord.length
          );
          
          if (!alreadyHighlighted) {
            highlights.push({
              start: wordStart,
              end: wordStart + textWord.length,
              word: textWord
            });
          }
        }
        // בדוק התאמה חלקית (המילה מכילה את החיפוש)
        else if (normalizedTextWord.includes(normalizedQuery)) {
          const alreadyHighlighted = highlights.some(h => 
            h.start <= wordStart && h.end >= wordStart + textWord.length
          );
          
          if (!alreadyHighlighted) {
            highlights.push({
              start: wordStart,
              end: wordStart + textWord.length,
              word: textWord
            });
          }
        }
        // בדוק התאמה fuzzy (מילים דומות)
        else if (normalizedTextWord.length >= 3 && 
                 Math.abs(normalizedTextWord.length - normalizedQuery.length) <= 1) {
          const distance = levenshteinDistance(normalizedTextWord, normalizedQuery);
          if (distance <= 1) {
            const alreadyHighlighted = highlights.some(h => 
              h.start <= wordStart && h.end >= wordStart + textWord.length
            );
            
            if (!alreadyHighlighted) {
              highlights.push({
                start: wordStart,
                end: wordStart + textWord.length,
                word: textWord
              });
            }
          }
        }
        
        currentPos = wordStart + textWord.length;
      }
    }
    
    // אם אין מה להדגיש, החזר את הטקסט כמו שהוא
    if (highlights.length === 0) {
      return cleanText;
    }
    
    // מיין לפי מיקום
    highlights.sort((a, b) => a.start - b.start);
    
    // מיזוג הדגשות חופפות
    const merged = [];
    for (const highlight of highlights) {
      if (merged.length === 0) {
        merged.push(highlight);
      } else {
        const last = merged[merged.length - 1];
        if (highlight.start <= last.end) {
          // חופפים - מזג
          last.end = Math.max(last.end, highlight.end);
          last.word = cleanText.substring(last.start, last.end);
        } else {
          merged.push(highlight);
        }
      }
    }
    
    // בנה את הטקסט המודגש
    const parts = [];
    let lastEnd = 0;
    
    for (const highlight of merged) {
      // הוסף טקסט לפני ההדגשה
      if (highlight.start > lastEnd) {
        parts.push(cleanText.substring(lastEnd, highlight.start));
      }
      
      // הוסף את החלק המודגש
      parts.push(
        <mark key={`mark-${highlight.start}`} className="highlight">
          {highlight.word}
        </mark>
      );
      
      lastEnd = highlight.end;
    }
    
    // הוסף את השאר של הטקסט
    if (lastEnd < cleanText.length) {
      parts.push(cleanText.substring(lastEnd));
    }
    
    return <>{parts}</>;
  };

  // פונקציה עזר לחישוב Levenshtein distance
  const levenshteinDistance = (str1, str2) => {
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
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[len1][len2];
  };

  // הצג את כל התוצאות שנטענו עד כה - עם סינון לפי שם ספר
  const filteredByBookName = bookNameFilter.trim() 
    ? groupedResults.filter(group => 
        group.file.name.toLowerCase().includes(bookNameFilter.toLowerCase())
      )
    : groupedResults;
  
  const currentResults = filteredByBookName;
  
  // האם עדיין מציג תוצאות בהדרגה
  const isShowingGradually = displayedCount < allResults.length;
  
  // האם יש עוד תוצאות לטעון מהשרת
  const hasMoreToLoad = allResults.length < estimatedTotal && onLoadMore;
  
  // פונקציה לטעינת עוד תוצאות
  const handleLoadMore = async () => {
    if (isLoadingMore || !onLoadMore) return;
    
    setIsLoadingMore(true);
    try {
      await onLoadMore(allResults.length, 100);
    } catch (error) {
      console.error('❌ שגיאה בטעינת תוצאות נוספות:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <>
      <div className="search-results-container">
        {/* רשימת תוצאות */}
        <div className="results-list-new">
          {currentResults.map((bookGroup) => (
            <BookResult
              key={bookGroup.file.id}
              bookGroup={bookGroup}
              isExpanded={expandedBooks.has(bookGroup.file.id)}
              onToggleExpand={toggleBookExpansion}
              onFileClick={onFileClick}
              onShowPreview={showPreview}
              searchQuery={searchQuery}
              highlightSearchTerm={highlightSearchTerm}
              compactView={compactView}
            />
          ))}
        </div>

        {/* אינדיקטור טעינה למטה */}
        {isShowingGradually && (
          <div className="loading-more">
            <Spinner size="medium" />
            <div className="loading-text">
              טוען עוד תוצאות... ({displayedCount}/{allResults.length})
            </div>
          </div>
        )}
        
        {/* כפתור טען עוד */}
        {!isShowingGradually && hasMoreToLoad && (
          <div className="load-more-container">
            <button 
              className="load-more-btn"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <>
                  <Spinner size="tiny" />
                  <span>טוען...</span>
                </>
              ) : (
                <>טען עוד 100 תוצאות</>
              )}
            </button>
            <div className="load-more-info">
              מוצגים {allResults.length} מתוך {estimatedTotal.toLocaleString('he-IL')} תוצאות משוערות
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// אל תשתמש ב-memo על הקומפוננטה הראשית - תן לה להתרנדר
// ה-BookResult עם memo ידאג שרק תוצאות חדשות יתרנדרו
export default SearchResultsNew;
