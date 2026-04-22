import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  Button,
  Text,
} from '@fluentui/react-components';
import {
  DocumentRegular,
  DocumentTextRegular,
  SettingsRegular,
  SearchRegular,
  CopyRegular,
  ArrowDownloadRegular,
  PrintRegular,
  DeleteRegular,
  HomeRegular,
  BookRegular,
  CalendarRegular,
  WrenchRegular,
  LibraryRegular,
  PinRegular,
  PinOffRegular,
  SquareRegular,
  SquareMultipleRegular,
  ArrowClockwiseRegular,
  HistoryRegular,
} from '@fluentui/react-icons';
import { useState, useEffect, useRef } from 'react';

// Components
import TextViewer from './TextViewer';
import PDFViewer from './PDFViewer';
import Settings from './Settings';
import SearchPage from './SearchPage';
import LibraryHome from './components/LibraryHome';
import SearchAutocomplete from './components/SearchAutocomplete';
import MetadataTableEditor from './components/MetadataTableEditor';
import ToolsPage from './components/ToolsPage';
import LibrarySidebar from './components/LibrarySidebar';
import HistoryTab from './components/HistoryTab';
import TooltipWrapper from './components/TooltipWrapper';
import CustomAlert from './components/CustomAlert';
import CustomConfirm from './components/CustomConfirm';

// Hooks
import { useTabsManager, useWorkspaces, useSearch, useBooks, useContextMenu } from './hooks';

// Utils
import { updateSetting, getSetting } from './utils/settingsManager';
import otzariaDB from './utils/otzariaDB';
import { clearOtzariaTreeCache } from './utils/otzariaIntegration';
import searchEngine from './utils/searchEngine';
import meilisearchEngine from './utils/meilisearchEngine';
import booksMetadata from './utils/booksMetadata';
import searchIndex from './utils/searchIndex';
import customConfirm from './utils/customConfirm';
import './utils/meilisearchTest';
import './utils/devtools';
import './App.css';

// ערכת צבעים מותאמת אישית
const customLightTheme = {
  ...webLightTheme,
  colorBrandBackground: "#5c3d2e",
  colorBrandBackgroundHover: "#4a3124",
  colorBrandBackgroundPressed: "#3d2817",
  colorBrandBackgroundSelected: "#5c3d2e",
  colorBrandForeground1: "#5c3d2e",
  colorBrandForeground2: "#4a3124",
  colorBrandStroke1: "#5c3d2e",
  colorBrandStroke2: "#8b6f47",
};

const customDarkTheme = {
  ...webDarkTheme,
  colorBrandBackground: "#8b6f47",
  colorBrandBackgroundHover: "#a68a5c",
  colorBrandBackgroundPressed: "#c4a574",
  colorBrandBackgroundSelected: "#8b6f47",
  colorBrandForeground1: "#c4a574",
  colorBrandForeground2: "#a68a5c",
  colorBrandStroke1: "#8b6f47",
  colorBrandStroke2: "#a68a5c",
};

