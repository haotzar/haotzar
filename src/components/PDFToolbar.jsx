import {
  NoteRegular,
  BookmarkRegular,
  ArrowRotateClockwiseRegular,
  ArrowRotateCounterclockwiseRegular,
  DocumentRegular,
  TextAlignLeftRegular,
  FullScreenMaximizeRegular,
  FullScreenMinimizeRegular,
  ArrowFitRegular,
  DocumentOnePageRegular,
  DocumentMultipleRegular,
  BookOpenRegular
} from '@fluentui/react-icons';
import { useEffect, useState } from 'react';
import './PDFToolbar.css';

const PDFToolbar = ({ 
  onNotesClick, 
  onBookmarkClick,
  onNextPage,
  onPrevPage,
  currentPage = 1,
  totalPages = 0,
  isCollapsed = false,
  iframeRef,
  bookName
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentScaleMode, setCurrentScaleMode] = useState('page-width');
  const [currentSpreadMode, setCurrentSpreadMode] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
  
  // Load notes count for current page
  useEffect(() => {
    if (!bookName || !currentPage) return;
    
    try {
      const savedNotes = localStorage.getItem('personalNotes');
      if (savedNotes) {
        const allNotes = JSON.parse(savedNotes);
        
        // Count notes for current book and page
        const pageNotes = allNotes.filter(note => {
          if (!note.context) return false;
          
          const isBookMatch = note.context.bookName === bookName;
          const isPageMatch = 
            note.context.type === 'book' || 
            (note.context.type === 'page' && note.context.pageNumber == currentPage);
          
          return isBookMatch && isPageMatch;
        });
        
        setNotesCount(pageNotes.length);
      } else {
        setNotesCount(0);
      }
    } catch (error) {
      console.error('Error loading notes count:', error);
      setNotesCount(0);
    }
  }, [bookName, currentPage]);
  
  // מאזין ל-ESC ולשינויים במצב מסך מלא
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement || 
                           document.msFullscreenElement;
      
      const isNowFullscreen = !!fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      
      // אם יצאנו ממסך מלא, החזר את הסרגלים
      if (!isNowFullscreen && iframeRef && iframeRef.current) {
        const iframe = iframeRef.current;
        const pdfContainer = iframe.closest('.pdf-viewer-container');
        
        if (pdfContainer && pdfContainer.classList.contains('fullscreen-mode')) {
          // נקה את המחלקות והחזר את הסרגלים
          pdfContainer.classList.remove('fullscreen-mode');
          
          const toolbar = pdfContainer.querySelector('.pdf-toolbar');
          const topBar = pdfContainer.querySelector('.pdf-top-bar');
          
          if (toolbar) {
            toolbar.style.display = '';
          }
          if (topBar) {
            topBar.style.display = '';
          }
          
          // החזר את הסיידבר של PDF.js והתאם את ה-viewer
          try {
            const pdfWindow = iframe.contentWindow;
            if (pdfWindow && pdfWindow.PDFViewerApplication) {
              const doc = pdfWindow.document;
              const sidebarContainer = doc.getElementById('sidebarContainer');
              const viewerContainer = doc.getElementById('viewerContainer');
              
              if (sidebarContainer) {
                sidebarContainer.style.display = '';
              }
              
              // החזר את ה-viewerContainer למצב הרגיל
              if (viewerContainer) {
                viewerContainer.style.left = '';
                viewerContainer.style.right = '';
              }
            }
          } catch (e) {
            console.log('Could not restore PDF.js sidebar:', e);
          }
        }
      }
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
  }, [iframeRef]);
  
  // מעקב אחר שינויים במצב התצוגה
  useEffect(() => {
    if (!iframeRef || !iframeRef.current) return;
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    
    const checkViewMode = () => {
      try {
        const pdfWindow = iframe.contentWindow;
        if (pdfWindow.PDFViewerApplication && pdfWindow.PDFViewerApplication.pdfViewer) {
          const viewer = pdfWindow.PDFViewerApplication.pdfViewer;
          setCurrentScaleMode(viewer.currentScaleValue || 'page-width');
          setCurrentSpreadMode(viewer.spreadMode || 0);
        }
      } catch (e) {
        // Ignore cross-origin errors
      }
    };
    
    const interval = setInterval(checkViewMode, 500);
    return () => clearInterval(interval);
  }, [iframeRef]);
  
  const handleRotateClockwise = () => {
    if (!iframeRef || !iframeRef.current) return;
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      const pdfWindow = iframe.contentWindow;
      if (pdfWindow.PDFViewerApplication) {
        pdfWindow.PDFViewerApplication.rotatePages(90);
      }
    }
  };

  const handleRotateCounterClockwise = () => {
    if (!iframeRef || !iframeRef.current) return;
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      const pdfWindow = iframe.contentWindow;
      if (pdfWindow.PDFViewerApplication) {
        pdfWindow.PDFViewerApplication.rotatePages(-90);
      }
    }
  };

  const handleFullScreen = () => {
    if (!iframeRef || !iframeRef.current) return;
    const iframe = iframeRef.current;
    
    // מצא את ה-container הקרוב ביותר
    const pdfContainer = iframe.closest('.pdf-viewer-container');
    if (!pdfContainer) return;
    
    const toolbar = pdfContainer.querySelector('.pdf-toolbar');
    const topBar = pdfContainer.querySelector('.pdf-top-bar');
    
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
      
      // הסר את המחלקות והחזר את הסרגלים
      pdfContainer.classList.remove('fullscreen-mode');
      if (toolbar) {
        toolbar.style.display = '';
      }
      if (topBar) {
        topBar.style.display = '';
      }
      
      // החזר את הסיידבר של PDF.js והתאם את ה-viewer
      try {
        const pdfWindow = iframe.contentWindow;
        if (pdfWindow && pdfWindow.PDFViewerApplication) {
          const doc = pdfWindow.document;
          const sidebarContainer = doc.getElementById('sidebarContainer');
          const viewerContainer = doc.getElementById('viewerContainer');
          
          if (sidebarContainer) {
            sidebarContainer.style.display = '';
          }
          
          // החזר את ה-viewerContainer למצב הרגיל
          if (viewerContainer) {
            viewerContainer.style.left = '';
            viewerContainer.style.right = '';
          }
        }
      } catch (e) {
        console.log('Could not restore PDF.js sidebar:', e);
      }
    } else {
      // היכנס למצב מסך מלא
      pdfContainer.classList.add('fullscreen-mode');
      
      // הסתר את הסרגלים
      if (toolbar) {
        toolbar.style.display = 'none';
      }
      if (topBar) {
        topBar.style.display = 'none';
      }
      
      // הסתר את הסיידבר של PDF.js והתאם את ה-viewer
      try {
        const pdfWindow = iframe.contentWindow;
        if (pdfWindow && pdfWindow.PDFViewerApplication) {
          const doc = pdfWindow.document;
          const sidebarContainer = doc.getElementById('sidebarContainer');
          const viewerContainer = doc.getElementById('viewerContainer');
          const outerContainer = doc.getElementById('outerContainer');
          
          if (sidebarContainer) {
            sidebarContainer.style.display = 'none';
          }
          
          // התאם את ה-viewerContainer למלא את כל המקום
          if (viewerContainer) {
            viewerContainer.style.left = '0';
            viewerContainer.style.right = '0';
          }
          
          // הסר את המחלקה sidebarOpen מה-outerContainer
          if (outerContainer) {
            outerContainer.classList.remove('sidebarOpen');
          }
        }
      } catch (e) {
        console.log('Could not hide PDF.js sidebar:', e);
      }
      
      // בקש מסך מלא על הקונטיינר הספציפי
      if (pdfContainer.requestFullscreen) {
        pdfContainer.requestFullscreen();
      } else if (pdfContainer.webkitRequestFullscreen) {
        pdfContainer.webkitRequestFullscreen();
      } else if (pdfContainer.mozRequestFullScreen) {
        pdfContainer.mozRequestFullScreen();
      } else if (pdfContainer.msRequestFullscreen) {
        pdfContainer.msRequestFullscreen();
      }
    }
  };

  const handleDocumentProperties = () => {
    if (!iframeRef || !iframeRef.current) return;
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      const pdfWindow = iframe.contentWindow;
      if (pdfWindow.PDFViewerApplication) {
        pdfWindow.PDFViewerApplication.pdfDocumentProperties.open();
      }
    }
  };

  const handleFitToPage = () => {
    if (!iframeRef || !iframeRef.current) return;
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      const pdfWindow = iframe.contentWindow;
      if (pdfWindow.PDFViewerApplication) {
        pdfWindow.PDFViewerApplication.pdfViewer.currentScaleValue = 'page-fit';
        setCurrentScaleMode('page-fit');
      }
    }
  };

  const handleFitToWidth = () => {
    if (!iframeRef || !iframeRef.current) return;
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      const pdfWindow = iframe.contentWindow;
      if (pdfWindow.PDFViewerApplication) {
        pdfWindow.PDFViewerApplication.pdfViewer.currentScaleValue = 'page-width';
        setCurrentScaleMode('page-width');
      }
    }
  };

  const handleSinglePageView = () => {
    if (!iframeRef || !iframeRef.current) return;
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      const pdfWindow = iframe.contentWindow;
      if (pdfWindow.PDFViewerApplication) {
        pdfWindow.PDFViewerApplication.pdfViewer.spreadMode = 0; // NO_SPREAD
        setCurrentSpreadMode(0);
      }
    }
  };

  const handleOddPagesView = () => {
    if (!iframeRef || !iframeRef.current) return;
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      const pdfWindow = iframe.contentWindow;
      if (pdfWindow.PDFViewerApplication) {
        pdfWindow.PDFViewerApplication.pdfViewer.spreadMode = 1; // ODD_SPREAD
        setCurrentSpreadMode(1);
      }
    }
  };

  const handleEvenPagesView = () => {
    if (!iframeRef || !iframeRef.current) return;
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      const pdfWindow = iframe.contentWindow;
      if (pdfWindow.PDFViewerApplication) {
        pdfWindow.PDFViewerApplication.pdfViewer.spreadMode = 2; // EVEN_SPREAD
        setCurrentSpreadMode(2);
      }
    }
  };

  // בנה את רשימת הכפתורים דינמית - הצג רק את הכפתור הרלוונטי
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
    // כפתורי תצוגת עמודים - הצג רק את הכפתור שמשנה את המצב הנוכחי
    ...(currentSpreadMode === 0 ? [{
      id: 'even-pages',
      icon: BookOpenRegular,
      label: 'עמודים כפולים',
      onClick: handleEvenPagesView,
      tooltip: 'תצוגת עמודים כפולים'
    }] : []),
    ...(currentSpreadMode === 1 || currentSpreadMode === 2 ? [{
      id: 'single-page',
      icon: DocumentOnePageRegular,
      label: 'עמוד בודד',
      onClick: handleSinglePageView,
      tooltip: 'תצוגת עמוד בודד'
    }] : []),
    {
      id: 'divider1',
      isDivider: true
    },
    // כפתורי התאמה - הצג רק את הכפתור שמשנה את המצב הנוכחי
    ...(currentScaleMode === 'page-width' ? [{
      id: 'fit-page',
      icon: ArrowFitRegular,
      label: 'התאם לעמוד',
      onClick: handleFitToPage,
      tooltip: 'התאם לעמוד'
    }] : [{
      id: 'fit-width',
      icon: TextAlignLeftRegular,
      label: 'התאם לרוחב',
      onClick: handleFitToWidth,
      tooltip: 'התאם לרוחב'
    }]),
    {
      id: 'divider2',
      isDivider: true
    },
    {
      id: 'rotate-ccw',
      icon: ArrowRotateCounterclockwiseRegular,
      label: 'סובב שמאלה',
      onClick: handleRotateCounterClockwise,
      tooltip: 'סובב שמאלה'
    },
    {
      id: 'rotate-cw',
      icon: ArrowRotateClockwiseRegular,
      label: 'סובב ימינה',
      onClick: handleRotateClockwise,
      tooltip: 'סובב ימינה'
    },
    {
      id: 'divider3',
      isDivider: true
    },
    {
      id: 'properties',
      icon: DocumentRegular,
      label: 'מאפיינים',
      onClick: handleDocumentProperties,
      tooltip: 'מאפייני מסמך'
    },
    {
      id: 'divider4',
      isDivider: true
    },
    {
      id: 'notes',
      icon: NoteRegular,
      label: 'הערות',
      onClick: onNotesClick,
      tooltip: 'הערות (N)',
      badge: notesCount > 0 ? notesCount : null
    },
    {
      id: 'bookmark',
      icon: BookmarkRegular,
      label: 'סימניה',
      onClick: onBookmarkClick,
      tooltip: 'הוסף סימניה'
    }
  ];

  return (
    <div className={`pdf-toolbar ${isCollapsed ? 'collapsed' : 'expanded'}`}>
      <div className="toolbar-content">
        {toolbarItems.map((item) => {
          if (item.isDivider) {
            return <div key={item.id} className="toolbar-divider" />;
          }

          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              className="toolbar-item"
              onClick={item.onClick}
              title={item.tooltip}
              aria-label={item.label}
            >
              <IconComponent className="toolbar-icon" />
              {item.badge && (
                <span className="toolbar-badge">{item.badge}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PDFToolbar;
