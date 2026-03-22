// פונקציה לסריקת קבצים מתיקיות
export async function scanFiles(getSetting, setLoadingState) {
  const isElectron = window.electron !== undefined;
  const isTauri = window.__TAURI__ !== undefined;
  
  let allFiles = [];
  
  if (isTauri) {
    // Tauri - טען דרך Rust API
    const { invoke } = window.__TAURI__.tauri;
    
    setLoadingState?.({ isLoading: true, stage: 'סורק תיקיות...', progress: 40, message: '' });
    
    const libraryFoldersSetting = getSetting('libraryFolders', ['books']);
    const scanPaths = [];
    
    for (const folder of libraryFoldersSetting) {
      if (folder === 'books') {
        try {
          const booksPath = await invoke('get_books_path');
          scanPaths.push(booksPath);
        } catch (error) {
          console.error('שגיאה בקבלת נתיב books:', error);
        }
      } else {
        scanPaths.push(folder);
      }
    }

    if (scanPaths.length === 0) {
      console.warn('⚠️ אין תיקיות מוגדרות לסריקה');
      return [];
    }

    const bookFiles = await invoke('scan_books_in_paths', { paths: scanPaths });
    console.log(`✅ נמצאו ${bookFiles.length} קבצים`);
    
    if (bookFiles.length === 0) {
      return [];
    }
    
    setLoadingState?.({ isLoading: true, stage: 'מעבד קבצים...', progress: 60, message: '' });
    
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
    
    allFiles = [...pdfFiles, ...textFiles];
    allFiles.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    
  } else if (isElectron) {
    // Electron - טען מתיקיות מוגדרות
    setLoadingState?.({ isLoading: true, stage: 'סורק תיקיות...', progress: 40, message: '' });
    
    const libraryFoldersSetting = getSetting('libraryFolders', ['books']);
    const scanPaths = [];
    
    for (const folder of libraryFoldersSetting) {
      if (folder === 'books') {
        const booksPath = window.electron.getBooksPath();
        scanPaths.push(booksPath);
      } else {
        scanPaths.push(folder);
      }
    }

    if (scanPaths.length === 0) {
      console.warn('⚠️ אין תיקיות מוגדרות לסריקה');
      return [];
    }

    const bookFiles = window.electron.scanBooksInPaths(scanPaths);
    console.log(`✅ נמצאו ${bookFiles.length} קבצים`);
    
    if (bookFiles.length === 0) {
      return [];
    }
    
    setLoadingState?.({ isLoading: true, stage: 'מעבד קבצים...', progress: 60, message: '' });
    
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
    
    allFiles = [...pdfFiles, ...textFiles];
    allFiles.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    
  } else {
    // במצב פיתוח - טען מתיקיית books הרגילה
    setLoadingState?.({ isLoading: true, stage: 'טוען קבצים...', progress: 50, message: '' });
    
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

    allFiles = [...pdfFiles, ...textFiles];
    allFiles.sort((a, b) => a.name.localeCompare(b.name, 'he'));
  }
  
  console.log(`📚 סה"כ ${allFiles.length} קבצים נסרקו`);
  return allFiles;
}
