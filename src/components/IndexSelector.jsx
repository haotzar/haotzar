import { useState, useEffect, useRef } from 'react';
import { FilterRegular, CheckmarkRegular } from '@fluentui/react-icons';
import './IndexSelector.css';

const IndexSelector = ({ selectedIndexes, onIndexesChange, meilisearchEngine }) => {
  const [availableIndexes, setAvailableIndexes] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const buttonRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // טעינת רשימת אינדקסים
  useEffect(() => {
    // טען רק אם עדיין אין אינדקסים - המתן 3 שניות לפני ניסיון ראשון
    if (availableIndexes.length === 0) {
      retryTimeoutRef.current = setTimeout(() => loadIndexes(), 3000);
    }
    
    // ניקוי timeout בעת unmount
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []); // רק פעם אחת בטעינה

  // סגירת dropdown בלחיצה מחוץ לו
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target) &&
          !e.target.closest('.index-selector-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const loadIndexes = async (isRetry = false) => {
    if (!isRetry) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      const indexes = await meilisearchEngine.getAvailableIndexes();
      
      if (indexes.length === 0) {
        setError('לא נמצאו אינדקסים. ודא ששרת Meilisearch רץ ושיש אינדקסים זמינים.');
      } else {
        setAvailableIndexes(indexes);
        setRetryCount(0); // איפוס מונה ניסיונות
        
        // בטל כל timeout פעיל
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        
        console.log('📚 אינדקסים זמינים:', indexes);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('❌ שגיאה בטעינת אינדקסים:', error);
      
      // אם השרת עדיין עולה, נסה שוב אוטומטית
      if ((error.message === 'Server starting' || error.message === 'Server not running') && retryCount < 15) {
        const nextRetry = retryCount + 1;
        setRetryCount(nextRetry);
        setError(`השרת עולה... ניסיון ${nextRetry}/15`);
        
        // בטל timeout קודם אם קיים
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        // נסה שוב אחרי 2 שניות
        retryTimeoutRef.current = setTimeout(() => {
          console.log(`🔄 ניסיון חוזר ${nextRetry}/15 לטעינת אינדקסים...`);
          loadIndexes(true);
        }, 2000);
      } else if (error.message === 'Server not available') {
        setError('שרת Meilisearch לא זמין. ודא שהשרת רץ.');
        setIsLoading(false);
      } else {
        setError('שגיאה בטעינת אינדקסים. נסה שוב מאוחר יותר.');
        setIsLoading(false);
      }
    }
  };

  const toggleIndex = (indexUid) => {
    const newSelected = selectedIndexes.includes(indexUid)
      ? selectedIndexes.filter(id => id !== indexUid)
      : [...selectedIndexes, indexUid];
    
    onIndexesChange(newSelected);
  };

  const selectAll = () => {
    onIndexesChange(availableIndexes.map(idx => idx.uid));
  };

  const deselectAll = () => {
    onIndexesChange([]);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="index-selector-wrapper">
      <button
        ref={buttonRef}
        className={`index-selector-btn ${isOpen ? 'active' : ''}`}
        onClick={toggleDropdown}
        title={selectedIndexes.length > 0 
          ? `${selectedIndexes.length} אינדקסים נבחרים` 
          : 'בחר אינדקסים לחיפוש'}
      >
        <FilterRegular />
        {selectedIndexes.length > 0 && (
          <span className="index-badge">{selectedIndexes.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="index-selector-dropdown">
          <div className="index-selector-content">
            <div className="index-selector-header">
              <h3>בחר אינדקסים לחיפוש</h3>
              <div className="index-selector-actions">
                <button onClick={selectAll} className="select-action-btn">
                  בחר הכל
                </button>
                <button onClick={deselectAll} className="select-action-btn">
                  נקה הכל
                </button>
                <button onClick={loadIndexes} className="select-action-btn" disabled={isLoading}>
                  {isLoading ? 'טוען...' : 'רענן'}
                </button>
              </div>
            </div>

            <div className="index-list">
              {isLoading ? (
                <div className="index-loading">טוען אינדקסים...</div>
              ) : error ? (
                <div className="index-error-container">
                  <div className="index-error-message">{error}</div>
                  <button onClick={loadIndexes} className="index-retry-btn">
                    נסה שוב
                  </button>
                </div>
              ) : availableIndexes.length === 0 ? (
                <div className="index-empty">לא נמצאו אינדקסים</div>
              ) : (
                availableIndexes.map((index) => (
                  <label key={index.uid} className="index-item">
                    <input
                      type="checkbox"
                      checked={selectedIndexes.includes(index.uid)}
                      onChange={() => toggleIndex(index.uid)}
                      className="index-checkbox"
                    />
                    <div className="index-info">
                      <div className="index-name">
                        {index.uid}
                        {selectedIndexes.includes(index.uid) && (
                          <CheckmarkRegular className="index-check-icon" />
                        )}
                      </div>
                      <div className="index-stats">
                        {index.numberOfDocuments.toLocaleString()} מסמכים
                        {index.isIndexing && <span className="indexing-badge">מתעדכן...</span>}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="index-selector-footer">
              <button
                className="index-apply-btn"
                onClick={() => setIsOpen(false)}
              >
                החל
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndexSelector;
