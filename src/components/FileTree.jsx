import { useState, useEffect } from 'react';
import { 
  ChevronDownRegular, 
  ChevronLeftRegular,
  FolderRegular,
  FolderOpenRegular,
  DocumentRegular,
  GridRegular,
  ListRegular
} from '@fluentui/react-icons';
import './FileTree.css';

const FileTreeNode = ({ node, onFileClick, onFolderClick, level = 0, viewMode, searchTerm }) => {
  const [isExpanded, setIsExpanded] = useState(searchTerm ? true : false);
  
  const isFolder = node.type === 'folder';
  const hasChildren = isFolder && node.children && node.children.length > 0;

  useEffect(() => {
    if (searchTerm && hasChildren) {
      setIsExpanded(true);
    }
  }, [searchTerm, hasChildren]);

  const handleToggle = () => {
    if (isFolder) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleClick = () => {
    if (!isFolder) {
      if (onFileClick && node.fullData) {
        onFileClick(node.fullData);
      }
    } else if (viewMode === 'grid') {
      if (onFolderClick) {
        onFolderClick(node);
      }
    } else {
      handleToggle();
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="file-tree-node">
        <div 
          className={`file-tree-item ${isFolder ? 'folder' : 'file'} ${isExpanded ? 'expanded' : ''}`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={handleClick}
        >
          {isFolder && (
            <span className="tree-chevron">
              {isExpanded ? <ChevronDownRegular /> : <ChevronLeftRegular />}
            </span>
          )}
          
          <span className="tree-icon">
            {isFolder ? (
              isExpanded ? <FolderOpenRegular /> : <FolderRegular />
            ) : (
              <DocumentRegular />
            )}
          </span>
          
          <span className="tree-label">{node.name}</span>
          
          {isFolder && (
            <span className="tree-count">
              {hasChildren ? node.children.length : 0}
            </span>
          )}
        </div>
        
        {isFolder && isExpanded && hasChildren && (
          <div className="file-tree-children">
            {node.children.map((child, index) => (
              <FileTreeNode
                key={`${child.path}-${index}`}
                node={child}
                onFileClick={onFileClick}
                onFolderClick={onFolderClick}
                level={level + 1}
                viewMode={viewMode}
                searchTerm={searchTerm}
              />
            ))}
          </div>
        )}
        
        {isFolder && isExpanded && !hasChildren && (
          <div className="empty-folder-message" style={{ paddingRight: `${(level + 1) * 20 + 8}px` }}>
            תיקייה ריקה
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`grid-item-card ${isFolder ? 'folder' : 'file'}`}
      onClick={handleClick}
    >
      <div className="grid-item-icon">
        {isFolder ? <FolderRegular /> : <DocumentRegular />}
      </div>
      <div className="grid-item-name" title={node.name}>{node.name}</div>
    </div>
  );
};

const FileTree = ({ files, onFileClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('fileTree_viewMode');
    return saved || 'grid';
  });
  const [currentFolder, setCurrentFolder] = useState(() => {
    const saved = localStorage.getItem('fileTree_currentFolder');
    return saved ? JSON.parse(saved) : null;
  });

  // בניית עץ - שומר את כל ההירכיה המלאה
  const buildTree = (filesList) => {
    const root = {
      name: 'ספרייה',
      type: 'folder',
      path: 'root',
      children: []
    };

    filesList.forEach(file => {
      const normalizedPath = file.path.replace(/\\/g, '/');
      
      // מצא את תיקיית books או את התיקייה הראשית
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
      
      // בנה את העץ עם הנתיב המלא
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
    return root;
  };

  // סינון עץ לפי חיפוש - מחפש גם בתתי תיקיות
  const filterTree = (node, term, depth = 0) => {
    if (!term) return node;
    
    const lowerTerm = term.toLowerCase();
    const indent = '  '.repeat(depth);
    
    console.log(`${indent}🔍 filterTree: ${node.name} (type: ${node.type}, children: ${node.children?.length || 0})`);
    
    // אם זה קובץ, בדוק אם השם מכיל את מילת החיפוש
    if (node.type === 'file') {
      const matches = node.name.toLowerCase().includes(lowerTerm);
      console.log(`${indent}  📄 קובץ: ${node.name} -> ${matches ? '✅ תואם' : '❌ לא תואם'}`);
      return matches ? node : null;
    }
    
    // אם זו תיקייה, חפש בכל הילדים (רקורסיבית)
    if (node.type === 'folder') {
      if (!node.children || node.children.length === 0) {
        console.log(`${indent}  📁 תיקייה ריקה: ${node.name}`);
        return null;
      }
      
      console.log(`${indent}  📁 מחפש בתיקייה: ${node.name} (${node.children.length} ילדים)`);
      
      const filteredChildren = node.children
        .map(child => filterTree(child, term, depth + 1))
        .filter(child => child !== null);
      
      console.log(`${indent}  📊 נמצאו ${filteredChildren.length} תוצאות בתיקייה ${node.name}`);
      
      // החזר את התיקייה אם:
      // 1. יש לה ילדים מסוננים (קבצים או תיקיות שמכילים את מילת החיפוש)
      // 2. או ששם התיקייה עצמה מכיל את מילת החיפוש
      const folderNameMatches = node.name.toLowerCase().includes(lowerTerm);
      
      if (filteredChildren.length > 0 || folderNameMatches) {
        console.log(`${indent}  ✅ מחזיר תיקייה: ${node.name} (ילדים: ${filteredChildren.length}, שם תואם: ${folderNameMatches})`);
        return {
          ...node,
          children: filteredChildren
        };
      }
    }
    
    console.log(`${indent}  ❌ לא נמצאו תוצאות עבור: ${node.name}`);
    return null;
  };

  // איסוף כל הקבצים מהעץ
  const flattenFiles = (node, results = []) => {
    if (!node || !node.children) return results;
    
    node.children.forEach(child => {
      if (child.type === 'file') {
        results.push(child);
      } else if (child.type === 'folder' && child.children) {
        flattenFiles(child, results);
      }
    });
    
    return results;
  };

  const tree = buildTree(files);
  const displayFolder = currentFolder || tree;
  const filteredTree = searchTerm ? filterTree(displayFolder, searchTerm) : displayFolder;
  const searchResults = searchTerm && viewMode === 'grid' && filteredTree 
    ? flattenFiles(filteredTree) 
    : null;

  // טיפול בלחיצה על תיקייה
  const handleFolderClick = (folder) => {
    setCurrentFolder(folder);
    localStorage.setItem('fileTree_currentFolder', JSON.stringify(folder));
    setSearchTerm('');
  };

  // בניית breadcrumb מהנתיב המלא
  const buildBreadcrumb = () => {
    const path = [{ name: 'ספרייה', folder: null, pathIndex: 0 }];
    
    if (!currentFolder) {
      return path;
    }
    
    const folderPath = currentFolder.path;
    const pathParts = folderPath.split('/').filter(p => p && p !== 'root');
    
    // עבור על העץ ומצא כל תיקייה בנתיב
    const tree = buildTree(files);
    let currentNode = tree;
    let currentPath = 'root';
    
    pathParts.forEach((partName) => {
      currentPath += '/' + partName;
      
      if (currentNode && currentNode.children) {
        const foundFolder = currentNode.children.find(
          child => child.type === 'folder' && child.name === partName
        );
        
        if (foundFolder) {
          path.push({ 
            name: foundFolder.name, 
            folder: foundFolder,
            pathIndex: path.length
          });
          currentNode = foundFolder;
        }
      }
    });
    
    return path;
  };

  // לחיצה על breadcrumb
  const handleBreadcrumbClick = (pathIndex) => {
    if (pathIndex === 0) {
      setCurrentFolder(null);
      localStorage.removeItem('fileTree_currentFolder');
    } else {
      const breadcrumb = buildBreadcrumb();
      const targetFolder = breadcrumb[pathIndex].folder;
      setCurrentFolder(targetFolder);
      localStorage.setItem('fileTree_currentFolder', JSON.stringify(targetFolder));
    }
    setSearchTerm('');
  };

  useEffect(() => {
    setCurrentFolder(null);
    localStorage.removeItem('fileTree_currentFolder');
    setSearchTerm('');
  }, [viewMode]);

  // שמירת viewMode ב-localStorage
  useEffect(() => {
    localStorage.setItem('fileTree_viewMode', viewMode);
  }, [viewMode]);

  const breadcrumb = buildBreadcrumb();

  return (
    <div className="file-tree-container">
      <div className="file-tree-header">
        <h2>ספריה</h2>
        
        <div className="search-and-view-row">
          <input
            type="text"
            className="file-tree-search"
            placeholder="חיפוש בספרייה..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <div className="view-mode-buttons">
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
              title="תצוגת רשת"
            >
              <GridRegular />
            </button>
          </div>
        </div>
      </div>
      
      <div className={`file-tree-content ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
        {viewMode === 'grid' && breadcrumb.length > 1 && (
          <div className="breadcrumb-nav">
            {breadcrumb.map((item, index) => (
              <span key={index}>
                <span
                  className={`breadcrumb-item ${index === breadcrumb.length - 1 ? 'current' : ''}`}
                  onClick={() => index < breadcrumb.length - 1 && handleBreadcrumbClick(index)}
                >
                  {item.name}
                </span>
                {index < breadcrumb.length - 1 && <span className="breadcrumb-separator"> / </span>}
              </span>
            ))}
          </div>
        )}
        
        {filteredTree && filteredTree.children && filteredTree.children.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid-container">
              {searchResults && searchResults.length > 0 ? (
                searchResults.map((child, index) => (
                  <FileTreeNode
                    key={`${child.path}-${index}`}
                    node={child}
                    onFileClick={onFileClick}
                    onFolderClick={handleFolderClick}
                    level={0}
                    viewMode={viewMode}
                    searchTerm={searchTerm}
                  />
                ))
              ) : (
                filteredTree.children.map((child, index) => (
                  <FileTreeNode
                    key={`${child.path}-${index}`}
                    node={child}
                    onFileClick={onFileClick}
                    onFolderClick={handleFolderClick}
                    level={0}
                    viewMode={viewMode}
                    searchTerm={searchTerm}
                  />
                ))
              )}
            </div>
          ) : (
            filteredTree.children.map((child, index) => (
              <FileTreeNode
                key={`${child.path}-${index}`}
                node={child}
                onFileClick={onFileClick}
                onFolderClick={handleFolderClick}
                level={0}
                viewMode={viewMode}
                searchTerm={searchTerm}
              />
            ))
          )
        ) : (
          <div className="file-tree-empty">
            {searchTerm ? 'לא נמצאו תוצאות' : filteredTree && filteredTree.type === 'folder' ? 'תיקייה ריקה' : 'אין קבצים להצגה'}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileTree;
