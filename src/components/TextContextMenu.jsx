import { useEffect, useState } from 'react';
import {
  CopyRegular,
  SearchRegular,
  PrintRegular,
  NoteRegular,
  SelectAllOnRegular,
  BookSearchRegular
} from '@fluentui/react-icons';
import './TextContextMenu.css';

const TextContextMenu = ({ x, y, onClose, onNotesClick, onLocateBook, onSearch }) => {
  const [hasSelection, setHasSelection] = useState(false);
  const [position, setPosition] = useState({ left: x, top: y });
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    // חישוב מיקום התפריט כדי שלא יחרוג מהמסך
    const menuWidth = 220;
    const menuHeight = 350;
    const padding = 10;

    let left = x;
    let top = y;

    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }

    if (left < padding) {
      left = padding;
    }

    if (top + menuHeight > window.innerHeight - padding) {
      top = window.innerHeight - menuHeight - padding;
    }

    if (top < padding) {
      top = padding;
    }

    setPosition({ left, top });
  }, [x, y]);

  useEffect(() => {
    // בדוק אם יש טקסט מסומן
    const checkSelection = () => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';
      setHasSelection(text.length > 0);
      setSelectedText(text);
    };

    checkSelection();
  }, []);

  const handleCopy = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const text = selection.toString();
      
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
    const textContent = document.querySelector('.text-content-continuous');
    if (textContent) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(textContent);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    onClose();
  };

  const handleSearch = () => {
    if (onSearch && selectedText) {
      onSearch(selectedText);
    }
    onClose();
  };

  const handlePrint = () => {
    window.print();
    onClose();
  };

  const handleAddNote = () => {
    if (onNotesClick) {
      onNotesClick(selectedText);
    }
    onClose();
  };

  const handleLocateBook = () => {
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
      className="text-context-menu" 
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

export default TextContextMenu;
