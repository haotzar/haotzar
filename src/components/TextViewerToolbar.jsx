import {
  NoteRegular,
  BookRegular,
  LinkRegular,
  TextFontRegular,
  FullScreenMaximizeRegular,
  FullScreenMinimizeRegular,
  ArrowFitRegular,
  TextAlignLeftRegular
} from '@fluentui/react-icons';
import { useState, useEffect } from 'react';
import TooltipWrapper from './TooltipWrapper';
import './TextViewerToolbar.css';

const TextViewerToolbar = ({ 
  onNotesClick,
  onCommentariesClick,
  onLinksClick,
  currentPage = 1,
  totalPages = 0,
  isCollapsed = false,
  bookName,
  onFontSizeChange,
  onColumnChange,
  currentColumns = 2,
  onToggleWideView,
  bookType = null,
  currentLineIndex = 0
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notesCount, setNotesCount] = useState(0);
  const [isWideView, setIsWideView] = useState(true); // ברירת מחדל: ללא רווח
  
  // Load notes count for current line
  useEffect(() => {
    if (!bookName || currentLineIndex === null || currentLineIndex === undefined) return;
    
    try {
      const savedNotes = localStorage.getItem('personalNotes');
      if (savedNotes) {
        const allNotes = JSON.parse(savedNotes);
        
        // Count notes for current book and line
        const lineNotes = allNotes.filter(note => {
          if (!note.context) return false;
          
          const isBookMatch = note.context.bookName === bookName;
          const isLineMatch = 
            note.context.type === 'book' || 
            (note.context.type === 'line' && note.context.lineIndex == currentLineIndex);
          
          return isBookMatch && isLineMatch;
        });
        
        setNotesCount(lineNotes.length);
      } else {
        setNotesCount(0);
      }
    } catch (error) {
      console.error('Error loading notes count:', error);
      setNotesCount(0);
    }
  }, [bookName, currentLineIndex]);
  
  // מאזין ל-ESC ולשינויים במצב מסך מלא
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement || 
                           document.msFullscreenElement;
      
      setIsFullscreen(!!fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const handleFullScreen = () => {
    // נסה למצוא את ה-text-viewer בכרטיסיה הפעילה, אם לא קיימת - חפש בכלל
    let textViewer = null;
    const activeTab = document.querySelector('.tab-item.active');
    if (activeTab) {
      textViewer = activeTab.querySelector('.text-viewer');
    }
    if (!textViewer) {
      textViewer = document.querySelector('.text-viewer');
    }
    if (!textViewer) return;
    
    if (isFullscreen) {
      // צא ממצב מסך מלא
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } else {
      // היכנס למצב מסך מלא
      if (textViewer.requestFullscreen) {
        textViewer.requestFullscreen();
      } else if (textViewer.webkitRequestFullscreen) {
        textViewer.webkitRequestFullscreen();
      } else if (textViewer.mozRequestFullScreen) {
        textViewer.mozRequestFullScreen();
      } else if (textViewer.msRequestFullscreen) {
        textViewer.msRequestFullscreen();
      }
    }
  };

  const handleIncreaseFontSize = () => {
    if (onFontSizeChange) {
      onFontSizeChange('increase');
    }
  };

  const handleDecreaseFontSize = () => {
    if (onFontSizeChange) {
      onFontSizeChange('decrease');
    }
  };

  const handleToggleWideView = () => {
    const newWideView = !isWideView;
    setIsWideView(newWideView);
    if (onToggleWideView) {
      onToggleWideView(newWideView);
    }
  };

  const toolbarItems = [
    {
      id: 'fullscreen',
      icon: isFullscreen ? FullScreenMinimizeRegular : FullScreenMaximizeRegular,
      label: isFullscreen ? 'צא ממסך מלא' : 'מסך מלא',
      onClick: handleFullScreen,
      tooltip: isFullscreen ? 'צא ממסך מלא (ESC)' : 'מסך מלא (F11)'
    },
    {
      id: 'divider0',
      isDivider: true
    },
    {
      id: 'wide-view',
      icon: isWideView ? TextAlignLeftRegular : ArrowFitRegular,
      label: isWideView ? 'הצר רווחים' : 'הרחב רווחים',
      onClick: handleToggleWideView,
      tooltip: isWideView ? 'הצר רווחים' : 'הרחב רווחים'
    },
    {
      id: 'divider1',
      isDivider: true
    },
    {
      id: 'notes',
      icon: NoteRegular,
      label: 'הערות אישיות',
      onClick: onNotesClick,
      tooltip: 'הערות אישיות (N)',
      badge: notesCount > 0 ? notesCount : null
    },
    // כפתורי מפרשים וקישורים - רק לספרי אוצריא
    ...(bookType === 'otzaria' ? [
      {
        id: 'commentaries',
        icon: BookRegular,
        label: 'מפרשים',
        onClick: onCommentariesClick,
        tooltip: 'מפרשים (C)'
      },
      {
        id: 'links',
        icon: LinkRegular,
        label: 'קישורים',
        onClick: onLinksClick,
        tooltip: 'קישורים (L)'
      }
    ] : [])
  ];

  return (
    <div className={`text-viewer-toolbar ${isCollapsed ? 'collapsed' : 'expanded'}`}>
      <div className="toolbar-content">
        {toolbarItems.map((item) => {
          if (item.isDivider) {
            return <div key={item.id} className="toolbar-divider" />;
          }

          const IconComponent = item.icon;
          return (
            <TooltipWrapper key={item.id} content={item.tooltip}>
              <button
                className={`toolbar-item ${item.className || ''}`}
                onClick={item.onClick}
                aria-label={item.label}
              >
                <IconComponent className="toolbar-icon" />
                {item.badge && (
                  <span className="toolbar-badge">{item.badge}</span>
                )}
              </button>
            </TooltipWrapper>
          );
        })}
      </div>
    </div>
  );
};

export default TextViewerToolbar;
