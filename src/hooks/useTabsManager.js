import { useState, useEffect, useCallback } from 'react';
import { getSetting, updateSetting } from '../utils/settingsManager';
import customConfirm from '../utils/customConfirm';

/**
 * Hook לניהול כרטיסיות
 * מנהל את כל הלוגיקה של פתיחה, סגירה, גרירה והחלפת כרטיסיות
 */
export function useTabsManager(workspaces, currentWorkspace) {
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [draggedTab, setDraggedTab] = useState(null);
  const [dragOverTab, setDragOverTab] = useState(null);
  const [showTabsDialog, setShowTabsDialog] = useState(false);

  // שמירת מצב הכרטיסיות לשולחן העבודה הנוכחי
  const saveTabsState = useCallback((tabs, activeId) => {
    try {
      if (!tabs || !Array.isArray(tabs)) {
        console.warn('saveTabsState: tabs is not an array', tabs);
        return;
      }
      
      if (!workspaces || !Array.isArray(workspaces)) {
        console.warn('saveTabsState: workspaces is not an array', workspaces);
        return;
      }
      
      if (!currentWorkspace) {
        console.warn('saveTabsState: currentWorkspace is not defined');
        return;
      }
      
      // עדכן את שולחן העבודה הנוכחי
      const updated = workspaces.map(w => 
        w.id === currentWorkspace ? { ...w, tabs } : w
      );
      updateSetting('workspaces', updated);
      updateSetting('activeTabId', activeId);
    } catch (error) {
      console.error('Error in saveTabsState:', error);
    }
  }, [workspaces, currentWorkspace]);

  // טעינת מצב הכרטיסיות משולחן העבודה הנוכחי
  const loadTabsState = useCallback(() => {
    const workspace = workspaces.find(w => w.id === currentWorkspace);
    if (workspace && workspace.tabs && workspace.tabs.length > 0) {
      return {
        openTabs: workspace.tabs,
        activeTabId: getSetting('activeTabId', null),
      };
    }
    return null;
  }, [workspaces, currentWorkspace]);

  // פתיחת כרטיסייה חדשה
  const openTab = useCallback(async (tab, options = {}) => {
    const { replaceSearchTab = false } = options;

    // בדוק אם הכרטיסייה כבר פתוחה
    const existingTab = openTabs.find((t) => t.id === tab.id);

    if (existingTab) {
      // אם כבר פתוחה, עדכן את ההקשר רק אם יש context חדש ושונה
      if (tab.searchContext) {
        const contextChanged = 
          !existingTab.searchContext ||
          existingTab.searchContext.searchQuery !== tab.searchContext.searchQuery ||
          existingTab.searchContext.context?.pageNum !== tab.searchContext.context?.pageNum ||
          existingTab.searchContext.context?.chunkId !== tab.searchContext.context?.chunkId ||
          existingTab.searchContext.context?.lineIndex !== tab.searchContext.context?.lineIndex;
        
        if (contextChanged) {
          const updatedTabs = openTabs.map(t => 
            t.id === tab.id 
              ? { ...t, searchContext: tab.searchContext, _updateKey: Date.now() }
              : t
          );
          setOpenTabs(updatedTabs);
          saveTabsState(updatedTabs, tab.id);
        }
      }
      setActiveTabId(tab.id);
      return;
    }

    // בדוק אם יש יותר מ-9 כרטיסיות והצג התראה
    if (openTabs.length >= 9) {
      const dontShowAgain = getSetting('dontShowTabsWarning', false);
      if (!dontShowAgain) {
        const result = await customConfirm(
          'יש לך הרבה כרטיסיות פתוחות.\nמומלץ ליצור שולחן עבודה חדש לניהול טוב יותר.',
          {
            title: 'ליצור שולחן עבודה חדש?',
            type: 'question',
            showDontShowAgain: true,
            buttons: [
              { label: 'ביטול', value: 'cancel', primary: false },
              { label: 'פתח בכל אופן', value: 'continue', primary: false },
              { label: 'צור שולחן עבודה', value: 'workspace', primary: true }
            ]
          }
        );
        
        if (result.dontShowAgain) {
          updateSetting('dontShowTabsWarning', true);
        }
        
        if (result.value === 'cancel') {
          return { cancelled: true };
        }
        
        if (result.value === 'workspace') {
          return { createWorkspace: true };
        }
      }
    }

    let newTabs;
    
    // הסר סיומת קובץ משם הכרטיסייה
    const displayName = tab.name?.replace(/\.(pdf|txt|html|docx?)$/i, '') || tab.name;
    const newTab = { ...tab, name: displayName };
    
    // אם צריך להחליף כרטיסיית חיפוש
    if (replaceSearchTab) {
      const searchTabIndex = openTabs.findIndex(t => t.type === 'search');
      if (searchTabIndex !== -1) {
        newTabs = [...openTabs];
        newTabs[searchTabIndex] = newTab;
      } else {
        newTabs = [...openTabs, newTab];
      }
    } else {
      newTabs = [...openTabs, newTab];
    }
    
    setOpenTabs(newTabs);
    setActiveTabId(tab.id);
    saveTabsState(newTabs, tab.id);
    
    return { success: true };
  }, [openTabs, saveTabsState]);

  // סגירת כרטיסייה
  const closeTab = useCallback((tabId) => {
    const newTabs = openTabs.filter((tab) => tab.id !== tabId);
    setOpenTabs(newTabs);

    let newActiveTabId = activeTabId;
    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        newActiveTabId = newTabs[newTabs.length - 1].id;
        setActiveTabId(newActiveTabId);
      } else {
        newActiveTabId = null;
        setActiveTabId(null);
      }
    }

    saveTabsState(newTabs, newActiveTabId);
  }, [openTabs, activeTabId, saveTabsState]);

  // שכפול כרטיסייה
  const duplicateTab = useCallback((tab) => {
    const newTab = {
      ...tab,
      id: `${tab.type}-${Date.now()}`,
    };
    const newTabs = [...openTabs, newTab];
    setOpenTabs(newTabs);
    setActiveTabId(newTab.id);
    saveTabsState(newTabs, newTab.id);
  }, [openTabs, saveTabsState]);

  // סגירת כרטיסיות אחרות
  const closeOtherTabs = useCallback((tabId) => {
    const tab = openTabs.find(t => t.id === tabId);
    if (tab) {
      const newTabs = [tab];
      setOpenTabs(newTabs);
      setActiveTabId(tab.id);
      saveTabsState(newTabs, tab.id);
    }
  }, [openTabs, saveTabsState]);

  // סגירת כרטיסיות מימין
  const closeTabsToRight = useCallback((tabId) => {
    const targetIndex = openTabs.findIndex(tab => tab.id === tabId);
    if (targetIndex !== -1) {
      const newTabs = openTabs.slice(targetIndex);
      setOpenTabs(newTabs);
      const newActiveTabId = newTabs.find(tab => tab.id === activeTabId) 
        ? activeTabId 
        : tabId;
      setActiveTabId(newActiveTabId);
      saveTabsState(newTabs, newActiveTabId);
    }
  }, [openTabs, activeTabId, saveTabsState]);

  // סגירת כרטיסיות משמאל
  const closeTabsToLeft = useCallback((tabId) => {
    const targetIndex = openTabs.findIndex(tab => tab.id === tabId);
    if (targetIndex !== -1) {
      const newTabs = openTabs.slice(0, targetIndex + 1);
      setOpenTabs(newTabs);
      const newActiveTabId = newTabs.find(tab => tab.id === activeTabId) 
        ? activeTabId 
        : tabId;
      setActiveTabId(newActiveTabId);
      saveTabsState(newTabs, newActiveTabId);
    }
  }, [openTabs, activeTabId, saveTabsState]);

  // טעינה מחדש של כרטיסייה
  const reloadTab = useCallback((tabId) => {
    const updatedTabs = openTabs.map(tab => 
      tab.id === tabId 
        ? { ...tab, lastReloaded: Date.now() }
        : tab
    );
    setOpenTabs(updatedTabs);
  }, [openTabs]);

  // עדכון כרטיסייה
  const updateTab = useCallback((tabId, updates) => {
    const updatedTabs = openTabs.map(tab => 
      tab.id === tabId ? { ...tab, ...updates } : tab
    );
    setOpenTabs(updatedTabs);
    saveTabsState(updatedTabs, activeTabId);
  }, [openTabs, activeTabId, saveTabsState]);

  // גרירת כרטיסיות
  const handleDragStart = useCallback((tab) => {
    setDraggedTab(tab);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTab(null);
    setDragOverTab(null);
  }, []);

  const handleDragOver = useCallback((tab) => {
    if (draggedTab && draggedTab.id !== tab.id) {
      setDragOverTab(tab);
    }
  }, [draggedTab]);

  const handleDragLeave = useCallback(() => {
    setDragOverTab(null);
  }, []);

  const handleDrop = useCallback((targetTab) => {
    if (!draggedTab || draggedTab.id === targetTab.id) {
      return;
    }

    const draggedIndex = openTabs.findIndex(tab => tab.id === draggedTab.id);
    const targetIndex = openTabs.findIndex(tab => tab.id === targetTab.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    const newTabs = [...openTabs];
    const [removed] = newTabs.splice(draggedIndex, 1);
    newTabs.splice(targetIndex, 0, removed);

    setOpenTabs(newTabs);
    saveTabsState(newTabs, activeTabId);
    setDragOverTab(null);
  }, [draggedTab, openTabs, activeTabId, saveTabsState]);

  // Split View - הוספת כרטיסייה לתצוגה מפוצלת
  const addToSplitView = useCallback((tab) => {
    const displayName = tab.name.replace(/\.(pdf|txt|html|docx?)$/i, '');
    
    const newSplitTab = {
      id: `split-${Date.now()}`,
      name: `בחר ספר... | ${displayName}`,
      type: 'split',
      leftTab: null,
      rightTab: { ...tab, name: displayName },
      splitRatio: 50,
      isSelectingLeft: true
    };

    const newTabs = [...openTabs, newSplitTab];
    setOpenTabs(newTabs);
    setActiveTabId(newSplitTab.id);
    saveTabsState(newTabs, newSplitTab.id);
  }, [openTabs, saveTabsState]);

  // בחירת הכרטיסייה השנייה לתצוגה מפוצלת
  const selectSecondTabForSplit = useCallback((secondTab) => {
    const splitTab = openTabs.find(tab => tab.type === 'split' && tab.isSelectingLeft);
    
    if (splitTab && secondTab.id !== splitTab.rightTab.id) {
      const leftName = secondTab.name.replace(/\.(pdf|txt|html|docx?)$/i, '');
      const rightName = splitTab.rightTab.name.replace(/\.(pdf|txt|html|docx?)$/i, '');
      
      const updatedTabs = openTabs.map(tab => {
        if (tab.id === splitTab.id) {
          return {
            ...tab,
            name: `${leftName} | ${rightName}`,
            leftTab: { ...secondTab, name: leftName },
            rightTab: { ...tab.rightTab, name: rightName },
            isSelectingLeft: false
          };
        }
        return tab;
      });

      setOpenTabs(updatedTabs);
      saveTabsState(updatedTabs, splitTab.id);
    }
  }, [openTabs, saveTabsState]);

  // ביטול בחירת כרטיסייה שנייה
  const cancelSelectSecondTab = useCallback(() => {
    const splitTab = openTabs.find(tab => tab.type === 'split' && tab.isSelectingLeft);
    
    if (splitTab) {
      const newTabs = openTabs.filter(tab => tab.id !== splitTab.id);
      setOpenTabs(newTabs);
      
      if (newTabs.length > 0) {
        const newActiveId = newTabs[newTabs.length - 1].id;
        setActiveTabId(newActiveId);
        saveTabsState(newTabs, newActiveId);
      }
    }
  }, [openTabs, saveTabsState]);

  // החלפת צדדים בתצוגה מפוצלת
  const reverseSplitView = useCallback((tabId) => {
    const updatedTabs = openTabs.map(tab => 
      tab.id === tabId && tab.type === 'split'
        ? {
            ...tab,
            leftTab: tab.rightTab,
            rightTab: tab.leftTab,
            name: `${tab.rightTab.name} | ${tab.leftTab.name}`
          }
        : tab
    );
    setOpenTabs(updatedTabs);
    saveTabsState(updatedTabs, activeTabId);
  }, [openTabs, activeTabId, saveTabsState]);

  // סגירת צד שמאל
  const closeLeftView = useCallback((tabId) => {
    const updatedTabs = openTabs.map(tab => 
      tab.id === tabId && tab.type === 'split'
        ? { ...tab.rightTab }
        : tab
    );
    setOpenTabs(updatedTabs);
    saveTabsState(updatedTabs, activeTabId);
  }, [openTabs, activeTabId, saveTabsState]);

  // סגירת צד ימין
  const closeRightView = useCallback((tabId) => {
    const updatedTabs = openTabs.map(tab => 
      tab.id === tabId && tab.type === 'split'
        ? { ...tab.leftTab }
        : tab
    );
    setOpenTabs(updatedTabs);
    saveTabsState(updatedTabs, activeTabId);
  }, [openTabs, activeTabId, saveTabsState]);

  // הפרדת התצוגות
  const separateViews = useCallback((tabId) => {
    const splitTabIndex = openTabs.findIndex(tab => tab.id === tabId);
    const splitTab = openTabs[splitTabIndex];
    
    if (splitTabIndex !== -1 && splitTab?.type === 'split') {
      const newTabs = [
        ...openTabs.slice(0, splitTabIndex),
        splitTab.leftTab,
        splitTab.rightTab,
        ...openTabs.slice(splitTabIndex + 1)
      ];
      setOpenTabs(newTabs);
      setActiveTabId(splitTab.leftTab.id);
      saveTabsState(newTabs, splitTab.leftTab.id);
    }
  }, [openTabs, saveTabsState]);

  // עדכון יחס הפיצול
  const updateSplitRatio = useCallback((tabId, newRatio) => {
    const updatedTabs = openTabs.map(tab => 
      tab.id === tabId && tab.type === 'split'
        ? { ...tab, splitRatio: newRatio }
        : tab
    );
    setOpenTabs(updatedTabs);
  }, [openTabs]);

  // עדכון מספר הכרטיסיות ל-CSS
  useEffect(() => {
    const container = document.querySelector('.tabs-container');
    if (container) {
      container.style.setProperty('--tab-count', openTabs.length);
    }
  }, [openTabs.length]);

  return {
    // State
    openTabs,
    activeTabId,
    draggedTab,
    dragOverTab,
    showTabsDialog,
    
    // Setters
    setOpenTabs,
    setActiveTabId,
    setShowTabsDialog,
    
    // Actions
    openTab,
    closeTab,
    duplicateTab,
    closeOtherTabs,
    closeTabsToRight,
    closeTabsToLeft,
    reloadTab,
    updateTab,
    
    // Drag & Drop
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    
    // Split View
    addToSplitView,
    selectSecondTabForSplit,
    cancelSelectSecondTab,
    reverseSplitView,
    closeLeftView,
    closeRightView,
    separateViews,
    updateSplitRatio,
    
    // Utils
    saveTabsState,
    loadTabsState,
  };
}
