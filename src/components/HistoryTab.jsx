import { useState, useEffect } from 'react';
import { 
  DocumentRegular,
  HistoryRegular,
  DeleteRegular,
  SearchRegular,
  DismissRegular
} from '@fluentui/react-icons';
import './HistoryTab.css';

const HistoryTab = ({ recentBooks = [], onFileClick, onClearHistory }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());

  // זיהוי מקור הספר
  const getBookSource = (file) => {
    // ספרי אוצריא
    if (file.type === 'otzaria') {
      return 'otzaria';
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
      if (pathLower.includes('האוצר') || pathLower.includes('ozer')) {
        return 'ozer';
      }
    }
    
    // ברירת מחדל - ספר מקומי
    return 'local';
  };

  // קבלת אייקון לפי מקור
  const getBookIcon = (book) => {
    const source = getBookSource(book);
    
    switch (source) {
      case 'otzaria':
        return <img src="/otzaria-icon.png" alt="אוצריא" style={{ width: '20px', height: '20px' }} />;
      case 'hebrewbooks':
        return <img src="/hebrew_books.png" alt="HebrewBooks" style={{ width: '20px', height: '20px' }} />;
      case 'ozvehadar':
        return <img src="/Logo-ozveadar.png" alt="עוז והדר" style={{ width: '20px', height: '20px' }} />;
      case 'kook':
        return <img src="/logo-kook.png" alt="מוסד הרב קוק" style={{ width: '20px', height: '20px' }} />;
      case 'ozer':
        return <img src="/icon.png" alt="האוצר" style={{ width: '20px', height: '20px' }} />;
      default:
        return <DocumentRegular />;
    }
  };

  // סינון ספרים לפי חיפוש
  const filteredBooks = recentBooks.filter(book => 
    book.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // קיבוץ לפי תאריך
  const groupedBooks = () => {
    const groups = {
      'היום': [],
      'אתמול': [],
      'השבוע': [],
      'חודש אחרון': [],
      'ישן יותר': []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    filteredBooks.forEach(book => {
      const bookDate = book.lastOpened ? new Date(book.lastOpened) : new Date(0);
      
      if (bookDate >= today) {
        groups['היום'].push(book);
      } else if (bookDate >= yesterday) {
        groups['אתמול'].push(book);
      } else if (bookDate >= weekAgo) {
        groups['השבוע'].push(book);
      } else if (bookDate >= monthAgo) {
        groups['חודש אחרון'].push(book);
      } else {
        groups['ישן יותר'].push(book);
      }
    });

    // הסר קבוצות ריקות
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  };

  const groups = groupedBooks();

  // פורמט זמן יחסי (כמו בכרום)
  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'עכשיו';
    if (minutes < 60) return `לפני ${minutes} דקות`;
    if (hours < 24) return `לפני ${hours} שעות`;
    if (days === 1) return 'אתמול';
    if (days < 7) return `לפני ${days} ימים`;
    
    return new Date(timestamp).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="history-tab" dir="rtl">
      <div className="history-header">
        <div className="history-title-row">
          <h1 className="history-main-title">היסטוריה</h1>
          <div className="history-actions">
            <button
              className="history-clear-btn"
              onClick={onClearHistory}
              title="נקה היסטוריה"
            >
              נקה היסטוריה
            </button>
          </div>
        </div>
        
        <div className="history-search-row">
          <div className="history-search">
            <SearchRegular className="search-icon" />
            <input
              type="text"
              placeholder="חפש בהיסטוריה"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="history-search-input"
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="נקה חיפוש"
              >
                <DismissRegular />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="history-content">
        {filteredBooks.length === 0 ? (
          <div className="history-empty">
            <HistoryRegular className="empty-icon" />
            <p>אין פריטים בהיסטוריה שלך</p>
          </div>
        ) : (
          <div className="history-list">
            {Object.entries(groups).map(([groupName, books]) => (
              <div key={groupName} className="history-group">
                <div className="history-group-header">{groupName}</div>
                <div className="history-items">
                  {books.map((book) => (
                    <div
                      key={book.id}
                      className="history-item"
                      onClick={() => onFileClick(book)}
                    >
                      <div className="history-item-icon">
                        {getBookIcon(book)}
                      </div>
                      <div className="history-item-content">
                        <div className="history-item-title">{book.name}</div>
                      </div>
                      <div className="history-item-time">
                        {formatRelativeTime(book.lastOpened)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryTab;
