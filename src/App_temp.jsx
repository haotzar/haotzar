
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
} from '@fluentui/react-icons';
import { useState, useEffect, useRef } from 'react';
// import { invoke } from '@tauri-apps/api/tauri'; // Disabled for Electron build
// Stub for Tauri invoke when building for Electron
const invoke = async () => {
  throw new Error('Tauri invoke not available in Electron build');
};
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
import { loadSettings, saveSettings, updateSetting, getSetting } from './utils/settingsManager';
import otzariaDB from './utils/otzariaDB';
import { buildOtzariaVirtualTree, searchOtzariaBooks, clearOtzariaTreeCache } from './utils/otzariaIntegration';
import searchEngine from './utils/searchEngine';
import meilisearchEngine from './utils/meilisearchEngine';
import booksMetadata from './utils/booksMetadata';
import { autoConvertSearch } from './utils/hebrewConverter';
import searchIndex from './utils/searchIndex';
import './utils/meilisearchTest'; // טוען פונקציות בדיקה ל-window.testMeilisearch
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
  
  // דיאלוג ספרייה ב-empty state
  const [showLibraryDialog, setShowLibraryDialog] = useState(false);
  
  // דיאלוג כרטיסיות פתוחות
  const [showTabsDialog, setShowTabsDialog] = useState(false);
  
  // Split View - תצוגה מפוצלת
  const [isSelectingSecondTab, setIsSelectingSecondTab] = useState(false);
  const [splitViewFirstTab, setSplitViewFirstTab] = useState(null);
  
  const toggleLibrary = () => {
    setShowLibraryDialog(!showLibraryDialog);
  };
  
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
    const savedBackgroundMode = getSetting('backgroundMode', 'with-image');
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

  // הסרת מסך טעינה כשהאפליקציה מוכנה
  useEffect(() => {
    if (allFiles.length > 0 || openTabs.length > 0) {
      // המתן רגע קצר כדי לוודא שהכל נטען
      const timer = setTimeout(() => {
        document.body.classList.add('loaded');
        // הסר את מסך הטעינה לגמרי אחרי האנימציה
        setTimeout(() => {
          const loadingScreen = document.getElementById('loading-screen');
          if (loadingScreen) {
            loadingScreen.remove();
          }
        }, 300);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [allFiles, openTabs]);

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
              otzariaPath = isElectron 
                ? window.electron.joinPath(window.electron.getAppPath(), 'books', 'אוצריא', 'seforim.db')
                : await invoke('get_otzaria_db_path');
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
                    setTimeout(() => {
                      if (window.confirm(
                        '⚠️ שגיאה בפתיחת מסד נתונים אוצריא\n\n' +
                        'better-sqlite3 צריך rebuild.\n\n' +
                        'הרץ בטרמינל:\n' +
                        'npm rebuild better-sqlite3\n\n' +
                        'האם לפתוח את התיעוד?'
                      )) {
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
                otzariaPath = isElectron 
                  ? window.electron.joinPath(window.electron.getAppPath(), 'books', 'אוצריא', 'seforim.db')
                  : await invoke('get_otzaria_db_path');
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
              console.warn('⚠️ אין תיקיות מוגדרות לסריקה');
              alert('אין תיקיות ספרייה מוגדרות.\n\nעבור להגדרות > ניהול נתונים > תיקיות ספרייה\nוהוסף תיקייה עם ספרים.');
              setAllFiles([]);
              return;
            }

            console.log('📁 סורק תיקיות:', scanPaths);
            const bookFiles = await invoke('scan_books_in_paths', { paths: scanPaths });
            console.log(`✅ נמצאו ${bookFiles.length} קבצים ב-${(performance.now() - scanStart).toFixed(0)}ms`);
            console.log('📋 First 5 files:', bookFiles.slice(0, 5));
            
            if (bookFiles.length === 0) {
              console.warn('⚠️ לא נמצאו ספרים');

              const primaryPath = scanPaths[0];
              const openFolder = window.confirm(
                `📚 לא נמצאו ספרים!\n\n` +
                `תיקיות שנסרקו:\n${scanPaths.join('\n')}\n\n` +
                `הוסף קבצי PDF או TXT לתיקיות אלו.\n\n` +
                `האם לפתוח את תיקיית הספרים עכשיו?`
              );
              
              if (openFolder) {
                try {
                  await invoke('open_books_folder', { path: primaryPath });
                } catch (error) {
                  console.error('שגיאה בפתיחת תיקייה:', error);
                  alert(`לא ניתן לפתוח את התיקייה אוטומטית.\n\nפתח ידנית את:\n${primaryPath}`);
                }
              }
              
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
              
              // בניית אינדקס חיפוש מהיר
              console.log('🔨 בונה אינדקס חיפוש...');
              searchIndex.buildIndex(allFiles);
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
                const validTabs = savedState.openTabs.filter(savedTab => {
                  // אפשר כרטיסיות אוצריא (type === 'otzaria')
                  if (savedTab.type === 'otzaria') {
                    return true;
                  }
                  // אפשר כרטיסיות רגילות שקיימות ב-allFiles
                  return allFiles.some(file => file.id === savedTab.id);
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
            console.error('שגיאה בטעינת קבצים מ-AppData:', error);
            console.error('פרטי השגיאה:', error.message);
            // אם אין תיקיית books, הצג הודעה למשתמש
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
              console.warn('⚠️ אין תיקיות מוגדרות לסריקה');
              alert('אין תיקיות ספרייה מוגדרות.\n\nעבור להגדרות > ניהול נתונים > תיקיות ספרייה\nוהוסף תיקייה עם ספרים.');
              setAllFiles([]);
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
              alert(`📚 לא נמצאו ספרים!\n\nתיקיות שנסרקו:\n${scanPaths.join('\n')}\n\nהוסף קבצי PDF או TXT לתיקיות אלו.`);
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
              console.error('❌ לא נמצאו קבצי PDF או TXT!');
              alert('לא נמצאו ספרים!\n\nהאפליקציה לא מצאה קבצי PDF או TXT.');
              setAllFiles([]);
              return;
            }
            
            const allFiles = [...pdfFiles, ...textFiles];
            allFiles.sort((a, b) => a.name.localeCompare(b.name, 'he'));
            console.log('📚 Total files after processing:', allFiles.length);
            console.log('📚 Sample files:', allFiles.slice(0, 3).map(f => ({ name: f.name, path: f.path })));
            setAllFiles(allFiles);
            console.log('✅ setAllFiles called with', allFiles.length, 'files');
            
            // בניית אינדקס חיפוש מהיר
            console.log('🔨 בונה אינדקס חיפוש...');
            searchIndex.buildIndex(allFiles);
            
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
                const validTabs = savedState.openTabs.filter(savedTab => {
                  // אפשר כרטיסיות אוצריא (type === 'otzaria')
                  if (savedTab.type === 'otzaria') {
                    return true;
                  }
                  // אפשר כרטיסיות רגילות שקיימות ב-allFiles
                  return allFiles.some(file => file.id === savedTab.id);
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
          
          // בניית אינדקס חיפוש מהיר
          console.log('🔨 בונה אינדקס חיפוש...');
          searchIndex.buildIndex(allFiles);

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
            const validTabs = savedState.openTabs.filter(savedTab => {
              // אפשר כרטיסיות אוצריא (type === 'otzaria')
              if (savedTab.type === 'otzaria') {
                return true;
              }
              // אפשר כרטיסיות רגילות שקיימות ב-allFiles
              return allFiles.some(file => file.id === savedTab.id);
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

  const handleFileClick = (file, searchContext = null) => {
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
      let newTabs;
      
      // צור כרטיסייה חדשה עם הקשר החיפוש
      const newTab = searchContext 
        ? { ...file, searchContext, _updateKey: Date.now() }
        : file;
      
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
  const handleNewSearchTab = () => {
    // סגור תצוגה מקדימה של תיקייה כשפותחים כרטיסייה חדשה
    if (folderPreview) {
      closeFolderPreview();
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

  // עדכון רשימת ספרים שנפתחו לאחרונה
  const updateRecentBooks = (file) => {
    const recent = [...recentBooks];
    // הסר את הספר אם הוא כבר ברשימה
    const filtered = recent.filter(book => book.id !== file.id);
    // הוסף את הספר בתחילת הרשימה
    const updated = [file, ...filtered].slice(0, 100); // שמור 100 ספרים אחרונים
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
        
        // חיפוש באינדקס המהיר
        let results = searchIndex.searchAdvanced(headerSearchQuery, {
          maxResults: 10,
          includeAcronyms: true,
          includeToc: true,
          includePartialMatch: true
        });
        
        // אם יש תוצאות מהאינדקס, השתמש בהן
        if (results.length > 0) {
          // הוסף מטא-דאטה לתוצאות
          const resultsWithMetadata = results.map(file => {
            const metadata = booksMetadata.getBookMetadata(file.name);
            return {
              ...file,
              author: metadata?.author || file.author,
              metadata: metadata
            };
          });
          
          setHeaderSuggestions(resultsWithMetadata);
          setShowHeaderAutocomplete(true);
          return;
        }
        
        // אם אין תוצאות מהאינדקס, חפש גם באוצריא
        if (otzariaDB.db) {
          console.log('📖 מחפש גם בספרי אוצריא...');
          try {
            const otzariaResults = searchOtzariaBooks(headerSearchQuery);
            
            if (otzariaResults.length > 0) {
              const limitedResults = otzariaResults.slice(0, 10).map(book => ({
                id: book.id,
                name: book.title,
                path: book.path || `otzaria://${book.id}`,
                type: 'otzaria',
                bookId: book.id,
                isVirtual: true,
                virtualType: 'otzaria-book',
                matchType: 'otzaria',
                matchScore: 80
              }));
              
              setHeaderSuggestions(limitedResults);
              setShowHeaderAutocomplete(true);
              return;
            }
          } catch (error) {
            console.error('❌ שגיאה בחיפוש אוצריא:', error);
          }
        }
        
        // אם אין תוצאות כלל
        setHeaderSuggestions([]);
        setShowHeaderAutocomplete(false);
        
      } else if (!headerSearchQuery || headerSearchQuery.length === 0) {
        // אם אין טקסט חיפוש בכלל, הצג ספרים אחרונים
        const recentWithMetadata = recentBooks.map(book => {
          const metadata = booksMetadata.getBookMetadata(book.name);
          return {
            ...book,
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

