import { useState, useEffect } from 'react';
import {
  SearchRegular,
  PanelLeftRegular,
  PrintRegular,
  ChevronRightRegular,
  ChevronLeftRegular,
  PanelRightContractRegular,
  PanelRightExpandRegular,
  ZoomInRegular,
  ZoomOutRegular,
  HistoryRegular
} from '@fluentui/react-icons';
import TooltipWrapper from './TooltipWrapper';
import './PDFTopBar.css';

const PDFTopBar = ({ currentPage, totalPages, onPageChange, onNextPage, onPrevPage, iframeRef, isToolbarCollapsed, onToggleToolbar, onZoomIn, onZoomOut, onHistoryClick }) => {
  const [pageInput, setPageInput] = useState('');

  // סגור את דיאלוג החיפוש בלחיצה בכל מקום
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!iframeRef || !iframeRef.current) return;
      
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        const pdfWindow = iframe.contentWindow;
        if (pdfWindow.PDFViewerApplication) {
          try {
            const doc = pdfWindow.document;
            const findbar = doc.getElementById('findbar');
            
            // בדוק אם דיאלוג החיפוש פתוח
            if (findbar && !findbar.classList.contains('hidden')) {
              // בדוק אם הלחיצה הייתה על ה-findbar עצמו או על כפתור החיפוש
              const clickedElement = e.target;
              
              // בדוק אם הלחיצה הייתה בתוך ה-findbar
              const isClickOnFindbar = clickedElement.closest('#findbar');
              
              // בדוק אם הלחיצה הייתה על כפתור החיפוש בטופבר
              const isClickOnSearchButton = clickedElement.closest('.pdf-top-bar-btn[title*="חיפוש"]');
              
              // סגור את הדיאלוג רק אם הלחיצה לא הייתה על findbar או על כפתור החיפוש
              if (!isClickOnFindbar && !isClickOnSearchButton) {
                pdfWindow.PDFViewerApplication.findBar.close();
              }
            }
          } catch (e) {
            console.log('Could not close findbar:', e);
          }
        }
      }
    };

    // האזן ללחיצות באפליקציה
    document.addEventListener('click', handleClickOutside);
    
    // האזן ללחיצות על ה-iframe
    if (iframeRef && iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.document.addEventListener('click', handleClickOutside);
      } catch (e) {
        console.log('Could not add listener to iframe:', e);
      }
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      if (iframeRef && iframeRef.current && iframeRef.current.contentWindow) {
        try {
          iframeRef.current.contentWindow.document.removeEventListener('click', handleClickOutside);
        } catch (e) {
          console.log('Could not remove listener from iframe:', e);
        }
      }
    };
  }, [iframeRef]);

  const handleToggleSidebar = () => {
    if (!iframeRef || !iframeRef.current) return;
    
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      const pdfWindow = iframe.contentWindow;
      if (pdfWindow.PDFViewerApplication) {
        pdfWindow.PDFViewerApplication.pdfSidebar.toggle();
      }
    }
  };

  const handleOpenSearch = (e) => {
    e.stopPropagation(); // מנע סגירה מיידית
    
    if (!iframeRef || !iframeRef.current) return;
    
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      const pdfWindow = iframe.contentWindow;
      if (pdfWindow.PDFViewerApplication) {
        // פתח את דיאלוג החיפוש של PDF.js
        pdfWindow.PDFViewerApplication.findBar.open();
      }
    }
  };

  const handlePrint = () => {
    if (!iframeRef || !iframeRef.current) return;
    
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      const pdfWindow = iframe.contentWindow;
      if (pdfWindow.PDFViewerApplication) {
        // המתן שה-PDF ייטען
        if (pdfWindow.PDFViewerApplication.pdfDocument) {
          // קרא לפונקציית ההדפסה
          pdfWindow.print();
        } else {
          // אם ה-PDF עדיין לא נטען, המתן
          const checkReady = setInterval(() => {
            if (pdfWindow.PDFViewerApplication.pdfDocument) {
              clearInterval(checkReady);
              pdfWindow.print();
            }
          }, 100);
          
          setTimeout(() => clearInterval(checkReady), 5000);
        }
      }
    }
  };

  const handlePageInputChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setPageInput(value);
    }
  };

  const handlePageInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      const pageNum = parseInt(pageInput);
      if (pageNum >= 1 && pageNum <= totalPages) {
        onPageChange(pageNum);
        setPageInput('');
      }
    }
  };

  const handlePageInputBlur = () => {
    const pageNum = parseInt(pageInput);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
    }
    setPageInput('');
  };

  return (
    <div className="pdf-top-bar">
      <div className="pdf-top-bar-right">
        <TooltipWrapper content="תוכן עניינים (F9)">
          <button
            className="pdf-top-bar-btn"
            onClick={handleToggleSidebar}
          >
            <PanelLeftRegular />
          </button>
        </TooltipWrapper>

        <TooltipWrapper content="חיפוש (Ctrl F)">
          <button
            className="pdf-top-bar-btn"
            onClick={handleOpenSearch}
          >
            <SearchRegular />
          </button>
        </TooltipWrapper>
      </div>
      
      <div className="pdf-page-controls">
        <TooltipWrapper content="עמוד הבא (→)">
          <button
            className="pdf-page-nav-btn"
            onClick={onNextPage}
            disabled={currentPage >= totalPages}
          >
            <ChevronLeftRegular />
          </button>
        </TooltipWrapper>
        
        <TooltipWrapper content="מספר עמוד">
          <input
            type="text"
            className="pdf-page-input"
            placeholder={currentPage.toString()}
            value={pageInput}
            onChange={handlePageInputChange}
            onKeyDown={handlePageInputKeyDown}
            onBlur={handlePageInputBlur}
          />
        </TooltipWrapper>
        <span className="pdf-page-separator">/</span>
        <span className="pdf-page-total">{totalPages}</span>
        
        <TooltipWrapper content="עמוד קודם (←)">
          <button
            className="pdf-page-nav-btn"
            onClick={onPrevPage}
            disabled={currentPage <= 1}
          >
            <ChevronRightRegular />
          </button>
        </TooltipWrapper>
      </div>


      <div className="pdf-top-bar-left">
        <div className="pdf-zoom-controls">
          <TooltipWrapper content="הקטן (Ctrl -)">
            <button
              className="pdf-top-bar-btn pdf-zoom-btn"
              onClick={onZoomOut}
            >
              <ZoomOutRegular />
            </button>
          </TooltipWrapper>
          
          <TooltipWrapper content="הגדל (Ctrl +)">
            <button
              className="pdf-top-bar-btn pdf-zoom-btn"
              onClick={onZoomIn}
            >
              <ZoomInRegular />
            </button>
          </TooltipWrapper>
        </div>
        
        <TooltipWrapper content="היסטוריה (Ctrl+H)">
          <button
            className="pdf-top-bar-btn"
            onClick={onHistoryClick}
          >
            <HistoryRegular />
          </button>
        </TooltipWrapper>
        
        <TooltipWrapper content="הדפס (Ctrl P)">
          <button
            className="pdf-top-bar-btn"
            onClick={handlePrint}
          >
            <PrintRegular />
          </button>
        </TooltipWrapper>
        
        <TooltipWrapper content={isToolbarCollapsed ? 'הצג סרגל כלים' : 'הסתר סרגל כלים'}>
          <button
            className="pdf-top-bar-btn pdf-toolbar-toggle-btn"
            onClick={onToggleToolbar}
          >
            {isToolbarCollapsed ? <PanelRightExpandRegular /> : <PanelRightContractRegular />}
          </button>
        </TooltipWrapper>
      </div>
    </div>
  );
};

export default PDFTopBar;
