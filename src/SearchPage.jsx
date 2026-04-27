import { SearchRegular, DocumentRegular, DocumentTextRegular, SettingsRegular, EyeRegular } from '@fluentui/react-icons';
import { useState, useEffect, useMemo } from 'react';
import TooltipWrapper from './components/TooltipWrapper';
import SearchResultsNew from './components/SearchResultsNew';
import CategoryFilter from './components/CategoryFilter';
import IndexSelector from './components/IndexSelector';
import PDFViewer from './PDFViewer';
import TextViewer from './TextViewer';
import meilisearchEngine from './utils/meilisearchEngine';
import booksMetadata from './utils/booksMetadata';
import { autoConvertSearch } from './utils/hebrewConverter';
import './SearchPage.css';

const SearchPage = ({
  searchQuery,
  setSearchQuery,
  isIndexing,
  isSearching,
  searchResults,
  setSearchResults,
  handleFileClick,
  allFiles,
  onSearch,
  onNewSearch, // callback לפתיחת טאב חיפוש חדש
  recentBooks: _recentBooks = [], // הוסף recentBooks כ-prop
  isActive = true, // האם הכרטיסייה פעילה
  onAutocompleteChange, // callback לעדכון App על מצב ההשלמה
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchAccuracy, setSearchAccuracy] = useState(50); // רמת דיוק החיפוש
  const [hasSearched, setHasSearched] = useState(false); // האם בוצע חיפוש
  
  // אינדקסים נבחרים לחיפוש
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  
  // אפשרויות חיפוש מתקדמות חדשות
  const [specificBook, setSpecificBook] = useState(''); // חיפוש בספר ספציפי
  const [matchingStrategy, setMatchingStrategy] = useState('last'); // 'last' או 'all'
  const [cropLength, setCropLength] = useState(300); // אורך ההקשר המוצג (מילים)
  
  // אופציות עברית
  const [fullSpelling, setFullSpelling] = useState(false); // כתיב מלא/חסר
  const [prefixes, setPrefixes] = useState(false); // תחיליות
  const [suffixes, setSuffixes] = useState(false); // סיומות
  
  // פונקציה לסגירת ההשלמה האוטומטית
  const closeAutocomplete = () => {
    setShowAutocomplete(false);
    setShowAdvanced(false);
  };
  
  // הגדרות חיפוש מתקדם
  const [partialWord, setPartialWord] = useState(false); // חלק ממילה
  
  // state לתצוגה מקדימה
  const [previewBook, setPreviewBook] = useState(null);
  const [previewContext, setPreviewContext] = useState(null);
  const [previewSearchQuery, setPreviewSearchQuery] = useState(''); // שמור את ה-query בזמן פתיחת התצוגה

  // שמור את searchContext כ-memoized כדי למנוע יצירת אובייקט חדש בכל רינדור
  const memoizedSearchContext = useMemo(() => ({
    searchQuery: previewSearchQuery,
    context: previewContext
  }), [previewSearchQuery, previewContext]);

  // איפוס תצוגה מקדימה רק כשאין תוצאות (לא כשמשנים את החיפוש)
  useEffect(() => {
    if (searchResults.length === 0) {
      setPreviewBook(null);
      setPreviewContext(null);
      setPreviewSearchQuery('');
    }
  }, [searchResults]);

  // קטגוריות ראשיות
  const categories = [
    { id: 'tanach', name: 'תנ"ך' },
    { id: 'shas', name: 'ש"ס' },
    { id: 'halacha', name: 'הלכה' },
    { id: 'shut', name: 'שו"ת' },
    { id: 'machshava', name: 'מחשבה ומוסר' },
    { id: 'contemporary', name: 'מחברי זמננו' },
  ];

  // קטגוריות נוספות (שורה שנייה)
  const moreCategories = [
    { id: 'chassidut', name: 'חסידות' },
    { id: 'kabbalah', name: 'קבלה' },
    { id: 'journals', name: 'כתבי עת' },
    { id: 'favorites', name: 'מועדפים' },
    { id: 'prayers', name: 'תפלות' },
    { id: 'reference', name: 'ספרות עזר' },
  ];

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  // טעינת חיפושים אחרונים מ-localStorage
  useEffect(() => {
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches));
      } catch (e) {
        console.error('Failed to load recent searches:', e);
      }
    }
  }, []);

  // שמירת חיפוש חדש
  const saveRecentSearch = (query) => {
    if (!query || query.trim().length === 0) return;
    
    setRecentSearches(prev => {
      // הסר כפילויות והוסף בהתחלה
      const filtered = prev.filter(s => s !== query);
      const updated = [query, ...filtered].slice(0, 20); // שמור רק 20 אחרונים
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  };

  // מחיקת חיפוש מהרשימה
  const removeRecentSearch = (query) => {
    setRecentSearches(prev => {
      const updated = prev.filter(s => s !== query);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  };

  // שידור אירוע גלובלי כשההשלמה האוטומטית משתנה
  useEffect(() => {
    // עדכן את App.jsx על מצב ההשלמה - אבל רק אם זה לא SearchPage
    // SearchPage מטפל בזה בעצמו
    if (onAutocompleteChange) {
      // לא לשדר כלום - SearchPage מטפל בזה בעצמו
      // onAutocompleteChange(showAutocomplete);
    }
  }, [showAutocomplete, onAutocompleteChange]);

  // סגירת השלמה אוטומטית כשהכרטיסייה לא פעילה
  useEffect(() => {
    if (!isActive) {
      closeAutocomplete();
    }
  }, [isActive]);

  // סגירת השלמה אוטומטית ופאנל מתקדם בלחיצה בכל מקום
  useEffect(() => {
    const handleClickOutside = (e) => {
      // סגור את ההשלמה האוטומטית רק אם לוחצים מחוץ לתיבת החיפוש ומחוץ ל-dropdown
      if (!e.target.closest('.search-box-wrapper') && 
          !e.target.closest('.search-page-autocomplete-dropdown')) {
        closeAutocomplete();
      }
      
      // סגור את הפאנל המתקדם אם לוחצים מחוץ לו ומחוץ לכפתור
      if (!e.target.closest('.advanced-btn-wrapper') && 
          !e.target.closest('.advanced-options-overlay')) {
        setShowAdvanced(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleFileSelect = (file) => {
    setShowAutocomplete(false);
    setSearchQuery(''); // נקה את תיבת החיפוש
    handleFileClick(file);
  };

  // חיפוש בתוכן - רק בלחיצה על Enter
  const handleSearchSubmit = () => {
    if (searchQuery && searchQuery.trim().length > 0) {
      // המרה אוטומטית מאנגלית לעברית
      const { converted, shouldConvert } = autoConvertSearch(searchQuery);
      const finalQuery = shouldConvert ? converted : searchQuery;
      
      // אם כבר יש תוצאות חיפוש (כלומר זה חיפוש חדש), פתח טאב חדש
      if (searchResults && searchResults.length > 0 && onNewSearch) {
        console.log('🔍 פותח טאב חיפוש חדש עבור:', finalQuery);
        onNewSearch(finalQuery);
        return; // לא ממשיכים - הטאב החדש יטפל בחיפוש
      }
      
      // סמן שבוצע חיפוש
      setHasSearched(true);
      
      // אם צריך המרה, עדכן את שדה החיפוש
      if (shouldConvert) {
        setSearchQuery(converted);
      }
      
      // שמור את החיפוש ברשימת החיפושים האחרונים
      saveRecentSearch(finalQuery);
      
      // סגור השלמה אוטומטית
      setShowAutocomplete(false);
      
      // בצע חיפוש בתוכן עם אופציות מתקדמות
      console.log('🔍 SearchPage: שולח חיפוש עם אינדקסים:', selectedIndexes);
      onSearch(finalQuery, {
        fullSpelling,
        partialWord,
        suffixes,
        prefixes,
        matchingStrategy, // אסטרטגיית התאמה (last/all)
        cropLength, // אורך הקשר
        specificBook, // חיפוש בספר ספציפי
        accuracy: searchAccuracy, // רמת הדיוק
        selectedIndexes // אינדקסים נבחרים
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  // סינון תוצאות לפי קטגוריה
  const getFilteredResults = () => {
    if (selectedCategory === 'all') {
      return searchResults;
    }

    return searchResults.filter(result => {
      const metadata = booksMetadata.getBookByFileName(result.file.name);
      
      // אם אין מטא-דאטה, השתמש בלוגיקה הישנה
      if (!metadata) {
        const fileName = result.file.name;
        
        switch (selectedCategory) {
          case 'tanach':
            return fileName.includes('מקראות') || fileName.includes('שמות') || fileName.includes('בראשית') || fileName.includes('מגילת');
          case 'shas':
            return fileName.includes('מסכת') || fileName.includes('גמרא') || fileName.includes('ברכות') || fileName.includes('נדה');
          case 'halacha':
            return fileName.includes('שולחן ערוך') || fileName.includes('משנה ברורה');
          default:
            return false;
        }
      }
      
      // השתמש במטא-דאטה
      return metadata.categories.includes(selectedCategory);
    });
  };

  const filteredResults = getFilteredResults();

  return (
    <div className="search-page">
      {/* רקע */}
      <div className="search-bg"></div>
      
      {/* תוכן */}
      <div className="search-content-wrapper">
        {/* תוכן ראשי - ימין */}
        <div className="search-main-content">
        {/* תיבת חיפוש - מבוסס על header */}
        <div className="search-box-container">
          {/* שורת חיפוש ודיוק */}
          <div className="search-main-row">
            {/* בורר דיוק חיפוש */}
            <div className="search-accuracy-control-inline">
              <div className="accuracy-slider-header">
                <span className="accuracy-label">רמת דיוק</span>
                <span className="accuracy-value">{searchAccuracy}%</span>
              </div>
              <div className="accuracy-range-wrapper">
                <div 
                  className="accuracy-range-fill" 
                  style={{ width: `${searchAccuracy}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={100 - searchAccuracy}
                  onChange={(e) => setSearchAccuracy(100 - Number(e.target.value))}
                  className="accuracy-range"
                />
              </div>
              <div className="accuracy-labels">
                <span>רחב</span>
                <span>מדויק</span>
              </div>
            </div>

            {/* תיבת החיפוש */}
            <div className="search-box-wrapper">
              <div className="search-box-main">
                {/* בורר אינדקסים - מימין */}
                <IndexSelector
                  selectedIndexes={selectedIndexes}
                  onIndexesChange={(indexes) => {
                    setSelectedIndexes(indexes);
                    setShowAutocomplete(false);
                  }}
                  meilisearchEngine={meilisearchEngine}
                />
                
                <SearchRegular className="search-icon-main" />
              <input
                type="text"
                placeholder={
                  isIndexing 
                    ? 'בונה אינדקס...זה עלול לקחת זמן' 
                    : 'חפש בשמות קבצים או בתוכן... (לחץ Enter)'
                }
                className="search-input-main"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={() => {
                  // Toggle של ההשלמה האוטומטית בלחיצה
                  setShowAutocomplete(!showAutocomplete);
                }}
                disabled={isIndexing}
              />
              {searchQuery && (
                <button
                  className="search-clear-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setShowAutocomplete(false);
                  }}
                >
                  ×
                </button>
              )}
              
              {/* כפתור הגדרות מתקדמות */}
              <TooltipWrapper content="הגדרות מתקדמות">
                <button
                  className={`advanced-settings-btn ${showAdvanced ? 'active' : ''}`}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <SettingsRegular />
                </button>
              </TooltipWrapper>
            </div>
            
            {/* השלמה אוטומטית - רק חיפושים אחרונים */}
            {showAutocomplete && (
              <div className="search-autocomplete-dropdown">
                {recentSearches.length > 0 ? (
                  <div className="recent-searches-list">
                    {recentSearches.slice(0, 20).map((search, index) => (
                      <div 
                        key={index} 
                        className="recent-search-item"
                        onClick={() => {
                          setSearchQuery(search);
                          setShowAutocomplete(false);
                          setHasSearched(true);
                          onSearch(search, {
                            fullSpelling,
                            partialWord,
                            suffixes,
                            prefixes,
                            matchingStrategy,
                            cropLength,
                            specificBook,
                            accuracy: searchAccuracy
                          });
                        }}
                      >
                        <div className="autocomplete-icon">
                          <SearchRegular />
                        </div>
                        <div className="autocomplete-content">
                          <div className="autocomplete-title">
                            {search}
                          </div>
                        </div>
                        <TooltipWrapper content="הסר">
                          <button
                            className="recent-search-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRecentSearch(search);
                            }}
                          >
                            ×
                          </button>
                        </TooltipWrapper>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-recent-searches">
                    <div className="no-recent-icon">
                      <SearchRegular />
                    </div>
                    <div className="no-recent-text">אין חיפושים אחרונים</div>
                  </div>
                )}
              </div>
            )}
            
            {/* הגדרות מתקדמות */}
            {showAdvanced && (
              <div className="advanced-options-overlay">
                <div className="advanced-options-content">
                  <div className="advanced-options-header">
                    <div className="advanced-options-title">הגדרות חיפוש מתקדמות</div>
                  </div>
                  
                  <div className="advanced-options-section">
                    <label className="advanced-section-label">חיפוש בספר ספציפי</label>
                    <input
                      type="text"
                      className="advanced-text-input"
                      placeholder="הזן שם ספר..."
                      value={specificBook}
                      onChange={(e) => setSpecificBook(e.target.value)}
                    />
                  </div>
                  
                  <div className="advanced-options-section">
                    <div className="advanced-options-row">
                      <div className="advanced-option-half">
                        <label className="advanced-section-label">אסטרטגיית התאמה</label>
                        <select
                          className="advanced-text-input"
                          value={matchingStrategy}
                          onChange={(e) => setMatchingStrategy(e.target.value)}
                        >
                          <option value="last">חלקית</option>
                          <option value="all">מלאה</option>
                        </select>
                      </div>
                      
                      <div className="advanced-option-half">
                        <label className="advanced-section-label">אורך הקשר (מילים)</label>
                        <TooltipWrapper content={`מספר המילים המוצגות בכל תוצאה (כרגע: ${cropLength} מילים)`}>
                          <input
                            type="number"
                            className="advanced-text-input"
                            min="50"
                            max="500"
                            step="10"
                            value={cropLength}
                            onChange={(e) => setCropLength(Number(e.target.value))}
                          />
                        </TooltipWrapper>
                      </div>
                    </div>
                  </div>
                  
                  <div className="advanced-options-section">
                    <label className="advanced-section-label">אופציות עברית</label>
                    <div className="advanced-options-row">
                      <div className="advanced-option-compact">
                        <label className="option-label-compact">
                          <input
                            type="checkbox"
                            className="option-checkbox"
                            checked={fullSpelling}
                            onChange={(e) => setFullSpelling(e.target.checked)}
                          />
                          <span>כתיב מלא/חסר</span>
                        </label>
                      </div>
                      
                      <div className="advanced-option-compact">
                        <label className="option-label-compact">
                          <input
                            type="checkbox"
                            className="option-checkbox"
                            checked={prefixes}
                            onChange={(e) => setPrefixes(e.target.checked)}
                          />
                          <span>תחיליות (ו, ה, ב, כ, ל, מ)</span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="advanced-options-row">
                      <div className="advanced-option-compact">
                        <label className="option-label-compact">
                          <input
                            type="checkbox"
                            className="option-checkbox"
                            checked={suffixes}
                            onChange={(e) => setSuffixes(e.target.checked)}
                          />
                          <span>סיומות (ים, ות, ה, י)</span>
                        </label>
                      </div>
                      
                      <div className="advanced-option-compact">
                        <label className="option-label-compact">
                          <input
                            type="checkbox"
                            className="option-checkbox"
                            checked={partialWord}
                            onChange={(e) => setPartialWord(e.target.checked)}
                          />
                          <span>חלק ממילה</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="advanced-options-actions">
                    <button
                      className="advanced-action-btn reset-btn"
                      onClick={() => {
                        setSpecificBook('');
                        setMatchingStrategy('last');
                        setCropLength(300); // ברירת מחדל 300 מילים
                        setFullSpelling(false);
                        setPrefixes(false);
                        setSuffixes(false);
                        setPartialWord(false);
                      }}
                    >
                      איפוס
                    </button>
                    <button
                      className="advanced-action-btn apply-btn"
                      onClick={() => {
                        setShowAdvanced(false);
                        if (searchQuery) {
                          handleSearchSubmit();
                        }
                      }}
                    >
                      החל
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
          </div>
        </div>

        {/* סינון קטגוריות */}
        <CategoryFilter
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        categories={categories}
        moreCategories={moreCategories}
      />

      {/* מספר תוצאות */}
      {hasSearched && filteredResults.length > 0 && !isSearching && (
        <div className="results-count-header">
          {(() => {
            // חישוב מספר ספרים ייחודיים
            const uniqueBooks = new Set();
            let totalMatches = 0;
            
            filteredResults.forEach(result => {
              uniqueBooks.add(result.file.id);
              if (result.contexts && result.contexts.length > 0) {
                totalMatches += result.contexts.length;
              } else {
                totalMatches += 1;
              }
            });
            
            const bookCount = uniqueBooks.size;
            const estimatedTotal = searchResults.estimatedTotalHits || totalMatches;
            
            return (
              <>
                מציג {bookCount} {bookCount === 1 ? 'ספר' : 'ספרים'} • כ-{estimatedTotal.toLocaleString('he-IL')} תוצאות
              </>
            );
          })()}
        </div>
      )}

      {/* הודעה כשאין תוצאות בכלל */}
      {hasSearched && searchResults.length === 0 && !isSearching && (
        <div className="no-results-message">
          <div className="no-results-icon">
            <SearchRegular />
          </div>
          <div className="no-results-text">לא נמצאו תוצאות</div>
          <div className="no-results-hint">נסה לחפש במילים אחרות או בדוק את האיות</div>
        </div>
      )}

      {/* הודעה כשאין תוצאות בקטגוריה ספציפית */}
      {hasSearched && searchResults.length > 0 && filteredResults.length === 0 && !isSearching && (
        <div className="no-results-message">
          <div className="no-results-icon">
            <DocumentRegular />
          </div>
          <div className="no-results-text">לא נמצאו תוצאות בקטגוריה זו</div>
          <div className="no-results-hint">נסה לבחור קטגוריה אחרת או "הכל"</div>
        </div>
      )}

        {/* תוצאות חיפוש */}
        {hasSearched && (
          <div className="search-results-wrapper">
            <SearchResultsNew
              results={filteredResults}
              onFileClick={handleFileClick}
              isSearching={isSearching}
              searchQuery={searchQuery}
              onPreviewChange={(book, context) => {
                setPreviewBook(book);
                setPreviewContext(context);
                setPreviewSearchQuery(searchQuery); // שמור את ה-query הנוכחי
              }}
              onLoadMore={async (offset, limit) => {
                // טען עוד תוצאות מ-Meilisearch
                console.log(`🔄 טוען עוד תוצאות: offset=${offset}, limit=${limit}`);
                try {
                  const newResults = await onSearch(searchQuery, {
                    fullSpelling,
                    partialWord,
                    suffixes,
                    prefixes,
                    matchingStrategy,
                    cropLength,
                    specificBook,
                    accuracy: searchAccuracy,
                    selectedIndexes,
                    offset,
                    append: true // סימן שזה הוספה ולא החלפה
                  });
                  
                  console.log(`✅ הוספו ${newResults?.length || 0} תוצאות`);
                } catch (error) {
                  console.error('❌ שגיאה בטעינת תוצאות נוספות:', error);
                }
              }}
            />
          </div>
        )}
        </div>

        {/* פאנל צד שמאלי - תצוגה מקדימה */}
        <div className="search-side-panel">
          {previewBook ? (
            <div className="preview-sidebar-content">
              {previewBook.type === 'pdf' ? (
                <PDFViewer 
                  key={`preview-${previewBook.id}-${previewContext?.pageNum || previewContext?.chunkId || 0}`}
                  pdfPath={previewBook.path} 
                  title={previewBook.name}
                  searchContext={memoizedSearchContext}
                  isPreviewMode={true}
                />
              ) : (
                <TextViewer 
                  key={`preview-${previewBook.id}-${previewContext?.pageNum || previewContext?.chunkId || 0}`}
                  textPath={previewBook.path} 
                  title={previewBook.name}
                  searchContext={memoizedSearchContext}
                />
              )}
            </div>
          ) : (
            <div className="side-panel-content">
              <div className="side-panel-icon">
                <EyeRegular />
              </div>
              <h3>תצוגה מקדימה</h3>
              <p>לחץ על תוצאת חיפוש כדי לראות תצוגה מקדימה כאן</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
