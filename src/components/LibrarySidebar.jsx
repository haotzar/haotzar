import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  DocumentRegular,
  ChevronDownRegular,
  ChevronLeftRegular,
  ChevronUpRegular,
  FolderRegular,
  FolderOpenRegular,
  DismissRegular,
  PinRegular,
  PinOffRegular,
  HistoryRegular,
  HomeRegular,
} from '@fluentui/react-icons';
import './LibrarySidebar.css';
import { buildOtzariaVirtualTree, buildHebrewBooksVirtualTree } from '../utils/otzariaIntegration';

const LibrarySidebar = ({ allFiles, pinnedBooks = [], onFileClick, onUnpinBook, isOpen = true, recentBooks = [], onFolderClick, onClose, onHomeClick, currentFolder = null }) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  
  // היסטוריית ניווט - מערך של תיקיות שנפתחו בסייר (FolderPreview)
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  
  // Ref לעקוב אחרי הערכים האחרונים
  const historyRef = useRef({ history: [], index: -1 });
  
  // עדכן את ה-ref כאשר ה-state משתנה
  useEffect(() => {
    historyRef.current = { history: navigationHistory, index: currentHistoryIndex };
  }, [navigationHistory, currentHistoryIndex]);
  
  // עדכון ההיסטוריה כאשר currentFolder משתנה
  useEffect(() => {
    if (currentFolder && currentFolder.path) {
      // בדוק אם זו תיקייה חדשה (לא חזרה בהיסטוריה)
      const isNavigatingHistory = 
        currentHistoryIndex >= 0 && 
        currentHistoryIndex < navigationHistory.length &&
        navigationHistory[currentHistoryIndex]?.path === currentFolder.path;
      
      if (!isNavigatingHistory) {
        // זו תיקייה חדשה - הוסף להיסטוריה
        saveToHistory(currentFolder);
      }
    }
  }, [currentFolder, currentHistoryIndex, navigationHistory]);
  
  // שמירת מצב נוכחי בהיסטוריה - רק עבור הסייר
  const saveToHistory = (node) => {
    if (!node || node.type !== 'folder') {
      console.log('⚠️ saveToHistory: Invalid node', node);
      return;
    }
    
    console.log('💾 saveToHistory called for:', node.path);
    
    const { history: prevHistory, index: prevIndex } = historyRef.current;
    
    console.log('💾 Current state - Index:', prevIndex, 'History:', prevHistory.map(h => h.path));
    
    // בדוק אם זו אותה תיקייה כמו האחרונה בהיסטוריה
    if (prevHistory.length > 0 && prevIndex >= 0) {
      const lastItem = prevHistory[prevIndex];
      if (lastItem && lastItem.path === node.path) {
        console.log('💾 Same folder - not adding to history');
        return;
      }
    }
    
    // אם אנחנו לא בסוף ההיסטוריה, נמחק את כל מה שאחרי
    const newHistory = prevHistory.slice(0, prevIndex + 1);
    
    // הוסף את המצב החדש
    newHistory.push({
      path: node.path,
      name: node.name,
      timestamp: Date.now(),
      node: node // שמור את ה-node המלא
    });
    
    console.log('💾 New history:', newHistory.map(h => h.path), 'New index:', newHistory.length - 1);
    
    // הגבל את ההיסטוריה ל-50 פריטים
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setNavigationHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
  };
  
  // ניווט אחורה - חזרה בהיסטוריה
  const navigateBack = () => {
    console.log('🔙 Navigate Back - Current Index:', currentHistoryIndex, 'History Length:', navigationHistory.length);
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      const prevState = navigationHistory[newIndex];
      console.log('🔙 Going to index:', newIndex, 'State:', prevState);
      
      // עדכן את האינדקס
      setCurrentHistoryIndex(newIndex);
      
      // פתח את התצוגה המקדימה
      if (prevState && prevState.node && onFolderClick) {
        onFolderClick(prevState.node);
      }
    } else {
      console.log('🔙 Cannot go back - at beginning');
    }
  };
  
  // ניווט קדימה - מתקדם להיסטוריה הבאה
  const navigateForward = () => {
    console.log('🔜 Navigate Forward - Current Index:', currentHistoryIndex, 'History Length:', navigationHistory.length);
    if (currentHistoryIndex < navigationHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      const nextState = navigationHistory[newIndex];
      console.log('🔜 Going to index:', newIndex, 'State:', nextState);
      
      // עדכן את האינדקס
      setCurrentHistoryIndex(newIndex);
      
      // פתח את התצוגה המקדימה
      if (nextState && nextState.node && onFolderClick) {
        onFolderClick(nextState.node);
      }
    } else {
      console.log('🔜 Cannot go forward - at end');
    }
  };
  
  // ניווט למעלה בהיררכיה (תיקייה אב) - לא משתמש בהיסטוריה
  const navigateUp = () => {
    const currentPath = currentFolder?.path;
    
    if (!currentPath) {
      return;
    }
    
    // אם אנחנו בשורש, אין לאן לעלות
    if (currentPath === 'root' || !currentPath) {
      return;
    }
    
    // חשב את נתיב התיקייה האב
    const pathParts = currentPath.split('/');
    if (pathParts.length <= 1) {
      if (onHomeClick) {
        onHomeClick();
      }
      return;
    }
    
    pathParts.pop(); // הסר את התיקייה האחרונה
    const parentPath = pathParts.join('/');
    
    // מצא את ה-node של התיקייה האב בעץ
    const parentNode = findNodeByPath(tree, parentPath);
    
    if (parentNode && onFolderClick) {
      // פתח את התיקייה האב (זה יוסיף אותה להיסטוריה דרך useEffect)
      onFolderClick(parentNode);
    } else {
      console.warn('⚠️ לא נמצא node עבור:', parentPath);
    }
  };
  
  // פונקציה למציאת node לפי path בעץ
  const findNodeByPath = (node, targetPath) => {
    if (!node || !targetPath) return null;
    
    // בדיקה ישירה
    if (node.path === targetPath) {
      return node;
    }
    
    // חיפוש רקורסיבי בילדים
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const found = findNodeByPath(child, targetPath);
        if (found) return found;
      }
    }
    
    return null;
  };
  
  // גלילה לתיקייה
  const scrollToFolder = (folderPath) => {
    setTimeout(() => {
      const element = document.querySelector(`[data-folder-path="${folderPath}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };
  
  // בדיקה אם אפשר לנווט אחורה
  const canNavigateBack = currentHistoryIndex > 0;
  
  // בדיקה אם אפשר לנווט קדימה
  const canNavigateForward = currentHistoryIndex < navigationHistory.length - 1;
  
  // בדיקה אם אפשר לעלות בהיררכיה
  const canNavigateUp = currentFolder && currentFolder.path && currentFolder.path !== 'root';

  // Debug - הדפס את מצב הניווט
  useEffect(() => {
    console.log('📊 Navigation State:', {
      currentHistoryIndex,
      historyLength: navigationHistory.length,
      canNavigateBack,
      canNavigateForward,
      canNavigateUp,
      currentFolder: currentFolder?.path,
      history: navigationHistory.map(h => h.path)
    });
  }, [currentHistoryIndex, navigationHistory, currentFolder]);

  // טיפול בלחיצה על קובץ - תמיד פותח כרטיסייה חדשה
  const handleFileClick = (file) => {
    onFileClick(file);
  };

  // טיפול בלחיצה על תיקיה - פתיחת תצוגה מקדימה (ההיסטוריה מתעדכנת דרך useEffect)
  const handleFolderClickAction = (node) => {
    if (onFolderClick) {
      onFolderClick(node);
    }
  };

  // בניית עץ מרשימת קבצים - תומך בתיקיות מרובות
  const buildTree = (filesList) => {
    const root = {
      name: 'ספרייה',
      type: 'folder',
      path: 'root',
      children: [],
      isVirtual: false
    };

    // הוספת תיקיות וירטואליות בתחילת העץ
    const virtualFolders = [];

    // תיקיית אוצריא - תמיד מוצגת
    const otzariaTree = buildOtzariaVirtualTree();
    if (otzariaTree) {
      virtualFolders.push(otzariaTree);
    }

    // תיקיית hebrewbooks - רק אם אין תיקייה קיימת
    const hasHebrewBooksFolder = filesList.some(file => {
      const normalizedPath = file.path.toLowerCase().replace(/\\/g, '/');
      return normalizedPath.includes('hebrewbooks') || 
             normalizedPath.includes('hebrew-books') ||
             normalizedPath.includes('hebrew_books');
    });
    
    if (!hasHebrewBooksFolder) {
      const hebrewBooksTree = buildHebrewBooksVirtualTree(filesList);
      if (hebrewBooksTree) {
        virtualFolders.push(hebrewBooksTree);
      }
    }

    // תיקיית היסטוריה
    if (recentBooks && recentBooks.length > 0) {
      virtualFolders.push({
        name: 'היסטוריה',
        type: 'folder',
        path: 'virtual-history',
        isVirtual: true,
        virtualType: 'history',
        children: recentBooks.map((book, index) => ({
          name: book.name.replace(/\.(pdf|txt|html|docx?)$/i, ''), // הסר סיומת
          type: 'file',
          path: book.path,
          fullData: book,
          isVirtual: true
        }))
      });
    }

    // תיקיית ספרים מוצמדים (אם יש)
    if (pinnedBooks && pinnedBooks.length > 0) {
      virtualFolders.push({
        name: 'מוצמדים',
        type: 'folder',
        path: 'virtual-pinned',
        isVirtual: true,
        virtualType: 'pinned',
        children: pinnedBooks.map((book, index) => ({
          name: book.name.replace(/\.(pdf|txt|html|docx?)$/i, ''), // הסר סיומת
          type: 'file',
          path: book.path,
          fullData: book,
          isVirtual: true
        }))
      });
    }

    // מצא את התיקייה הראשונה המשותפת לכל הקבצים מכל תיקייה
    const folderRoots = new Map(); // מפה של תיקיות ראשיות לקבצים שלהן
    
    filesList.forEach(file => {
      const normalizedPath = file.path.replace(/\\/g, '/');
      
      // אם הנתיב מכיל 'books/', זו תיקיית books הרגילה
      const booksIndex = normalizedPath.indexOf('books/');
      if (booksIndex !== -1) {
        const afterBooks = normalizedPath.substring(booksIndex + 'books/'.length);
        const rawParts = afterBooks.split('/').filter(p => p);
        
        if (rawParts.length > 0) {
          const isFileDirectlyInBooks = rawParts.length === 1;
          const rootFolder = isFileDirectlyInBooks ? 'books' : rawParts[0]; // התיקייה הראשונה אחרי books
          if (!folderRoots.has(rootFolder)) {
            folderRoots.set(rootFolder, []);
          }
          folderRoots.get(rootFolder).push({
            file,
            parts: isFileDirectlyInBooks ? rawParts : rawParts.slice(1) // כל השאר אחרי התיקייה הראשונה
          });
        }
      } else {
        // תיקייה מותאמת - קח את שם התיקייה האחרונה בנתיב (לפני הקבצים)
        const pathParts = normalizedPath.split('/');
        
        // מצא את התיקייה האחרונה שמכילה תתי-תיקיות או קבצים
        // נתחיל מהסוף ונחפש את התיקייה הראשונה שיש בה יותר מקובץ אחד
        let rootFolderIndex = -1;
        
        // אם יש לפחות 2 חלקים (תיקייה + קובץ), קח את התיקייה האחרונה לפני הקובץ
        if (pathParts.length >= 2) {
          // אם הקובץ נמצא ישירות בתיקייה (ללא תתי-תיקיות)
          if (pathParts.length === 2 || 
              (pathParts.length === 3 && (pathParts[0].includes(':') || pathParts[0] === ''))) {
            // קח את התיקייה האחרונה
            rootFolderIndex = pathParts.length - 2;
          } else {
            // יש תתי-תיקיות - חפש את התיקייה הראשונה שאינה תיקיית מערכת
            for (let i = 0; i < pathParts.length - 1; i++) {
              const part = pathParts[i].toLowerCase();
              // דלג על תיקיות מערכת וכוננים
              if (part && part !== 'c:' && part !== 'd:' && part !== 'e:' && 
                  part !== 'users' && part !== 'user' && 
                  part !== 'documents' && part !== 'downloads' && part !== 'desktop' &&
                  part !== 'haotzar' && part !== 'האוצר' && // דלג על תיקיית האפליקציה
                  !part.includes('appdata') && !part.includes('program') && 
                  !part.includes('roaming') && part !== '') {
                // אם זו תיקיית books, בדוק אם יש תיקייה אחרי זה
                if (part === 'books' && i < pathParts.length - 2) {
                  // יש תיקייה אחרי books - השתמש בה במקום
                  rootFolderIndex = i + 1;
                  break;
                } else if (part !== 'books') {
                  // תיקייה רגילה - השתמש בה
                  rootFolderIndex = i;
                  break;
                }
              }
            }
          }
        }
        
        if (rootFolderIndex !== -1 && rootFolderIndex < pathParts.length) {
          const rootFolder = pathParts[rootFolderIndex];
          console.log('📁 Root folder detected:', rootFolder, 'from path:', file.path);
          if (!folderRoots.has(rootFolder)) {
            folderRoots.set(rootFolder, []);
          }
          folderRoots.get(rootFolder).push({
            file,
            parts: pathParts.slice(rootFolderIndex + 1) // כל השאר אחרי התיקייה הראשונה
          });
        }
      }
    });

    // בנה את העץ מהתיקיות הראשיות
    folderRoots.forEach((files, rootFolderName) => {
      const rootFolder = {
        name: rootFolderName,
        type: 'folder',
        path: `root/${rootFolderName}`,
        children: []
      };
      
      files.forEach(({ file, parts }) => {
        let currentLevel = rootFolder.children;
        let currentPath = `root/${rootFolderName}`;
        
        parts.forEach((part, index) => {
          currentPath += '/' + part;
          const isLastPart = index === parts.length - 1;
          
          if (isLastPart) {
            // זה קובץ
            currentLevel.push({
              name: file.name,
              type: 'file',
              path: file.path,
              fullData: file
            });
          } else {
            // זו תיקייה
            let folder = currentLevel.find(item => item.name === part && item.type === 'folder');
            
            if (!folder) {
              folder = {
                name: part,
                type: 'folder',
                path: currentPath,
                children: []
              };
              currentLevel.push(folder);
            }
            
            currentLevel = folder.children;
          }
        });
      });
      
      root.children.push(rootFolder);
    });

    // מיון
    const sortNodes = (nodes) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name, 'he');
      });
      
      nodes.forEach(node => {
        if (node.type === 'folder' && node.children) {
          sortNodes(node.children);
        }
      });
    };

    sortNodes(root.children);
    
    // הוסף תיקיות וירטואליות בתחילה
    root.children = [...virtualFolders, ...root.children];
    
    return root;
  };

  // סינון עץ לפי חיפוש - מחפש גם בתתי תיקיות (מוסר כי אין יותר חיפוש)
  // const filterTree = (node, term, depth = 0) => {
  //   // קוד הסינון הוסר
  // };

  // טיפול בלחיצה על חץ - רק הרחבה/כיווץ (ללא שמירה בהיסטוריה)
  const toggleFolderExpand = (folderPath, folderName) => {
    const newExpanded = new Set(expandedFolders);
    const wasExpanded = newExpanded.has(folderPath);
    
    if (wasExpanded) {
      // כיווץ - הסר את התיקייה
      newExpanded.delete(folderPath);    } else {
      // הרחבה - הוסף את התיקייה
      newExpanded.add(folderPath);
      
      // הוסף גם את כל התיקיות האב בנתיב
      const pathParts = folderPath.split('/');
      let currentPath = '';
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentPath += (i > 0 ? '/' : '') + pathParts[i];
        if (currentPath) {
          newExpanded.add(currentPath);
        }
      }    }
    
    setExpandedFolders(newExpanded);
  };

  // טיפול בלחיצה על כפתור הבית
  const handleHomeClick = () => {
    // מצא את ה-node של השורש
    const rootNode = tree;    if (rootNode && onFolderClick) {
      // פתח את השורש ב-FolderPreview
      onFolderClick(rootNode);
    }
  };

  // רינדור צומת בעץ
  const renderNode = (node, level = 0) => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedFolders.has(node.path); // הסרנו את searchQuery
    const hasChildren = isFolder && node.children && node.children.length > 0;

    return (
      <div key={node.path} className="sidebar-tree-node">
        <div 
          className={`sidebar-tree-item ${isFolder ? 'folder' : 'file'}`}
          style={{ paddingRight: `${level * 20 + 12}px` }}
          data-folder-path={isFolder ? node.path : undefined}
        >
          {isFolder && hasChildren && (
            <span 
              className="sidebar-tree-chevron"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderExpand(node.path, node.name);
              }}
            >
              {isExpanded ? <ChevronDownRegular /> : <ChevronLeftRegular />}
            </span>
          )}
          
          <span 
            className="sidebar-tree-icon"
            onClick={() => {
              if (isFolder) {
                handleFolderClickAction(node);
              } else {
                // אם יש fullData - השתמש בו
                if (node.fullData) {
                  handleFileClick(node.fullData);
                } else {
                  // אחרת צור אובייקט חדש (לספרי אוצריא)
                  const fileData = {
                    id: node.bookId || node.path,
                    name: node.name,
                    path: node.path,
                    type: node.virtualType === 'otzaria-book' ? 'otzaria' : (node.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'text'),
                    bookId: node.bookId,
                    isVirtual: node.isVirtual,
                    virtualType: node.virtualType
                  };
                  handleFileClick(fileData);
                }
              }
            }}
          >
            {isFolder ? (
              node.isVirtual && node.virtualType === 'history' ? (
                <HistoryRegular />
              ) : node.isVirtual && node.virtualType === 'pinned' ? (
                <PinRegular />
              ) : level === 0 && (node.name === 'אוצריא' || node.path?.includes('אוצריא') || node.virtualType?.includes('otzaria')) ? (
                <img src="/otzaria-icon.png" alt="אוצריא" style={{ width: '20px', height: '20px' }} />
              ) : level === 0 && (
                node.name.toLowerCase() === 'hebrewbooks' || 
                node.name.toLowerCase() === 'hebrew books' ||
                node.name.toLowerCase() === 'hebrew-books' ||
                node.name === 'hebrewbooks' || 
                node.path?.toLowerCase().includes('hebrewbooks') || 
                node.path?.toLowerCase().includes('hebrew-books') || 
                node.path?.toLowerCase().includes('hebrew books') ||
                node.virtualType === 'hebrewbooks'
              ) ? (
                <img src="/hebrew_books.png" alt="HebrewBooks" style={{ width: '20px', height: '20px' }} />
              ) : level === 0 && (node.name === 'עוז והדר' || node.path?.toLowerCase().includes('עוז והדר') || node.path?.toLowerCase().includes('oz vehadar')) ? (
                <img src="/Logo-ozveadar.png" alt="עוז והדר" style={{ width: '20px', height: '20px' }} />
              ) : level === 0 && (node.name === 'מוסד הרב קוק' || node.path?.toLowerCase().includes('מוסד הרב קוק') || node.path?.toLowerCase().includes('kook')) ? (
                <img src="/logo-kook.png" alt="מוסד הרב קוק" style={{ width: '20px', height: '20px' }} />
              ) : level === 0 && (node.name === 'האוצר' || node.name === 'האוצר' || node.path?.toLowerCase().includes('האוצר') || node.path?.toLowerCase().includes('האוצר') || node.virtualType === 'האוצר') ? (
                <img src="/icon.png" alt="האוצר" style={{ width: '20px', height: '20px' }} />
              ) : (
                isExpanded ? <FolderOpenRegular /> : <FolderRegular />
              )
            ) : (
              <DocumentRegular />
            )}
          </span>
          
          <span 
            className="sidebar-tree-label"
            onClick={() => {
              if (isFolder) {
                handleFolderClickAction(node);
              } else {
                // אם יש fullData - השתמש בו
                if (node.fullData) {
                  handleFileClick(node.fullData);
                } else {
                  // אחרת צור אובייקט חדש (לספרי אוצריא)
                  const fileData = {
                    id: node.bookId || node.path,
                    name: node.name,
                    path: node.path,
                    type: node.virtualType === 'otzaria-book' ? 'otzaria' : (node.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'text'),
                    bookId: node.bookId,
                    isVirtual: node.isVirtual,
                    virtualType: node.virtualType
                  };
                  handleFileClick(fileData);
                }
              }
            }}
          >
            {node.name}
          </span>
          

        </div>
        
        {isFolder && isExpanded && hasChildren && (
          <div className="sidebar-tree-children">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // בניית העץ עם useMemo - רק כאשר allFiles, recentBooks או pinnedBooks משתנים
  const tree = useMemo(() => {
    const builtTree = buildTree(allFiles);    if (builtTree.children) {
      builtTree.children.forEach(child => {      });
    }
    return builtTree;
  }, [allFiles, recentBooks, pinnedBooks]);

  return (
    <div className={`library-sidebar ${!isOpen ? 'collapsed' : ''}`}>
      <div className="library-sidebar-header">
        {/* חץ למעלה */}
        <button
          className="library-sidebar-nav-btn"
          onClick={navigateUp}
          disabled={!canNavigateUp}
          aria-label="למעלה"
          title="תיקייה אב"
          type="button"
        >
          <ChevronUpRegular />
        </button>
        
        {/* פס הפרדה */}
        <div className="library-sidebar-divider"></div>
        
        {/* חיצי ניווט קדימה/אחורה */}
        <div className="library-sidebar-navigation">
          <button
            className="library-sidebar-nav-btn"
            onClick={navigateForward}
            disabled={!canNavigateForward}
            aria-label="קדימה"
            title="קדימה"
            type="button"
          >
            <ChevronLeftRegular style={{ transform: 'rotate(180deg)' }} />
          </button>
          <button
            className="library-sidebar-nav-btn"
            onClick={navigateBack}
            disabled={!canNavigateBack}
            aria-label="אחורה"
            title="אחורה"
            type="button"
          >
            <ChevronLeftRegular />
          </button>
        </div>
        
        {/* פס הפרדה */}
        <div className="library-sidebar-divider"></div>
        
        {/* כפתור בית */}
        <button
          className="library-sidebar-nav-btn library-sidebar-home-btn"
          onClick={handleHomeClick}
          aria-label="בית - ספרייה ראשית"
          title="בית"
          type="button"
        >
          <HomeRegular />
        </button>
      </div>

      <div className="library-sidebar-content">
        {/* ספרים מוצמדים */}
        {pinnedBooks && pinnedBooks.length > 0 && (
          <div className="pinned-books-section">
            {pinnedBooks.map((book) => (
              <div
                key={`pinned-${book.id}`}
                className="sidebar-tree-item file pinned-book-item"
                style={{ paddingRight: '12px' }}
                onClick={() => handleFileClick(book)}
              >
                <span className="pinned-icon">
                  <PinRegular />
                </span>
                <span className="sidebar-tree-icon">
                  <DocumentRegular />
                </span>
                <span className="sidebar-tree-label">{book.name}</span>
                <button
                  className="unpin-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpinBook(book.id);
                  }}
                  title="בטל הצמדה"
                  aria-label="בטל הצמדה"
                >
                  <PinOffRegular style={{ fontSize: '14px' }} />
                </button>
              </div>
            ))}
            <div className="pinned-books-divider"></div>
          </div>
        )}
        
        {/* עץ הספרייה */}
        {tree && tree.children && tree.children.length > 0 ? (
          tree.children.map(child => renderNode(child, 0))
        ) : (
          <div className="library-sidebar-empty">
            אין ספרים זמינים
          </div>
        )}
      </div>
    </div>
  );
};

export default LibrarySidebar;
