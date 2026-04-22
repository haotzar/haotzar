import { useState, useCallback } from 'react';
import { getSetting, updateSetting } from '../utils/settingsManager';

/**
 * Hook לניהול ספרים
 * מנהל ספרים אחרונים, ספרים מוצמדים ותיקיות
 */
export function useBooks() {
  const [allFiles, setAllFiles] = useState([]);
  const [recentBooks, setRecentBooks] = useState(() => getSetting('recentBooks', []));
  const [pinnedBooks, setPinnedBooks] = useState(() => getSetting('pinnedBooks', []));
  const [folderPreview, setFolderPreview] = useState(() => {
    const saved = localStorage.getItem('library_lastFolder');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLibrarySidebarOpen, setIsLibrarySidebarOpen] = useState(() => {
    const saved = localStorage.getItem('library_sidebarOpen');
    return saved === 'true';
  });

  // עדכון רשימת ספרים שנפתחו לאחרונה
  const updateRecentBooks = useCallback((file) => {
    const recent = [...recentBooks];
    const filtered = recent.filter(book => book.id !== file.id);
    const bookWithTimestamp = {
      ...file,
      lastOpened: Date.now()
    };
    const updated = [bookWithTimestamp, ...filtered].slice(0, 100);
    setRecentBooks(updated);
    updateSetting('recentBooks', updated);
  }, [recentBooks]);

  // הצמדת ספר
  const pinBook = useCallback((book) => {
    const isAlreadyPinned = pinnedBooks.some(b => b.id === book.id);
    
    if (isAlreadyPinned) {
      // אם מוצמד, בטל הצמדה
      const updatedPinned = pinnedBooks.filter(b => b.id !== book.id);
      setPinnedBooks(updatedPinned);
      updateSetting('pinnedBooks', updatedPinned);
    } else {
      // אם לא מוצמד, הוסף את הספר לתחילת הרשימה
      const updatedPinned = [book, ...pinnedBooks];
      setPinnedBooks(updatedPinned);
      updateSetting('pinnedBooks', updatedPinned);
    }
  }, [pinnedBooks]);

  // ביטול הצמדת ספר
  const unpinBook = useCallback((bookId) => {
    const updatedPinned = pinnedBooks.filter(book => book.id !== bookId);
    setPinnedBooks(updatedPinned);
    updateSetting('pinnedBooks', updatedPinned);
  }, [pinnedBooks]);

  // פתיחת תצוגה מקדימה של תיקייה
  const openFolderPreview = useCallback((folder) => {
    setFolderPreview(folder);
    if (folder) {
      localStorage.setItem('library_lastFolder', JSON.stringify(folder));
    }
  }, []);

  // סגירת תצוגה מקדימה של תיקייה
  const closeFolderPreview = useCallback(() => {
    setFolderPreview(null);
    localStorage.removeItem('library_lastFolder');
  }, []);

  // ניקוי היסטוריה
  const clearHistory = useCallback(() => {
    setRecentBooks([]);
    updateSetting('recentBooks', []);
  }, []);

  return {
    // State
    allFiles,
    recentBooks,
    pinnedBooks,
    folderPreview,
    isLibrarySidebarOpen,
    
    // Setters
    setAllFiles,
    setRecentBooks,
    setPinnedBooks,
    setFolderPreview,
    setIsLibrarySidebarOpen,
    
    // Actions
    updateRecentBooks,
    pinBook,
    unpinBook,
    openFolderPreview,
    closeFolderPreview,
    clearHistory,
  };
}
