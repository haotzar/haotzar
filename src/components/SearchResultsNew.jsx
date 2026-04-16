import { useState, useMemo, useEffect, memo } from 'react';
import { DocumentRegular, DocumentTextRegular, ChevronDownRegular, ChevronUpRegular, DismissRegular, EyeRegular } from '@fluentui/react-icons';
import { Spinner } from '@fluentui/react-components';
import PDFViewer from '../PDFViewer';
import TextViewer from '../TextViewer';
import './SearchResultsNew.css';

const SearchResultsNew = ({ results, onFileClick, isSearching, searchQuery, onPreviewChange }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedBooks, setExpandedBooks] = useState(new Set());
  const resultsPerPage = 30;
  const maxPages = 10;


  // קיבוץ תוצאות לפי ספר
  const groupedResults = useMemo(() => {
    if (!results || results.length === 0) return [];
    
    const grouped = new Map();
    
    results.forEach(result => {
      const bookId = result.file.id;
      
      if (!grouped.has(bookId)) {
        grouped.set(bookId, {
          file: result.file,
          contexts: [],
          totalMatches: 0
        });
      }
      
      const group = grouped.get(bookId);
      
      if (result.contexts && result.contexts.length > 0) {
        group.contexts.push(...result.contexts);
        group.totalMatches += result.contexts.length;
      } else {
        group.totalMatches += 1;
      }
    });
    
    return Array.from(grouped.values());
  }, [results]);

  // פונקציה להרחבה/כיווץ של ספר
  const toggleBookExpansion = (bookId) => {
    setExpandedBooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
  };

  // פונקציה להצגת תצוגה מקדימה
  const showPreview = (file, context) => {
    if (onPreviewChange) {
      onPreviewChange(file, context);
    }
  };

  if (isSearching) {
    return (
      <div className="search-loading">
        <Spinner size="large" />
        <div className="loading-text">מחפש בקבצים...</div>
      </div>
    );
  }

  if (!results || results.length === 0 || groupedResults.length === 0) {
    return null;
  }

  // סימון מילות החיפוש באדום - משופר עם תמיכה בוריאציות ומילים מרובות
  const highlightSearchTerm = (text, context) => {
    if (!text) return text;
    
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
    if (queryWords.length === 0) return text;
    
    // מצא את כל המיקומים שצריך להדגיש
    const highlights = [];
    
    // שלב 1: אם יש highlightedWords מההקשר - הוסף אותם
    if (context && context.highlightedWords && Array.isArray(context.highlightedWords)) {
      for (const word of context.highlightedWords) {
        const wordLower = word.toLowerCase();
        const textLower = text.toLowerCase();
        
        let searchFrom = 0;
        while (searchFrom < text.length) {
          const index = textLower.indexOf(wordLower, searchFrom);
          if (index === -1) break;
          
          highlights.push({
            start: index,
            end: index + word.length,
            word: text.substring(index, index + word.length)
          });
          
          searchFrom = index + word.length;
        }
      }
    }
    // תמיכה לאחור - אם יש highlightedWord בודד (ישן)
    else if (context && context.highlightedWord) {
      const word = context.highlightedWord;
      const wordLower = word.toLowerCase();
      const textLower = text.toLowerCase();
      
      let searchFrom = 0;
      while (searchFrom < text.length) {
        const index = textLower.indexOf(wordLower, searchFrom);
        if (index === -1) break;
        
        highlights.push({
          start: index,
          end: index + word.length,
          word: text.substring(index, index + word.length)
        });
        
        searchFrom = index + word.length;
      }
    }
    
    // שלב 2: חפש כל מילה מהשאילתה בטקסט
    for (const queryWord of queryWords) {
      const normalizedQuery = normalizeForMatch(queryWord);
      if (!normalizedQuery || normalizedQuery.length < 2) continue;
      
      const normalizedText = normalizeForMatch(text);
      const textWords = text.split(/\s+/);
      
      let currentPos = 0;
      for (const textWord of textWords) {
        const wordStart = text.indexOf(textWord, currentPos);
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
    if (highlights.length === 0) return text;
    
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
          last.word = text.substring(last.start, last.end);
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
        parts.push(text.substring(lastEnd, highlight.start));
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
    if (lastEnd < text.length) {
      parts.push(text.substring(lastEnd));
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

  // חישוב pagination - לפי ספרים
  const totalBooks = groupedResults.length;
  const totalPages = Math.min(Math.ceil(totalBooks / resultsPerPage), maxPages);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = Math.min(startIndex + resultsPerPage, totalBooks);
  const currentResults = groupedResults.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // גלול לראש אזור התוצאות
    const resultsWrapper = document.querySelector('.search-results-wrapper');
    if (resultsWrapper) {
      resultsWrapper.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="search-results-container">
        {/* רשימת תוצאות */}
        <div className="results-list-new">
          {currentResults.map((bookGroup) => {
            const isExpanded = expandedBooks.has(bookGroup.file.id);
            const firstContext = bookGroup.contexts[0];
            
            return (
              <div key={bookGroup.file.id} className="book-group">
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
                        replaceSearchTab: true // החלף את כרטיסיית החיפוש
                      } : null;
                      
                      onFileClick(bookGroup.file, contextData);
                    }}
                  >
                    {bookGroup.file.name}
                  </div>
                  
                  {/* כפתור הרחבה */}
                  {bookGroup.totalMatches > 1 && (
                    <button 
                      className="expand-btn"
                      onClick={() => toggleBookExpansion(bookGroup.file.id)}
                      title={isExpanded ? 'כווץ' : 'הרחב'}
                    >
                      {isExpanded ? <ChevronUpRegular /> : <ChevronDownRegular />}
                      <span className="match-count">({bookGroup.totalMatches})</span>
                    </button>
                  )}
                </div>

                {/* תצוגה מקדימה ראשונה */}
                {firstContext && (
                  <div 
                    className="result-snippet"
                    onClick={() => showPreview(bookGroup.file, firstContext)}
                    style={{ cursor: 'pointer' }}
                  >
                    <EyeRegular className="snippet-preview-icon" />
                    {highlightSearchTerm(firstContext.text, firstContext)}
                  </div>
                )}

                {/* תוצאות נוספות (כשמורחב) */}
                {isExpanded && bookGroup.contexts.length > 1 && (
                  <div className="expanded-results">
                    {bookGroup.contexts.slice(1).map((context, index) => (
                      <div 
                        key={index}
                        className="result-snippet expanded-snippet"
                        onClick={() => showPreview(bookGroup.file, context)}
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
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
          {/* כפתור הקודם */}
          {currentPage > 1 && (
            <button
              className="page-btn"
              onClick={() => handlePageChange(currentPage - 1)}
            >
              ← הקודם
            </button>
          )}

          {/* מספרי עמודים */}
          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`page-number ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
          </div>

          {/* כפתור הבא */}
          {currentPage < totalPages && (
            <button
              className="page-btn"
              onClick={() => handlePageChange(currentPage + 1)}
            >
              הבא →
            </button>
          )}
        </div>
      )}
      </div>
    </>
  );
};

// מנע רינדור מיותר כשרק searchQuery משתנה
export default memo(SearchResultsNew, (prevProps, nextProps) => {
  // החזר true אם הProps שווים (אל תרנדר מחדש)
  // החזר false אם הProps שונים (רנדר מחדש)
  
  const shouldNotRerender = (
    prevProps.results === nextProps.results &&
    prevProps.isSearching === nextProps.isSearching &&
    prevProps.onFileClick === nextProps.onFileClick
  );
  
  if (!shouldNotRerender) {
    console.log('🔄 SearchResultsNew re-rendering because:', {
      resultsChanged: prevProps.results !== nextProps.results,
      isSearchingChanged: prevProps.isSearching !== nextProps.isSearching,
      onFileClickChanged: prevProps.onFileClick !== nextProps.onFileClick,
      searchQueryChanged: prevProps.searchQuery !== nextProps.searchQuery
    });
  }
  
  return shouldNotRerender;
});
