
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  Button,
  Text,
  MenuDivider,
  Card,
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
  BookOpenRegular,
  CalendarRegular,
  WrenchRegular,
  DismissRegular,
  LibraryRegular,
  PinRegular,
  PinOffRegular,
  SubtractRegular,
  SquareRegular,
  SquareMultipleRegular,
  ArrowClockwiseRegular,
  ChevronDownRegular,
  HistoryRegular,
} from '@fluentui/react-icons';
import { useState, useEffect, useRef } from 'react';

// Tauri API - ייבוא דינמי במקום גישה ישירה
// השתמש ב-dynamic imports או platform.js בכל מקום שצריך invoke
// לא צריך להגדיר invoke גלובלי - זה יגרום לבעיות

import TextViewer from './TextViewer';
import PDFViewer from './PDFViewer';
import Settings from './Settings';
import SearchResults from './SearchResults';
import SearchPage from './SearchPage';
import LibraryHome from './components/LibraryHome';
import SearchAutocomplete from './components/SearchAutocomplete';
import MetadataTableEditor from './components/MetadataTableEditor';
import ToolsPage from './components/ToolsPage';
import LibrarySidebar from './components/LibrarySidebar';
import FileTree from './components/FileTree';
import BookPreview from './components/BookPreview';
import FolderPreview from './components/FolderPreview';
import HistoryTab from './components/HistoryTab';
import { loadSettings, saveSettings, updateSetting, getSetting } from './utils/settingsManager';
import otzariaDB from './utils/otzariaDB';
import { buildOtzariaVirtualTree, searchOtzariaBooks, clearOtzariaTreeCache } from './utils/otzariaIntegration';
import searchEngine from './utils/searchEngine';
import meilisearchEngine from './utils/meilisearchEngine';
import booksMetadata from './utils/booksMetadata';
import { autoConvertSearch } from './utils/hebrewConverter';
import searchIndex from './utils/searchIndex';
import './utils/meilisearchTest'; // טוען פונקציות בדיקה ל-window.testMeilisearch
import './utils/devtools'; // טוען כלי דיבוג ל-window.devtools
import CustomAlert from './components/CustomAlert';
import CustomConfirm from './components/CustomConfirm';
import customConfirm from './utils/customConfirm';
import './App.css';

