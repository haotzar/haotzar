import { useState, useCallback, useEffect } from 'react';

/**
 * Hook לניהול תפריט הקשר
 * מנהל פתיחה, סגירה ומיקום של תפריט הקשר
 */
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMenuTarget, setContextMenuTarget] = useState(null);

  // פתיחת תפריט הקשר
  const openContextMenu = useCallback((e, target) => {
    e.preventDefault();
    
    // גודל התפריט (בערך)
    const menuWidth = 220;
    const menuHeight = 300;
    
    // מיקום התפריט
    let x = e.clientX;
    let y = e.clientY;
    
    // בדיקה אם התפריט יוצא מהמסך מימין
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    
    // בדיקה אם התפריט יוצא מהמסך משמאל
    if (x < 10) {
      x = 10;
    }
    
    // בדיקה אם התפריט יוצא מהמסך מלמטה
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    // בדיקה אם התפריט יוצא מהמסך מלמעלה
    if (y < 10) {
      y = 10;
    }
    
    setContextMenu({ x, y });
    setContextMenuTarget(target);
  }, []);

  // סגירת תפריט הקשר
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    setContextMenuTarget(null);
  }, []);

  // סגירת תפריט בלחיצה מחוץ לו
  useEffect(() => {
    const handleClick = (e) => {
      const contextMenuElement = document.querySelector('.context-menu');
      if (contextMenuElement && !contextMenuElement.contains(e.target)) {
        closeContextMenu();
      }
    };
    
    if (contextMenu) {
      setTimeout(() => {
        document.addEventListener('click', handleClick);
      }, 0);
      
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu, closeContextMenu]);

  return {
    contextMenu,
    contextMenuTarget,
    openContextMenu,
    closeContextMenu,
  };
}
