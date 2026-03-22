import { useEffect, useState } from 'react';
import {
  CopyRegular,
  SearchRegular,
  PrintRegular,
  HighlightRegular,
  NoteRegular,
  BookmarkRegular,
  SelectAllOnRegular,
  BookSearchRegular
} from '@fluentui/react-icons';
import './PDFContextMenu.css';

const PDFContextMenu = ({ x, y, onClose, iframeRef, currentPage, bookName, onNotesClick, onLocateBook }) => {
  const [hasSelection, setHasSelection] = useState(false);
  const [position, setPosition] = useState({ left: x, top: y });

  useEffect(() => {
    // חישוב מיקום התפריט כדי שלא יחרוג מהמסך
    const menuWidth = 220; // רוחב משוער של התפריט
    const menuHeight = 400; // גובה משוער של התפריט
    const padding = 10; // ריפוד מהקצה

    let left = x;
    let top = y;

    // בדוק אם התפריט חורג מימין
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }

    // בדוק אם התפריט חורג משמאל
    if (left < padding) {
      left = padding;
    }

    // בדוק אם התפריט חורג מלמטה
    if (top + menuHeight > window.innerHeight - padding) {
      top = window.innerHeight - menuHeight - padding;
    }

    // בדוק אם התפריט חורג מלמעלה
    if (top < padding) {
      top = padding;
    }

    setPosition({ left, top });
  }, [x, y]);

  useEffect(() => {
    // בדוק אם יש טקסט מסומן
    const checkSelection = () => {
      if (iframeRef?.current?.contentWindow) {
        const selection = iframeRef.current.contentWindow.getSelection();
        setHasSelection(selection && selection.toString().length > 0);
      }
    };

    checkSelection();
  }, [iframeRef]);

  const handleCopy = () => {
    if (iframeRef?.current?.contentWindow) {
      const pdfWindow = iframeRef.current.contentWindow;
      const selection = pdfWindow.getSelection();
      
      if (selection && selection.rangeCount > 0) {
        try {
          // קבל את הטקסט המסומן
          let text = '';
          
          // עבור על כל ה-ranges בסלקשן
          for (let i = 0; i < selection.rangeCount; i++) {
            const range = selection.getRangeAt(i);
            const container = range.cloneContents();
            
            // נסה לקבל טקסט עם רווחים תקינים
            const tempDiv = pdfWindow.document.createElement('div');
            tempDiv.appendChild(container);
            
            // PDF.js שומר את הטקסט ב-textContent של כל span
            // נעבור על כל ה-spans ונוסיף רווחים ביניהם
            const spans = tempDiv.querySelectorAll('span');
            if (spans.length > 0) {
              const words = [];
              spans.forEach(span => {
                const spanText = span.textContent.trim();
                if (spanText) {
                  words.push(spanText);
                }
              });
              text += words.join(' ');
            } else {
              // אם אין spans, קח את הטקסט הרגיל
              text += tempDiv.textContent;
            }
          }
          
          // נקה רווחים מיותרים
          text = text.replace(/\s+/g, ' ').trim();
          
          // העתק לזיכרון
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
              console.log('✅ Text copied:', text.substring(0, 50) + '...');
            }).catch(err => {
              console.error('❌ Failed to copy:', err);
              fallbackCopy(text);
            });
          } else {
            fallbackCopy(text);
          }
        } catch (err) {
          console.error('❌ Copy error:', err);
          // אם נכשל, נסה את השיטה הרגילה
          pdfWindow.document.execCommand('copy');
        }
      }
    }
    onClose();
  };

  const fallbackCopy = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      console.log('✅ Text copied using fallback');
    } catch (err) {
      console.error('❌ Fallback copy failed:', err);
    }
    document.body.removeChild(textarea);
  };

  const handleSelectAll = () => {
    if (iframeRef?.current?.contentWindow) {
      const pdfWindow = iframeRef.current.contentWindow;
      if (pdfWindow.PDFViewerApplication) {
        // בחר את כל הטקסט בעמוד הנוכחי
        const selection = pdfWindow.getSelection();
        const textLayer = pdfWindow.document.querySelector('.page[data-page-number="' + currentPage + '"] .textLayer');
        if (textLayer && selection) {
          const range = pdfWindow.document.createRange();
          range.selectNodeContents(textLayer);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
    onClose();
  };

  const handleSearch = () => {
    if (iframeRef?.current?.contentWindow) {
      const pdfWindow = iframeRef.current.contentWindow;
      if (pdfWindow.PDFViewerApplication) {
        const selection = pdfWindow.getSelection();
        let searchText = '';
        let displayText = '';
        
        // קבל את הטקסט המסומן עם רווחים תקינים
        if (selection && selection.rangeCount > 0) {
          try {
            for (let i = 0; i < selection.rangeCount; i++) {
              const range = selection.getRangeAt(i);
              const container = range.cloneContents();
              const tempDiv = pdfWindow.document.createElement('div');
              tempDiv.appendChild(container);
              
              const spans = tempDiv.querySelectorAll('span');
              if (spans.length > 0) {
                const words = [];
                spans.forEach(span => {
                  const spanText = span.textContent.trim();
                  if (spanText) words.push(spanText);
                });
                displayText = words.join(' ');
                // לחיפוש - הסר רווחים כי ב-PDF העברי הטקסט נשמר ללא רווחים
                searchText = words.join('');
              } else {
                displayText = tempDiv.textContent;
                searchText = tempDiv.textContent.replace(/\s+/g, '');
              }
            }
            searchText = searchText.trim();
            displayText = displayText.replace(/\s+/g, ' ').trim();
          } catch (err) {
            displayText = selection.toString().trim();
            searchText = selection.toString().replace(/\s+/g, '').trim();
          }
        }
        
        // סגור את התפריט קודם
        onClose();
        
        // פתח את פאנל החיפוש אחרי סגירת התפריט
        setTimeout(() => {
          // פתח את פאנל החיפוש
          pdfWindow.PDFViewerApplication.findBar.open();
          
          if (searchText) {
            // מלא את שדה החיפוש עם הטקסט המסומן
            setTimeout(() => {
              const findInput = pdfWindow.document.getElementById('findInput');
              if (findInput) {
                // הצג את הטקסט עם רווחים בשדה החיפוש
                findInput.value = displayText;
                
                // אבל חפש ללא רווחים
                pdfWindow.PDFViewerApplication.eventBus.dispatch('find', {
                  source: findInput,
                  type: '',
                  query: searchText,
                  caseSensitive: false,
                  entireWord: false,
                  highlightAll: true,
                  findPrevious: false,
                  phraseSearch: false
                });
                
                findInput.focus();
                console.log('🔍 Search opened - Display:', displayText, 'Search:', searchText);
              } else {
                console.error('❌ findInput not found');
              }
            }, 100);
          }
        }, 50);
      }
    }
  };

  const handlePrint = () => {
    if (iframeRef?.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
    onClose();
  };

  const handleAddNote = () => {
    let selectedText = '';
    
    // קבל את הטקסט המסומן עם רווחים תקינים
    if (iframeRef?.current?.contentWindow) {
      const pdfWindow = iframeRef.current.contentWindow;
      const selection = pdfWindow.getSelection();
      
      if (selection && selection.rangeCount > 0) {
        try {
          for (let i = 0; i < selection.rangeCount; i++) {
            const range = selection.getRangeAt(i);
            const container = range.cloneContents();
            const tempDiv = pdfWindow.document.createElement('div');
            tempDiv.appendChild(container);
            
            const spans = tempDiv.querySelectorAll('span');
            if (spans.length > 0) {
              const words = [];
              spans.forEach(span => {
                const spanText = span.textContent.trim();
                if (spanText) words.push(spanText);
              });
              selectedText += words.join(' ');
            } else {
              selectedText += tempDiv.textContent;
            }
          }
          selectedText = selectedText.replace(/\s+/g, ' ').trim();
        } catch (err) {
          selectedText = selection.toString().trim();
        }
      }
    }
    
    // פתח את פאנל ההערות תמיד, עם או בלי טקסט מסומן
    if (onNotesClick) {
      onNotesClick(selectedText); // אפילו אם זה מחרוזת רקה
    }
    onClose();
  };

  const handleHighlight = () => {
    // פונקציונליות להדגשת טקסט - ניתן להרחיב בעתיד
    console.log('Highlight selected text');
    onClose();
  };

  const handleLocateBook = () => {
    let selectedText = '';
    
    // קבל את הטקסט המסומן עם רווחים תקינים
    if (iframeRef?.current?.contentWindow) {
      const pdfWindow = iframeRef.current.contentWindow;
      const selection = pdfWindow.getSelection();
      
      if (selection && selection.rangeCount > 0) {
        try {
          for (let i = 0; i < selection.rangeCount; i++) {
            const range = selection.getRangeAt(i);
            const container = range.cloneContents();
            const tempDiv = pdfWindow.document.createElement('div');
            tempDiv.appendChild(container);
            
            const spans = tempDiv.querySelectorAll('span');
            if (spans.length > 0) {
              const words = [];
              spans.forEach(span => {
                const spanText = span.textContent.trim();
                if (spanText) words.push(spanText);
              });
              selectedText += words.join(' ');
            } else {
              selectedText += tempDiv.textContent;
            }
          }
          selectedText = selectedText.replace(/\s+/g, ' ').trim();
        } catch (err) {
          selectedText = selection.toString().trim();
        }
      }
    }
    
    // העבר את הטקסט לתיבת החיפוש הראשית
    if (onLocateBook && selectedText) {
      onLocateBook(selectedText);
      console.log('🔍 Locating book with text:', selectedText);
    }
    onClose();
  };

  const menuItems = [
    {
      id: 'copy',
      icon: CopyRegular,
      label: 'העתק',
      onClick: handleCopy,
      disabled: !hasSelection,
      shortcut: 'Ctrl+C'
    },
    {
      id: 'select-all',
      icon: SelectAllOnRegular,
      label: 'בחר הכל',
      onClick: handleSelectAll,
      shortcut: 'Ctrl+A'
    },
    { id: 'divider1', isDivider: true },
    {
      id: 'search',
      icon: SearchRegular,
      label: hasSelection ? 'חפש טקסט מסומן' : 'חיפוש',
      onClick: handleSearch,
      shortcut: 'Ctrl+F'
    },
    {
      id: 'locate-book',
      icon: BookSearchRegular,
      label: 'אתר ספר',
      onClick: handleLocateBook,
      disabled: !hasSelection
    },
    { id: 'divider2', isDivider: true },
    {
      id: 'note',
      icon: NoteRegular,
      label: 'הוסף הערה',
      onClick: handleAddNote,
      shortcut: 'N'
    },
    {
      id: 'highlight',
      icon: HighlightRegular,
      label: 'הדגש',
      onClick: handleHighlight,
      disabled: !hasSelection
    },
    { id: 'divider3', isDivider: true },
    {
      id: 'print',
      icon: PrintRegular,
      label: 'הדפס',
      onClick: handlePrint,
      shortcut: 'Ctrl+P'
    }
  ];

  return (
    <div 
      className="pdf-context-menu" 
      style={{ left: position.left, top: position.top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {menuItems.map((item) => {
        if (item.isDivider) {
          return <div key={item.id} className="context-menu-divider" />;
        }

        const IconComponent = item.icon;
        return (
          <button
            key={item.id}
            className={`context-menu-item ${item.disabled ? 'disabled' : ''}`}
            onClick={item.onClick}
            disabled={item.disabled}
          >
            <IconComponent className="context-menu-icon" />
            <span className="context-menu-label">{item.label}</span>
            {item.shortcut && (
              <span className="context-menu-shortcut">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default PDFContextMenu;