// ערכת צבעים מותאמת אישית - חום-שחור
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
  const [isDark, setIsDark] = useState(() => getSetting('theme', 'light') === 'dark');
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [allFiles, setAllFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState(''); // חיפוש בדף החיפוש
  const [headerSearchQuery, setHeaderSearchQuery] = useState(''); // חיפוש בסרגל העליון
  const [showHeaderAutocomplete, setShowHeaderAutocomplete] = useState(false);
  const [headerSuggestions, setHeaderSuggestions] = useState([]);
  const isTypingRef = useRef(false); // עוקב אחרי האם המשתמש מקליד
  const abbrDictionaryRef = useRef(null);
  const [abbrDictionaryReady, setAbbrDictionaryReady] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMenuTarget, setContextMenuTarget] = useState(null);
  const [currentView, setCurrentView] = useState(() => {
    // תמיד התחל בתצוגת ספרים - אם אין כרטיסיות, נפתח כרטיסיית חיפוש
    return 'books';
  }); // 'books', 'home', 'tools', 'settings', 'metadata'
  const [selectedTool, setSelectedTool] = useState('calendar'); // הכלי שנבחר בדף הכלים
  const [recentBooks, setRecentBooks] = useState(() => getSetting('recentBooks', []));
  const [customBooksPath, setCustomBooksPath] = useState(() => getSetting('customBooksPath', null));
  
  // מצב גרירת כרטיסיות
  const [draggedTab, setDraggedTab] = useState(null);
  const [dragOverTab, setDragOverTab] = useState(null);
  
  // שולחנות עבודה
  const [workspaces, setWorkspaces] = useState(() => getSetting('workspaces', [
    { id: 'default', name: 'ברירת מחדל', tabs: [] }
  ]));
  const [currentWorkspace, setCurrentWorkspace] = useState(() => getSetting('currentWorkspace', 'default'));
  
  // מצבי חיפוש מתקדם
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  
  // מצב סיידבר ספרייה - טוען מ-localStorage
  const [isLibrarySidebarOpen, setIsLibrarySidebarOpen] = useState(() => {
    const saved = localStorage.getItem('library_sidebarOpen');
    return saved === 'true';
  });
  
  // תצוגה מקדימה של תיקייה
  const [folderPreview, setFolderPreview] = useState(() => {
    const saved = localStorage.getItem('library_lastFolder');
    return saved ? JSON.parse(saved) : null;
  });
  
  // דיאלוג כרטיסיות פתוחות
  const [showTabsDialog, setShowTabsDialog] = useState(false);
  
  // Split View - תצוגה מפוצלת
  const [isSelectingSecondTab, setIsSelectingSecondTab] = useState(false);
  const [splitViewFirstTab, setSplitViewFirstTab] = useState(null);
  
  // ספרים מוצמדים
  const [pinnedBooks, setPinnedBooks] = useState(() => getSetting('pinnedBooks', []));

  // הגדרת data-theme ראשונית
  useEffect(() => {
    const initialTheme = getSetting('theme', 'light');
    document.documentElement.setAttribute('data-theme', initialTheme);
    
    // טעינת צבע הבסיס השמור
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
    
    // טעינת הגדרות רקע
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
    // הוספת data-theme לגוף המסמך
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // שמירת מצב סרגל הספרייה
  useEffect(() => {
    localStorage.setItem('library_sidebarOpen', isLibrarySidebarOpen);
  }, [isLibrarySidebarOpen]);

  // עדכון מספר הכרטיסיות ל-CSS
  useEffect(() => {
    const container = document.querySelector('.tabs-container');
    if (container) {
      container.style.setProperty('--tab-count', openTabs.length);
    }
  }, [openTabs.length]);

  // הסרת מסך טעינה כשהאפליקציה מוכנה
  useEffect(() => {
    // הסר את מסך הטעינה אחרי זמן קצוב או כשיש תוכן
    const hasContent = allFiles.length > 0 || openTabs.length > 0;
    
    // אם יש תוכן, הסר מיד. אם אין, המתן 2 שניות ואז הסר בכל מקרה
    const delay = hasContent ? 100 : 2000;
    
    const timer = setTimeout(() => {
      document.body.classList.add('loaded');
      // הסר את מסך הטעינה לגמרי אחרי האנימציה
      setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
          loadingScreen.remove();
        }
      }, 300);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [allFiles, openTabs]);

  // בדיקה אם צריך לפתוח אוצריא אחרי רענון
  useEffect(() => {
    const shouldOpenOtzaria = localStorage.getItem('openOtzariaAfterReload');
    
    if (shouldOpenOtzaria === 'true') {
      // נקה את הדגל
      localStorage.removeItem('openOtzariaAfterReload');
      
      // המתן שהאפליקציה תיטען לגמרי
      setTimeout(async () => {
        try {
          // טען את שורש אוצריא
          const { getOtzariaRootFolder } = await import('./utils/otzariaIntegration');
          const rootFolder = await getOtzariaRootFolder();
          
          if (rootFolder) {
            console.log('פותח את שורש אוצריא אחרי רענון');
            setFolderPreview(rootFolder);
            localStorage.setItem('library_lastFolder', JSON.stringify(rootFolder));
          }
        } catch (error) {
          console.error('שגיאה בפתיחת אוצריא אחרי רענון:', error);
        }
      }, 500);
    }
    // HebrewBooks מטופל ב-useEffect נפרד שתלוי ב-allFiles
  }, [allFiles]);

  // useEffect נפרד שמאזין לשינויים ב-allFiles ובודק את הדגל
  useEffect(() => {
    console.log('🔍 useEffect רץ - allFiles.length:', allFiles.length);
    
    const shouldOpenHebrewBooks = localStorage.getItem('openHebrewBooksAfterReload');
    console.log('🔍 shouldOpenHebrewBooks:', shouldOpenHebrewBooks);
    
    if (shouldOpenHebrewBooks === 'true') {
      console.log('✅ דגל קיים!');
      
      // המתן קצת כדי לוודא שהכל נטען
      setTimeout(() => {
        const hebrewBooksPath = localStorage.getItem('hebrewBooksPath');
        console.log('🔍 hebrewBooksPath:', hebrewBooksPath);
        
        if (!hebrewBooksPath) {
          console.error('❌ לא נמצא נתיב HebrewBooks');
          localStorage.removeItem('openHebrewBooksAfterReload');
          return;
        }
        
        // בדוק אם יש קבצים
        if (allFiles.length === 0) {
          console.warn('⚠️ אין קבצים עדיין - ממתין...');
          return; // לא מנקה את הדגל - ה-useEffect ירוץ שוב כשיהיו קבצים
        }
        
        console.log('✅ יש', allFiles.length, 'קבצים');
        
        const normalizedHebrewBooksPath = hebrewBooksPath.toLowerCase().replace(/\\/g, '/');
        const hebrewBooksFiles = allFiles.filter(file => {
          const normalizedFilePath = file.path.toLowerCase().replace(/\\/g, '/');
          return normalizedFilePath.includes(normalizedHebrewBooksPath);
        });
        
        console.log(`🔍 נמצאו ${hebrewBooksFiles.length} קבצים מ-HebrewBooks`);
        
        if (hebrewBooksFiles.length > 0) {
          const hebrewBooksFolder = {
            name: hebrewBooksPath.split(/[/\\]/).pop() || 'HebrewBooks',
            type: 'folder',
            path: hebrewBooksPath,
            isVirtual: false
          };
          
          console.log('✅ פותח תיקייה:', hebrewBooksFolder);
          
          // פתח את התיקייה
          setFolderPreview(hebrewBooksFolder);
          localStorage.setItem('library_lastFolder', JSON.stringify(hebrewBooksFolder));
          
          // נקה את הדגל
          localStorage.removeItem('openHebrewBooksAfterReload');
          console.log('✅ דגל נוקה');
        } else {
          console.warn('⚠️ לא נמצאו קבצים מ-HebrewBooks');
          // לא מנקה את הדגל - אולי הקבצים עדיין נסרקים
        }
      }, 500); // המתן 500ms
    }
  }, [allFiles, setFolderPreview]);

  // שמירת מצב הכרטיסיות לשולחן העבודה הנוכחי
  const saveTabsState = (tabs, activeId) => {
    try {
      // בדיקת תקינות
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
      setWorkspaces(updated);
      updateSetting('workspaces', updated);
      
      // שמור גם את הכרטיסייה הפעילה
      updateSetting('activeTabId', activeId);
    } catch (error) {
      console.error('Error in saveTabsState:', error);
    }
  };

  // טעינת מצב הכרטיסיות משולחן העבודה הנוכחי
  const loadTabsState = () => {
    const workspace = workspaces.find(w => w.id === currentWorkspace);
    if (workspace && workspace.tabs && workspace.tabs.length > 0) {
      return {
        openTabs: workspace.tabs,
        activeTabId: getSetting('activeTabId', null),
      };
    }
    return null;
  };

  // טעינת קבצים מתיקיית books (PDF וטקסט)
  useEffect(() => {
    const loadFiles = async () => {
      const startTime = performance.now();
      console.log('⏱️ התחלת טעינה:', new Date().toLocaleTimeString());
      
      try {
        // טעינת מטא-דאטה של ספרים - ברקע (לא הכרחי מיד)
        const LOAD_METADATA_IMMEDIATELY = false; // 🔧 false = מהיר יותר
        
        if (LOAD_METADATA_IMMEDIATELY) {
          const metadataStart = performance.now();
          console.log('📚 טוען מטא-דאטה של ספרים...');
          await booksMetadata.loadMetadata();
          console.log(`✅ מטא-דאטה נטענה ב-${(performance.now() - metadataStart).toFixed(0)}ms`);
        } else {
          console.log('📚 מטא-דאטה תיטען ברקע...');
          // טען ברקע ללא המתנה
          booksMetadata.loadMetadata().then(() => {
            console.log('✅ מטא-דאטה נטענה ברקע');
          }).catch(error => {
            console.warn('⚠️ שגיאה בטעינת מטא-דאטה:', error);
          });
        }
        
        // בדיקה אם אנחנו ב-Electron או Tauri
        const isElectron = window.electron !== undefined;
        const isTauri = window.__TAURI__ !== undefined;
        const isDesktop = isElectron || isTauri;
        
        // פתיחת מסד נתונים של אוצריא (אם קיים) - ברקע
        const LOAD_OTZARIA_IMMEDIATELY = false; // 🔧 false = מהיר יותר
        
        if (isElectron || isTauri) {
          if (LOAD_OTZARIA_IMMEDIATELY) {
            try {
              const otzariaStart = performance.now();
              console.log('📖 מנסה לפתוח מסד נתונים של אוצריא...');
            
            // נקה את ה-cache של עץ האוצריא לפני פתיחה מחדש
            clearOtzariaTreeCache();
            
            // בדוק אם יש נתיב שמור ב-localStorage
            let otzariaPath = localStorage.getItem('otzariaDbPath');
            
            // אם אין, נסה את הנתיב הדיפולטיבי
            if (!otzariaPath) {
              if (isElectron) {
                otzariaPath = window.electron.joinPath(window.electron.getAppPath(), 'books', 'אוצריא', 'seforim.db');
              } else {
                // Tauri - השתמש ב-dynamic import
                try {
                  const { invoke } = await import('@tauri-apps/api/tauri');
                  otzariaPath = await invoke('get_otzaria_db_path');
                } catch (error) {
                  console.error('❌ שגיאה בקבלת נתיב אוצריא:', error);
                  otzariaPath = null;
                }
              }
            }
            
            console.log('📍 נתיב אוצריא:', otzariaPath);
            
            if (isElectron) {
              const exists = window.electron.fileExists(otzariaPath);
              console.log('🔍 הקובץ קיים?', exists);
              
              if (exists) {
                console.log('📂 פותח מסד נתונים אוצריא...');
                const opened = await otzariaDB.open(otzariaPath);
                
                // בדוק אם באמת נפתח - על ידי ניסיון לקרוא נתונים
                if (opened) {
                  try {
                    const stats = otzariaDB.getStats();
                    if (stats && stats.books > 0) {
                      console.log('✅ מסד נתונים אוצריא נפתח בהצלחה:', stats);
                    } else {
                      throw new Error('לא ניתן לקרוא נתונים מהמסד');
                    }
                  } catch (verifyError) {
                    console.error('❌ נכשל לפתוח את מסד הנתונים');
                    console.error('📋 שגיאה:', verifyError.message);
                    console.error('');
                    console.error('🔧 פתרון: הרץ את הפקודה הבאה בטרמינל:');
                    console.error('   npm rebuild better-sqlite3');
                    console.error('');
                    console.error('או:');
                    console.error('   npm install --force better-sqlite3');
                    console.error('');
                    
                    // הצג התראה למשתמש - רק אם באמת יש בעיה
                    setTimeout(async () => {
                      const shouldOpen = await customConfirm(
                        '⚠️ שגיאה בפתיחת מסד נתונים אוצריא\n\n' +
                        'better-sqlite3 צריך rebuild.\n\n' +
                        'הרץ בטרמינל:\n' +
                        'npm rebuild better-sqlite3\n\n' +
                        'האם לפתוח את התיעוד?',
                        { type: 'warning', title: 'שגיאה' }
                      );
                      if (shouldOpen) {
                        window.open('https://github.com/WiseLibs/better-sqlite3#installation', '_blank');
                      }
                    }, 2000);
                  }
                } else {
                  console.warn('⚠️ לא ניתן לפתוח את מסד הנתונים - ייתכן שהקובץ פגום');
                }
              } else {
                console.warn('⚠️ קובץ seforim.db לא נמצא ב:', otzariaPath);
                console.warn('💡 הנח את הקובץ ב: books/אוצריא/seforim.db');
                console.warn('💡 או בחר תיקייה דרך הממשק');
              }
            } else if (isTauri) {
              // ננסה לפתוח ב-Tauri
              const opened = await otzariaDB.open(otzariaPath);
              if (opened) {
                console.log('✅ מסד נתונים אוצריא נפתח (Tauri)');
              }
            }
            console.log(`✅ אוצריא הושלם ב-${(performance.now() - otzariaStart).toFixed(0)}ms`);
          } catch (error) {
            console.error('❌ שגיאה בפתיחת מסד נתונים אוצריא:', error);
            console.error('📋 פרטי שגיאה:', error.message);
            console.log(`⚠️ אוצריא נכשל אחרי ${(performance.now() - otzariaStart).toFixed(0)}ms`);
          }
        } else {
          // טען אוצריא ברקע
          console.log('📖 אוצריא ייטען ברקע...');
          
          (async () => {
            try {
              const otzariaStart = performance.now();
              
              // נקה את ה-cache של עץ האוצריא לפני פתיחה מחדש
              clearOtzariaTreeCache();
              
              // בדוק אם יש נתיב שמור ב-localStorage
              let otzariaPath = localStorage.getItem('otzariaDbPath');
              
              // אם אין, נסה את הנתיב הדיפולטיבי
              if (!otzariaPath) {
                if (isElectron) {
                  otzariaPath = window.electron.joinPath(window.electron.getAppPath(), 'books', 'אוצריא', 'seforim.db');
                } else {
                  // Tauri - השתמש ב-dynamic import
                  try {
                    const { invoke } = await import('@tauri-apps/api/tauri');
                    otzariaPath = await invoke('get_otzaria_db_path');
                  } catch (error) {
                    console.error('❌ שגיאה בקבלת נתיב אוצריא:', error);
                    return; // צא מה-async function
                  }
                }
              }
              
              if (isElectron) {
                const exists = window.electron.fileExists(otzariaPath);
                
                if (exists) {
                  const opened = await otzariaDB.open(otzariaPath);
                  if (opened) {
                    const stats = otzariaDB.getStats();
                    console.log(`✅ אוצריא נטען ברקע ב-${(performance.now() - otzariaStart).toFixed(0)}ms:`, stats);
                  }
                }
              } else if (isTauri) {
                const opened = await otzariaDB.open(otzariaPath);
                if (opened) {
                  console.log(`✅ אוצריא נטען ברקע (Tauri) ב-${(performance.now() - otzariaStart).toFixed(0)}ms`);
                }
              }
            } catch (error) {
              console.warn('⚠️ שגיאה בטעינת אוצריא ברקע:', error.message);
            }
          })();
        }
        }
        
        // בחר מנוע חיפוש
        const activeEngine = isDesktop ? meilisearchEngine : searchEngine;
        
        console.log('🔍 מזהה סביבה:', isElectron ? 'Electron' : isTauri ? 'Tauri' : 'Browser');
        console.log('🔧 מנוע חיפוש:', isDesktop ? 'Meilisearch' : 'FlexSearch');
        
        // הפעל Meilisearch באפליקציה דסקטופ - במקביל ללא המתנה!
        // הגדרה: שנה ל-false כדי להשבית Meilisearch לחלוטין
        const ENABLE_MEILISEARCH = true; // 🔧 true = מופעל ברקע, false = מושבת
        
        if (isDesktop && ENABLE_MEILISEARCH) {
          // הפעל ברקע ללא המתנה - לא חוסם את הטעינה!
          console.log('🚀 מפעיל Meilisearch ברקע (לא חוסם)...');
          
          // הפעל במקביל ללא await
          meilisearchEngine.startServer().then(started => {
            if (started) {
              console.log('✅ Meilisearch הופעל בהצלחה ברקע!');
            } else {
              console.warn('⚠️ Meilisearch לא הופעל - ממשיך עם FlexSearch');
            }
          }).catch(error => {
            console.error('❌ שגיאה בהפעלת Meilisearch ברקע:', error);
          });
          
          // ממשיך מיד לטעינת קבצים - לא ממתין!
        } else if (isDesktop && !ENABLE_MEILISEARCH) {
          console.log('ℹ️ Meilisearch מושבת - משתמש ב-FlexSearch');
        }
        
        // טעינת קבצים דרך Tauri או Electron
        if (isTauri) {
          // טעינת קבצים דרך Rust commands (עוקף בעיות scope)
          
          try {
            const scanStart = performance.now();
            console.log('📚 מנסה לטעון ספרים דרך Rust API...');
            
            // קבל את רשימת התיקיות מההגדרות
            const libraryFoldersSetting = getSetting('libraryFolders', ['books']);
            console.log('📚 Library folders from settings:', libraryFoldersSetting);
            
            // בנה רשימת נתיבים לסריקה
            const scanPaths = [];
            
            for (const folder of libraryFoldersSetting) {
              if (folder === 'books') {
                // תיקיית books ברירת המחדל - קבל את הנתיב המלא
                try {
                  const { invoke } = await import('@tauri-apps/api/tauri');
                  const booksPath = await invoke('get_books_path');
                  scanPaths.push(booksPath);
                  console.log('📁 תיקיית books:', booksPath);
                } catch (error) {
                  console.error('שגיאה בקבלת נתיב books:', error);
                }
              } else {
                // תיקייה מותאמת אישית - השתמש בנתיב כמו שהוא
                scanPaths.push(folder);
                console.log('📁 תיקייה מותאמת:', folder);
              }
            }

            console.log('📁 Total scan paths:', scanPaths);

            if (scanPaths.length === 0) {
              console.warn('⚠️ אין תיקיות מוגדרות לסריקה - ממשיך עם רשימה ריקה');
              // אל תציג alert - פשוט המשך עם רשימה ריקה
              // המשתמש יכול להוסיף תיקיות דרך ההגדרות
              setAllFiles([]);
              // המשך לטעון את האפליקציה גם בלי ספרים
              const savedState = loadTabsState();
              if (savedState && savedState.openTabs.length > 0) {
                setOpenTabs(savedState.openTabs);
                setActiveTabId(savedState.activeTabId);
              }
              return;
            }

            console.log('📁 סורק תיקיות:', scanPaths);
            try {
              const { invoke } = await import('@tauri-apps/api/tauri');
              const bookFiles = await invoke('scan_books_in_paths', { paths: scanPaths });
              console.log(`✅ נמצאו ${bookFiles.length} קבצים ב-${(performance.now() - scanStart).toFixed(0)}ms`);
              console.log('📋 First 5 files:', bookFiles.slice(0, 5));
            
              if (bookFiles.length === 0) {
                console.warn('⚠️ לא נמצאו ספרים');
                
                // אל תחזור - תן למשתמש לגשת להגדרות
                setAllFiles([]);
                // המשך לטעון את האפליקציה גם בלי ספרים
              }
              
              const pdfFiles = [];
              const textFiles = [];
              
              bookFiles.forEach((filePath, index) => {
                const fileName = filePath.split(/[/\\]/).pop();
                const lowerName = fileName.toLowerCase();
                
                if (lowerName.endsWith('.pdf')) {
                  pdfFiles.push({
                    id: `pdf-${index}`,
                    name: fileName.replace(/\.pdf$/i, ''),
                    path: filePath,
                    type: 'pdf',
                  });
                } else if (lowerName.endsWith('.txt')) {
                  textFiles.push({
                    id: `txt-${index}`,
                    name: fileName.replace(/\.txt$/i, ''),
                    path: filePath,
                    type: 'text',
                  });
                }
              });
              
              console.log('📊 PDF:', pdfFiles.length, 'TXT:', textFiles.length);
              
              if (pdfFiles.length === 0 && textFiles.length === 0) {
                console.warn('⚠️ לא נמצאו קבצי PDF או TXT');
                setAllFiles([]);
                // המשך לטעון את האפליקציה - תן למשתמש לגשת להגדרות
              } else {
                const allFiles = [...pdfFiles, ...textFiles];
                allFiles.sort((a, b) => a.name.localeCompare(b.name, 'he'));
                console.log('📚 Total files after processing:', allFiles.length);
                console.log('📚 Sample files:', allFiles.slice(0, 3).map(f => ({ name: f.name, path: f.path })));
                setAllFiles(allFiles);
                
                // בניית אינדקס חיפוש מהיר - אסינכרונית
                console.log('🔨 בונה אינדקס חיפוש...');
                searchIndex.buildIndex(allFiles).then(() => {
                  console.log('✅ אינדקס חיפוש הושלם');
                });
              }
              console.log('✅ setAllFiles called with', allFiles.length, 'files');
              
              // טעינת אינדקס קיים (האינדקס נבנה מראש) - רק אם צריך
              console.log('📋 בודק אם יש אינדקס חיפוש...');
              const activeEngine = isElectron && meilisearchEngine.isReady() 
                ? meilisearchEngine 
                : searchEngine;
              
              if (isElectron && meilisearchEngine.isReady()) {
                console.log('✅ Meilisearch מוכן לשימוש');
              } else {
                // טען אינדקס רק אם המשתמש מחפש
                console.log('ℹ️ אינדקס חיפוש יטען בעת הצורך');
              }
              
              if (allFiles.length > 0) {
                const savedState = loadTabsState();
                if (savedState && savedState.openTabs.length > 0) {
                  const validTabs = savedState.openTabs
                    .filter(savedTab => {
                      // אפשר כרטיסיות אוצריא (type === 'otzaria')
                      if (savedTab.type === 'otzaria') {
                        return true;
                      }
                      // אפשר כרטיסיות רגילות שקיימות ב-allFiles
                      return allFiles.some(file => file.id === savedTab.id);
                    })
                    .map(tab => {
                      // הסר סיומת קובץ משם הכרטיסייה אם קיימת
                      if (tab.name && tab.type !== 'search' && tab.type !== 'otzaria') {
                        return {
                          ...tab,
                          name: tab.name.replace(/\.(pdf|txt|html|docx?)$/i, '')
                        };
                      }
                      return tab;
                    });
                  if (validTabs.length > 0) {
                    setOpenTabs(validTabs);
                    const activeTabExists = validTabs.some(tab => tab.id === savedState.activeTabId);
                    setActiveTabId(activeTabExists ? savedState.activeTabId : validTabs[0].id);
                    return;
                  }
                }
                // אם אין כרטיסיות שמורות, אל תפתח כלום - תן למשתמש לבחור
                setOpenTabs([]);
                setActiveTabId(null);
                setCurrentView('books');
              } else {
                console.warn('לא נמצאו קבצי PDF או TXT');
              }
            } catch (error) {
              console.error('שגיאה בטעינת קבצים מ-Tauri:', error);
              console.error('פרטי השגיאה:', error.message);
              setAllFiles([]);
            }
        } else if (isElectron) {
          // Electron - טען מתיקיות מוגדרות
          try {
            const scanStart = performance.now();
            console.log('📚 טוען ספרים ב-Electron...');
            
            // קבל את רשימת התיקיות מההגדרות
            const libraryFoldersSetting = getSetting('libraryFolders', ['books']);
            console.log('📚 Library folders from settings:', libraryFoldersSetting);
            
            // בנה רשימת נתיבים לסריקה
            const scanPaths = [];
            
            for (const folder of libraryFoldersSetting) {
              if (folder === 'books') {
                // תיקיית books ברירת המחדל - קבל את הנתיב המלא
                const booksPath = window.electron.getBooksPath();
                scanPaths.push(booksPath);
                console.log('📁 תיקיית books:', booksPath);
              } else {
                // תיקייה מותאמת אישית - השתמש בנתיב כמו שהוא
                scanPaths.push(folder);
                console.log('📁 תיקייה מותאמת:', folder);
              }
            }

            console.log('📁 Total scan paths:', scanPaths);

            if (scanPaths.length === 0) {
              console.warn('⚠️ אין תיקיות מוגדרות לסריקה - ממשיך עם רשימה ריקה');
              // אל תציג alert - פשוט המשך עם רשימה ריקה
              // המשתמש יכול להוסיף תיקיות דרך ההגדרות
              setAllFiles([]);
              // המשך לטעון את האפליקציה גם בלי ספרים
              const savedState = loadTabsState();
              if (savedState && savedState.openTabs.length > 0) {
                setOpenTabs(savedState.openTabs);
                setActiveTabId(savedState.activeTabId);
              }
              return;
            }

            // בדוק אם יש cache של רשימת קבצים
            const ENABLE_FILES_CACHE = true; // 🔧 true = מהיר (cache), false = סריקה מלאה
            const cacheKey = 'filesCache_v1';
            const cacheTimeKey = 'filesCacheTime_v1';
            const CACHE_DURATION = 5 * 60 * 1000; // 5 דקות
            
            let bookFiles = [];
            let usedCache = false;
            
            if (ENABLE_FILES_CACHE) {
              try {
                const cachedFiles = localStorage.getItem(cacheKey);
                const cacheTime = localStorage.getItem(cacheTimeKey);
                
                if (cachedFiles && cacheTime) {
                  const age = Date.now() - parseInt(cacheTime);
                  if (age < CACHE_DURATION) {
                    bookFiles = JSON.parse(cachedFiles);
                    usedCache = true;
                    console.log(`📦 משתמש ב-cache (גיל: ${Math.round(age / 1000)}s, ${bookFiles.length} קבצים)`);
                    console.log(`✅ נמצאו ${bookFiles.length} קבצים ב-${(performance.now() - scanStart).toFixed(0)}ms (cache)`);
                    
                    // 🚀 סרוק ברקע לעדכון cache - לא חוסם!
                    console.log('🔄 מתחיל סריקה ברקע לעדכון cache...');
                    setTimeout(() => {
                      const bgScanStart = performance.now();
                      console.log('📁 סורק ברקע:', scanPaths);
                      
                      try {
                        const freshFiles = window.electron.scanBooksInPaths(scanPaths);
                        console.log(`✅ סריקה ברקע הושלמה ב-${(performance.now() - bgScanStart).toFixed(0)}ms (${freshFiles.length} קבצים)`);
                        
                        // עדכן cache
                        if (freshFiles.length > 0) {
                          localStorage.setItem(cacheKey, JSON.stringify(freshFiles));
                          localStorage.setItem(cacheTimeKey, Date.now().toString());
                          console.log('💾 Cache עודכן ברקע');
                          
                          // בדוק אם יש שינויים
                          if (freshFiles.length !== bookFiles.length) {
                            console.log(`📊 שינוי ברשימת קבצים: ${bookFiles.length} → ${freshFiles.length}`);
                            
                            // אופציונלי: עדכן את הרשימה בזמן אמת
                            // (כרגע לא עושים כלום - יעודכן בטעינה הבאה)
                          }
                        }
                      } catch (error) {
                        console.warn('⚠️ שגיאה בסריקה ברקע:', error);
                      }
                    }, 2000); // המתן 2 שניות אחרי הטעינה
                  } else {
                    console.log(`⏰ Cache פג תוקף (גיל: ${Math.round(age / 1000)}s) - סורק מחדש`);
                  }
                }
              } catch (error) {
                console.warn('⚠️ שגיאה בטעינת cache:', error);
              }
            }
            
            // אם אין cache או שהוא פג תוקף - סרוק
            if (bookFiles.length === 0) {
              console.log('📁 סורק תיקיות:', scanPaths);
              bookFiles = window.electron.scanBooksInPaths(scanPaths);
              console.log(`✅ נמצאו ${bookFiles.length} קבצים ב-${(performance.now() - scanStart).toFixed(0)}ms`);
              
              // בדוק אם יש תיקיית HebrewBooks נפרדת
              const hebrewBooksPath = localStorage.getItem('hebrewBooksPath');
              if (hebrewBooksPath && window.electron.fileExists(hebrewBooksPath)) {
                console.log('📁 סורק תיקיית HebrewBooks:', hebrewBooksPath);
                const hebrewBooksFiles = window.electron.scanBooksInPaths([hebrewBooksPath]);
                console.log(`✅ נמצאו ${hebrewBooksFiles.length} קבצים ב-HebrewBooks`);
                
                // הוסף את הקבצים לרשימה הכללית
                bookFiles = [...bookFiles, ...hebrewBooksFiles];
                console.log(`📚 סה"כ קבצים כולל HebrewBooks: ${bookFiles.length}`);
              }
              
              // שמור ב-cache
              if (ENABLE_FILES_CACHE && bookFiles.length > 0) {
                try {
                  localStorage.setItem(cacheKey, JSON.stringify(bookFiles));
                  localStorage.setItem(cacheTimeKey, Date.now().toString());
                  console.log('💾 רשימת קבצים נשמרה ב-cache');
                } catch (error) {
                  console.warn('⚠️ לא ניתן לשמור cache:', error);
                }
              }
            }
            
            if (bookFiles.length > 0 && !usedCache) {
              console.log('📋 First 10 files:', bookFiles.slice(0, 10));
              console.log('📋 Last 5 files:', bookFiles.slice(-5));
            }
            
            if (bookFiles.length === 0) {
              console.warn('⚠️ לא נמצאו ספרים');
              
              setAllFiles([]);
              return;
            }
            
            const pdfFiles = [];
            const textFiles = [];
            
            bookFiles.forEach((filePath, index) => {
              const fileName = filePath.split(/[/\\]/).pop();
              const lowerName = fileName.toLowerCase();
              
              if (lowerName.endsWith('.pdf')) {
                pdfFiles.push({
                  id: `pdf-${index}`,
                  name: fileName.replace(/\.pdf$/i, ''),
                  path: filePath,
                  type: 'pdf',
                });
              } else if (lowerName.endsWith('.txt')) {
                textFiles.push({
                  id: `txt-${index}`,
                  name: fileName.replace(/\.txt$/i, ''),
                  path: filePath,
                  type: 'text',
                });
              }
            });
            
            console.log('📊 PDF:', pdfFiles.length, 'TXT:', textFiles.length);
            
            if (pdfFiles.length === 0 && textFiles.length === 0) {
              console.warn('⚠️ לא נמצאו קבצי PDF או TXT');
              setAllFiles([]);
              return;
            }
            
            const allFiles = [...pdfFiles, ...textFiles];
            allFiles.sort((a, b) => a.name.localeCompare(b.name, 'he'));
            console.log('📚 Total files after processing:', allFiles.length);
            console.log('📚 Sample files:', allFiles.slice(0, 3).map(f => ({ name: f.name, path: f.path })));
            setAllFiles(allFiles);
            console.log('✅ setAllFiles called with', allFiles.length, 'files');
            
            // בניית אינדקס חיפוש מהיר - אסינכרונית
            console.log('🔨 בונה אינדקס חיפוש...');
            searchIndex.buildIndex(allFiles).then(() => {
              console.log('✅ אינדקס חיפוש הושלם');
            });
            
            // טעינת אינדקס קיים - רק אם צריך
            console.log('📋 בודק אם יש אינדקס חיפוש...');
            if (meilisearchEngine.isReady()) {
              console.log('✅ Meilisearch מוכן לשימוש');
            } else {
              // טען אינדקס רק אם המשתמש מחפש
              console.log('ℹ️ אינדקס חיפוש יטען בעת הצורך');
            }
            
            if (allFiles.length > 0) {
              const savedState = loadTabsState();
              if (savedState && savedState.openTabs.length > 0) {
                const validTabs = savedState.openTabs
                  .filter(savedTab => {
                    // אפשר כרטיסיות אוצריא (type === 'otzaria')
                    if (savedTab.type === 'otzaria') {
                      return true;
                    }
                    // אפשר כרטיסיות רגילות שקיימות ב-allFiles
                    return allFiles.some(file => file.id === savedTab.id);
                  })
                  .map(tab => {
                    // הסר סיומת קובץ משם הכרטיסייה אם קיימת
                    if (tab.name && tab.type !== 'search' && tab.type !== 'otzaria') {
                      return {
                        ...tab,
                        name: tab.name.replace(/\.(pdf|txt|html|docx?)$/i, '')
                      };
                    }
                    return tab;
                  });
                if (validTabs.length > 0) {
                  setOpenTabs(validTabs);
                  const activeTabExists = validTabs.some(tab => tab.id === savedState.activeTabId);
                  setActiveTabId(activeTabExists ? savedState.activeTabId : validTabs[0].id);
                  return;
                }
              }
              // אם אין כרטיסיות שמורות, אל תפתח כלום - תן למשתמש לבחור
              setOpenTabs([]);
              setActiveTabId(null);
              setCurrentView('books');
            }
          } catch (error) {
            console.error('שגיאה בטעינת קבצים ב-Electron:', error);
            setAllFiles([]);
          }
        } else {
          // במצב פיתוח - טען מתיקיית books הרגילה
          const pdfModules = import.meta.glob('/books/**/*.pdf', { eager: false });
          const pdfFiles = Object.keys(pdfModules).map((path, index) => {
            const fileName = path.split('/').pop();
            const nameWithoutExt = fileName.replace('.pdf', '');

            return {
              id: `pdf-${index}`,
              name: nameWithoutExt,
              path: path,
              type: 'pdf',
            };
          });

          const textModules = import.meta.glob('/books/**/*.txt', { eager: false });
          const textFiles = Object.keys(textModules).map((path, index) => {
            const fileName = path.split('/').pop();
            const nameWithoutExt = fileName.replace('.txt', '');

            return {
              id: `txt-${index}`,
              name: nameWithoutExt,
              path: path,
              type: 'text',
            };
          });

          const allFiles = [...pdfFiles, ...textFiles];
          allFiles.sort((a, b) => a.name.localeCompare(b.name, 'he'));

          setAllFiles(allFiles);
          
          // בניית אינדקס חיפוש מהיר - אסינכרונית
          console.log('🔨 בונה אינדקס חיפוש...');
          searchIndex.buildIndex(allFiles).then(() => {
            console.log('✅ אינדקס חיפוש הושלם');
          });

          // טעינת אינדקס קיים (האינדקס נבנה מראש) - רק אם צריך
          console.log('📋 בודק אם יש אינדקס חיפוש...');
          const activeEngine = isElectron && meilisearchEngine.isReady() 
            ? meilisearchEngine 
            : searchEngine;
          
          if (isElectron && meilisearchEngine.isReady()) {
            console.log('✅ Meilisearch מוכן לשימוש');
          } else {
            // טען אינדקס רק אם המשתמש מחפש
            console.log('ℹ️ אינדקס חיפוש יטען בעת הצורך');
          }

          const savedState = loadTabsState();
          if (savedState && savedState.openTabs.length > 0) {
            const validTabs = savedState.openTabs
              .filter(savedTab => {
                // אפשר כרטיסיות אוצריא (type === 'otzaria')
                if (savedTab.type === 'otzaria') {
                  return true;
                }
                // אפשר כרטיסיות רגילות שקיימות ב-allFiles
                return allFiles.some(file => file.id === savedTab.id);
              })
              .map(tab => {
                // הסר סיומת קובץ משם הכרטיסייה אם קיימת
                if (tab.name && tab.type !== 'search' && tab.type !== 'otzaria') {
                  return {
                    ...tab,
                    name: tab.name.replace(/\.(pdf|txt|html|docx?)$/i, '')
                  };
                }
                return tab;
              });

            if (validTabs.length > 0) {
              setOpenTabs(validTabs);
              const activeTabExists = validTabs.some(tab => tab.id === savedState.activeTabId);
              setActiveTabId(activeTabExists ? savedState.activeTabId : validTabs[0].id);
              return;
            }
          }

          // אם אין כרטיסיות שמורות, אל תפתח כלום - תן למשתמש לבחור
          setOpenTabs([]);
          setActiveTabId(null);
          setCurrentView('books');
        }
      } catch (error) {
        console.error('שגיאה בטעינת קבצים:', error);
      } finally {
        const totalTime = performance.now() - startTime;
        console.log('');
        console.log('═══════════════════════════════════════════');
        console.log('⏱️  סיכום זמני טעינה');
        console.log('═══════════════════════════════════════════');
        console.log(`🎯 זמן כולל: ${totalTime.toFixed(0)}ms (${(totalTime / 1000).toFixed(2)} שניות)`);
        console.log(`⏰ התחלה: ${new Date(startTime).toLocaleTimeString()}`);
        console.log(`⏰ סיום: ${new Date().toLocaleTimeString()}`);
        console.log('═══════════════════════════════════════════');
        console.log('');
      }
    };

    loadFiles();
  }, []);

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

    // סגור תצוגה מקדימה של תיקייה כשפותחים ספר/כרטיסייה
    if (folderPreview) {
      closeFolderPreview();
    }
    
    // עבור לתצוגת ספרים
    setCurrentView('books');
    
    // בדוק אם הכרטיסייה כבר פתוחה
    const existingTab = openTabs.find((tab) => tab.id === file.id);

    if (existingTab) {
      console.log('📑 Tab exists, checking if context changed...');
      // אם כבר פתוחה, עדכן את ההקשר רק אם יש context חדש ושונה
      if (searchContext) {
        // בדוק אם ה-context באמת השתנה
        const contextChanged = 
          !existingTab.searchContext ||
          existingTab.searchContext.searchQuery !== searchContext.searchQuery ||
          existingTab.searchContext.context?.pageNum !== searchContext.context?.pageNum ||
          existingTab.searchContext.context?.chunkId !== searchContext.context?.chunkId ||
          existingTab.searchContext.context?.lineIndex !== searchContext.context?.lineIndex;
        
        console.log('📑 Context changed:', contextChanged);
        
        if (contextChanged) {
          const updatedTabs = openTabs.map(tab => 
            tab.id === file.id 
              ? { ...tab, searchContext, _updateKey: Date.now() } // עדכן רק אם השתנה
              : tab
          );
          setOpenTabs(updatedTabs);
          saveTabsState(updatedTabs, file.id);
        }
      }
      setActiveTabId(file.id);
    } else {
      console.log('📑 Opening new tab');
      
      // בדוק אם יש יותר מ-9 כרטיסיות והצג התראה
      if (openTabs.length >= 9) {
        // בדוק אם המשתמש ביקש לא להציג שוב
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
          
          // שמור את ההעדפה אם המשתמש סימן "אל תציג שוב"
          if (result.dontShowAgain) {
            updateSetting('dontShowTabsWarning', true);
          }
          
          if (result.value === 'workspace') {
            // צור שולחן עבודה חדש
            const workspaceNumbers = workspaces
              .map(w => {
                const match = w.name.match(/^שולחן עבודה (\d+)$/);
                return match ? parseInt(match[1]) : 0;
              })
              .filter(n => n > 0);
            
            const nextNumber = workspaceNumbers.length > 0 ? Math.max(...workspaceNumbers) + 1 : 1;
            const name = `שולחן עבודה ${nextNumber}`;
            
            createWorkspace(name);
            return; // אל תפתח כרטיסייה חדשה
          } else if (result.value === 'cancel') {
            return; // אל תפתח כרטיסייה חדשה
          }
          // אם result.value === 'continue', המשך לפתוח כרטיסייה
        }
      }
      
      let newTabs;
      
      // הסר סיומת קובץ משם הכרטיסייה
      const displayName = file.name.replace(/\.(pdf|txt|html|docx?)$/i, '');
      
      // צור כרטיסייה חדשה עם הקשר החיפוש
      const newTab = searchContext 
        ? { ...file, name: displayName, searchContext, _updateKey: Date.now() }
        : { ...file, name: displayName };
      
      // אם צריך להחליף כרטיסיית חיפוש
      if (searchContext && searchContext.replaceSearchTab) {
        const searchTabIndex = openTabs.findIndex(tab => tab.type === 'search');
        if (searchTabIndex !== -1) {
          // החלף את כרטיסיית החיפוש
          newTabs = [...openTabs];
          newTabs[searchTabIndex] = newTab;
        } else {
          // אם אין כרטיסיית חיפוש, פשוט הוסף
          newTabs = [...openTabs, newTab];
        }
      } else {
        // אם לא, פתח כרטיסייה חדשה
        newTabs = [...openTabs, newTab];
      }
      
      setOpenTabs(newTabs);
      setActiveTabId(file.id);
      saveTabsState(newTabs, file.id);
    }

    // עדכן רשימת ספרים אחרונים
    updateRecentBooks(file);
  };

  // פתיחת כרטיסיית חיפוש חדשה
  const handleNewSearchTab = async () => {
    // סגור תצוגה מקדימה של תיקייה כשפותחים כרטיסייה חדשה
    if (folderPreview) {
      closeFolderPreview();
    }

    // עבור לתצוגת ספרים
    setCurrentView('books');

    // בדוק אם יש יותר מ-9 כרטיסיות והצג התראה
    if (openTabs.length >= 9) {
      // בדוק אם המשתמש ביקש לא להציג שוב
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
        
        // שמור את ההעדפה אם המשתמש סימן "אל תציג שוב"
        if (result.dontShowAgain) {
          updateSetting('dontShowTabsWarning', true);
        }
        
        if (result.value === 'workspace') {
          // צור שולחן עבודה חדש
          const workspaceNumbers = workspaces
            .map(w => {
              const match = w.name.match(/^שולחן עבודה (\d+)$/);
              return match ? parseInt(match[1]) : 0;
            })
            .filter(n => n > 0);
          
          const nextNumber = workspaceNumbers.length > 0 ? Math.max(...workspaceNumbers) + 1 : 1;
          const name = `שולחן עבודה ${nextNumber}`;
          
          createWorkspace(name);
          return; // אל תפתח כרטיסייה חדשה
        } else if (result.value === 'cancel') {
          return; // אל תפתח כרטיסייה חדשה
        }
        // אם result.value === 'continue', המשך לפתוח כרטיסייה
      }
    }

    // צור ID ייחודי לכל כרטיסיית חיפוש
    const searchTabId = `search-tab-${Date.now()}`;
    const searchTab = {
      id: searchTabId,
      name: 'חיפוש',
      type: 'search',
      searchQuery: '', // כל כרטיסייה עם query משלה
      searchResults: [] // כל כרטיסייה עם תוצאות משלה
    };
    
    // תמיד צור כרטיסייה חדשה
    const newTabs = [...openTabs, searchTab];
    setOpenTabs(newTabs);
    setActiveTabId(searchTabId);
    saveTabsState(newTabs, searchTabId);
  };

  // פתיחת כרטיסיית חיפוש חדשה עם טקסט חיפוש
  const openSearchTab = (searchText = '') => {
    // סגור תצוגה מקדימה של תיקייה אם פתוחה
    if (folderPreview) {
      closeFolderPreview();
    }

    // צור ID ייחודי לכל כרטיסיית חיפוש
    const searchTabId = `search-tab-${Date.now()}`;
    const searchTab = {
      id: searchTabId,
      name: searchText ? `חיפוש: ${searchText}` : 'חיפוש',
      type: 'search',
      searchQuery: searchText, // התחל עם טקסט החיפוש
      searchResults: []
    };
    
    // תמיד צור כרטיסייה חדשה
    const newTabs = [...openTabs, searchTab];
    setOpenTabs(newTabs);
    setActiveTabId(searchTabId);
    saveTabsState(newTabs, searchTabId);
  };

  // פתיחת כרטיסיית היסטוריה
  const openHistoryTab = () => {
    // סגור תצוגה מקדימה של תיקייה אם פתוחה
    if (folderPreview) {
      closeFolderPreview();
    }

    // עבור לתצוגת ספרים
    setCurrentView('books');

    // בדוק אם כבר יש כרטיסיית היסטוריה פתוחה
    const existingHistoryTab = openTabs.find(tab => tab.type === 'history');
    if (existingHistoryTab) {
      // אם כבר יש כרטיסייה - עבור אליה
      setActiveTabId(existingHistoryTab.id);
      return;
    }

    // צור כרטיסיית היסטוריה חדשה
    const historyTabId = `history-tab-${Date.now()}`;
    const historyTab = {
      id: historyTabId,
      name: 'היסטוריה',
      type: 'history'
    };
    
    const newTabs = [...openTabs, historyTab];
    setOpenTabs(newTabs);
    setActiveTabId(historyTabId);
    saveTabsState(newTabs, historyTabId);
  };

  // עדכון רשימת ספרים שנפתחו לאחרונה
  const updateRecentBooks = (file) => {
    const recent = [...recentBooks];
    // הסר את הספר אם הוא כבר ברשימה
    const filtered = recent.filter(book => book.id !== file.id);
    // הוסף את הספר בתחילת הרשימה עם תאריך פתיחה
    const bookWithTimestamp = {
      ...file,
      lastOpened: Date.now()
    };
    const updated = [bookWithTimestamp, ...filtered].slice(0, 100); // שמור 100 ספרים אחרונים
    setRecentBooks(updated);
    updateSetting('recentBooks', updated);
  };

  // ניהול שולחנות עבודה
  const createWorkspace = (name) => {
    const newWorkspace = {
      id: `workspace-${Date.now()}`,
      name,
      tabs: []
    };
    const updated = [...workspaces, newWorkspace];
    setWorkspaces(updated);
    updateSetting('workspaces', updated);
    return newWorkspace.id;
  };

  const deleteWorkspace = (id) => {
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
  };

  const renameWorkspace = (id, newName) => {
    const updated = workspaces.map(w => 
      w.id === id ? { ...w, name: newName } : w
    );
    setWorkspaces(updated);
    updateSetting('workspaces', updated);
  };

  const selectWorkspace = (id) => {
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
  };

  // פתיחת דף הכלים עם כלי ספציפי
  const handleOpenTool = (toolName) => {
    setSelectedTool(toolName);
    setCurrentView('tools');
  };

  const handleCloseTab = (tabId, e) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((tab) => tab.id !== tabId);
    setOpenTabs(newTabs);

    // אם סגרנו את הכרטיסייה הפעילה, עבור לכרטיסייה הקודמת
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

    // שמירת המצב החדש
    saveTabsState(newTabs, newActiveTabId);
  };

  // פונקציות גרירת כרטיסיות
  const handleDragStart = (e, tab) => {
    setDraggedTab(tab);
    e.dataTransfer.effectAllowed = 'move';
    // הוספת סגנון חזותי לכרטיסייה הנגררת
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedTab(null);
    setDragOverTab(null);
  };

  const handleDragOver = (e, tab) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedTab && draggedTab.id !== tab.id) {
      setDragOverTab(tab);
    }
  };

  const handleDragLeave = (e) => {
    // בדוק אם עזבנו את האלמנט לגמרי (לא רק עברנו לילד שלו)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverTab(null);
    }
  };

  const handleDrop = (e, targetTab) => {
    e.preventDefault();
    
    if (!draggedTab || draggedTab.id === targetTab.id) {
      return;
    }

    // מצא את האינדקסים
    const draggedIndex = openTabs.findIndex(tab => tab.id === draggedTab.id);
    const targetIndex = openTabs.findIndex(tab => tab.id === targetTab.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    // צור מערך חדש עם הסדר המעודכן
    const newTabs = [...openTabs];
    const [removed] = newTabs.splice(draggedIndex, 1);
    newTabs.splice(targetIndex, 0, removed);

    setOpenTabs(newTabs);
    saveTabsState(newTabs, activeTabId);
    setDragOverTab(null);
  };

  // פונקציה לנרמול טקסט - הסרת גרשיים, סימני ציטוט ואותיות שימוש
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .replace(/['"״׳''""]/g, '') // הסרת כל סוגי הגרשיים והמרכאות
      .replace(/''/g, '') // הסרת שתי גרשיים בודדות ('')
      // הסרת אותיות שימוש בתחילת מילים (ה, ו, ב, כ, ל, מ, ש)
      .replace(/(^|[\s])([הוכלמשב])(?=[א-ת])/g, '$1')
      .replace(/\s+/g, ' ') // מיזוג רווחים כפולים
      .trim();
  };

  const normalizeAbbrKey = (text) => {
    return normalizeText(text).replace(/\s/g, '');
  };

  const getAbbreviationExpansions = (rawInput) => {
    const dict = abbrDictionaryRef.current;
    if (!dict || !rawInput) return [];

    const key = normalizeAbbrKey(rawInput);
    const expansions = dict[key];
    if (!expansions || expansions.length === 0) return [];

    return expansions.slice(0, 8);
  };

  // טעינת מילון ראשי תיבות (טעינה עצלה מה-public)
  useEffect(() => {
    let cancelled = false;

    const loadAbbrDictionary = async () => {
      try {
        const res = await fetch('/abbr_merged.json');
        if (!res.ok) throw new Error(`Failed to load abbr_merged.json (${res.status})`);
        const raw = await res.json();

        const normalizedDict = {};
        Object.entries(raw || {}).forEach(([abbr, expansions]) => {
          const normKey = normalizeAbbrKey(abbr);
          if (!normKey) return;
          if (!normalizedDict[normKey]) normalizedDict[normKey] = [];

          (Array.isArray(expansions) ? expansions : []).forEach((exp) => {
            if (typeof exp === 'string' && exp.trim().length > 0) {
              normalizedDict[normKey].push(exp);
            }
          });
        });

        if (!cancelled) {
          abbrDictionaryRef.current = normalizedDict;
          setAbbrDictionaryReady(true);
        }
      } catch (e) {
        console.warn('⚠️ Failed to load abbreviation dictionary:', e);
        if (!cancelled) {
          abbrDictionaryRef.current = null;
          setAbbrDictionaryReady(false);
        }
      }
    };

    loadAbbrDictionary();

    return () => {
      cancelled = true;
    };
  }, []);

  // פונקציה לבדיקת התאמה לראשי תיבות - גמישה יותר
  // לא מסירה ה' הידיעה כדי לאפשר התאמה כמו "אהק" = "אבן האזל קנין"
  const matchesAcronym = (text, acronym) => {
    // נרמול מיוחד לראשי תיבות - ללא הסרת ה' הידיעה
    const normalizeForAcronym = (str) => {
      return str
        .toLowerCase()
        .replace(/['"״׳''""]/g, '')
        .replace(/''/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    const words = normalizeForAcronym(text).split(' ').filter(w => w.length > 0);
    const acronymChars = normalizeForAcronym(acronym).replace(/\s/g, '').split('');
    
    // אם אין מילים או אין אותיות, לא יכול להתאים
    if (words.length === 0 || acronymChars.length === 0) {
      return false;
    }
    
    // בדוק אם כל אות בראשי תיבות מתאימה לתחילת מילה
    // מותר לדלג על מילות קישור קצרות מסוימות (על, את, של, וכו')
    let wordIndex = 0;
    let matchedChars = 0;
    
    for (let i = 0; i < acronymChars.length; i++) {
      const char = acronymChars[i];
      let found = false;
      
      // חפש מילה שמתחילה באות הזו
      while (wordIndex < words.length) {
        const word = words[wordIndex];
        
        if (word.startsWith(char)) {
          // מצאנו התאמה!
          found = true;
          matchedChars++;
          wordIndex++; // עבור למילה הבאה
          break;
        } else {
          // בדוק אם זו מילת קישור שאפשר לדלג עליה
          // כולל ה' הידיעה בודדת
          const skippableWords = ['על', 'את', 'של', 'עם', 'אל', 'מן', 'ה'];
          const isSkippable = skippableWords.includes(word);
          
          if (isSkippable) {
            // דלג על מילת קישור והמשך לחפש
            wordIndex++;
            continue;
          } else {
            // מילה רגילה שלא מתאימה - עבור למילה הבאה
            wordIndex++;
          }
        }
      }
      
      // אם לא מצאנו התאמה לאות הזו, זה לא ראשי תיבות
      if (!found) {
        return false;
      }
    }
    
    // כל האותיות התאימו
    return matchedChars === acronymChars.length;
  };

  // פונקציה לבדיקת התאמה לפורמט 2+1 (שתי אותיות ראשונות + אות אחת)
  // לדוגמה: "שוע" = "שולחן ערוך" (שו + ע)
  const matchesTwoOneAcronym = (text, acronym) => {
    const normalizedAcronym = normalizeText(acronym).replace(/\s/g, '');
    
    // חייב להיות בדיוק 3 תווים
    if (normalizedAcronym.length !== 3) {
      return false;
    }
    
    const words = normalizeText(text).split(' ').filter(w => w.length > 0);
    
    // חייבות להיות לפחות 2 מילים
    if (words.length < 2) {
      return false;
    }
    
    const firstTwo = normalizedAcronym.substring(0, 2);
    const lastOne = normalizedAcronym.substring(2, 3);
    
    // המילה הראשונה חייבת להתחיל בשתי האותיות הראשונות
    // והמילה השנייה חייבת להתחיל באות השלישית
    return words[0].startsWith(firstTwo) && words[1].startsWith(lastOne);
  };

  // פונקציה לחישוב ציון התאמה לחיפוש - משופרת
  const calculateMatchScore = (fileName, query) => {
    const normalizedFile = normalizeText(fileName);
    const normalizedQuery = normalizeText(query);
    
    // נרמול ללא הסרת אותיות שימוש - לבדיקת התאמה מדויקת
    const fileWithoutPrefix = fileName.toLowerCase().replace(/['"״׳''""]/g, '');
    const queryWithoutPrefix = query.toLowerCase().replace(/['"״׳''""]/g, '');
    
    // פיצול לפי רווחים
    const fileWords = normalizedFile.split(' ').filter(w => w.length > 0);
    const queryWords = normalizedQuery.split(' ').filter(w => w.length > 0);
    
    // זיהוי חיפוש קצר (עד 4 תווים) - צריך יחס שונה
    const isShortQuery = normalizedQuery.length <= 4;
    
    let score = 0;
    
    // 1. התאמה מדויקת מלאה (ציון גבוה מאוד)
    if (normalizedFile === normalizedQuery) {
      score += 10000;
    }
    
    // 2. בונוס להתאמה ללא אותיות שימוש (העדפה לחיפוש נקי)
    if (fileWithoutPrefix.includes(queryWithoutPrefix)) {
      score += 500;
    }
    
    // 3. התאמה מדויקת בתחילת השם
    if (normalizedFile.startsWith(normalizedQuery)) {
      score += 800;
    }
    
    // 4. התאמה מדויקת של מילה שלמה
    if (fileWords.includes(normalizedQuery)) {
      score += 400;
    }
    
    // 5. התאמה של כל מילות החיפוש (גם עם מילים באמצע)
    // דרישה: כל מילת חיפוש חייבת להתאים לתחילת מילה או להופיע שלמה
    const allWordsMatch = queryWords.every(qWord => 
      fileWords.some(fWord => fWord.startsWith(qWord) || fWord.includes(qWord))
    );
    
    // בדיקה מחמירה יותר: כמה מילים באמת מתאימות בצורה משמעותית
    const meaningfulMatches = queryWords.filter(qWord => {
      // התאמה משמעותית = מילה שמתחילה בחיפוש או מכילה אותו כמילה שלמה
      return fileWords.some(fWord => 
        fWord.startsWith(qWord) || 
        fWord === qWord ||
        fWord.includes(' ' + qWord + ' ') ||
        fWord.includes(' ' + qWord) ||
        fWord.includes(qWord + ' ')
      );
    }).length;
    
    // דרישה: לפחות 70% מהמילים חייבות להתאים בצורה משמעותית
    // אבל לחיפוש קצר - הקל על הדרישה
    const meaningfulMatchRatio = meaningfulMatches / queryWords.length;
    const requiredRatio = isShortQuery ? 0.5 : 0.7; // חיפוש קצר - 50%, ארוך - 70%
    
    if (allWordsMatch && meaningfulMatchRatio >= requiredRatio) {
      score += 300;
      
      // בונוס אם המילים מופיעות ברצף
      const queryInFile = normalizedFile.includes(normalizedQuery);
      if (queryInFile) {
        score += 200;
      }
    } else if (meaningfulMatchRatio < 0.3 && !isShortQuery) {
      // אם פחות מ-30% מהמילים מתאימות בצורה משמעותית - קנס כבד (רק לחיפוש ארוך)
      score -= 500;
    }
    
    // 6. התאמה חלקית - כמה מילים מתאימות
    const matchingWords = queryWords.filter(qWord => 
      fileWords.some(fWord => fWord.includes(qWord))
    ).length;
    
    // ציון יחסי - התאם לאורך החיפוש
    if (isShortQuery) {
      // חיפוש קצר - פחות מחמיר
      if (matchingWords >= queryWords.length * 0.5) {
        score += matchingWords * 100;
      }
    } else {
      // חיפוש ארוך - יותר מחמיר
      if (matchingWords >= queryWords.length * 0.7) {
        score += matchingWords * 80;
      } else if (matchingWords >= queryWords.length * 0.5) {
        score += matchingWords * 40;
      } else {
        // קנס כבד על התאמה חלקית מדי
        score -= 200;
      }
    }
    
    // 7. בונוס למילה שמתחילה בחיפוש (חשוב מאוד!)
    const startsWithMatches = queryWords.filter(qWord => 
      fileWords.some(fWord => fWord.startsWith(qWord))
    ).length;
    
    score += startsWithMatches * 100; // בונוס גבוה למילים שמתחילות נכון
    
    // 8. התאמה לראשי תיבות (אם אין רווחים בחיפוש)
    if (!normalizedQuery.includes(' ') && normalizedQuery.length >= 2) {
      if (matchesAcronym(fileName, normalizedQuery)) {
        score += 250; // ציון בינוני-גבוה
      }
    }
    
    // 9. קנס על אורך השם (העדפה לשמות קצרים יותר) - מוגבר
    score -= normalizedFile.length * 1.5;
    
    // 10. קנס כבד על מילים שלא מתאימות (רעש) - אבל רק לחיפוש ארוך
    if (!isShortQuery) {
      const unmatchedWords = fileWords.length - matchingWords;
      score -= unmatchedWords * 30; // הוגבר מ-10 ל-30
    }
    
    // 11. קנס נוסף אם החיפוש קצר והקובץ ארוך (סימן לחוסר רלוונטיות) - רק לחיפוש ארוך
    if (!isShortQuery && normalizedQuery.length <= 4 && normalizedFile.length > 20) {
      score -= 100;
    }
    
    return Math.max(0, score); // ודא שהציון לא שלילי
  };

  // חיפוש בשמות קבצים להשלמה אוטומטית בסרגל העליון - עם אינדקס מהיר
  useEffect(() => {
    // הוסף debounce כדי למנוע חיפושים מיותרים
    const timeoutId = setTimeout(() => {
      if (headerSearchQuery && headerSearchQuery.length >= 1) {
        console.log('🔍 חיפוש מהיר באינדקס:', headerSearchQuery);
        
        const allResults = []; // מערך לכל התוצאות
        
        // 1. חיפוש באינדקס המהיר (קבצים מקומיים)
        const indexResults = searchIndex.searchAdvanced(headerSearchQuery, {
          maxResults: 50, // הגבלה ל-50 תוצאות
          includeAcronyms: true,
          includeToc: true,
          includePartialMatch: true
        });
        
        console.log(`📚 נמצאו ${indexResults.length} תוצאות באינדקס`);
        
        // הוסף מטא-דאטה לתוצאות מהאינדקס
        indexResults.forEach(file => {
          const metadata = booksMetadata.getBookByFileName(file.name);
          // הסר סיומת קובץ מהשם המוצג
          const displayName = file.name.replace(/\.(pdf|txt|html|docx?)$/i, '');
          allResults.push({
            ...file,
            name: displayName, // עדכן את השם ללא סיומת
            author: metadata?.author || file.author,
            metadata: metadata,
            source: 'local'
          });
        });
        
        // 2. חיפוש באוצריא (במקביל)
        if (otzariaDB.db) {
          console.log('📖 מחפש גם בספרי אוצריא...');
          try {
            const otzariaResults = searchOtzariaBooks(headerSearchQuery);
            console.log(`📖 נמצאו ${otzariaResults.length} תוצאות באוצריא`);
            
            // המר תוצאות אוצריא לפורמט אחיד
            otzariaResults.forEach(book => {
              allResults.push({
                id: `otzaria-${book.id}`,
                name: book.title + (book.volume ? ` - ${book.volume}` : ''),
                path: book.path || `otzaria://${book.id}`,
                type: 'otzaria',
                bookId: book.id,
                isVirtual: true,
                virtualType: 'otzaria-book',
                matchType: 'otzaria',
                matchScore: 75, // ציון בינוני לספרי אוצריא
                source: 'otzaria'
              });
            });
          } catch (error) {
            console.error('❌ שגיאה בחיפוש אוצריא:', error);
          }
        }
        
        // 3. מיון משולב לפי ציון (גבוה לנמוך)
        allResults.sort((a, b) => {
          const scoreA = a.matchScore || 50;
          const scoreB = b.matchScore || 50;
          return scoreB - scoreA;
        });
        
        // 4. הגבלה ל-50 תוצאות מהרשימה המשולבת
        const limitedResults = allResults.slice(0, 50);
        
        console.log(`✅ סה"כ ${limitedResults.length} תוצאות משולבות:`);
        console.log(`   📚 ${limitedResults.filter(r => r.source === 'local').length} ספרים מקומיים`);
        console.log(`   📖 ${limitedResults.filter(r => r.source === 'otzaria').length} ספרי אוצריא`);
        
        // 5. הצג תוצאות או הודעה מתאימה
        if (limitedResults.length > 0) {
          // הוסף פריט "חפש את..." בסוף הרשימה
          const resultsWithSearch = [
            ...limitedResults,
            {
              id: 'search-action',
              name: headerSearchQuery,
              type: 'search-action',
              matchType: 'search-action',
              isSearchAction: true
            }
          ];
          setHeaderSuggestions(resultsWithSearch);
          setShowHeaderAutocomplete(true);
        } else {
          // אין תוצאות - הצג רק את פריט החיפוש
          console.log('⚠️ לא נמצאו תוצאות עבור:', headerSearchQuery);
          
          setHeaderSuggestions([{
            id: 'search-action',
            name: headerSearchQuery,
            type: 'search-action',
            matchType: 'search-action',
            isSearchAction: true
          }]);
          setShowHeaderAutocomplete(true);
        }
        
      } else if (!headerSearchQuery || headerSearchQuery.length === 0) {
        // אם אין טקסט חיפוש בכלל, הצג ספרים אחרונים
        const recentWithMetadata = recentBooks.map(book => {
          const metadata = booksMetadata.getBookByFileName(book.name);
          // הסר סיומת קובץ מהשם המוצג
          const displayName = book.name.replace(/\.(pdf|txt|html|docx?)$/i, '');
          return {
            ...book,
            name: displayName, // עדכן את השם ללא סיומת
            author: metadata?.author || book.author,
            metadata: metadata
          };
        });
        setHeaderSuggestions(recentWithMetadata);
        // פתח את ההשלמה רק אם המשתמש מקליד או אם היא כבר פתוחה
        if (isTypingRef.current || showHeaderAutocomplete) {
          setShowHeaderAutocomplete(recentWithMetadata.length > 0);
        }
      } else {
        // פחות מ-1 תו - סגור את ההשלמה
        setHeaderSuggestions([]);
        setShowHeaderAutocomplete(false);
      }
    }, 200); // debounce של 200ms

    return () => clearTimeout(timeoutId);
  }, [headerSearchQuery, allFiles, recentBooks]);

  // סגירת השלמה אוטומטית בלחיצה מחוץ לתיבה
  useEffect(() => {
    const handleClickOutside = (e) => {
      // בדוק אם הלחיצה הייתה על תיבת החיפוש או על ההשלמה האוטומטית
      if (!e.target.closest('.header-search-container') && 
          !e.target.closest('.header-autocomplete-dropdown')) {
        setShowHeaderAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // פונקציה לסגירת ההשלמה האוטומטית מבחוץ
  const closeHeaderAutocomplete = () => {
    setShowHeaderAutocomplete(false);
  };

  const handleHeaderFileSelect = (file) => {
    setShowHeaderAutocomplete(false);
    
    // בדוק אם זה פעולת חיפוש
    if (file.isSearchAction) {
      // פתח כרטיסיית חיפוש חדשה עם הטקסט
      console.log('� פותח חיפוש עבור:', file.name);
      openSearchTab(file.name);
      setHeaderSearchQuery('');
      return;
    }
    
    setHeaderSearchQuery('');
    
    // בדוק אם יש כותרת לחיפוש
    if (file.matchType === 'book-with-title' && file.tocEntry) {
      // פתח את הספר עם המיקום המדויק מתוכן העניינים
      console.log('📖 פותח ספר עם כותרת:', file.name, '->', file.tocEntry.label);
      handleFileClick(file, {
        context: { pageNum: file.tocEntry.page },
        outlineSearch: file.tocEntry.label
      });
    } else if (file.matchType === 'book-only' && file.searchTitle) {
      // פתח את הספר עם חיפוש בתוכן העניינים של PDF
      console.log('📖 פותח ספר עם חיפוש בתוכן עניינים:', file.name, '->', file.searchTitle);
      handleFileClick(file, {
        outlineSearch: file.searchTitle
      });
    } else {
      // פתיחה רגילה
      handleFileClick(file);
    }
  };

  const handleHeaderKeyDown = (e) => {
    if (e.key === 'Enter' && showHeaderAutocomplete && headerSuggestions.length > 0) {
      handleHeaderFileSelect(headerSuggestions[0]);
    }
  };

  // סינון קבצים לפי חיפוש בדף החיפוש (לפי שם)
  const searchPageFilteredFiles = allFiles.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // חיפוש בתוכן הקבצים
  const handleContentSearch = async (query, advancedOptions = {}) => {
    // אם לא קיבלנו query, השתמש ב-searchQuery מה-state
    const effectiveQuery = query || searchQuery;
    
    console.log('🔍 handleContentSearch called with:', { query: effectiveQuery, advancedOptions });
    
    if (!effectiveQuery || effectiveQuery.trim().length === 0) {
      console.log('⚠️ Empty search query');
      return [];
    }
    
    try {
      // בחר מנוע חיפוש
      const isElectron = window.electron !== undefined;
      console.log('🔧 Environment:', { isElectron, meilisearchReady: meilisearchEngine.isReady() });
      
      const activeEngine = isElectron && meilisearchEngine.isReady() 
        ? meilisearchEngine 
        : searchEngine;
      
      console.log('🔧 Using engine:', activeEngine === meilisearchEngine ? 'Meilisearch' : 'FlexSearch');
      
      // טען אינדקס אם צריך (טעינה עצלה)
      if (activeEngine === searchEngine && !searchEngine.isReady()) {
        console.log('📋 טוען אינדקס FlexSearch...');
        const loaded = await searchEngine.loadIndexFromFile();
        if (!loaded) {
          console.warn('⚠️ לא נמצא אינדקס חיפוש - צריך לבנות אינדקס');
          setSearchResults([]);
          setIsSearching(false);
          return;
        }
        console.log('✅ אינדקס FlexSearch נטען');
      }
      
      // מיזוג אופציות ברירת מחדל עם אופציות מתקדמות
      const searchOptions = {
        maxResults: 500, // הגדלנו מ-100 ל-500 ספרים
        contextLength: 150,
        fullSpelling: advancedOptions.fullSpelling || false,
        partialWord: advancedOptions.partialWord || false,
        suffixes: advancedOptions.suffixes || false,
        prefixes: advancedOptions.prefixes || false,
        accuracy: advancedOptions.accuracy !== undefined ? advancedOptions.accuracy : 50, // רמת דיוק (0-100)
        specificBook: advancedOptions.specificBook || '', // חיפוש בספר ספציפי
        matchingStrategy: advancedOptions.matchingStrategy || 'last', // אסטרטגיית התאמה
        cropLength: advancedOptions.cropLength || 300, // אורך הקשר (מילים) - מקסימום 300
        selectedIndexes: advancedOptions.selectedIndexes || [] // אינדקסים נבחרים לחיפוש
      };
      
      console.log('📡 Calling search with:', { query: effectiveQuery, options: searchOptions });
      const results = await activeEngine.search(effectiveQuery, searchOptions);
      
      console.log(`✅ Got ${results.length} results from engine`);
      
      // תקן את התוצאות - מצא את הקבצים המקוריים מתוך allFiles
      const fixedResults = results.map(result => {
        const originalFile = allFiles.find(f => 
          f.name === result.file.name || 
          f.name === result.file.id ||
          f.id === result.file.id
        );
        
        if (originalFile) {
          return {
            ...result,
            file: originalFile
          };
        }
        
        // File not found in allFiles, but result is still valid
        return result;
      });
      
      console.log(`נמצאו ${fixedResults.length} קבצים עם התאמות`);
      return fixedResults;
    } catch (error) {
      console.error('❌ שגיאה בחיפוש:', error);
      return [];
    }
  };

  // חיפוש אוטומטי כשמשנים את השאילתה (חיפוש מאוחד) - הוסר!
  // החיפוש יתבצע רק בלחיצה על Enter

  // פתיחת תפריט הקשר
  const handleContextMenu = (e, target) => {
    e.preventDefault();
    
    // גודל התפריט (בערך)
    const menuWidth = 220;
    const menuHeight = 300; // גובה משוער
    
    // מיקום התפריט
    let x = e.clientX;
    let y = e.clientY;
    
    // בדיקה אם התפריט יוצא מהמסך מימין
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10; // 10px מרווח מהקצה
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
  };

  // סגירת תפריט הקשר
  const closeContextMenu = () => {
    setContextMenu(null);
    setContextMenuTarget(null);
  };

  // פעולות תפריט הקשר
  const handleCopyFileName = () => {
    if (contextMenuTarget) {
      navigator.clipboard.writeText(contextMenuTarget.name);
    }
    closeContextMenu();
  };

  const handleDownloadFile = () => {
    if (contextMenuTarget) {
      const link = document.createElement('a');
      link.href = contextMenuTarget.path;
      link.download = contextMenuTarget.name + '.pdf';
      link.click();
    }
    closeContextMenu();
  };

  const handlePrintFile = () => {
    if (contextMenuTarget) {
      window.open(contextMenuTarget.path, '_blank');
    }
    closeContextMenu();
  };

  const handleCloseTabFromMenu = () => {
    if (contextMenuTarget) {
      handleCloseTab(contextMenuTarget.id, new Event('click'));
    }
    closeContextMenu();
  };

  // שכפול כרטיסייה
  const handleDuplicateTab = () => {
    if (contextMenuTarget) {
      const newTab = {
        ...contextMenuTarget,
        id: `${contextMenuTarget.type}-${Date.now()}`,
      };
      const newTabs = [...openTabs, newTab];
      setOpenTabs(newTabs);
      setActiveTabId(newTab.id);
      saveTabsState(newTabs, newTab.id);
    }
    closeContextMenu();
  };

  // סגירת כרטיסיות אחרות
  const handleCloseOtherTabs = () => {
    if (contextMenuTarget) {
      const newTabs = [contextMenuTarget];
      setOpenTabs(newTabs);
      setActiveTabId(contextMenuTarget.id);
      saveTabsState(newTabs, contextMenuTarget.id);
    }
    closeContextMenu();
  };

  // סגירת כרטיסיות מימין (לפני הכרטיסייה הנוכחית)
  const handleCloseTabsToRight = () => {
    if (contextMenuTarget) {
      const targetIndex = openTabs.findIndex(tab => tab.id === contextMenuTarget.id);
      if (targetIndex !== -1) {
        const newTabs = openTabs.slice(targetIndex);
        setOpenTabs(newTabs);
        const newActiveTabId = newTabs.find(tab => tab.id === activeTabId) 
          ? activeTabId 
          : contextMenuTarget.id;
        setActiveTabId(newActiveTabId);
        saveTabsState(newTabs, newActiveTabId);
      }
    }
    closeContextMenu();
  };

  // סגירת כרטיסיות משמאל (אחרי הכרטיסייה הנוכחית)
  const handleCloseTabsToLeft = () => {
    if (contextMenuTarget) {
      const targetIndex = openTabs.findIndex(tab => tab.id === contextMenuTarget.id);
      if (targetIndex !== -1) {
        const newTabs = openTabs.slice(0, targetIndex + 1);
        setOpenTabs(newTabs);
        const newActiveTabId = newTabs.find(tab => tab.id === activeTabId) 
          ? activeTabId 
          : contextMenuTarget.id;
        setActiveTabId(newActiveTabId);
        saveTabsState(newTabs, newActiveTabId);
      }
    }
    closeContextMenu();
  };

  // טעינה מחדש של כרטיסייה
  const handleReloadTab = () => {
    if (contextMenuTarget) {
      // כפה רענון על ידי עדכון מצב
      const updatedTabs = openTabs.map(tab => 
        tab.id === contextMenuTarget.id 
          ? { ...tab, lastReloaded: Date.now() }
          : tab
      );
      setOpenTabs(updatedTabs);
    }
    closeContextMenu();
  };

  // Split View - הוספת כרטיסייה לתצוגה מפוצלת
  const handleAddToSplitView = () => {
    if (contextMenuTarget) {
      // הסר סיומת מהשם
      const displayName = contextMenuTarget.name.replace(/\.(pdf|txt|html|docx?)$/i, '');
      
      // יצירת כרטיסייה מפוצלת מיד עם הספר הראשון
      const newSplitTab = {
        id: `split-${Date.now()}`,
        name: `בחר ספר... | ${displayName}`,
        type: 'split',
        leftTab: null, // עדיין לא נבחר
        rightTab: { ...contextMenuTarget, name: displayName },
        splitRatio: 50,
        isSelectingLeft: true // דגל שמציין שצריך להציג דיאלוג בחירה בצד שמאל
      };

      // הוספת הכרטיסייה החדשה
      const newTabs = [...openTabs, newSplitTab];
      setOpenTabs(newTabs);
      setActiveTabId(newSplitTab.id);
      saveTabsState(newTabs, newSplitTab.id);
    }
    closeContextMenu();
  };

  // בחירת הכרטיסייה השנייה לתצוגה מפוצלת - עדכון הטאב הקיים
  const handleSelectSecondTab = (secondTab) => {
    // מצא את הכרטיסייה המפוצלת שממתינה לבחירה
    const splitTab = openTabs.find(tab => tab.type === 'split' && tab.isSelectingLeft);
    
    if (splitTab && secondTab.id !== splitTab.rightTab.id) {
      // הסר סיומות משמות הקבצים
      const leftName = secondTab.name.replace(/\.(pdf|txt|html|docx?)$/i, '');
      const rightName = splitTab.rightTab.name.replace(/\.(pdf|txt|html|docx?)$/i, '');
      
      // עדכן את הכרטיסייה המפוצלת עם הבחירה השנייה
      const updatedTabs = openTabs.map(tab => {
        if (tab.id === splitTab.id) {
          return {
            ...tab,
            name: `${leftName} | ${rightName}`,
            leftTab: { ...secondTab, name: leftName },
            rightTab: { ...tab.rightTab, name: rightName },
            isSelectingLeft: false // סיימנו את הבחירה
          };
        }
        return tab;
      });

      setOpenTabs(updatedTabs);
      saveTabsState(updatedTabs, splitTab.id);
    }
  };

  // ביטול בחירת כרטיסייה שנייה - סגירת הכרטיסייה המפוצלת
  const handleCancelSelectSecondTab = () => {
    // מצא ומחק את הכרטיסייה המפוצלת שממתינה לבחירה
    const splitTab = openTabs.find(tab => tab.type === 'split' && tab.isSelectingLeft);
    
    if (splitTab) {
      const newTabs = openTabs.filter(tab => tab.id !== splitTab.id);
      setOpenTabs(newTabs);
      
      // חזור לכרטיסייה הקודמת
      if (newTabs.length > 0) {
        const newActiveId = newTabs[newTabs.length - 1].id;
        setActiveTabId(newActiveId);
        saveTabsState(newTabs, newActiveId);
      }
    }
  };

  // החלפת צדדים בתצוגה מפוצלת
  const handleReverseSplitView = () => {
    if (contextMenuTarget && contextMenuTarget.type === 'split') {
      const updatedTabs = openTabs.map(tab => 
        tab.id === contextMenuTarget.id 
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
    }
    closeContextMenu();
  };

  // סגירת צד שמאל - המרת הטאב לטאב רגיל
  const handleCloseLeftView = () => {
    if (contextMenuTarget && contextMenuTarget.type === 'split') {
      const updatedTabs = openTabs.map(tab => 
        tab.id === contextMenuTarget.id 
          ? { ...tab.rightTab }
          : tab
      );
      setOpenTabs(updatedTabs);
      saveTabsState(updatedTabs, activeTabId);
    }
    closeContextMenu();
  };

  // סגירת צד ימין - המרת הטאב לטאב רגיל
  const handleCloseRightView = () => {
    if (contextMenuTarget && contextMenuTarget.type === 'split') {
      const updatedTabs = openTabs.map(tab => 
        tab.id === contextMenuTarget.id 
          ? { ...tab.leftTab }
          : tab
      );
      setOpenTabs(updatedTabs);
      saveTabsState(updatedTabs, activeTabId);
    }
    closeContextMenu();
  };

  // הפרדת התצוגות - יצירת שני טאבים נפרדים
  const handleSeparateViews = () => {
    if (contextMenuTarget && contextMenuTarget.type === 'split') {
      const splitTabIndex = openTabs.findIndex(tab => tab.id === contextMenuTarget.id);
      if (splitTabIndex !== -1) {
        const newTabs = [
          ...openTabs.slice(0, splitTabIndex),
          contextMenuTarget.leftTab,
          contextMenuTarget.rightTab,
          ...openTabs.slice(splitTabIndex + 1)
        ];
        setOpenTabs(newTabs);
        setActiveTabId(contextMenuTarget.leftTab.id);
        saveTabsState(newTabs, contextMenuTarget.leftTab.id);
      }
    }
    closeContextMenu();
  };

  // עדכון יחס הפיצול בטאב
  const updateSplitRatio = (tabId, newRatio) => {
    const updatedTabs = openTabs.map(tab => 
      tab.id === tabId && tab.type === 'split'
        ? { ...tab, splitRatio: newRatio }
        : tab
    );
    setOpenTabs(updatedTabs);
  };
  
  // הצמדת ספר לראש הרשימה
  const handlePinBook = () => {
    if (contextMenuTarget) {
      // בדוק אם הספר כבר מוצמד
      const isAlreadyPinned = pinnedBooks.some(book => book.id === contextMenuTarget.id);
      
      if (isAlreadyPinned) {
        // אם מוצמד, בטל הצמדה
        handleUnpinBook(contextMenuTarget.id);
      } else {
        // אם לא מוצמד, הוסף את הספר לתחילת הרשימה
        const updatedPinned = [contextMenuTarget, ...pinnedBooks];
        setPinnedBooks(updatedPinned);
        updateSetting('pinnedBooks', updatedPinned);
      }
    }
    closeContextMenu();
  };
  
  // ביטול הצמדת ספר
  const handleUnpinBook = (bookId) => {
    const updatedPinned = pinnedBooks.filter(book => book.id !== bookId);
    setPinnedBooks(updatedPinned);
    updateSetting('pinnedBooks', updatedPinned);
  };

  // פתיחת תצוגה מקדימה של תיקייה
  const handleFolderClick = (folder) => {
    setFolderPreview(folder);
    if (folder) {
      localStorage.setItem('library_lastFolder', JSON.stringify(folder));
    }
  };

  // סגירת תצוגה מקדימה של תיקייה
  const closeFolderPreview = () => {
    setFolderPreview(null);
  };
  
  // חזרה לבית - סגירת תצוגה מקדימה
  const handleHomeClick = () => {
    setFolderPreview(null);
  };
  
  // סגור תצוגה מקדימה כשעוברים לדף אחר
  useEffect(() => {
    if (currentView !== 'books' && folderPreview) {
      closeFolderPreview();
    }
  }, [currentView]);

  // סגירת תפריט בלחיצה מחוץ לו
  useEffect(() => {
    const handleClick = (e) => {
      // בדוק אם הלחיצה הייתה מחוץ לתפריט ההקשר
      const contextMenuElement = document.querySelector('.context-menu');
      if (contextMenuElement && !contextMenuElement.contains(e.target)) {
        closeContextMenu();
      }
    };
    
    if (contextMenu) {
      // השתמש ב-setTimeout כדי לוודא שהאירוע לא נקרא מיד
      setTimeout(() => {
        document.addEventListener('click', handleClick);
      }, 0);
      
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // טיפול בקיצורי מקלדת גלובליים
  useEffect(() => {
    const handleKeyDown = (e) => {
      // בדוק אם המשתמש מקליד בשדה קלט
      const isInputField = e.target.tagName === 'INPUT' || 
                          e.target.tagName === 'TEXTAREA' || 
                          e.target.isContentEditable;
      
      // רשימת קיצורים שאנחנו רוצים לתפוס
      const isOurShortcut = e.ctrlKey && (
        e.key.toLowerCase() === 'h' ||
        e.key.toLowerCase() === 't' ||
        e.key.toLowerCase() === 'w'
      );
      
      // אם זה הקיצור שלנו ולא בשדה קלט - תפוס אותו מיד
      if (isOurShortcut && !isInputField) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      } else {
        return; // לא הקיצור שלנו - תן לאירוע להמשיך
      }
      
      // Ctrl+H - פתיחת כרטיסיית היסטוריה
      if (e.key.toLowerCase() === 'h') {
        console.log('🔍 Ctrl+H נלחץ - פותח כרטיסיית היסטוריה');
        
        // סגור תצוגה מקדימה של תיקייה אם פתוחה
        if (folderPreview) {
          setFolderPreview(null);
          localStorage.removeItem('library_lastFolder');
        }

        // עבור לתצוגת ספרים
        setCurrentView('books');

        // בדוק אם כבר יש כרטיסיית היסטוריה פתוחה
        const existingHistoryTab = openTabs.find(tab => tab.type === 'history');
        if (existingHistoryTab) {
          // אם כבר יש כרטיסייה - עבור אליה
          setActiveTabId(existingHistoryTab.id);
          return;
        }

        // צור כרטיסיית היסטוריה חדשה
        const historyTabId = `history-tab-${Date.now()}`;
        const historyTab = {
          id: historyTabId,
          name: 'היסטוריה',
          type: 'history'
        };
        
        const newTabs = [...openTabs, historyTab];
        setOpenTabs(newTabs);
        setActiveTabId(historyTabId);
        saveTabsState(newTabs, historyTabId);
      }
      
      // Ctrl+T - פתיחת כרטיסיית חיפוש חדשה
      else if (e.key.toLowerCase() === 't') {
        console.log('🔍 Ctrl+T נלחץ - פותח כרטיסיית חיפוש');
        
        // סגור תצוגה מקדימה של תיקייה
        if (folderPreview) {
          setFolderPreview(null);
          localStorage.removeItem('library_lastFolder');
        }

        // עבור לתצוגת ספרים
        setCurrentView('books');

        // צור ID ייחודי לכל כרטיסיית חיפוש
        const searchTabId = `search-tab-${Date.now()}`;
        const searchTab = {
          id: searchTabId,
          name: 'חיפוש',
          type: 'search',
          searchQuery: '',
          searchResults: []
        };
        
        const newTabs = [...openTabs, searchTab];
        setOpenTabs(newTabs);
        setActiveTabId(searchTabId);
        saveTabsState(newTabs, searchTabId);
      }
      
      // Ctrl+W - סגירת כרטיסייה פעילה
      else if (e.key.toLowerCase() === 'w') {
        console.log('🔍 Ctrl+W נלחץ - סוגר כרטיסייה');
        
        if (activeTabId && openTabs.length > 0) {
          const newTabs = openTabs.filter((tab) => tab.id !== activeTabId);
          setOpenTabs(newTabs);

          let newActiveTabId = null;
          if (newTabs.length > 0) {
            newActiveTabId = newTabs[newTabs.length - 1].id;
            setActiveTabId(newActiveTabId);
          } else {
            setActiveTabId(null);
          }

          saveTabsState(newTabs, newActiveTabId);
        }
      }
    };

    // השתמש ב-capture phase כדי לתפוס את האירוע לפני כולם
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    console.log('✅ מאזין לקיצורי מקלדת הופעל');
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      console.log('❌ מאזין לקיצורי מקלדת הוסר');
    };
  }, [activeTabId, openTabs, folderPreview, currentView]);

  return (
    <FluentProvider theme={isDark ? customDarkTheme : customLightTheme}>
      <div className="app-layout">
        {/* Custom Title Bar */}
        {window.electron && (
          <div className="custom-title-bar">
            <div className="title-bar-drag-region">
              <img src="/icon.png" alt="האוצר" className="title-bar-icon" />
              <span className="title-bar-title">האוצר</span>
            </div>
            <div className="title-bar-controls">
              <button 
                className="title-bar-button minimize"
                onClick={() => window.electron.windowMinimize()}
                aria-label="מזער"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M0 5h10" stroke="currentColor" strokeWidth="1"/>
                </svg>
              </button>
              <button 
                className="title-bar-button maximize"
                onClick={() => window.electron.windowMaximize()}
                aria-label="מקסם/שחזר"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <rect x="0" y="0" width="10" height="10" stroke="currentColor" strokeWidth="1" fill="none"/>
                </svg>
              </button>
              <button 
                className="title-bar-button close"
                onClick={() => window.electron.windowClose()}
                aria-label="סגור"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M0 0L10 10M10 0L0 10" stroke="currentColor" strokeWidth="1"/>
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Overlay גלובלי שמכסה הכל כשההשלמה פתוחה */}
        {isAutocompleteOpen && (
          <div 
            className="global-autocomplete-overlay"
            onClick={() => setIsAutocompleteOpen(false)}
          />
        )}
        
        {/* Header */}
        <div className="app-header">
          {/* קבוצת כפתורים מימין - בית, כלים, הגדרות */}
          <div className="header-actions header-actions-right">
            <Button
              appearance="subtle"
              icon={<SettingsRegular />}
              onClick={() => setCurrentView('settings')}
              aria-label="הגדרות"
              data-active={currentView === 'settings'}
            />
            <Button
              appearance="subtle"
              icon={<WrenchRegular />}
              onClick={() => setCurrentView('tools')}
              aria-label="כלים"
              data-active={currentView === 'tools'}
            />
            <Button
              appearance="subtle"
              icon={<HomeRegular />}
              onClick={() => setCurrentView('home')}
              aria-label="בית"
              data-active={currentView === 'home'}
            />
          </div>
          
          {/* שורת חיפוש מרכזית */}
          <div className="header-search-container">
            <div className="header-search-wrapper">
              {headerSearchQuery && (
                <button
                  className="header-clear-search"
                  onClick={() => {
                    setHeaderSearchQuery('');
                    setShowHeaderAutocomplete(false);
                  }}
                >
                  ×
                </button>
              )}
              <input
                type="text"
                placeholder="חפש ספר לפי שם או מחבר..."
                className="header-search-input"
                value={headerSearchQuery}
                onChange={(e) => {
                  isTypingRef.current = true;
                  setHeaderSearchQuery(e.target.value);
                  // אפס את הדגל אחרי זמן קצר
                  setTimeout(() => {
                    isTypingRef.current = false;
                  }, 100);
                }}
                onKeyDown={handleHeaderKeyDown}
                onClick={() => {
                  // לחיצת עכבר - toggle של ההשלמה האוטומטית
                  // רק אם לא מקלידים כרגע
                  if (!isTypingRef.current && headerSuggestions.length > 0) {
                    setShowHeaderAutocomplete(!showHeaderAutocomplete);
                  }
                }}
              />
              <SearchRegular className="header-search-icon" />
            </div>
            
            {/* השלמה אוטומטית */}
            {showHeaderAutocomplete && (
              <div className="header-autocomplete-dropdown">
                <SearchAutocomplete
                  suggestions={headerSuggestions}
                  onSelect={handleHeaderFileSelect}
                  searchQuery={headerSearchQuery}
                />
              </div>
            )}
          </div>
          
          {/* קבוצת כפתורים משמאל - ספרייה, חיפוש, כרטיסיות */}
          <div className="header-actions header-actions-left">
            <Button
              appearance="subtle"
              icon={<BookOpenRegular />}
              onClick={() => {
                setCurrentView('books');
                setFolderPreview(null); // סגור תצוגת תיקייה
                localStorage.removeItem('library_lastFolder');
              }}
              aria-label="כרטיסיות פתוחות"
              data-active={currentView === 'books' && !folderPreview}
            />
            <Button
              appearance="subtle"
              icon={<SearchRegular />}
              onClick={() => {
                setCurrentView('books');
                setFolderPreview(null); // סגור תצוגת תיקייה
                handleNewSearchTab();
              }}
              aria-label="חיפוש חדש"
            />
            <Button
              appearance="subtle"
              icon={<LibraryRegular />}
              onClick={() => {
                setCurrentView('books');
                setIsLibrarySidebarOpen(!isLibrarySidebarOpen); // toggle
              }}
              aria-label="ספרייה"
              data-active={isLibrarySidebarOpen || folderPreview}
            />
          </div>
        </div>

        <div className="app-body">
          {/* Main Content */}
          <div className="main-content">
            {/* מיכל התוכן המרכזי */}
            <div className="main-content-center">
              {/* תצוגה מקדימה של תיקייה - מעל הכל */}
              {folderPreview && (
                <FolderPreview
                  folder={folderPreview}
                  onClose={closeFolderPreview}
                  onFileClick={(file) => {
                    handleFileClick(file);
                    closeFolderPreview();
                  }}
                  onFolderClick={handleFolderClick}
                  allFiles={allFiles}
                />
              )}

              {/* כרטיסיות - מוצגות רק בתצוגת ספרים */}
              {openTabs.length > 0 && currentView === 'books' && (
                <div className="tabs-container">
                {/* כפתור רשימת כרטיסיות */}
                <button
                  className="search-tabs-btn"
                  onClick={() => setShowTabsDialog(!showTabsDialog)}
                  title="רשימת כרטיסיות (Ctrl+Shift+A)"
                  aria-label="רשימת כרטיסיות"
                >
                  <ChevronDownRegular />
                </button>
                {openTabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`tab-item ${activeTabId === tab.id ? 'active' : ''} ${dragOverTab?.id === tab.id ? 'drag-over' : ''}`}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, tab)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, tab)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, tab)}
                    onClick={() => {
                      setActiveTabId(tab.id);
                      saveTabsState(openTabs, tab.id);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, tab)}
                    title={tab.name}
                  >
                    {tab.type === 'split' ? (
                      <SquareMultipleRegular className="tab-icon" />
                    ) : tab.type === 'search' ? (
                      <SearchRegular className="tab-icon" />
                    ) : tab.type === 'history' ? (
                      <HistoryRegular className="tab-icon" />
                    ) : tab.type === 'pdf' ? (
                      <DocumentRegular className="tab-icon" />
                    ) : tab.type === 'otzaria' ? (
                      <BookRegular className="tab-icon" />
                    ) : (
                      <DocumentTextRegular className="tab-icon" />
                    )}
                    <span 
                      className="tab-item-content"
                      ref={(el) => {
                        if (el) {
                          // בדוק אם הטקסט נחתך
                          const isOverflowing = el.scrollWidth > el.clientWidth;
                          if (isOverflowing) {
                            el.setAttribute('data-overflow', 'true');
                          } else {
                            el.removeAttribute('data-overflow');
                          }
                        }
                      }}
                    >
                      {tab.name}
                    </span>
                    <button
                      className="tab-close-btn"
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      aria-label="סגור"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {/* כפתור + לכרטיסייה חדשה */}
                <button
                  className="new-tab-btn"
                  onClick={handleNewSearchTab}
                  title="כרטיסיית חיפוש חדשה"
                  aria-label="כרטיסייה חדשה"
                >
                  +
                </button>
              </div>
              )}

              {/* תפריט כרטיסיות פתוחות - מחוץ ל-container */}
              {showTabsDialog && openTabs.length > 0 && currentView === 'books' && (
                <>
                  <div className="tabs-dropdown-overlay" onClick={() => setShowTabsDialog(false)} />
                  <div className="tabs-dropdown">
                    <div className="tabs-dropdown-header">
                      <span>כרטיסיות פתוחות</span>
                      <span className="tabs-dropdown-count">{openTabs.length}</span>
                    </div>
                    <div className="tabs-dropdown-list">
                      {openTabs.map((tab) => (
                        <div
                          key={tab.id}
                          className={`tabs-dropdown-item ${activeTabId === tab.id ? 'active' : ''}`}
                          onClick={() => {
                            setActiveTabId(tab.id);
                            saveTabsState(openTabs, tab.id);
                            setShowTabsDialog(false);
                          }}
                        >
                          <div className="tabs-dropdown-item-icon">
                            {tab.type === 'split' ? (
                              <SquareMultipleRegular />
                            ) : tab.type === 'search' ? (
                              <SearchRegular />
                            ) : tab.type === 'history' ? (
                              <HistoryRegular />
                            ) : tab.type === 'pdf' ? (
                              <DocumentRegular />
                            ) : tab.type === 'otzaria' ? (
                              <BookRegular />
                            ) : (
                              <DocumentTextRegular />
                            )}
                          </div>
                          <div className="tabs-dropdown-item-content">
                            <div className="tabs-dropdown-item-title">{tab.name}</div>
                          </div>
                          <button
                            className="tabs-dropdown-item-close"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseTab(tab.id, e);
                              if (openTabs.length === 1) {
                                setShowTabsDialog(false);
                              }
                            }}
                            aria-label="סגור"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* מציג קבצים - תמיד ב-DOM אבל מוסתר בתצוגות אחרות */}
              <div className="file-viewer" style={{ 
                display: currentView === 'books' ? 'block' : 'none'
              }}>
                {/* תצוגת כרטיסיות */}
                <div style={{ 
                  width: '100%', 
                  height: '100%'
                }}>
                  {openTabs.length > 0 ? (
                      openTabs.map((tab) => (
                        <div
                          key={tab.id}
                          style={{
                            width: '100%',
                            height: '100%',
                            display: activeTabId === tab.id ? 'flex' : 'none',
                            flexDirection: tab.type === 'split' ? 'row' : 'column'
                          }}
                        >
                          {tab.type === 'split' ? (
                            /* תצוגה מפוצלת */
                            <>
                              {/* צד שמאל */}
                              <div 
                                className="split-view-pane split-view-left"
                                style={{ width: `${tab.splitRatio}%`, position: 'relative' }}
                              >
                                {tab.isSelectingLeft || !tab.leftTab ? (
                                  /* דיאלוג בחירת כרטיסייה שנייה */
                                  <div className="split-view-selector-in-pane">
                                    <div className="split-view-selector">
                                      <div className="split-view-selector-header">
                                        <h3>בחר כרטיסייה להוספה</h3>
                                        <button onClick={handleCancelSelectSecondTab}>✕</button>
                                      </div>
                                      <div className="split-view-selector-tabs">
                                        {openTabs
                                          .filter(t => t.id !== tab.id && t.id !== tab.rightTab.id && t.type !== 'split')
                                          .map(t => (
                                            <div
                                              key={t.id}
                                              className="split-view-selector-tab"
                                              onClick={() => handleSelectSecondTab(t)}
                                            >
                                              {t.type === 'search' ? <SearchRegular /> : t.type === 'pdf' ? <DocumentRegular /> : <DocumentTextRegular />}
                                              <span>{t.name}</span>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  </div>
                                ) : tab.leftTab.type === 'search' ? (
                                  <SearchPage
                                    searchQuery={tab.leftTab.searchQuery || ''}
                                    setSearchQuery={(query) => {
                                      const updatedTabs = openTabs.map(t => 
                                        t.id === tab.id ? { ...t, leftTab: { ...t.leftTab, searchQuery: query } } : t
                                      );
                                      setOpenTabs(updatedTabs);
                                    }}
                                    isSearching={isSearching}
                                    searchResults={tab.leftTab.searchResults || []}
                                    setSearchResults={(results) => {
                                      const updatedTabs = openTabs.map(t => 
                                        t.id === tab.id ? { ...t, leftTab: { ...t.leftTab, searchResults: results } } : t
                                      );
                                      setOpenTabs(updatedTabs);
                                    }}
                                    handleFileClick={handleFileClick}
                                    allFiles={allFiles}
                                    onSearch={async (query, advancedOptions) => {
                                      setIsSearching(true);
                                      try {
                                        const results = await handleContentSearch(query, advancedOptions);
                                        const updatedTabs = openTabs.map(t => 
                                          t.id === tab.id ? { ...t, leftTab: { ...t.leftTab, searchQuery: query, searchResults: results || [] } } : t
                                        );
                                        setOpenTabs(updatedTabs);
                                      } finally {
                                        setIsSearching(false);
                                      }
                                    }}
                                    recentBooks={recentBooks}
                                    isActive={activeTabId === tab.id}
                                    onAutocompleteChange={setIsAutocompleteOpen}
                                  />
                                ) : tab.leftTab.type === 'pdf' ? (
                                  <PDFViewer 
                                    key={`${tab.leftTab.id}-${tab.leftTab._updateKey || 0}`}
                                    pdfPath={tab.leftTab.path} 
                                    title={tab.leftTab.name}
                                    searchContext={tab.leftTab.searchContext}
                                    onLocateBook={setHeaderSearchQuery}
                                    onPdfClick={closeHeaderAutocomplete}
                                    onHistoryClick={openHistoryTab}
                                  />
                                ) : tab.leftTab.type === 'otzaria' ? (
                                  <TextViewer
                                    key={`${tab.leftTab.id}-${tab.leftTab._updateKey || 0}`}
                                    bookId={tab.leftTab.bookId}
                                    bookType="otzaria"
                                    searchContext={tab.leftTab.searchContext}
                                    onLinkClick={handleFileClick}
                                    onSearchRequest={setHeaderSearchQuery}
                                    onHistoryClick={openHistoryTab}
                                  />
                                ) : tab.leftTab.type === 'text' && tab.leftTab.path ? (
                                  <TextViewer 
                                    key={`${tab.leftTab.id}-${tab.leftTab._updateKey || 0}`}
                                    textPath={tab.leftTab.path} 
                                    title={tab.leftTab.name}
                                    searchContext={tab.leftTab.searchContext}
                                    onSearchRequest={setHeaderSearchQuery}
                                    onHistoryClick={openHistoryTab}
                                  />
                                ) : (
                                  <div className="empty-state">
                                    <p>לא ניתן להציג את הקובץ</p>
                                  </div>
                                )}
                              </div>

                              {/* קו מפריד */}
                              <div 
                                className="split-view-divider"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  const startX = e.clientX;
                                  const startRatio = tab.splitRatio;
                                  
                                  const handleMouseMove = (e) => {
                                    const deltaX = e.clientX - startX;
                                    const containerWidth = e.target.parentElement.offsetWidth;
                                    const deltaPercent = (deltaX / containerWidth) * 100;
                                    const newRatio = Math.min(Math.max(startRatio + deltaPercent, 20), 80);
                                    updateSplitRatio(tab.id, newRatio);
                                  };
                                  
                                  const handleMouseUp = () => {
                                    document.removeEventListener('mousemove', handleMouseMove);
                                    document.removeEventListener('mouseup', handleMouseUp);
                                  };
                                  
                                  document.addEventListener('mousemove', handleMouseMove);
                                  document.addEventListener('mouseup', handleMouseUp);
                                }}
                              />

                              {/* צד ימין */}
                              <div 
                                className="split-view-pane split-view-right"
                                style={{ width: `${100 - tab.splitRatio}%` }}
                              >
                                {tab.rightTab.type === 'search' ? (
                                  <SearchPage
                                    searchQuery={tab.rightTab.searchQuery || ''}
                                    setSearchQuery={(query) => {
                                      const updatedTabs = openTabs.map(t => 
                                        t.id === tab.id ? { ...t, rightTab: { ...t.rightTab, searchQuery: query } } : t
                                      );
                                      setOpenTabs(updatedTabs);
                                    }}
                                    isSearching={isSearching}
                                    searchResults={tab.rightTab.searchResults || []}
                                    setSearchResults={(results) => {
                                      const updatedTabs = openTabs.map(t => 
                                        t.id === tab.id ? { ...t, rightTab: { ...t.rightTab, searchResults: results } } : t
                                      );
                                      setOpenTabs(updatedTabs);
                                    }}
                                    handleFileClick={handleFileClick}
                                    allFiles={allFiles}
                                    onSearch={async (query, advancedOptions) => {
                                      setIsSearching(true);
                                      try {
                                        const results = await handleContentSearch(query, advancedOptions);
                                        const updatedTabs = openTabs.map(t => 
                                          t.id === tab.id ? { ...t, rightTab: { ...t.rightTab, searchQuery: query, searchResults: results || [] } } : t
                                        );
                                        setOpenTabs(updatedTabs);
                                      } finally {
                                        setIsSearching(false);
                                      }
                                    }}
                                    recentBooks={recentBooks}
                                    isActive={activeTabId === tab.id}
                                    onAutocompleteChange={setIsAutocompleteOpen}
                                  />
                                ) : tab.rightTab.type === 'pdf' ? (
                                  <PDFViewer 
                                    key={`${tab.rightTab.id}-${tab.rightTab._updateKey || 0}`}
                                    pdfPath={tab.rightTab.path} 
                                    title={tab.rightTab.name}
                                    searchContext={tab.rightTab.searchContext}
                                    onLocateBook={setHeaderSearchQuery}
                                    onPdfClick={closeHeaderAutocomplete}
                                    onHistoryClick={openHistoryTab}
                                  />
                                ) : tab.rightTab.type === 'otzaria' ? (
                                  <TextViewer
                                    key={`${tab.rightTab.id}-${tab.rightTab._updateKey || 0}`}
                                    bookId={tab.rightTab.bookId}
                                    bookType="otzaria"
                                    searchContext={tab.rightTab.searchContext}
                                    onLinkClick={handleFileClick}
                                    onSearchRequest={setHeaderSearchQuery}
                                    onHistoryClick={openHistoryTab}
                                  />
                                ) : tab.rightTab.type === 'text' && tab.rightTab.path ? (
                                  <TextViewer 
                                    key={`${tab.rightTab.id}-${tab.rightTab._updateKey || 0}`}
                                    textPath={tab.rightTab.path} 
                                    title={tab.rightTab.name}
                                    searchContext={tab.rightTab.searchContext}
                                    onSearchRequest={setHeaderSearchQuery}
                                    onHistoryClick={openHistoryTab}
                                  />
                                ) : (
                                  <div className="empty-state">
                                    <p>לא ניתן להציג את הקובץ</p>
                                  </div>
                                )}
                              </div>
                            </>
                          ) : tab.type === 'search' ? (
                            <SearchPage
                              searchQuery={tab.searchQuery || ''}
                              setSearchQuery={(query) => {
                                const updatedTabs = openTabs.map(t => 
                                  t.id === tab.id ? { ...t, searchQuery: query } : t
                                );
                                setOpenTabs(updatedTabs);
                              }}
                              isSearching={isSearching}
                              searchResults={tab.searchResults || []}
                              setSearchResults={(results) => {
                                const updatedTabs = openTabs.map(t => 
                                  t.id === tab.id ? { ...t, searchResults: results } : t
                                );
                                setOpenTabs(updatedTabs);
                              }}
                              handleFileClick={handleFileClick}
                              allFiles={allFiles}
                              onSearch={async (query, advancedOptions) => {
                                // wrapper שמעדכן את התוצאות של הכרטיסייה הספציפית
                                setIsSearching(true);
                                try {
                                  const results = await handleContentSearch(query, advancedOptions);
                                  const updatedTabs = openTabs.map(t => 
                                    t.id === tab.id ? { ...t, searchQuery: query, searchResults: results || [] } : t
                                  );
                                  setOpenTabs(updatedTabs);
                                } finally {
                                  setIsSearching(false);
                                }
                              }}
                              recentBooks={recentBooks}
                              isActive={activeTabId === tab.id}
                              onAutocompleteChange={setIsAutocompleteOpen}
                            />
                          ) : tab.type === 'history' ? (
                            <HistoryTab
                              recentBooks={recentBooks}
                              onFileClick={handleFileClick}
                              onClearHistory={() => {
                                setRecentBooks([]);
                                updateSetting('recentBooks', []);
                              }}
                            />
                          ) : tab.type === 'pdf' ? (
                            <PDFViewer 
                              key={`${tab.id}-${tab._updateKey || 0}`}
                              pdfPath={tab.path} 
                              title={tab.name}
                              searchContext={tab.searchContext}
                              onLocateBook={setHeaderSearchQuery}
                              onPdfClick={closeHeaderAutocomplete}
                              onHistoryClick={openHistoryTab}
                            />
                          ) : tab.type === 'otzaria' ? (
                            <TextViewer
                              key={`${tab.id}-${tab._updateKey || 0}`}
                              bookId={tab.bookId}
                              bookType="otzaria"
                              searchContext={tab.searchContext}
                              onLinkClick={handleFileClick}
                              onSearchRequest={setHeaderSearchQuery}
                              onHistoryClick={openHistoryTab}
                            />
                          ) : tab.type === 'text' && tab.path ? (
                            <TextViewer 
                              key={`${tab.id}-${tab._updateKey || 0}`}
                              textPath={tab.path} 
                              title={tab.name}
                              searchContext={tab.searchContext}
                              onSearchRequest={setHeaderSearchQuery}
                              onHistoryClick={openHistoryTab}
                            />
                          ) : (
                            <div className="empty-state">
                              <p>לא ניתן להציג את הקובץ</p>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <div className="empty-state-cards">
                          <div 
                            className="empty-state-card"
                            onClick={handleNewSearchTab}
                            title="פתח חיפוש"
                          >
                            <SearchRegular className="empty-state-card-icon" />
                            <span className="empty-state-card-title">חיפוש</span>
                          </div>
                          <div 
                            className="empty-state-card"
                            onClick={() => {
                              setCurrentView('books');
                              setFolderPreview(null); // אפס תצוגת תיקייה כדי להציג שורש
                              setIsLibrarySidebarOpen(true);
                            }}
                            title="פתח ספרייה"
                          >
                            <LibraryRegular className="empty-state-card-icon" />
                            <span className="empty-state-card-title">ספרייה</span>
                          </div>
                        </div>
                        <Text size={500} style={{ marginTop: '32px', opacity: 0.7 }}>
                          לחץ על הספרייה לבחירת ספר או על החיפוש לחיפוש בתוכן
                        </Text>
                      </div>
                    )}
                  </div>
                </div>

              {/* תצוגות אחרות - מוצגות במקום נפרד */}
              <div style={{ 
                display: currentView !== 'books' ? 'block' : 'none',
                width: '100%',
                height: '100%'
              }}>
                {currentView === 'home' && (
                  <LibraryHome 
                    recentBooks={recentBooks} 
                    allFiles={allFiles} 
                    onBookClick={handleFileClick}
                    workspaces={workspaces}
                    currentWorkspace={currentWorkspace}
                    onSelectWorkspace={selectWorkspace}
                    onCreateWorkspace={createWorkspace}
                    onDeleteWorkspace={deleteWorkspace}
                    onRenameWorkspace={renameWorkspace}
                    onOpenCalendar={() => handleOpenTool('calendar')}
                    onOpenParasha={() => handleOpenTool('parasha')}
                    onOpenLibrary={() => {
                      setCurrentView('books');
                      setFolderPreview(null); // אפס תצוגת תיקייה כדי להציג שורש
                      setIsLibrarySidebarOpen(true);
                    }}
                  />
                )}
                
                {currentView === 'tools' && (
                  <ToolsPage initialTool={selectedTool} />
                )}
                
                {currentView === 'settings' && (
                  <Settings 
                    isDark={isDark} 
                    setIsDark={setIsDark}
                    onNavigateToMetadata={() => setCurrentView('metadata')}
                  />
                )}
                
                {currentView === 'metadata' && (
                  <MetadataTableEditor onBack={() => setCurrentView('settings')} />
                )}
              </div>
            </div>
            
            {/* סיידבר ספרייה - מימין */}
            {currentView === 'books' && (
              <LibrarySidebar
                allFiles={allFiles}
                pinnedBooks={pinnedBooks}
                recentBooks={recentBooks}
                currentFolder={folderPreview}
                onFileClick={(file) => {
                  handleFileClick(file);
                  setIsLibrarySidebarOpen(false); // סגור את הספרייה אחרי פתיחת ספר
                }}
                onUnpinBook={handleUnpinBook}
                onFolderClick={handleFolderClick}
                onHomeClick={handleHomeClick}
                onClose={() => setIsLibrarySidebarOpen(false)}
                isOpen={isLibrarySidebarOpen}
              />
            )}
          </div>
        </div>

        {/* תפריט הקשר מותאם - בסגנון Chrome */}
        {contextMenu && (
          <div
            className="context-menu"
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 1000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenuTarget && (
              <>
                {/* טעינה מחדש */}
                <div className="context-menu-item" onClick={handleReloadTab}>
                  <ArrowClockwiseRegular />
                  <span>טעינה מחדש</span>
                  <span className="context-menu-shortcut">Ctrl+R</span>
                </div>

                {/* שכפול */}
                <div className="context-menu-item" onClick={handleDuplicateTab}>
                  <CopyRegular />
                  <span>שכפול</span>
                </div>

                {/* הצמדה - רק לכרטיסיות רגילות */}
                {contextMenuTarget.type !== 'split' && (
                  <div className="context-menu-item" onClick={handlePinBook}>
                    {pinnedBooks.some(book => book.id === contextMenuTarget.id) ? (
                      <>
                        <PinOffRegular />
                        <span>בטל הצמדה מספרייה</span>
                      </>
                    ) : (
                      <>
                        <PinRegular />
                        <span>הצמד לספרייה</span>
                      </>
                    )}
                  </div>
                )}

                <div className="context-menu-divider"></div>

                {/* Split View - רק לכרטיסיות רגילות */}
                {contextMenuTarget.type !== 'split' && openTabs.length > 1 && (
                  <>
                    <div className="context-menu-item" onClick={handleAddToSplitView}>
                      <SquareMultipleRegular />
                      <span>הוסף לתצוגה מפוצלת</span>
                    </div>
                    <div className="context-menu-divider"></div>
                  </>
                )}

                {/* אופציות Split View - רק לכרטיסיות מפוצלות */}
                {contextMenuTarget.type === 'split' && (
                  <>
                    <div className="context-menu-item" onClick={handleReverseSplitView}>
                      <ArrowClockwiseRegular />
                      <span>החלף צדדים</span>
                    </div>
                    <div className="context-menu-item" onClick={handleCloseLeftView}>
                      <span>סגור צד שמאל</span>
                    </div>
                    <div className="context-menu-item" onClick={handleCloseRightView}>
                      <span>סגור צד ימין</span>
                    </div>
                    <div className="context-menu-item" onClick={handleSeparateViews}>
                      <span>הפרד תצוגות</span>
                    </div>
                    <div className="context-menu-divider"></div>
                  </>
                )}

                {/* סגירה */}
                <div className="context-menu-item" onClick={handleCloseTabFromMenu}>
                  <DeleteRegular />
                  <span>סגירה</span>
                  <span className="context-menu-shortcut">Ctrl+W</span>
                </div>

                {/* סגירת כרטיסיות אחרות */}
                <div 
                  className={`context-menu-item ${openTabs.length <= 1 ? 'context-menu-item-disabled' : ''}`}
                  onClick={openTabs.length > 1 ? handleCloseOtherTabs : closeContextMenu}
                >
                  <span>סגירת כרטיסיות אחרות</span>
                </div>

                {/* סגירת כרטיסיות מימין (לפני הכרטיסייה הנוכחית) */}
                <div 
                  className={`context-menu-item ${
                    openTabs.findIndex(tab => tab.id === contextMenuTarget.id) === 0 
                      ? 'context-menu-item-disabled' 
                      : ''
                  }`}
                  onClick={
                    openTabs.findIndex(tab => tab.id === contextMenuTarget.id) > 0 
                      ? handleCloseTabsToRight 
                      : closeContextMenu
                  }
                >
                  <span>סגירת כרטיסיות מימין</span>
                </div>

                {/* סגירת כרטיסיות משמאל (אחרי הכרטיסייה הנוכחית) */}
                <div 
                  className={`context-menu-item ${
                    openTabs.findIndex(tab => tab.id === contextMenuTarget.id) === openTabs.length - 1 
                      ? 'context-menu-item-disabled' 
                      : ''
                  }`}
                  onClick={
                    openTabs.findIndex(tab => tab.id === contextMenuTarget.id) < openTabs.length - 1 
                      ? handleCloseTabsToLeft 
                      : closeContextMenu
                  }
                >
                  <span>סגירת כרטיסיות משמאל</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* קומפוננט התראות מותאם אישית */}
        <CustomAlert />
        
        {/* קומפוננט אישור מותאם אישית */}
        <CustomConfirm />
      </div>
    </FluentProvider>
  );
}

export default App;
