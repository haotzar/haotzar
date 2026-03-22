import { useState, useEffect } from 'react';
import {
  SearchRegular,
  PrintRegular,
  PanelRightContractRegular,
  PanelRightExpandRegular,
  ZoomInRegular,
  ZoomOutRegular,
  PanelLeftRegular,
  ChevronUpRegular,
  ChevronDownRegular,
  DismissRegular
} from '@fluentui/react-icons';
import './TextViewerTopBar.css';

const TextViewerTopBar = ({ 
  isToolbarCollapsed, 
  onToggleToolbar,
  onZoomIn,
  onZoomOut,
  onSearch,
  onToggleOutline,
  outlineCount = 0,
  bookName = '',
  currentHeadingPath = [],
  onHeadingClick = null,
  searchQuery = '',
  searchResults = [],
  currentSearchIndex = -1,
  onNextSearchResult = null,
  onPrevSearchResult = null,
  onCloseSearch = null
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // עדכן את שדה החיפוש כשיש שאילתה חדשה מבחוץ
  useEffect(() => {
    if (searchQuery && searchQuery !== searchInput) {
      setSearchInput(searchQuery);
      // פתח את תיבת החיפוש אוטומטית
      if (!showSearch) {
        setShowSearch(true);
      }
    } else if (!searchQuery && searchInput) {
      // אם השאילתה נוקתה מבחוץ, נקה גם את השדה
      setSearchInput('');
    }
  }, [searchQuery]);
  
  // עדכן את שדה החיפוש גם כשמספר התוצאות משתנה
  useEffect(() => {
    // אם יש שאילתה אבל אין תוצאות, וודא שהשדה מעודכן
    if (searchQuery && searchResults.length === 0 && searchInput !== searchQuery) {
      setSearchInput(searchQuery);
    }
  }, [searchResults, searchQuery]);

  const handleOpenSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      setTimeout(() => {
        document.querySelector('.text-search-input')?.focus();
      }, 100);
    } else {
      // כשסוגרים את החיפוש, נקה הכל
      setSearchInput('');
      if (onCloseSearch) {
        onCloseSearch();
      }
    }
  };

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      // בדוק אם השאילתה בשדה שונה מהשאילתה הנוכחית
      const hasNewQuery = searchInput.trim() !== searchQuery;
      
      if (e.shiftKey && !hasNewQuery) {
        // Shift+Enter - תוצאה קודמת (רק אם אין שאילתה חדשה)
        if (onPrevSearchResult) {
          onPrevSearchResult();
        }
      } else if (hasNewQuery) {
        // יש שאילתה חדשה - בצע חיפוש חדש
        if (searchInput.trim() && onSearch) {
          onSearch(searchInput);
        }
      } else if (searchResults.length > 0) {
        // אותה שאילתה ויש תוצאות - עבור לתוצאה הבאה
        if (onNextSearchResult) {
          onNextSearchResult();
        }
      }
    } else if (e.key === 'Escape') {
      handleOpenSearch();
    }
  };

  const handleSearchSubmit = () => {
    if (searchInput.trim() && onSearch) {
      onSearch(searchInput);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="text-viewer-top-bar">
      <div className="text-viewer-top-bar-right">
        <button
          className="text-viewer-top-bar-btn"
          onClick={onToggleOutline}
          title={`תוכן עניינים (${outlineCount} פריטים)`}
        >
          <PanelLeftRegular />
        </button>

        <button
          className="text-viewer-top-bar-btn"
          onClick={handleOpenSearch}
          title="חיפוש (Ctrl F)"
        >
          <SearchRegular />
        </button>

        {showSearch && (
          <div className="text-search-box">
            <input
              type="text"
              className="text-search-input"
              placeholder="חפש בטקסט..."
              value={searchInput}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
            />
            {searchQuery && searchInput && searchResults.length === 0 && (
              <span className="search-no-results">אין תוצאות</span>
            )}
            {searchQuery && searchResults.length > 0 && (
              <div className="text-search-results-info">
                <span className="search-result-count">
                  {currentSearchIndex + 1} / {searchResults.length}
                </span>
                <button
                  className="text-search-nav-btn"
                  onClick={onPrevSearchResult}
                  title="תוצאה קודמת (Shift+Enter)"
                >
                  <ChevronUpRegular />
                </button>
                <button
                  className="text-search-nav-btn"
                  onClick={onNextSearchResult}
                  title="תוצאה הבאה (Enter)"
                >
                  <ChevronDownRegular />
                </button>
              </div>
            )}
            <button
              className="text-search-submit"
              onClick={handleSearchSubmit}
              title="חפש"
            >
              <SearchRegular />
            </button>
            <button
              className="text-search-close"
              onClick={handleOpenSearch}
              title="סגור (Esc)"
            >
              <DismissRegular />
            </button>
          </div>
        )}
      </div>

      <div className="text-book-title">
        {currentHeadingPath.length > 0 ? (
          <>
            {currentHeadingPath.map((headingItem, index) => (
              <span key={index}>
                {index > 0 && <span className="book-title-separator">›</span>}
                <span 
                  className={index === currentHeadingPath.length - 1 ? "book-title-heading-current" : "book-title-heading-parent"}
                  onClick={() => onHeadingClick && onHeadingClick(headingItem.lineIndex)}
                  style={{ cursor: onHeadingClick ? 'pointer' : 'default' }}
                  title={`קפוץ ל: ${headingItem.title}`}
                >
                  {headingItem.title}
                </span>
              </span>
            ))}
          </>
        ) : (
          <span className="book-title-text">{bookName}</span>
        )}
      </div>

      <div className="text-viewer-top-bar-left">
        <div className="text-zoom-controls">
          <button
            className="text-viewer-top-bar-btn text-zoom-btn"
            onClick={onZoomOut}
            title="הקטן (Ctrl -)"
          >
            <ZoomOutRegular />
          </button>
          
          <button
            className="text-viewer-top-bar-btn text-zoom-btn"
            onClick={onZoomIn}
            title="הגדל (Ctrl +)"
          >
            <ZoomInRegular />
          </button>
        </div>
        
        <button
          className="text-viewer-top-bar-btn"
          onClick={handlePrint}
          title="הדפס (Ctrl P)"
        >
          <PrintRegular />
        </button>
        
        <button
          className="text-viewer-top-bar-btn text-toolbar-toggle-btn"
          onClick={onToggleToolbar}
          title={isToolbarCollapsed ? 'הצג סרגל כלים' : 'הסתר סרגל כלים'}
        >
          {isToolbarCollapsed ? <PanelRightExpandRegular /> : <PanelRightContractRegular />}
        </button>
      </div>
    </div>
  );
};

export default TextViewerTopBar;
