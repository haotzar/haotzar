import { useState, useEffect, useRef } from 'react';
import { 
  DismissRegular,
  BookRegular,
  ChevronLeftRegular,
  ChevronRightRegular
} from '@fluentui/react-icons';
import './TextViewerLinksPanel.css';

const TextViewerLinksPanel = ({ bookId, currentLineIndex, isOpen, onClose, onLinkClick, panelType = 'commentaries' }) => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLink, setSelectedLink] = useState(null); // הקישור שנבחר להצגת תוכן
  const [linkContent, setLinkContent] = useState(''); // תוכן השורה של הקישור
  const [loadingContent, setLoadingContent] = useState(false);
  const [selectedBookLinks, setSelectedBookLinks] = useState(null); // קישורים של ספר שנבחר
  const [openTabs, setOpenTabs] = useState([]); // רשימת הטאבים הפתוחים (עד 3)
  const [activeTabIndex, setActiveTabIndex] = useState(0); // הטאב הפעיל
  const [showingList, setShowingList] = useState(false); // האם מציגים את רשימת המפרשים
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('linksPanelWidth');
    return saved ? parseInt(saved) : 240;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [showScrollButtons, setShowScrollButtons] = useState({ left: false, right: false });
  const panelRef = useRef(null);
  const tabsListRef = useRef(null);

  // טען קישורים כשהפאנל נפתח או כשהשורה משתנה
  useEffect(() => {
    if (isOpen && bookId && currentLineIndex !== null && currentLineIndex !== undefined) {
      loadLinks();
    }
  }, [isOpen, bookId, currentLineIndex]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const panel = panelRef.current;
      if (!panel) return;
      
      const rect = panel.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      
      // הגבל רוחב בין 200 ל-600 פיקסלים
      if (newWidth >= 200 && newWidth <= 600) {
        setPanelWidth(newWidth);
        localStorage.setItem('linksPanelWidth', newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // עדכן את הספר הפתוח כשהקישורים משתנים
  useEffect(() => {
    if (openTabs.length > 0) {
      // אם יש קישורים חדשים
      if (links && Object.keys(links).length > 0) {
        // עדכן את כל הטאבים הפתוחים
        const updatedTabs = openTabs.map(tab => {
          const bookTitle = tab.bookTitle;
          // מצא את הקישורים המעודכנים של אותו ספר
          const allLinks = [
            ...(links.COMMENTARY || []), 
            ...(links.TARGUM || []), 
            ...(links.SOURCE || []), 
            ...(links.REFERENCE || []), 
            ...(links.OTHER || [])
          ];
          const groupedByBook = groupLinksByBook(allLinks);
          const updatedBookLinks = groupedByBook[bookTitle];
          
          // עדכן את הטאב עם הקישורים החדשים (גם אם אין קישורים)
          return {
            ...tab,
            bookLinks: updatedBookLinks || [],
            loading: true
          };
        });
        
        setOpenTabs(updatedTabs);
        
        // טען מחדש את התוכן של כל הטאבים שיש להם קישורים
        updatedTabs.forEach((tab, index) => {
          if (tab.bookLinks && tab.bookLinks.length > 0) {
            loadTabContent(index, tab.bookLinks);
          } else {
            // אם אין קישורים בשורה הנוכחית, עדכן שהטעינה הסתיימה
            setOpenTabs(prevTabs => {
              const newTabs = [...prevTabs];
              if (newTabs[index]) {
                newTabs[index] = {
                  ...newTabs[index],
                  loading: false,
                  content: []
                };
              }
              return newTabs;
            });
          }
        });
      } else {
        // אם אין קישורים בכלל בשורה הנוכחית, עדכן את כל הטאבים לריקים
        setOpenTabs(prevTabs => prevTabs.map(tab => ({
          ...tab,
          bookLinks: [],
          loading: false,
          content: []
        })));
      }
    }
  }, [links]);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const otzariaDB = (await import('../utils/otzariaDB.js')).default;
      
      console.log(`📖 טוען קישורים לספר ${bookId}, שורה ${currentLineIndex}`);
      
      // קבל קישורים לשורה הספציפית
      const lineLinks = otzariaDB.getLineLinks(bookId, currentLineIndex);
      console.log(`📚 נמצאו ${lineLinks.length} קישורים לשורה זו`);
      
      // קבץ לפי סוג קישור
      const grouped = {
        COMMENTARY: [],
        TARGUM: [],
        SOURCE: [],
        REFERENCE: [],
        OTHER: []
      };
      
      lineLinks.forEach(link => {
        if (grouped[link.linkType]) {
          grouped[link.linkType].push(link);
        }
      });
      
      setLinks(grouped);
    } catch (error) {
      console.error('❌ שגיאה בטעינת קישורים:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLinkTypeTitle = (type) => {
    const titles = {
      COMMENTARY: 'מפרשים',
      TARGUM: 'תרגומים',
      SOURCE: 'מקורות',
      REFERENCE: 'הפניות',
      OTHER: 'קישורים אחרים'
    };
    return titles[type] || type;
  };

  const handleLinkClick = (link) => {
    // לחיצה על קישור - הצג את התוכן בפאנל
    setSelectedLink(link);
    loadLinkContent(link);
  };

  const handleBookClick = (bookLinks) => {
    const bookTitle = bookLinks[0].bookTitle;
    
    // סגור את תצוגת הרשימה
    setShowingList(false);
    
    // בדוק אם הספר כבר פתוח בטאב
    const existingTabIndex = openTabs.findIndex(tab => tab.bookTitle === bookTitle);
    
    if (existingTabIndex !== -1) {
      // אם הספר כבר פתוח, עבור לטאב שלו
      setActiveTabIndex(existingTabIndex);
    } else {
      // אם יש פחות מ-3 טאבים, הוסף טאב חדש
      if (openTabs.length < 3) {
        const newTab = {
          bookTitle: bookTitle,
          bookLinks: bookLinks,
          content: null,
          loading: true
        };
        
        const newTabs = [...openTabs, newTab];
        setOpenTabs(newTabs);
        setActiveTabIndex(newTabs.length - 1);
        
        // טען את התוכן של הטאב החדש
        loadTabContent(newTabs.length - 1, bookLinks);
      } else {
        // אם יש כבר 3 טאבים, החלף את הטאב הפעיל
        const newTabs = [...openTabs];
        newTabs[activeTabIndex] = {
          bookTitle: bookTitle,
          bookLinks: bookLinks,
          content: null,
          loading: true
        };
        setOpenTabs(newTabs);
        
        // טען את התוכן של הטאב
        loadTabContent(activeTabIndex, bookLinks);
      }
    }
  };

  const loadTabContent = async (tabIndex, bookLinks) => {
    try {
      const otzariaDB = (await import('../utils/otzariaDB.js')).default;
      
      // טען את כל הקטעים
      const contents = [];
      for (const link of bookLinks) {
        const lines = otzariaDB.getBookLines(link.bookId, link.targetLineIndex, 1);
        if (lines.length > 0) {
          contents.push({
            content: lines[0].content,
            lineIndex: link.targetLineIndex,
            link: link
          });
        }
      }
      
      // עדכן את הטאב עם התוכן
      setOpenTabs(prevTabs => {
        const newTabs = [...prevTabs];
        if (newTabs[tabIndex]) {
          newTabs[tabIndex].content = contents;
          newTabs[tabIndex].loading = false;
        }
        return newTabs;
      });
    } catch (error) {
      console.error('❌ שגיאה בטעינת תוכן:', error);
      setOpenTabs(prevTabs => {
        const newTabs = [...prevTabs];
        if (newTabs[tabIndex]) {
          newTabs[tabIndex].content = [];
          newTabs[tabIndex].loading = false;
        }
        return newTabs;
      });
    }
  };

  const closeTab = (tabIndex, e) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((_, index) => index !== tabIndex);
    setOpenTabs(newTabs);
    
    // אם סגרנו את הטאב הפעיל, עבור לטאב הקודם או הבא
    if (tabIndex === activeTabIndex) {
      if (newTabs.length === 0) {
        setActiveTabIndex(0);
      } else if (tabIndex >= newTabs.length) {
        setActiveTabIndex(newTabs.length - 1);
      }
    } else if (tabIndex < activeTabIndex) {
      setActiveTabIndex(activeTabIndex - 1);
    }
  };

  const loadLinkContent = async (link) => {
    setLoadingContent(true);
    try {
      const otzariaDB = (await import('../utils/otzariaDB.js')).default;
      
      // קבל את השורה הספציפית מהספר
      const lines = otzariaDB.getBookLines(link.bookId, link.targetLineIndex, 1);
      
      if (lines.length > 0) {
        setLinkContent(lines[0].content);
      } else {
        setLinkContent('לא נמצא תוכן');
      }
    } catch (error) {
      console.error('❌ שגיאה בטעינת תוכן:', error);
      setLinkContent('שגיאה בטעינת תוכן');
    } finally {
      setLoadingContent(false);
    }
  };

  const handleOpenBook = () => {
    // לחיצה על התוכן - פתח את הספר
    if (selectedLink && onLinkClick) {
      const bookData = {
        id: `otzaria-${selectedLink.bookId}`,
        name: selectedLink.bookTitle,
        type: 'otzaria',
        bookId: selectedLink.bookId,
        path: `virtual-otzaria/${selectedLink.bookTitle}`,
        heShortDesc: selectedLink.heShortDesc,
        volume: selectedLink.volume
      };
      
      onLinkClick(bookData);
    }
  };

  const handleBackToList = () => {
    setSelectedLink(null);
    setLinkContent('');
    setOpenTabs([]);
    setActiveTabIndex(0);
    setShowingList(false);
  };

  const handleAddTab = () => {
    // הצג את רשימת המפרשים מעל הטאבים
    setShowingList(true);
  };

  // פונקציות גלילה לטאבים
  const scrollTabs = (direction) => {
    const tabsList = tabsListRef.current;
    if (!tabsList) return;
    
    const scrollAmount = 100;
    if (direction === 'right') {
      tabsList.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    } else {
      tabsList.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const checkScrollButtons = () => {
    const tabsList = tabsListRef.current;
    if (!tabsList) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = tabsList;
    setShowScrollButtons({
      left: scrollLeft > 0,
      right: scrollLeft < scrollWidth - clientWidth - 1
    });
  };

  // בדוק אם צריך להציג כפתורי גלילה
  useEffect(() => {
    const tabsList = tabsListRef.current;
    if (!tabsList) return;
    
    checkScrollButtons();
    
    const handleScroll = () => checkScrollButtons();
    const handleResize = () => checkScrollButtons();
    
    tabsList.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    
    return () => {
      tabsList.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [openTabs]);

  const handleOpenBookAtLine = (link) => {
    // פתח את הספר בשורה ספציפית
    if (onLinkClick) {
      const bookData = {
        id: `otzaria-${link.bookId}`,
        name: link.bookTitle,
        type: 'otzaria',
        bookId: link.bookId,
        path: `virtual-otzaria/${link.bookTitle}`,
        heShortDesc: link.heShortDesc,
        volume: link.volume,
        targetLineIndex: link.targetLineIndex
      };
      
      onLinkClick(bookData);
    }
  };

  // קיבוץ קישורים לפי שם ספר
  const groupLinksByBook = (linksList) => {
    const grouped = {};
    linksList.forEach(link => {
      const key = link.bookTitle;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(link);
    });
    return grouped;
  };

  // חישוב סך כל הקישורים
  const getTotalLinksCount = () => {
    const linkTypes = panelType === 'commentaries' 
      ? ['COMMENTARY', 'TARGUM'] 
      : ['SOURCE', 'REFERENCE', 'OTHER'];
    
    return linkTypes.reduce((total, type) => {
      return total + (links[type] || []).length;
    }, 0);
  };

  if (!isOpen) return null;

  const panelTitle = panelType === 'commentaries' ? 'מפרשים' : 'קישורים';
  const linkTypes = panelType === 'commentaries' 
    ? ['COMMENTARY', 'TARGUM'] 
    : ['SOURCE', 'REFERENCE', 'OTHER'];
  const totalCount = getTotalLinksCount();

  return (
    <div className="text-viewer-links-panel" ref={panelRef} style={{ width: `${panelWidth}px` }}>
      {/* Resize Handle */}
      <div 
        className="panel-resize-handle"
        onMouseDown={() => setIsResizing(true)}
        title="גרור לשינוי רוחב"
      />
      
      <div className="links-panel-header">
        <h3>{panelTitle} ({totalCount})</h3>
        {currentLineIndex !== null && currentLineIndex !== undefined && (
          <span className="current-line-indicator">שורה {currentLineIndex + 1}</span>
        )}
        <button
          className="links-panel-close"
          onClick={onClose}
          aria-label="סגור"
          title="סגור"
        >
          <DismissRegular />
        </button>
      </div>

      <div className="links-panel-content">
        {loading ? (
          <div className="links-panel-loading">טוען...</div>
        ) : selectedLink ? (
          // תצוגת תוכן קישור בודד
          <div className="link-content-view">
            <div className="link-content-header">
              <button className="back-to-list-btn" onClick={handleBackToList}>
                ← חזור לרשימה
              </button>
              <div className="link-content-title">
                <strong>{selectedLink.bookTitle}</strong>
                {selectedLink.volume && <span> - {selectedLink.volume}</span>}
                <span className="link-line-info"> (שורה {selectedLink.targetLineIndex + 1})</span>
              </div>
            </div>
            <div className="link-content-body">
              {loadingContent ? (
                <div className="content-loading">טוען תוכן...</div>
              ) : (
                <div 
                  className="link-content-text"
                  onClick={handleOpenBook}
                  dangerouslySetInnerHTML={{ __html: linkContent }}
                  title="לחץ לפתיחת הספר"
                />
              )}
            </div>
          </div>
        ) : openTabs.length > 0 && !showingList ? (
          // תצוגת טאבים
          <div className="tabs-view">
            {/* רשימת הטאבים */}
            <div className="tabs-bar">
              {showScrollButtons.left && (
                <button 
                  className="tab-scroll-btn tab-scroll-left"
                  onClick={() => scrollTabs('left')}
                  title="גלול שמאלה"
                >
                  <ChevronLeftRegular />
                </button>
              )}
              <div className="tabs-list" ref={tabsListRef}>
                {openTabs.map((tab, index) => (
                  <div
                    key={index}
                    className={`tab-item ${index === activeTabIndex ? 'active' : ''}`}
                    onClick={() => setActiveTabIndex(index)}
                  >
                    <span className="tab-title">{tab.bookTitle}</span>
                    <button
                      className="tab-close-btn"
                      onClick={(e) => closeTab(index, e)}
                      title="סגור"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {showScrollButtons.right && (
                <button 
                  className="tab-scroll-btn tab-scroll-right"
                  onClick={() => scrollTabs('right')}
                  title="גלול ימינה"
                >
                  <ChevronRightRegular />
                </button>
              )}
              {openTabs.length < 3 && (
                <button
                  className="tab-add-btn"
                  onClick={handleAddTab}
                  title="הוסף מפרש"
                >
                  +
                </button>
              )}
            </div>
            
            {/* תוכן הטאב הפעיל */}
            <div className="tab-content">
              {openTabs[activeTabIndex] && (
                <div className="link-content-body">
                  {openTabs[activeTabIndex].loading ? (
                    <div className="content-loading">טוען תוכן...</div>
                  ) : openTabs[activeTabIndex].content && Array.isArray(openTabs[activeTabIndex].content) ? (
                    <div className="multiple-links-content">
                      {openTabs[activeTabIndex].content.map((item, index) => (
                        <div key={index} className="link-content-section">
                          <div className="link-content-section-header">
                            <span>קטע {index + 1} - שורה {item.lineIndex + 1}</span>
                          </div>
                          <div 
                            className="link-content-text"
                            onClick={() => handleOpenBookAtLine(item.link)}
                            dangerouslySetInnerHTML={{ __html: item.content }}
                            title="לחץ לפתיחת הספר בשורה זו"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="content-loading">אין תוכן להצגה</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="links-sections">
            {linkTypes.map(type => {
              const typeLinks = links[type] || [];
              if (typeLinks.length === 0) return null;
              
              // קיבוץ לפי ספר
              const groupedByBook = groupLinksByBook(typeLinks);
              
              return (
                <div key={type} className="links-section">
                  <h5 className="links-section-subtitle">
                    {getLinkTypeTitle(type)}
                    <span className="links-count">({typeLinks.length})</span>
                  </h5>
                  <div className="links-list">
                    {Object.entries(groupedByBook).map(([bookTitle, bookLinks]) => (
                      <button
                        key={bookTitle}
                        className="link-item"
                        onClick={() => handleBookClick(bookLinks)}
                        title={bookLinks[0].heShortDesc || bookTitle}
                      >
                        <ChevronLeftRegular className="link-arrow" />
                        <span className="link-title">
                          {bookTitle}
                          {bookLinks[0].volume && <span className="link-volume"> - {bookLinks[0].volume}</span>}
                          {bookLinks.length > 1 && (
                            <span className="link-line-number"> ({bookLinks.length} קטעים)</span>
                          )}
                        </span>
                        <BookRegular className="link-icon" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {linkTypes.every(type => (links[type] || []).length === 0) && (
              <div className="links-empty-section">
                <BookRegular style={{ fontSize: '48px', opacity: 0.3 }} />
                <p>אין {panelTitle} לשורה זו</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TextViewerLinksPanel;

