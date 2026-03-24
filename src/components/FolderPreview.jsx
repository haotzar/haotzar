import { useState, useEffect, useRef } from 'react';
import { 
  DocumentRegular,
  DismissRegular,
  ChevronRightRegular,
  FolderRegular,
  SearchRegular,
  HomeRegular,
  PanelRightRegular,
  EyeRegular,
  ArrowClockwiseRegular,
  FolderOpenRegular,
  InfoRegular,
  DocumentBulletListRegular,
  GridRegular,
  ListRegular,
} from '@fluentui/react-icons';
import PDFThumbnail from './PDFThumbnail';
import TextViewer from '../TextViewer';
import { getOtzariaRootFolder, getOtzariaCategoryById, getOtzariaCategoryByPath, clearOtzariaTreeCache } from '../utils/otzariaIntegration';
import EmptyLibraryPrompt from './EmptyLibraryPrompt';
import './FolderPreview.css';

const FolderPreview = ({ folder, onClose, onFileClick, onFolderClick, allFiles }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showPreviewPanel, setShowPreviewPanel] = useState(() => {
    const saved = localStorage.getItem('folderPreview_showPreviewPanel');
    return saved === 'true';
  });
  const [panelMode, setPanelMode] = useState(() => {
    const saved = localStorage.getItem('folderPreview_panelMode');
    return saved || 'preview';
  });
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('folderPreview_viewMode');
    return saved || 'grid';
  });

  // Debounce לחיפוש - מחכה 300ms אחרי שהמשתמש מפסיק להקליד
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // שמירת הגדרות ב-localStorage
  useEffect(() => {
    localStorage.setItem('folderPreview_showPreviewPanel', showPreviewPanel);
  }, [showPreviewPanel]);

  useEffect(() => {
    localStorage.setItem('folderPreview_panelMode', panelMode);
  }, [panelMode]);

  useEffect(() => {
    localStorage.setItem('folderPreview_viewMode', viewMode);
  }, [viewMode]);

  // פונקציה לבחירת תיקייה מקומית
  const handleSelectLocalFolder = async (libraryType) => {
    try {
      if (window.electron) {
        const result = await window.electron.selectFolder();

        if (result.success && result.path) {
          console.log('נבחרה תיקייה:', result.path);
          
          if (libraryType === 'otzaria') {
            // חפש קובץ seforim.db בתיקייה
            const dbPath = window.electron.joinPath(result.path, 'seforim.db');
            
            if (window.electron.fileExists(dbPath)) {
              console.log('נמצא מסד נתונים ב:', dbPath);
              
              // שמור את הנתיב ב-localStorage
              localStorage.setItem('otzariaDbPath', dbPath);
              
              // שמור שצריך לפתוח את אוצריא אחרי הרענון
              localStorage.setItem('openOtzariaAfterReload', 'true');
              
              // נקה את ה-cache לפני רענון
              clearOtzariaTreeCache();
              
              alert(`מסד הנתונים נמצא!\n\nמרענן את האפליקציה...`);
              
              // רענן את האפליקציה
              window.location.reload();
            } else {
              alert(`לא נמצא קובץ seforim.db בתיקייה שנבחרה.\n\nוודא שבחרת את התיקייה הנכונה.`);
            }
          } else {
            // hebrewbooks - שמור את הנתיב
            localStorage.setItem('hebrewBooksPath', result.path);
            
            // שמור שצריך לפתוח את HebrewBooks אחרי הרענון
            localStorage.setItem('openHebrewBooksAfterReload', 'true');
            
            alert(`נבחרה תיקיית HebrewBooks!\n\nמרענן את האפליקציה...`);
            window.location.reload();
          }
        }
      } else {
        alert('פונקציה זו זמינה רק בגרסת האפליקציה המותקנת');
      }
    } catch (error) {
      console.error('שגיאה בבחירת תיקייה:', error);
      alert('שגיאה בבחירת תיקייה: ' + error.message);
    }
  };

  // פונקציה להורדת ספרייה
  const handleDownloadLibrary = async (libraryType) => {
    const urls = {
      otzaria: 'https://github.com/Otzaria/otzaria-library/releases/download/library-db-1/seforim.db.zip',
      hebrewbooks: 'https://www.hebrewbooks.org'
    };
    
    const url = urls[libraryType];
    
    try {
      if (window.electron && window.electron.openExternal) {
        // ב-Electron - פתח את הקישור בדפדפן החיצוני
        setIsDownloading(true);
        await window.electron.openExternal(url);
        
        // המתן 2 שניות ואז הסתר את האינדיקטור
        setTimeout(() => {
          setIsDownloading(false);
        }, 2000);
      } else {
        // בדפדפן רגיל או אם אין את הפונקציה
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('שגיאה בפתיחת קישור:', error);
      setIsDownloading(false);
      // נסה עם window.open כ-fallback
      window.open(url, '_blank');
    }
  };

  // המר קובץ PDF ל-Blob URL
  useEffect(() => {
    if (!previewFile || previewFile.type !== 'pdf') {
      setPreviewUrl('');
      return;
    }

    const loadUrl = async () => {
      try {
        const isElectron = window.electron !== undefined;
        if (isElectron) {
          const arrayBuffer = window.electron.readFileAsBuffer(previewFile.path);
          const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
          const blobUrl = URL.createObjectURL(blob);
          setPreviewUrl(`/pdfjs/web/viewer.html?file=${encodeURIComponent(blobUrl)}&previewMode=true#zoom=page-fit`);
        } else {
          setPreviewUrl(`/pdfjs/web/viewer.html?file=${encodeURIComponent(previewFile.path)}&previewMode=true#zoom=page-fit`);
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };

    loadUrl();

    return () => {
      if (previewUrl && previewUrl.includes('blob:')) {
        const blobUrl = decodeURIComponent(previewUrl.split('file=')[1].split('&')[0]);
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [previewFile]);

  if (!folder) return null;

  // בניית breadcrumb מההירכיה האמיתית של התיקייה
  const buildBreadcrumb = () => {
    const breadcrumb = [{ name: 'ספרייה', path: 'root', folder: null }];
    
    if (!folder || !folder.path) return breadcrumb;
    
    // אם זו תיקייה וירטואלית של אוצריא, בנה breadcrumb מיוחד
    if (folder.isVirtual && folder.virtualType === 'otzaria') {
      breadcrumb.push({
        name: 'אוצריא',
        path: 'virtual-otzaria',
        folder: { path: 'virtual-otzaria', name: 'אוצריא', isVirtual: true, virtualType: 'otzaria-root' }
      });
      return breadcrumb;
    }
    
    if (folder.isVirtual && folder.virtualType === 'otzaria-category') {
      // בנה breadcrumb מהנתיב
      breadcrumb.push({
        name: 'אוצריא',
        path: 'virtual-otzaria',
        folder: { path: 'virtual-otzaria', name: 'אוצריא', isVirtual: true, virtualType: 'otzaria-root' }
      });
      
      // פרק את הנתיב לקטגוריות
      const pathParts = folder.path.replace('virtual-otzaria/', '').split('/').filter(p => p);
      
      // בנה breadcrumb לכל קטגוריה בנתיב
      let currentPath = 'virtual-otzaria';
      pathParts.forEach((categoryName, index) => {
        currentPath += '/' + categoryName;
        
        // אם זו הקטגוריה האחרונה, השתמש בתיקייה הנוכחית
        if (index === pathParts.length - 1) {
          breadcrumb.push({
            name: categoryName,
            path: currentPath,
            folder: folder
          });
        } else {
          // אחרת, צור placeholder לקטגוריה ביניים
          breadcrumb.push({
            name: categoryName,
            path: currentPath,
            folder: { 
              path: currentPath, 
              name: categoryName, 
              isVirtual: true, 
              virtualType: 'otzaria-category',
              // ננסה למצוא את ה-categoryId מה-cache
              categoryId: null
            }
          });
        }
      });
      
      return breadcrumb;
    }
    
    // פרק את הנתיב
    const pathParts = folder.path.split('/').filter(p => p && p !== 'root');
    
    // בנה את ה-breadcrumb מכל חלקי הנתיב
    let currentPath = 'root';
    pathParts.forEach((partName, index) => {
      currentPath += '/' + partName;
      breadcrumb.push({
        name: partName,
        path: currentPath,
        folder: index === pathParts.length - 1 ? folder : { path: currentPath, name: partName }
      });
    });
    
    return breadcrumb;
  };

  const breadcrumb = buildBreadcrumb();

  // ניווט לתיקייה ספציפית ב-breadcrumb - בנה מחדש את התיקייה מהעץ
  const navigateToFolder = (breadcrumbItem) => {
    console.log('🔍 Navigating to:', breadcrumbItem);
    
    // טיפול מיוחד בתיקיות אוצריא
    if (breadcrumbItem.folder?.isVirtual && breadcrumbItem.folder.virtualType === 'otzaria-root') {
      console.log('📖 Navigating to Otzaria root');
      const otzariaTree = getOtzariaRootFolder();
      if (otzariaTree) {
        onFolderClick(otzariaTree);
      }
      return;
    }
    
    // אם זו קטגוריית אוצריא, חפש לפי נתיב או ID
    if (breadcrumbItem.folder?.isVirtual && breadcrumbItem.folder.virtualType === 'otzaria-category') {
      console.log('📖 Navigating to Otzaria category:', breadcrumbItem.path);
      
      // נסה למצוא לפי נתיב
      let category = getOtzariaCategoryByPath(breadcrumbItem.path);
      
      // אם לא נמצא ויש categoryId, נסה לפי ID
      if (!category && breadcrumbItem.folder.categoryId) {
        category = getOtzariaCategoryById(breadcrumbItem.folder.categoryId);
      }
      
      if (category) {
        onFolderClick(category);
      } else {
        console.warn('⚠️ לא נמצאה קטגוריה:', breadcrumbItem.path);
      }
      return;
    }
    
    // בנה את העץ מחדש כדי למצוא את התיקייה המלאה עם כל הילדים
    if (!allFiles || allFiles.length === 0) {
      console.error('❌ No files available to build tree');
      return;
    }
    
    console.log('🌳 Building tree from', allFiles.length, 'files');
    
    // בנה עץ פשוט מהקבצים
    const buildSimpleTree = () => {
      const root = { name: 'ספרייה', type: 'folder', path: 'root', children: [] };
      
      // הוסף תיקייה וירטואלית של אוצריא אם יש חיבור למסד הנתונים
      const otzariaTree = getOtzariaRootFolder();
      if (otzariaTree) {
        root.children.push(otzariaTree);
      }
      
      allFiles.forEach(file => {
        const normalizedPath = file.path.replace(/\\/g, '/');
        let pathParts = [];
        
        const booksIndex = normalizedPath.indexOf('books/');
        if (booksIndex !== -1) {
          const afterBooks = normalizedPath.substring(booksIndex + 'books/'.length);
          pathParts = afterBooks.split('/').filter(p => p);
        } else {
          const allParts = normalizedPath.split('/').filter(p => p);
          let startIndex = 0;
          for (let i = 0; i < allParts.length - 1; i++) {
            const part = allParts[i].toLowerCase();
            if (part && part !== 'c:' && part !== 'd:' && part !== 'e:' && 
                part !== 'users' && part !== 'user' && 
                part !== 'documents' && part !== 'downloads' && part !== 'desktop' &&
                !part.includes('appdata') && !part.includes('program') && part !== '') {
              startIndex = i;
              break;
            }
          }
          pathParts = allParts.slice(startIndex);
        }
        
        let currentLevel = root.children;
        let currentPath = 'root';
        
        pathParts.forEach((part, index) => {
          currentPath += '/' + part;
          const isLastPart = index === pathParts.length - 1;
          
          if (isLastPart) {
            currentLevel.push({
              name: part,
              type: 'file',
              path: file.path,
              fullData: file
            });
          } else {
            let folder = currentLevel.find(item => item.name === part && item.type === 'folder');
            if (!folder) {
              folder = { name: part, type: 'folder', path: currentPath, children: [] };
              currentLevel.push(folder);
            }
            currentLevel = folder.children;
          }
        });
      });
      
      return root;
    };
    
    const tree = buildSimpleTree();
    console.log('🌳 Tree built:', tree);
    
    // אם זה השורש (ספרייה), הצג את כל התיקיות הראשיות
    if (!breadcrumbItem.folder || breadcrumbItem.path === 'root') {
      console.log('✅ Showing root with', tree.children?.length, 'children');
      onFolderClick(tree);
      return;
    }
    
    if (breadcrumbItem.folder === folder) {
      console.log('✅ Already in this folder');
      return; // כבר בתיקייה הזו
    }
    
    // מצא את התיקייה בעץ לפי הנתיב
    const findFolderByPath = (node, targetPath) => {
      if (node.path === targetPath) {
        return node;
      }
      
      if (node.children) {
        for (const child of node.children) {
          if (child.type === 'folder') {
            const found = findFolderByPath(child, targetPath);
            if (found) return found;
          }
        }
      }
      
      return null;
    };
    
    console.log('🔍 Looking for path:', breadcrumbItem.path);
    const fullFolder = findFolderByPath(tree, breadcrumbItem.path);
    
    if (fullFolder) {
      console.log('✅ Found folder with', fullFolder.children?.length, 'children');
      onFolderClick(fullFolder);
    } else {
      console.error('❌ Could not find folder:', breadcrumbItem.path);
    }
  };

  // סינון קבצים לפי חיפוש - מחפש גם בתתי תיקיות
  // משתמש ב-debouncedSearchQuery כדי לא לתקוע את הממשק
  const filterChildrenRecursive = (children, query, maxDepth = 10, currentDepth = 0) => {
    if (!children || children.length === 0) return [];
    if (!query) return children;
    if (currentDepth > maxDepth) return []; // הגבלת עומק למניעת תקיעות
    
    const lowerQuery = query.toLowerCase();
    const results = [];
    
    // הגבלת מספר התוצאות למניעת תקיעות
    const MAX_RESULTS = 500;
    
    for (let i = 0; i < children.length && results.length < MAX_RESULTS; i++) {
      const child = children[i];
      
      // אם זה קובץ, בדוק אם השם תואם
      if (child.type === 'file') {
        if (child.name.toLowerCase().includes(lowerQuery)) {
          results.push(child);
        }
      } 
      // אם זו תיקייה, חפש גם בתוכה
      else if (child.type === 'folder') {
        // בדוק אם שם התיקייה תואם
        const folderNameMatches = child.name.toLowerCase().includes(lowerQuery);
        
        // חפש בתוך התיקייה (רקורסיבית)
        const childResults = child.children ? filterChildrenRecursive(child.children, query, maxDepth, currentDepth + 1) : [];
        
        if (folderNameMatches) {
          // אם שם התיקייה תואם, הצג את התיקייה עם כל התוכן שלה
          results.push(child);
        } else if (childResults.length > 0) {
          // אם יש תוצאות בתוך התיקייה אבל שם התיקייה לא תואם,
          // הוסף את הקבצים ישירות (שטח אותם)
          results.push(...childResults.slice(0, MAX_RESULTS - results.length));
        }
      }
    }
    
    return results;
  };
  
  const filteredChildren = debouncedSearchQuery 
    ? filterChildrenRecursive(folder.children, debouncedSearchQuery)
    : (folder.children || []);

  // מיון - תיקיות קודם, אחר כך קבצים
  const sortedChildren = [...filteredChildren].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name, 'he');
  });

  const handleItemClick = (item) => {
    if (item.type === 'folder') {
      // פתח תיקייה אחרת
      onFolderClick(item);
      setPreviewFile(null); // נקה תצוגה מקדימה
    } else {
      // אם יש תצוגה מקדימה - הצג בה
      if (showPreviewPanel) {
        setPreviewFile(item.fullData);
      } else {
        // אחרת פתח קובץ
        onFileClick(item.fullData);
      }
    }
  };

  // לחיצה על קובץ בתצוגה מקדימה
  const handlePreviewClick = (item) => {
    if (item.type === 'file') {
      setPreviewFile(item.fullData);
      if (!showPreviewPanel) {
        setShowPreviewPanel(true);
      }
    }
  };

  return (
    <div className="folder-preview-overlay">
      <div className={`folder-preview-container ${showPreviewPanel ? 'with-preview' : ''}`}>
        {/* כותרת - תמיד למעלה */}
        <div className="folder-preview-header">
          <button 
            className="folder-preview-close"
            onClick={onClose}
            aria-label="סגור"
          >
            <DismissRegular />
          </button>
          
          {/* Breadcrumbs */}
          <div className="folder-preview-breadcrumbs">
            {breadcrumb.map((item, index) => (
              <div key={item.path} className="folder-preview-breadcrumb">
                {index > 0 && (
                  <ChevronRightRegular className="folder-preview-breadcrumb-separator" />
                )}
                <button
                  className={`folder-preview-breadcrumb-btn ${index === breadcrumb.length - 1 ? 'active' : ''}`}
                  onClick={() => {
                    if (index < breadcrumb.length - 1) {
                      navigateToFolder(item);
                    }
                  }}
                  disabled={index === breadcrumb.length - 1}
                >
                  {index === 0 ? <HomeRegular /> : <FolderRegular />}
                  <span>{item.name}</span>
                </button>
              </div>
            ))}
          </div>
          
          <div className="folder-preview-actions">
            <div className="folder-preview-count">
              {folder.children?.length || 0} פריטים
            </div>
            
            {/* כפתורי תצוגה */}
            <div className="preview-controls">
              {/* כפתורי החלפת תצוגה - רשימה/כרטיסים */}
              <div className="view-mode-controls">
                <button
                  className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="תצוגת רשימה"
                >
                  <ListRegular />
                </button>
                <button
                  className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="תצוגת כרטיסים"
                >
                  <GridRegular />
                </button>
              </div>
              
              {/* כפתור החלפת מצב - רק כשהחלונית פתוחה */}
              {showPreviewPanel && (
                <button
                  className={`panel-mode-btn ${panelMode === 'details' ? 'active' : ''}`}
                  onClick={() => setPanelMode(panelMode === 'preview' ? 'details' : 'preview')}
                  title={panelMode === 'preview' ? 'הצג פרטים' : 'הצג תצוגה מקדימה'}
                >
                  {panelMode === 'preview' ? <DocumentBulletListRegular /> : <EyeRegular />}
                </button>
              )}
              
              {/* כפתור פתיחה/סגירה של החלונית */}
              <button
                className={`preview-toggle-btn ${showPreviewPanel ? 'active' : ''}`}
                onClick={() => {
                  setShowPreviewPanel(!showPreviewPanel);
                  if (showPreviewPanel) {
                    setPreviewFile(null);
                  }
                }}
                title={showPreviewPanel ? 'הסתר חלונית' : 'הצג חלונית'}
              >
                <PanelRightRegular />
              </button>
            </div>
          </div>
        </div>

        {/* תוכן מתחת לכותרת */}
        <div className="folder-preview-body">
          {/* תוכן ראשי */}
          <div className="folder-preview-main">
            {/* חיפוש - רק אם התיקייה לא ריקה */}
            {!(folder.isEmpty && (folder.virtualType === 'otzaria' || folder.virtualType === 'hebrewbooks')) && (
              <div className="folder-preview-search">
                <SearchRegular className="folder-preview-search-icon" />
                <input
                  type="text"
                  placeholder="חפש בתיקייה..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="folder-preview-search-input"
                />
                {searchQuery && (
                  <>
                    {searchQuery !== debouncedSearchQuery && (
                      <span className="folder-preview-search-loading">מחפש...</span>
                    )}
                    <button
                      className="folder-preview-search-clear"
                      onClick={() => setSearchQuery('')}
                      aria-label="נקה"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            )}

            {/* רשימת פריטים */}
            <div className="folder-preview-content">
              {/* אם זו תיקייה ריקה של אוצריא או hebrewbooks, הצג EmptyLibraryPrompt */}
              {folder.isEmpty && (folder.virtualType === 'otzaria' || folder.virtualType === 'hebrewbooks') ? (
                <EmptyLibraryPrompt
                  libraryType={folder.virtualType}
                  onSelectFolder={() => handleSelectLocalFolder(folder.virtualType)}
                  onDownload={() => handleDownloadLibrary(folder.virtualType)}
                  isDownloading={isDownloading}
                />
              ) : folder.needsReload && folder.virtualType === 'otzaria' ? (
                <div className="empty-library-prompt">
                  <div className="empty-library-content">
                    <div className="empty-library-icon">
                      <img src="/otzaria-icon.png" alt="אוצריא" />
                    </div>
                    
                    <h3 className="empty-library-title">מסד הנתונים קיים אבל לא נטען</h3>
                    <p className="empty-library-description">
                      קובץ מסד הנתונים של אוצריא נמצא במערכת, אך לא נטען בהצלחה.
                    </p>
                    
                    <div className="empty-library-info">
                      <InfoRegular />
                      <span>ייתכן שיש בעיה עם better-sqlite3 או שהקובץ פגום.</span>
                    </div>

                    <div className="empty-library-actions">
                      <button
                        className="empty-library-btn primary"
                        onClick={() => window.location.reload()}
                      >
                        <ArrowClockwiseRegular />
                        <span>טען מחדש את האפליקציה</span>
                      </button>
                      
                      <button
                        className="empty-library-btn secondary"
                        onClick={() => handleSelectLocalFolder('otzaria')}
                      >
                        <FolderOpenRegular />
                        <span>בחר קובץ DB אחר</span>
                      </button>
                    </div>

                    <div className="empty-library-help">
                      <details>
                        <summary>
                          💡 פתרונות אפשריים
                        </summary>
                        <div>
                          <p>1. הרץ בטרמינל: <code>npm rebuild better-sqlite3</code></p>
                          <p>2. או: <code>npm install --force better-sqlite3</code></p>
                          <p>3. בדוק שהקובץ seforim.db לא פגום</p>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              ) : sortedChildren.length > 0 ? (
                <div className={`folder-preview-${viewMode}`}>
                  {sortedChildren.map((item, index) => (
                    <div
                      key={`${item.path}-${index}`}
                      className={`folder-preview-item ${item.type === 'folder' ? 'is-folder' : 'is-file'} ${previewFile?.path === item.fullData?.path ? 'selected' : ''}`}
                      onClick={() => handleItemClick(item)}
                      onDoubleClick={() => {
                        if (item.type === 'file') {
                          onFileClick(item.fullData);
                        }
                      }}
                      title={item.name}
                    >
                      <div className="folder-preview-item-icon">
                        {item.type === 'folder' ? (
                          <FolderRegular />
                        ) : (
                          <DocumentRegular />
                        )}
                      </div>
                      <div className="folder-preview-item-name">
                        {item.name}
                        {item.matchCount && searchQuery && (
                          <span className="folder-match-count"> ({item.matchCount} תוצאות)</span>
                        )}
                      </div>
                      {item.type === 'folder' && viewMode === 'grid' && (
                        <div className="folder-preview-item-arrow">
                          <ChevronRightRegular />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="folder-preview-empty">
                  {searchQuery ? 'לא נמצאו תוצאות' : 'התיקייה ריקה'}
                </div>
              )}
            </div>
          </div>

          {/* פאנל תצוגה מקדימה או פרטים */}
          {showPreviewPanel && (
            <div className="folder-preview-panel">
              {previewFile ? (
                panelMode === 'preview' ? (
                  // מצב תצוגה מקדימה
                  <div className="folder-preview-panel-content">
                    {previewFile.type === 'pdf' ? (
                      previewUrl ? (
                        <iframe
                          key={previewFile.path}
                          src={previewUrl}
                          className="pdf-preview-iframe"
                          title="תצוגה מקדימה"
                        />
                      ) : (
                        <div className="folder-preview-panel-empty">
                          <p>טוען...</p>
                        </div>
                      )
                    ) : previewFile.type === 'otzaria' ? (
                      <TextViewer 
                        key={`folder-preview-${previewFile.id}`}
                        bookId={previewFile.bookId}
                        bookType="otzaria"
                        isPreviewMode={true}
                      />
                    ) : (
                      <TextViewer 
                        key={`folder-preview-${previewFile.id}`}
                        textPath={previewFile.path} 
                        title={previewFile.name}
                        isPreviewMode={true}
                      />
                    )}
                  </div>
                ) : (
                  // מצב פרטים
                  <div className="folder-details-panel">
                    <div className="details-panel-header">
                      <h3>פרטי הקובץ</h3>
                    </div>
                    <div className="details-panel-content">
                      {/* שם הקובץ */}
                      <div className="detail-item">
                        <div className="detail-label">שם:</div>
                        <div className="detail-value">{previewFile.name}</div>
                      </div>

                      {/* סוג */}
                      <div className="detail-item">
                        <div className="detail-label">סוג:</div>
                        <div className="detail-value">
                          {previewFile.type === 'pdf' ? 'PDF' : 
                           previewFile.type === 'otzaria' ? 'ספר אוצריא' : 
                           'קובץ טקסט'}
                        </div>
                      </div>

                      {/* פרטים ספציפיים לספרי אוצריא */}
                      {previewFile.type === 'otzaria' && (
                        <>
                          {previewFile.heShortDesc && (
                            <div className="detail-item">
                              <div className="detail-label">תיאור:</div>
                              <div className="detail-value">{previewFile.heShortDesc}</div>
                            </div>
                          )}
                          
                          {previewFile.totalLines && (
                            <div className="detail-item">
                              <div className="detail-label">מספר שורות:</div>
                              <div className="detail-value">{previewFile.totalLines.toLocaleString('he-IL')}</div>
                            </div>
                          )}
                          
                          {previewFile.volume && (
                            <div className="detail-item">
                              <div className="detail-label">כרך:</div>
                              <div className="detail-value">{previewFile.volume}</div>
                            </div>
                          )}
                          
                          {previewFile.categoryTitle && (
                            <div className="detail-item">
                              <div className="detail-label">קטגוריה:</div>
                              <div className="detail-value">{previewFile.categoryTitle}</div>
                            </div>
                          )}
                          
                          <div className="detail-item">
                            <div className="detail-label">ניקוד:</div>
                            <div className="detail-value">
                              {previewFile.hasNekudot ? '✓ יש' : '✗ אין'}
                            </div>
                          </div>
                          
                          <div className="detail-item">
                            <div className="detail-label">טעמים:</div>
                            <div className="detail-value">
                              {previewFile.hasTeamim ? '✓ יש' : '✗ אין'}
                            </div>
                          </div>
                        </>
                      )}

                      {/* נתיב */}
                      <div className="detail-item">
                        <div className="detail-label">נתיב:</div>
                        <div className="detail-value detail-path">{previewFile.path}</div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="folder-preview-panel-empty">
                  <div className="preview-panel-icon">
                    {panelMode === 'preview' ? <EyeRegular /> : <DocumentBulletListRegular />}
                  </div>
                  <h3>{panelMode === 'preview' ? 'תצוגה מקדימה' : 'פרטי קובץ'}</h3>
                  <p>בחר קובץ כדי לראות {panelMode === 'preview' ? 'תצוגה מקדימה' : 'פרטים'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FolderPreview;
