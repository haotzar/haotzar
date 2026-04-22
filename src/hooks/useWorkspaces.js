import { useState, useCallback } from 'react';
import { getSetting, updateSetting } from '../utils/settingsManager';

/**
 * Hook לניהול שולחנות עבודה
 * מנהל יצירה, מחיקה, שינוי שם ומעבר בין שולחנות עבודה
 */
export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState(() => 
    getSetting('workspaces', [
      { id: 'default', name: 'ברירת מחדל', tabs: [] }
    ])
  );
  
  const [currentWorkspace, setCurrentWorkspace] = useState(() => 
    getSetting('currentWorkspace', 'default')
  );

  // יצירת שולחן עבודה חדש
  const createWorkspace = useCallback((name) => {
    const newWorkspace = {
      id: `workspace-${Date.now()}`,
      name,
      tabs: []
    };
    const updated = [...workspaces, newWorkspace];
    setWorkspaces(updated);
    updateSetting('workspaces', updated);
    return newWorkspace.id;
  }, [workspaces]);

  // מחיקת שולחן עבודה
  const deleteWorkspace = useCallback((id, openTabs, setOpenTabs, setActiveTabId) => {
    if (id === 'default') return; // לא למחוק את ברירת המחדל
    
    const updated = workspaces.filter(w => w.id !== id);
    setWorkspaces(updated);
    updateSetting('workspaces', updated);
    
    // אם מחקנו את שולחן העבודה הנוכחי, עבור לברירת מחדל
    if (currentWorkspace === id) {
      setCurrentWorkspace('default');
      updateSetting('currentWorkspace', 'default');
      
      // טען את הכרטיסיות של ברירת המחדל
      const defaultWorkspace = updated.find(w => w.id === 'default');
      if (defaultWorkspace) {
        setOpenTabs(defaultWorkspace.tabs);
        setActiveTabId(defaultWorkspace.tabs.length > 0 ? defaultWorkspace.tabs[0].id : null);
      }
    }
  }, [workspaces, currentWorkspace]);

  // שינוי שם שולחן עבודה
  const renameWorkspace = useCallback((id, newName) => {
    const updated = workspaces.map(w => 
      w.id === id ? { ...w, name: newName } : w
    );
    setWorkspaces(updated);
    updateSetting('workspaces', updated);
  }, [workspaces]);

  // מעבר לשולחן עבודה אחר
  const selectWorkspace = useCallback((id, openTabs, setOpenTabs, setActiveTabId) => {
    // שמור את הכרטיסיות הנוכחיות בשולחן העבודה הנוכחי
    const updated = workspaces.map(w => 
      w.id === currentWorkspace ? { ...w, tabs: openTabs } : w
    );
    setWorkspaces(updated);
    updateSetting('workspaces', updated);
    
    // עבור לשולחן העבודה החדש
    setCurrentWorkspace(id);
    updateSetting('currentWorkspace', id);
    
    // טען את הכרטיסיות של שולחן העבודה החדש
    const workspace = updated.find(w => w.id === id);
    if (workspace) {
      setOpenTabs(workspace.tabs);
      setActiveTabId(workspace.tabs.length > 0 ? workspace.tabs[0].id : null);
    }
  }, [workspaces, currentWorkspace]);

  // עדכון כרטיסיות של שולחן עבודה
  const updateWorkspaceTabs = useCallback((workspaceId, tabs) => {
    const updated = workspaces.map(w => 
      w.id === workspaceId ? { ...w, tabs } : w
    );
    setWorkspaces(updated);
    updateSetting('workspaces', updated);
  }, [workspaces]);

  return {
    workspaces,
    currentWorkspace,
    setWorkspaces,
    setCurrentWorkspace,
    createWorkspace,
    deleteWorkspace,
    renameWorkspace,
    selectWorkspace,
    updateWorkspaceTabs,
  };
}
