import { DocumentRegular } from '@fluentui/react-icons';
import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import './RecentBooks.css';

// הגדרת worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const THUMBNAILS_CACHE_KEY = 'book-thumbnails-cache';

const RecentBooks = ({ recentBooks, onBookClick }) => {
  const [thumbnails, setThumbnails] = useState({});

  // טעינת תמונות ממוזערות מה-cache
  useEffect(() => {
    try {
      const cached = localStorage.getItem(THUMBNAILS_CACHE_KEY);
      if (cached) {
        setThumbnails(JSON.parse(cached));
      }
    } catch (error) {
      console.error('Error loading thumbnails cache:', error);
    }
  }, []);

  // חילוץ תמונה ממוזערת של העמוד הראשון
  useEffect(() => {
    const loadThumbnails = async () => {
      const newThumbnails = { ...thumbnails };
      let hasNewThumbnails = false;
      
      for (const book of recentBooks?.slice(0, 5) || []) {
        const bookId = book.id || book.path;
        
        // אם כבר יש תמונה ממוזערת, דלג
        if (newThumbnails[bookId]) {
          continue;
        }
        
        if (book.type === 'pdf' && book.path) {
          try {
            const loadingTask = pdfjsLib.getDocument(book.path);
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            
            const scale = 0.5;
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;
            
            newThumbnails[bookId] = canvas.toDataURL();
            hasNewThumbnails = true;
          } catch (error) {
            console.error('Error loading thumbnail:', error);
          }
        }
      }
      
      if (hasNewThumbnails) {
        setThumbnails(newThumbnails);
        // שמירה ב-localStorage
        try {
          localStorage.setItem(THUMBNAILS_CACHE_KEY, JSON.stringify(newThumbnails));
        } catch (error) {
          console.error('Error saving thumbnails cache:', error);
        }
      }
    };
    
    if (recentBooks && recentBooks.length > 0) {
      loadThumbnails();
    }
  }, [recentBooks]);

  if (!recentBooks || recentBooks.length === 0) {
    return (
      <div className="recent-books-empty">
        <p>אין ספרים שנפתחו לאחרונה</p>
      </div>
    );
  }

  return (
    <div className="recent-books-grid">
      {recentBooks.slice(0, 5).map((book, index) => {
        const bookId = book.id || book.path;
        const hasThumbnail = thumbnails[bookId];
        // הסר סיומת קובץ מהשם המוצג
        const displayName = book.name.replace(/\.(pdf|txt|html|docx?)$/i, '');
        
        return (
          <div
            key={bookId || index}
            className="recent-book-card"
            onClick={() => onBookClick(book)}
            title={displayName}
          >
            <div className="recent-book-preview">
              {hasThumbnail ? (
                <img 
                  src={hasThumbnail} 
                  alt={displayName}
                  className="book-thumbnail"
                />
              ) : (
                <div className="pdf-preview-placeholder">
                  <DocumentRegular />
                </div>
              )}
            </div>
            <div className="recent-book-name">{displayName}</div>
          </div>
        );
      })}
    </div>
  );
};

export default RecentBooks;