function App() {
  // Theme state
  const [isDark, setIsDark] = useState(() => getSetting('theme', 'light') === 'dark');
  const [currentView, setCurrentView] = useState('books');
  const [selectedTool, setSelectedTool] = useState('calendar');
  const [customBooksPath, setCustomBooksPath] = useState(() => getSetting('customBooksPath', null));
  const isTypingRef = useRef(false);
  const abbrDictionaryRef = useRef(null);
  const [abbrDictionaryReady, setAbbrDictionaryReady] = useState(false);

  // Custom Hooks
  const workspaceManager = useWorkspaces();
  const booksManager = useBooks();
  const searchManager = useSearch(booksManager.allFiles);
  const contextMenuManager = useContextMenu();
  
  const tabsManager = useTabsManager(
    workspaceManager.workspaces,
    workspaceManager.currentWorkspace
  );

  // הגדרת data-theme ראשונית
  useEffect(() => {
    const initialTheme = getSetting('theme', 'light');
    document.documentElement.setAttribute('data-theme', initialTheme);
    
    const savedColor = getSetting('accentColor', '#5c3d2e');
    const root = document.documentElement;
    root.style.setProperty('--colorBrandBackground', savedColor);
    root.style.setProperty('--colorBrandBackgroundHover', savedColor);
    root.style.setProperty('--colorBrandBackgroundPressed', savedColor);
    root.style.setProperty('--colorBrandBackgroundSelected', savedColor);
    root.style.setProperty('--colorBrandForeground1', savedColor);
    root.style.setProperty('--colorBrandForeground2', savedColor);
    root.style.setProperty('--colorBrandStroke1', savedColor);
    root.style.setProperty('--colorBrandStroke2', savedColor);
    
    const savedBackgroundMode = getSetting('backgroundMode', 'none');
    if (savedBackgroundMode === 'none') {
      root.style.setProperty('--show-background-image', 'none');
      root.style.setProperty('--appBackgroundColor', '#ffffff');
      root.style.setProperty('--appBackgroundColorSecondary', '#f5f5f5');
      document.body.classList.remove('with-background');
    } else {
      root.style.setProperty('--show-background-image', 'block');
      root.style.setProperty('--appBackgroundColor', '#f7ead8');
      root.style.setProperty('--appBackgroundColorSecondary', '#f0e3d0');
      document.body.classList.add('with-background');
    }
  }, []);

  // שמירת ערכת הצבעים
  useEffect(() => {
    updateSetting('theme', isDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // שמירת מצב סרגל הספרייה
  useEffect(() => {
    localStorage.setItem('library_sidebarOpen', booksManager.isLibrarySidebarOpen);
  }, [booksManager.isLibrarySidebarOpen]);

  // הסרת מסך טעינה
  useEffect(() => {
    const hasContent = booksManager.allFiles.length > 0 || tabsManager.openTabs.length > 0;
    const delay = hasContent ? 100 : 2000;
    
    const timer = setTimeout(() => {
      document.body.classList.add('loaded');
      setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
          loadingScreen.remove();
        }
      }, 300);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [booksManager.allFiles, tabsManager.openTabs]);

  // סגור תצוגה מקדימה כשעוברים לדף אחר
  useEffect(() => {
    if (currentView !== 'books' && booksManager.folderPreview) {
      booksManager.closeFolderPreview();
    }
  }, [currentView, booksManager]);

  // פתיחת קובץ/ספר
  const handleFileClick = async (file, searchContext = null) => {
    console.log('🔍 handleFileClick:', { 
      fileName: file.name, 
      fileType: file.type,
      bookId: file.bookId,
      hasContext: !!searchContext 
    });
    
    if (searchContext) {
      console.log('📋 searchContext מלא:', JSON.stringify(searchContext, null, 2));
    }

    // סגור תצוגה מקדימה
    if (booksManager.folderPreview) {
      booksManager.closeFolderPreview();
    }
    
    setCurrentView('books');
    
    const result = await tabsManager.openTab(
      { ...file, searchContext },
      { replaceSearchTab: searchContext?.replaceSearchTab }
    );
    
    if (result?.createWorkspace) {
      const workspaceNumbers = workspaceManager.workspaces
        .map(w => {
          const match = w.name.match(/^שולחן עבודה (\d+)$/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(n => n > 0);
      
      const nextNumber = workspaceNumbers.length > 0 ? Math.max(...workspaceNumbers) + 1 : 1;
      const name = `שולחן עבודה ${nextNumber}`;
      workspaceManager.createWorkspace(name);
      return;
    }

    if (!result?.cancelled) {
      booksManager.updateRecentBooks(file);
    }
  };

  // פתיחת כרטיסיית חיפוש חדשה
  const handleNewSearchTab = async () => {
    if (booksManager.folderPreview) {
      booksManager.closeFolderPreview();
    }

    setCurrentView('books');

    const searchTabId = `search-tab-${Date.now()}`;
    const searchTab = {
      id: searchTabId,
      name: 'חיפוש',
      type: 'search',
      searchQuery: '',
      searchResults: []
    };
    
    const result = await tabsManager.openTab(searchTab);
    
    if (result?.createWorkspace) {
      const workspaceNumbers = workspaceManager.workspaces
        .map(w => {
          const match = w.name.match(/^שולחן עבודה (\d+)$/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(n => n > 0);
      
      const nextNumber = workspaceNumbers.length > 0 ? Math.max(...workspaceNumbers) + 1 : 1;
      const name = `שולחן עבודה ${nextNumber}`;
      workspaceManager.createWorkspace(name);
    }
  };

  // פתיחת כרטיסיית היסטוריה
  const openHistoryTab = () => {
    if (booksManager.folderPreview) {
      booksManager.closeFolderPreview();
    }

    setCurrentView('books');

    const existingHistoryTab = tabsManager.openTabs.find(tab => tab.type === 'history');
    if (existingHistoryTab) {
      tabsManager.setActiveTabId(existingHistoryTab.id);
      return;
    }

    const historyTabId = `history-tab-${Date.now()}`;
    const historyTab = {
      id: historyTabId,
      name: 'היסטוריה',
      type: 'history'
    };
    
    tabsManager.openTab(historyTab);
  };

  // פעולות תפריט הקשר
  const handleCopyFileName = () => {
    if (contextMenuManager.contextMenuTarget) {
      navigator.clipboard.writeText(contextMenuManager.contextMenuTarget.name);
    }
    contextMenuManager.closeContextMenu();
  };

  const handleDownloadFile = () => {
    if (contextMenuManager.contextMenuTarget) {
      const link = document.createElement('a');
      link.href = contextMenuManager.contextMenuTarget.path;
      link.download = contextMenuManager.contextMenuTarget.name + '.pdf';
      link.click();
    }
    contextMenuManager.closeContextMenu();
  };

  const handlePrintFile = () => {
    if (contextMenuManager.contextMenuTarget) {
      window.open(contextMenuManager.contextMenuTarget.path, '_blank');
    }
    contextMenuManager.closeContextMenu();
  };

  const handleOpenTool = (toolName) => {
    setSelectedTool(toolName);
    setCurrentView('tools');
  };

  const handleCloseTab = (tabId, e) => {
    e.stopPropagation();
    tabsManager.closeTab(tabId);
  };

  // קיצורי מקלדת גלובליים
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInputField = e.target.tagName === 'INPUT' || 
                          e.target.tagName === 'TEXTAREA' || 
                          e.target.isContentEditable;
      
      const isOurShortcut = e.ctrlKey && (
        e.key.toLowerCase() === 'h' ||
        e.key.toLowerCase() === 't' ||
        e.key.toLowerCase() === 'w'
      );
      
      if (isOurShortcut && !isInputField) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      } else {
        return;
      }
      
      // Ctrl+H - היסטוריה
      if (e.key.toLowerCase() === 'h') {
        openHistoryTab();
      }
      
      // Ctrl+T - כרטיסייה חדשה
      if (e.key.toLowerCase() === 't') {
        handleNewSearchTab();
      }
      
      // Ctrl+W - סגירת כרטיסייה
      if (e.key.toLowerCase() === 'w' && tabsManager.activeTabId) {
        tabsManager.closeTab(tabsManager.activeTabId);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tabsManager.activeTabId, tabsManager.openTabs]);

  return (
    <FluentProvider theme={isDark ? customDarkTheme : customLightTheme}>
      <div className="app-layout">
        {/* TODO: הוסף את כל ה-JSX מהקובץ המקורי כאן */}
        <div>App Refactored - Work in Progress</div>
        
        <CustomAlert />
        <CustomConfirm />
      </div>
    </FluentProvider>
  );
}

export default App;
