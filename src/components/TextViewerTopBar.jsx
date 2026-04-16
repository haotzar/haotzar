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
  DismissRegular,
  HistoryRegular
} from '@fluentui/react-icons';
import TooltipWrapper from './TooltipWrapper';
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
  onCloseSearch = null,
  onHistoryClick
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
        <TooltipWrapper content={`תוכן עניינים (${outlineCount} פריטים)`}>
          <button
            className="text-viewer-top-bar-btn"
            onClick={onToggleOutline}
          >
            <PanelLeftRegular />
          </button>
        </TooltipWrapper>

        <TooltipWrapper content="חיפוש (Ctrl F)">
          <button
            className="text-viewer-top-bar-btn"
            onClick={handleOpenSearch}
          >
            <SearchRegular />
          </button>
        </TooltipWrapper>

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
                <TooltipWrapper content="תוצאה קודמת (Shift+Enter)">
                  <button
                    className="text-search-nav-btn"
                    onClick={onPrevSearchResult}
                  >
                    <ChevronUpRegular />
                  </button>
                </TooltipWrapper>
                <TooltipWrapper content="תוצאה הבאה (Enter)">
                  <button
                    className="text-search-nav-btn"
                    onClick={onNextSearchResult}
                  >
                    <ChevronDownRegular />
                  </button>
                </TooltipWrapper>
              </div>
            )}
            <TooltipWrapper content="חפש">
              <button
                className="text-search-submit"
                onClick={handleSearchSubmit}
              >
                <SearchRegular />
              </button>
            </TooltipWrapper>
            <TooltipWrapper content="סגור (Esc)">
              <button
                className="text-search-close"
                onClick={handleOpenSearch}
              >
                <DismissRegular />
              </button>
            </TooltipWrapper>
          </div>
        )}
      </div>

      <div className="text-book-title">
        {currentHeadingPath.length > 0 ? (
          <>
            {currentHeadingPath.map((headingItem, index) => (
              <span key={index}>
                {index > 0 && <span className="book-title-separator">›</span>}
                <TooltipWrapper content={`קפוץ ל: ${headingItem.title}`}>
                  <span 
                    className={index === currentHeadingPath.length - 1 ? "book-title-heading-current" : "book-title-heading-parent"}
                    onClick={() => onHeadingClick && onHeadingClick(headingItem.lineIndex)}
                    style={{ cursor: onHeadingClick ? 'pointer' : 'default' }}
                  >
                    {headingItem.title}
                  </span>
                </TooltipWrapper>
              </span>
            ))}
          </>
        ) : (
          <span className="book-title-text">{bookName}</span>
        )}
      </div>

      <div className="text-viewer-top-bar-left">
        <div className="text-zoom-controls">
          <TooltipWrapper content="הקטן (Ctrl -)">
            <button
              className="text-viewer-top-bar-btn text-zoom-btn"
              onClick={onZoomOut}
            >
              <ZoomOutRegular />
            </button>
          </TooltipWrapper>
          
          <TooltipWrapper content="הגדל (Ctrl +)">
            <button
              className="text-viewer-top-bar-btn text-zoom-btn"
              onClick={onZoomIn}
            >
              <ZoomInRegular />
            </button>
          </TooltipWrapper>
        </div>
        
        <TooltipWrapper content="היסטוריה (Ctrl+H)">
          <button
            className="text-viewer-top-bar-btn"
            onClick={onHistoryClick}
          >
            <HistoryRegular />
          </button>
        </TooltipWrapper>
        
        <TooltipWrapper content="הדפס (Ctrl P)">
          <button
            className="text-viewer-top-bar-btn"
            onClick={handlePrint}
          >
            <PrintRegular />
          </button>
        </TooltipWrapper>
        
        <TooltipWrapper content={isToolbarCollapsed ? 'הצג סרגל כלים' : 'הסתר סרגל כלים'}>
          <button
            className="text-viewer-top-bar-btn text-toolbar-toggle-btn"
            onClick={onToggleToolbar}
          >
            {isToolbarCollapsed ? <PanelRightExpandRegular /> : <PanelRightContractRegular />}
          </button>
        </TooltipWrapper>
      </div>
    </div>
  );
};

export default TextViewerTopBar;
