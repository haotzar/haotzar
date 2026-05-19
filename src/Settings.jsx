import {
  Button,
  Switch,
  Text,
  Field,
  Label,
  Divider,
  Card,
} from '@fluentui/react-components';
import {
  SettingsRegular,
  DarkThemeRegular,
  ColorRegular,
  ArrowDownloadRegular,
  ArrowUploadRegular,
  DeleteRegular,
  PaintBrushRegular,
  DatabaseRegular,
  InfoRegular,
  ChevronRightRegular,
  FolderAddRegular,
  FolderRegular,
  AddRegular,
  EditRegular,
  SearchRegular,
  DismissRegular,
  PersonRegular,
  AppsRegular,
  ColorFilled,
  DatabaseFilled,
  InfoFilled,
  FolderFilled,
  SearchFilled,
  ArrowSyncRegular,
  ArrowSyncFilled,
  PauseRegular,
  PlayRegular,
  StopRegular,
} from '@fluentui/react-icons';
import { useState, useEffect, useRef } from 'react';
import tantivyEngine from './utils/tantivyEngine';
import { 
  exportSettingsToFile, 
  importSettingsFromFile, 
  clearAllSettings,
  getSetting,
  updateSetting
} from './utils/settingsManager';
import customAlert from './utils/customAlert';
import customConfirm from './utils/customConfirm';
import './Settings.css';

const Settings = ({ isDark, setIsDark, onNavigateToMetadata }) => {
  const [activeSection, setActiveSection] = useState('personalization');
  const [selectedColor, setSelectedColor] = useState(() => getSetting('accentColor', '#5c3d2e'));
  const [libraryFolders, setLibraryFolders] = useState(() => getSetting('libraryFolders', ['books']));
  const [backgroundMode, setBackgroundMode] = useState(() => getSetting('backgroundMode', 'none'));

  // state עבור בניית אינדקס
  const [indexFolder, setIndexFolder] = useState('');
  const [indexName, setIndexName] = useState('books');
  const [indexType, setIndexType] = useState('pdf');
  const [otzariaDbPath, setOtzariaDbPath] = useState('');
  const [indexBuilding, setIndexBuilding] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);
  const [indexStatus, setIndexStatus] = useState('');
  const [indexDone, setIndexDone] = useState(false);
  const [indexLogs, setIndexLogs] = useState([]);
  const [canCancelIndex, setCanCancelIndex] = useState(false);
  const [indexPaused, setIndexPaused] = useState(false);

  const colorOptions = [
    { name: 'חום קלאסי', value: '#5c3d2e' },
    { name: 'כחול', value: '#0078d4' },
    { name: 'ירוק', value: '#107c10' },
    { name: 'אדום', value: '#d13438' },
    { name: 'כתום', value: '#ff8c00' },
    { name: 'סגול', value: '#5c2d91' },
  ];

  const handleColorChange = (color) => {
    setSelectedColor(color.value);
    updateSetting('accentColor', color.value);
    
    const root = document.documentElement;
    root.style.setProperty('--colorBrandBackground', color.value);
    root.style.setProperty('--colorBrandBackgroundHover', color.value);
    root.style.setProperty('--colorBrandBackgroundPressed', color.value);
    root.style.setProperty('--colorBrandBackgroundSelected', color.value);
    root.style.setProperty('--colorBrandForeground1', color.value);
    root.style.setProperty('--colorBrandForeground2', color.value);
    root.style.setProperty('--colorBrandStroke1', color.value);
    root.style.setProperty('--colorBrandStroke2', color.value);
  };

  const handleBackgroundModeChange = (mode) => {
    setBackgroundMode(mode);
    updateSetting('backgroundMode', mode);
    
    const root = document.documentElement;
    if (mode === 'none') {
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
  };

  const handleAddFolder = async () => {
    try {
      // המתן ל-Tauri API אם נדרש
      if (typeof window.__TAURI__ !== 'undefined' && !window.__TAURI__.dialog) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const isElectron = window.electron !== undefined;
      const isTauri = typeof window !== 'undefined' && 
                      typeof window.__TAURI__ !== 'undefined' &&
                      typeof window.__TAURI__.dialog !== 'undefined';
      
      if (isTauri) {
        // שימוש ב-Tauri dialog API עם dynamic import
        try {
          const { open } = await import('@tauri-apps/plugin-dialog');
          const selectedPath = await open({
            directory: true,
            multiple: false,
            title: 'בחר תיקיית ספרייה'
          });
        
          if (selectedPath && typeof selectedPath === 'string') {
            const folderName = selectedPath.split(/[/\\]/).pop();
            
            if (!libraryFolders.includes(selectedPath)) {
              const updatedFolders = [...libraryFolders, selectedPath];
              setLibraryFolders(updatedFolders);
              updateSetting('libraryFolders', updatedFolders);
              
              // בדוק אם זו תיקיית HebrewBooks
              const isHebrewBooks = selectedPath.toLowerCase().includes('hebrewbooks') || 
                                    selectedPath.includes('אוצר');
              
              if (isHebrewBooks) {
                console.log('זוהתה תיקיית HebrewBooks:', selectedPath);
                localStorage.setItem('hebrewBooksPath', selectedPath);
                localStorage.setItem('openHebrewBooksAfterReload', 'true');
                console.log('נתיב HebrewBooks נשמר');
              }
              
              customAlert(`התיקייה "${folderName}" נוספה בהצלחה!\n\nנתיב: ${selectedPath}\n\nהאפליקציה תטען מחדש כדי לטעון את הספרייה החדשה.`, { type: 'success', title: 'הצלחה' });
              
              // המתן קצת ואז טען מחדש כדי לוודא שהכל נשמר
              setTimeout(() => {
                window.location.reload();
              }, 100);
            } else {
              customAlert(`התיקייה "${folderName}" כבר קיימת ברשימה.`, { type: 'warning', title: 'שים לב' });
            }
          }
        } catch (error) {
          console.error('שגיאה בפתיחת דיאלוג Tauri:', error);
          customAlert('שגיאה בבחירת תיקייה: ' + error.message, { type: 'error', title: 'שגיאה' });
        }
      } else if (isElectron) {
        const result = await window.electron.selectFolder();
        
        if (result.success && result.path) {
          const selectedPath = result.path;
          const folderName = selectedPath.split(/[/\\]/).pop();
          
          if (!libraryFolders.includes(selectedPath)) {
            const updatedFolders = [...libraryFolders, selectedPath];
            setLibraryFolders(updatedFolders);
            updateSetting('libraryFolders', updatedFolders);
            
            // בדוק אם זו תיקיית HebrewBooks
            const isHebrewBooks = selectedPath.toLowerCase().includes('hebrewbooks') || 
                                  selectedPath.includes('אוצר');
            
            if (isHebrewBooks) {
              console.log('זוהתה תיקיית HebrewBooks:', selectedPath);
              localStorage.setItem('hebrewBooksPath', selectedPath);
              localStorage.setItem('openHebrewBooksAfterReload', 'true');
              console.log('נתיב HebrewBooks נשמר');
            }
            
            const shouldReload = await customConfirm(
              `התיקייה "${folderName}" נוספה בהצלחה!\n\nנתיב: ${selectedPath}\n\nהאפליקציה תטען מחדש כדי לטעון את הספרייה החדשה.\n\nלחץ לישור להמשך.`,
              { type: 'question', title: 'הצלחה' }
            );
            if (shouldReload) {
              // המתן קצת ואז טען מחדש כדי לוודא שהכל נשמר
              setTimeout(() => {
                window.location.reload();
              }, 100);
            }
          } else {
            customAlert(`התיקייה "${folderName}" כבר קיימת ברשימה.`, { type: 'warning', title: 'שים לב' });
          }
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;
        
        input.onchange = async (e) => {
          const files = Array.from(e.target.files);
          if (files.length > 0) {
            const folderPath = files[0].webkitRelativePath.split('/')[0];
            
            if (!libraryFolders.includes(folderPath)) {
              const updatedFolders = [...libraryFolders, folderPath];
              setLibraryFolders(updatedFolders);
              updateSetting('libraryFolders', updatedFolders);
              
              const shouldReload = await customConfirm(
                `התיקייה "${folderPath}" נוספה בהצלחה!\n\nהאפליקציה תטען מחדש כדי לטעון את הספרייה החדשה.\n\nלחץ לישור להמשך.`,
                { type: 'question', title: 'הצלחה' }
              );
              if (shouldReload) {
                window.location.reload();
              }
            } else {
              customAlert(`התיקייה "${folderPath}" כבר קיימת ברשימה.`, { type: 'warning', title: 'שים לב' });
            }
          }
        };
        
        input.click();
      }
    } catch (error) {
      console.error('שגיאה בהוספת תיקייה:', error);
      customAlert('שגיאה בהוספת התיקייה: ' + error.message, { type: 'error', title: 'שגיאה' });
    }
  };

  const handleRemoveFolder = async (folderName) => {
    if (folderName === 'books') {
      customAlert('לא ניתן להסיר את תיקיית books הראשית', { type: 'warning', title: 'שים לב' });
      return;
    }
    
    const shouldRemove = await customConfirm(
      `האם אתה בטוח שברצונך להסיר את התיקייה "${folderName}" מהרשימה?\n\nהאפליקציה תטען מחדש אחרי ההסרה.`,
      { type: 'warning', title: 'אישור הסרה' }
    );
    if (shouldRemove) {
      const updatedFolders = libraryFolders.filter(folder => folder !== folderName);
      setLibraryFolders(updatedFolders);
      updateSetting('libraryFolders', updatedFolders);
      
      customAlert(`התיקייה "${folderName}" הוסרה מהרשימה`, { type: 'success', title: 'הצלחה' });
      window.location.reload();
    }
  };

  const handleExportSettings = async () => {
    const success = await exportSettingsToFile();
    if (success) {
      customAlert('ההגדרות יוצאו בהצלחה לקובץ JSON', { type: 'success', title: 'הצלחה' });
    } else {
      customAlert('שגיאה ביצוא ההגדרות', { type: 'error', title: 'שגיאה' });
    }
  };

  const handleImportSettings = async () => {
    try {
      const settings = await importSettingsFromFile();
      
      if (settings.theme) {
        setIsDark(settings.theme === 'dark');
      }
      
      customAlert('ההגדרות יובאו בהצלחה! רענן את הדף כדי לראות את השינויים.', { type: 'success', title: 'הצלחה' });
    } catch (error) {
      customAlert('שגיאה ביבוא ההגדרות: ' + error.message, { type: 'error', title: 'שגיאה' });
    }
  };

  const handleClearSettings = async () => {
    const shouldClear = await customConfirm(
      'האם אתה בטוח שברצונך למחוק את כל ההגדרות?',
      { type: 'warning', title: 'אישור מחיקה' }
    );
    if (shouldClear) {
      const success = clearAllSettings();
      if (success) {
        customAlert('כל ההגדרות נמחקו בהצלחה! רענן את הדף.', { type: 'success', title: 'הצלחה' });
      } else {
        customAlert('שגיאה במחיקת ההגדרות', { type: 'error', title: 'שגיאה' });
      }
    }
  };

  const handleSelectIndexFolder = async () => {
    try {
      const isTauri = window.__TAURI__ !== undefined;
      const isElectron = window.electron !== undefined;
      
      if (isTauri) {
        // שימוש ב-Tauri dialog API עם dynamic import
        try {
          const { open } = await import('@tauri-apps/plugin-dialog');
          const selectedPath = await open({
            directory: true,
            multiple: false,
            title: 'בחר תיקייה לבניית אינדקס'
          });
          
          if (selectedPath && typeof selectedPath === 'string') {
            setIndexFolder(selectedPath);
            const folderName = selectedPath.split(/[/\\]/).pop().toLowerCase().replace(/\s+/g, '_');
            setIndexName(folderName || 'books');
            setIndexDone(false);
            setIndexStatus('');
          }
        } catch (error) {
          console.error('שגיאה בפתיחת דיאלוג Tauri:', error);
          setIndexStatus('שגיאה בבחירת תיקייה: ' + error.message);
        }
      } else if (isElectron) {
        const result = await window.electron.selectFolder();
        if (result.success && result.path) {
          setIndexFolder(result.path);
          const folderName = result.path.split(/[/\\]/).pop().toLowerCase().replace(/\s+/g, '_');
          setIndexName(folderName || 'books');
          setIndexDone(false);
          setIndexStatus('');
        }
      } else {
        setIndexStatus('בחירת תיקיות זמין רק בגרסת Tauri או Electron');
      }
    } catch (error) {
      setIndexStatus('שגיאה בבחירת תיקייה: ' + error.message);
    }
  };

  const handleSelectOtzariaDb = async () => {
    try {
      const isTauri = window.__TAURI__ !== undefined;
      const isElectron = window.electron !== undefined;
      
      if (isTauri) {
        // שימוש ב-Tauri dialog API עם dynamic import
        try {
          const { open } = await import('@tauri-apps/plugin-dialog');
          const selectedPath = await open({
            directory: false,
            multiple: false,
            title: 'בחר קובץ מסד נתונים של אוצריה',
            filters: [{
              name: 'Otzaria Database',
              extensions: ['db']
            }]
          });
          
          if (selectedPath && typeof selectedPath === 'string') {
            setOtzariaDbPath(selectedPath);
            setIndexDone(false);
            setIndexStatus('');
          }
        } catch (error) {
          console.error('שגיאה בפתיחת דיאלוג Tauri:', error);
          setIndexStatus('שגיאה בבחירת קובץ: ' + error.message);
        }
      } else if (isElectron) {
        const result = await window.electron.selectFile([
          { name: 'Otzaria Database', extensions: ['db'] }
        ]);
        if (result.success && result.path) {
          setOtzariaDbPath(result.path);
          setIndexDone(false);
          setIndexStatus('');
        }
      } else {
        setIndexStatus('בחירת קבצים זמין רק בגרסת Tauri או Electron');
      }
    } catch (error) {
      setIndexStatus('שגיאה בבחירת קובץ: ' + error.message);
    }
  };

  const handleBuildIndex = async () => {
    console.log('handleBuildIndex called', { indexType, indexFolder, indexName, indexBuilding });
    
    // מנע הפעלות מרובות
    if (indexBuilding) {
      console.warn('כבר בתהליך בניית אינדקס');
      return;
    }
    
    if (indexType === 'pdf' && !indexFolder) {
      setIndexStatus('יש לבחור תיקייה תחילה');
      return;
    }
    if ((indexType === 'books' || indexType === 'lines') && !otzariaDbPath) {
      setIndexStatus('יש לבחור קובץ מסד נתונים של אוצריה');
      return;
    }
    if (!indexName.trim()) {
      setIndexStatus('יש להזין שם לאינדקס');
      return;
    }

    setIndexBuilding(true);
    setIndexProgress(0);
    setIndexDone(false);
    setIndexStatus('מתחיל בניית אינדקס...');
    setIndexLogs([]);
    setCanCancelIndex(true);

    try {
      const isElectron = window.electron !== undefined;
      if (!isElectron) {
        setIndexStatus('פעולה זו זמינה רק בגרסת Electron');
        setIndexBuilding(false);
        return;
      }

      setIndexStatus('מאתחל Tantivy...');
      setIndexProgress(5);
      
      // אתחל את Tantivy אם עדיין לא
      if (!tantivyEngine.isReady()) {
        setIndexStatus('מאתחל מנוע חיפוש...');
        await tantivyEngine.initialize();
      }
      
      setIndexProgress(10);
      setIndexStatus('מכין פקודת אינדוקס...');
      
      // בנה פקודה ל-Tantivy CLI
      const userDataPath = window.electron.getUserDataPath();
      const cliPath = window.electron.joinPath(userDataPath, 'tantivy', 'tantivy_cli.exe');
      const indexPath = window.electron.joinPath(userDataPath, 'tantivy', 'indexes', indexName.trim());
      
      // בדוק אם ה-CLI קיים
      const cliExists = await window.electron.fileExists(cliPath);
      if (!cliExists) {
        setIndexStatus('שגיאה: Tantivy CLI לא נמצא. העתק את tantivy_cli.exe לתיקיית public/');
        setIndexBuilding(false);
        setCanCancelIndex(false);
        return;
      }
      
      let command = '';
      let sourceDescription = '';
      
      if (indexType === 'pdf') {
        // בניית אינדקס ל-PDF
        command = `"${cliPath}" index --source pdf --pdf "${indexFolder}" --index-path "${indexPath}"`;
        sourceDescription = `תיקיית PDF: ${indexFolder}`;
      } else if (indexType === 'books') {
        // בניית אינדקס מטבלת books
        command = `"${cliPath}" index --source db --db "${otzariaDbPath}" --table book --index-path "${indexPath}"`;
        sourceDescription = `מסד נתונים: ${otzariaDbPath} (טבלת ספרייה)`;
      } else if (indexType === 'lines') {
        // בניית אינדקס מטבלת lines
        command = `"${cliPath}" index --source db --db "${otzariaDbPath}" --table line --index-path "${indexPath}"`;
        sourceDescription = `מסד נתונים: ${otzariaDbPath} (טבלת שורות)`;
      }
      
      setIndexStatus(`מתחיל אינדוקס ל-${sourceDescription}`);
      setIndexProgress(15);
      
      setIndexStatus('מריץ Tantivy CLI...');
      setIndexProgress(20);
      
      console.log('Running command:', command);
      
      // הגדר מאזין להתקדמות מ-Tantivy
      const progressHandler = (event, message) => {
        console.log('Progress:', message);
        
        // עדכן סטטוס לפי ההודעה - רק ההודעה האחרונה תוצג
        // Tantivy CLI מדווח בפורמט: "Indexed X documents" או "Processing file Y/Z"
        if (message.includes('Indexed') || message.includes('indexed')) {
          setIndexStatus(message);
          // נסה לחלץ מספר מסמכים
          const match = message.match(/(\d+)\s+documents?/i);
          if (match) {
            const count = parseInt(match[1]);
            // עדכן התקדמות לפי מספר המסמכים (נניח מקסימום 10000)
            const progress = 30 + Math.min(Math.floor((count / 10000) * 60), 60);
            setIndexProgress(progress);
          }
        } else if (message.includes('Processing') || message.includes('processing') || message.includes('מעבד')) {
          setIndexStatus(message);
          // נסה לחלץ אחוז מפורמט "Processing X/Y"
          const match = message.match(/(\d+)\/(\d+)/);
          if (match) {
            const current = parseInt(match[1]);
            const total = parseInt(match[2]);
            const progress = 30 + Math.floor((current / total) * 60);
            setIndexProgress(progress);
          } else {
            // אם אין מספרים, עדכן התקדמות בהדרגה
            setIndexProgress(prev => Math.min(prev + 5, 90));
          }
        } else if (message.includes('Reading') || message.includes('reading') || message.includes('נמצאו')) {
          setIndexStatus(message);
          setIndexProgress(25);
        } else if (message.includes('Creating') || message.includes('creating') || message.includes('יוצר')) {
          setIndexStatus(message);
          setIndexProgress(30);
        } else if (message.includes('Writing') || message.includes('writing') || message.includes('שומר')) {
          setIndexStatus(message);
          setIndexProgress(85);
        } else if (message.includes('Done') || message.includes('done') || message.includes('Complete') || message.includes('complete') || message.includes('הושלם')) {
          setIndexStatus(message);
          setIndexProgress(95);
        } else if (message.trim()) {
          // כל הודעה אחרת - הצג אותה והגדל התקדמות מעט
          setIndexStatus(message);
          setIndexProgress(prev => Math.min(prev + 2, 90));
        }
      };
      
      // רשום listener דרך window.electron
      let removeListener = null;
      if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.on('tantivy-progress', progressHandler);
        removeListener = () => {
          window.electron.ipcRenderer.removeListener('tantivy-progress', progressHandler);
        };
      }
      
      // הרץ את הפקודה
      const result = await window.electron.runTantivyCli(command);
      
      // הסר listener
      if (removeListener) {
        removeListener();
      }
      
      if (result.success) {
        setIndexProgress(100);
        setIndexStatus(`בניית אינדקס "${indexName}" הושלמה בהצלחה!`);
        setIndexDone(true);
        
        // רענן את רשימת האינדקסים
        if (tantivyEngine.isReady()) {
          await tantivyEngine.loadAvailableIndexes();
        }
      } else {
        const errorMsg = result.error || result.output || 'תהליך נכשל';
        setIndexProgress(0);
        
        // הודעות שגיאה ברורות
        if (errorMsg.includes('not found') || errorMsg.includes('לא נמצא')) {
          setIndexStatus('שגיאה: קובץ או תיקייה לא נמצאו. בדוק את הנתיב.');
        } else if (errorMsg.includes('permission') || errorMsg.includes('הרשאה')) {
          setIndexStatus('שגיאה: אין הרשאות גישה. הרץ כמנהל.');
        } else if (errorMsg.includes('timeout')) {
          setIndexStatus('שגיאה: התהליך ארך יותר מדי זמן (5 דקות).');
        } else if (errorMsg.includes('argument') || errorMsg.includes('usage')) {
          setIndexStatus('שגיאה: פקודה לא תקינה. בדוק את הפרמטרים.');
        } else {
          setIndexStatus(`שגיאה: ${errorMsg.substring(0, 200)}`);
        }
        
        console.error('Tantivy error:', errorMsg);
      }
    } catch (error) {
      setIndexStatus('שגיאה בבניית האינדקס: ' + error.message);
    } finally {
      setIndexBuilding(false);
      setCanCancelIndex(false);
      setIndexPaused(false);
    }
  };

  const handleCancelIndex = async () => {
    if (!canCancelIndex) return;
    
    // בדיקה אם הפונקציה קיימת
    if (!window.electron || !window.electron.cancelTantivyProcess) {
      customAlert('פונקציית ביטול לא זמינה. אנא טען מחדש את האפליקציה.', { type: 'error', title: 'שגיאה' });
      return;
    }
    
    const shouldCancel = await customConfirm(
      'האם אתה בטוח שברצונך לבטל את בניית האינדקס?',
      { type: 'warning', title: 'אישור ביטול' }
    );
    
    if (shouldCancel) {
      setIndexStatus('מבטל תהליך...');
      const result = await window.electron.cancelTantivyProcess();
      
      if (result.success) {
        setIndexStatus('התהליך בוטל על ידי המשתמש');
        setIndexProgress(0);
        setIndexBuilding(false);
        setCanCancelIndex(false);
        setIndexPaused(false);
      } else {
        setIndexStatus('שגיאה בביטול התהליך: ' + (result.error || result.message));
      }
    }
  };

  const handlePauseResumeIndex = async () => {
    if (!canCancelIndex) return;
    
    // בדיקה אם הפונקציות קיימות
    if (!window.electron || !window.electron.pauseTantivyProcess || !window.electron.resumeTantivyProcess) {
      customAlert('פונקציות השהיה/המשך לא זמינות. אנא טען מחדש את האפליקציה.', { type: 'error', title: 'שגיאה' });
      return;
    }
    
    if (indexPaused) {
      // המשך
      setIndexStatus('ממשיך תהליך...');
      const result = await window.electron.resumeTantivyProcess();
      
      if (result.success) {
        setIndexPaused(false);
        setIndexStatus('התהליך הומשך');
      } else {
        setIndexStatus('שגיאה בהמשך התהליך: ' + (result.error || result.message));
      }
    } else {
      // השהה
      setIndexStatus('משהה תהליך...');
      const result = await window.electron.pauseTantivyProcess();
      
      if (result.success) {
        setIndexPaused(true);
        setIndexStatus('התהליך הושהה - לחץ המשך להמשיך');
        
        if (result.limited) {
          customAlert('השהיה ב-Windows מוגבלת ועשויה לא לעבוד בכל המקרים', { type: 'info', title: 'שים לב' });
        }
      } else {
        setIndexStatus('שגיאה בהשהיית התהליך: ' + (result.error || result.message));
      }
    }
  };

  useEffect(() => {
    const savedColor = getSetting('accentColor', '#5c3d2e');
    const savedBackgroundMode = getSetting('backgroundMode', 'none');
    
    if (savedColor !== selectedColor) {
      setSelectedColor(savedColor);
    }
    if (savedBackgroundMode !== backgroundMode) {
      setBackgroundMode(savedBackgroundMode);
    }
    
    const root = document.documentElement;
    root.style.setProperty('--colorBrandBackground', savedColor);
    root.style.setProperty('--colorBrandBackgroundHover', savedColor);
    root.style.setProperty('--colorBrandBackgroundPressed', savedColor);
    root.style.setProperty('--colorBrandBackgroundSelected', savedColor);
    root.style.setProperty('--colorBrandForeground1', savedColor);
    root.style.setProperty('--colorBrandForeground2', savedColor);
    root.style.setProperty('--colorBrandStroke1', savedColor);
    root.style.setProperty('--colorBrandStroke2', savedColor);

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

  // Render Personalization Section
  const renderPersonalizationSection = () => (
    <div className="settings-container-win11">
      <div className="settings-header-win11">
        <h1 className="settings-title-win11">התאמה אישית</h1>
        <p className="settings-subtitle-win11">התאם את המראה והתחושה של האפליקציה</p>
      </div>

      <div className="settings-section-win11">
        <h2 className="settings-section-title">ערכה</h2>
        
        {/* Theme Toggle */}
        <div className="settings-group-win11">
          <div className="setting-item-win11">
            <div className="setting-item-left">
              <DarkThemeRegular className="setting-item-icon" />
              <div className="setting-item-content">
                <div className="setting-item-title">מצב לצפייה</div>
                <div className="setting-item-description">
                  {isDark ? 'מצב כהה' : 'מצב בהיר'}
                </div>
              </div>
            </div>
            <div className="setting-item-right">
              <Switch
                checked={isDark}
                onChange={(e, data) => setIsDark(data.checked)}
              />
            </div>
          </div>
        </div>

        {/* Background Mode */}
        <div className="settings-group-win11">
          <div className="setting-item-win11">
            <div className="setting-item-left">
              <PaintBrushRegular className="setting-item-icon" />
              <div className="setting-item-content">
                <div className="setting-item-title">רקע</div>
                <div className="setting-item-description">
                  {backgroundMode === 'none' ? 'ללא רקע' : 'עם תמונת רקע'}
                </div>
              </div>
            </div>
            <div className="setting-item-right">
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  appearance={backgroundMode === 'none' ? 'primary' : 'outline'}
                  size="small"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleBackgroundModeChange('none');
                  }}
                >
                  ללא
                </Button>
                <Button
                  appearance={backgroundMode === 'with-image' ? 'primary' : 'outline'}
                  size="small"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleBackgroundModeChange('with-image');
                  }}
                >
                  עם רקע
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Data Management Section
  const renderDataSection = () => (
    <div className="settings-container-win11">
      <div className="settings-header-win11">
        <h1 className="settings-title-win11">ספריות</h1>
        <p className="settings-subtitle-win11">נהל את תיקיות הספרייה שלך</p>
      </div>

      <div className="settings-section-win11">
        <h2 className="settings-section-title">תיקיות ספרייה</h2>
        
        <div className="settings-group-win11">
          {/* Library Folders */}
          <div className="setting-item-win11" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px', padding: '16px', overflow: 'visible' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
              <FolderRegular className="setting-item-icon" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                <div className="setting-item-title">תיקיות ספרייה</div>
                <div className="setting-item-description">
                  נהל את התיקיות שמכילות את הספרייה שלך
                </div>
              </div>
            </div>
            
            <div style={{ width: '100%', paddingRight: '36px', boxSizing: 'border-box' }}>
              <div className="folders-list" style={{ marginBottom: '12px' }}>
                {libraryFolders.map((folder) => (
                  <div key={folder} className="folder-item">
                    <FolderRegular className="folder-icon" />
                    <Text size={300} className="folder-name">{folder}</Text>
                    {folder !== 'books' && (
                      <Button
                        appearance="subtle"
                        icon={<DeleteRegular />}
                        onClick={() => handleRemoveFolder(folder)}
                        size="small"
                        style={{ color: '#d13438', flexShrink: 0 }}
                      />
                    )}
                  </div>
                ))}
              </div>
              
              <Button
                appearance="secondary"
                icon={<FolderAddRegular />}
                onClick={handleAddFolder}
                size="small"
              >
                הוסף תיקייה
              </Button>
            </div>
          </div>

          {/* Metadata Editor */}
          <div className="setting-item-win11 clickable" onClick={onNavigateToMetadata}>
            <div className="setting-item-left">
              <EditRegular className="setting-item-icon" />
              <div className="setting-item-content">
                <div className="setting-item-title">עורך מטא-דאטה</div>
                <div className="setting-item-description">
                  ערוך את המטא-דאטה של הספרייה
                </div>
              </div>
            </div>
            <div className="setting-item-right">
              <ChevronRightRegular className="setting-item-arrow" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Indexes Section
  const renderIndexesSection = () => (
    <div className="settings-container-win11">
      <div className="settings-header-win11">
        <h1 className="settings-title-win11">אינדקסים</h1>
        <p className="settings-subtitle-win11">בנה אינדקס חיפוש מהיר עם Tantivy</p>
      </div>

      <div className="settings-section-win11">
        <h2 className="settings-section-title">בניית אינדקס</h2>
        
        {/* Build Index */}
        <div className="settings-group-win11">
          <div className="setting-item-win11" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px', padding: '16px', overflow: 'visible' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
              <SearchRegular className="setting-item-icon" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                <div className="setting-item-title">בניית אינדקס</div>
                <div className="setting-item-description">
                  בנה אינדקס חיפוש מהיר עם Tantivy
                </div>
              </div>
            </div>
            
            <div style={{ width: '100%', paddingRight: '36px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
              {/* Index Type Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                <Text size={300} weight="semibold">סוג אינדקס</Text>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Button 
                    appearance={indexType === 'pdf' ? 'primary' : 'secondary'} 
                    onClick={() => { setIndexType('pdf'); setIndexDone(false); setIndexStatus(''); }}
                    disabled={indexBuilding}
                    size="small"
                  >
                    PDF
                  </Button>
                  <Button 
                    appearance={indexType === 'books' ? 'primary' : 'secondary'} 
                    onClick={() => { setIndexType('books'); setIndexDone(false); setIndexStatus(''); }}
                    disabled={indexBuilding}
                    size="small"
                  >
                    ספרייה
                  </Button>
                  <Button 
                    appearance={indexType === 'lines' ? 'primary' : 'secondary'} 
                    onClick={() => { setIndexType('lines'); setIndexDone(false); setIndexStatus(''); }}
                    disabled={indexBuilding}
                    size="small"
                  >
                    שורות
                  </Button>
                </div>
              </div>

              {/* Folder Selection for PDF */}
              {indexType === 'pdf' && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ 
                    flex: 1, 
                    padding: '8px 12px', 
                    border: '1px solid rgba(0,0,0,0.1)', 
                    borderRadius: '4px', 
                    fontSize: '13px', 
                    opacity: indexFolder ? 1 : 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    direction: 'ltr',
                    textAlign: 'left',
                    minWidth: 0,
                    boxSizing: 'border-box'
                  }}>
                    {indexFolder || 'לא נבחרה תיקייה'}
                  </div>
                  <Button 
                    appearance="secondary" 
                    icon={<FolderAddRegular />} 
                    onClick={handleSelectIndexFolder} 
                    disabled={indexBuilding}
                    size="small"
                    style={{ flexShrink: 0 }}
                  >
                    בחר
                  </Button>
                </div>
              )}

              {/* DB Selection for Books/Lines */}
              {(indexType === 'books' || indexType === 'lines') && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ 
                    flex: 1, 
                    padding: '8px 12px', 
                    border: '1px solid rgba(0,0,0,0.1)', 
                    borderRadius: '4px', 
                    fontSize: '13px', 
                    opacity: otzariaDbPath ? 1 : 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    direction: 'ltr',
                    textAlign: 'left',
                    minWidth: 0,
                    boxSizing: 'border-box'
                  }}>
                    {otzariaDbPath || 'לא נבחר קובץ'}
                  </div>
                  <Button 
                    appearance="secondary" 
                    icon={<DatabaseRegular />} 
                    onClick={handleSelectOtzariaDb} 
                    disabled={indexBuilding}
                    size="small"
                    style={{ flexShrink: 0 }}
                  >
                    בחר DB
                  </Button>
                </div>
              )}

              {/* Index Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                <Text size={300} weight="semibold">שם האינדקס</Text>
                <input
                  value={indexName}
                  onChange={e => setIndexName(e.target.value.replace(/\s+/g, '_'))}
                  disabled={indexBuilding}
                  placeholder="books"
                  style={{ 
                    padding: '8px 12px', 
                    border: '1px solid rgba(0,0,0,0.1)', 
                    borderRadius: '4px', 
                    fontSize: '13px',
                    fontFamily: 'Segoe UI, system-ui, sans-serif',
                    direction: 'ltr',
                    textAlign: 'left',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Progress Bar */}
              {(indexBuilding || indexDone) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Text size={300} weight="semibold">התקדמות</Text>
                    <Text size={300} style={{ opacity: 0.7 }}>{indexProgress}%</Text>
                  </div>
                  <div style={{ 
                    width: '100%', 
                    height: '6px', 
                    background: 'rgba(0,0,0,0.1)', 
                    borderRadius: '3px', 
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${indexProgress}%`, 
                      background: indexDone ? '#107c10' : '#0067c0', 
                      borderRadius: '3px', 
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  {indexStatus && (
                    <Text 
                      size={200} 
                      style={{ 
                        opacity: 0.7, 
                        wordBreak: 'break-word',
                        maxHeight: '60px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {indexStatus}
                    </Text>
                  )}
                </div>
              )}

              {/* Build Button */}
              <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '8px', boxSizing: 'border-box' }}>
                <Button
                  appearance="primary"
                  icon={<SearchRegular />}
                  onClick={handleBuildIndex}
                  disabled={indexBuilding || (indexType === 'pdf' && !indexFolder) || ((indexType === 'books' || indexType === 'lines') && !otzariaDbPath)}
                  style={{ flex: 1, boxSizing: 'border-box' }}
                  size="small"
                  title={
                    indexBuilding ? 'בונה אינדקס...' :
                    (indexType === 'pdf' && !indexFolder) ? 'בחר תיקייה תחילה' :
                    ((indexType === 'books' || indexType === 'lines') && !otzariaDbPath) ? 'בחר קובץ DB תחילה' :
                    'לחץ לבניית אינדקס'
                  }
                >
                  {indexBuilding ? 'בונה אינדקס...' : indexDone ? 'בנה מחדש' : 'בנה אינדקס'}
                </Button>
                
                {/* Control Buttons - shown only when building */}
                {canCancelIndex && window.electron && window.electron.cancelTantivyProcess && (
                  <>
                    <Button
                      appearance="secondary"
                      icon={indexPaused ? <PlayRegular /> : <PauseRegular />}
                      onClick={handlePauseResumeIndex}
                      size="small"
                      title={indexPaused ? 'המשך' : 'השהה'}
                      style={{ flexShrink: 0 }}
                    >
                      {indexPaused ? 'המשך' : 'השהה'}
                    </Button>
                    <Button
                      appearance="secondary"
                      icon={<StopRegular />}
                      onClick={handleCancelIndex}
                      size="small"
                      title="עצור"
                      style={{ flexShrink: 0, color: '#d13438' }}
                    >
                      עצור
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Updates Section
  const renderUpdatesSection = () => (
    <div className="settings-container-win11">
      <div className="settings-header-win11">
        <h1 className="settings-title-win11">עדכונים</h1>
        <p className="settings-subtitle-win11">עדכוני תוכנה וספרים</p>
      </div>

      <div className="settings-section-win11">
        <h2 className="settings-section-title">עדכוני תוכנה</h2>
        
        <div className="settings-group-win11">
          <div className="setting-item-win11">
            <div className="setting-item-left">
              <AppsRegular className="setting-item-icon" />
              <div className="setting-item-content">
                <div className="setting-item-title">גרסה נוכחית</div>
                <div className="setting-item-description">
                  1.0.0
                </div>
              </div>
            </div>
            <div className="setting-item-right">
              <Button
                appearance="primary"
                icon={<ArrowSyncRegular />}
                size="small"
              >
                בדוק עדכונים
              </Button>
            </div>
          </div>

          <div className="setting-item-win11">
            <div className="setting-item-left">
              <ArrowDownloadRegular className="setting-item-icon" />
              <div className="setting-item-content">
                <div className="setting-item-title">עדכון אוטומטי</div>
                <div className="setting-item-description">
                  הורד והתקן עדכונים באופן אוטומטי
                </div>
              </div>
            </div>
            <div className="setting-item-right">
              <Switch />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section-win11">
        <h2 className="settings-section-title">עדכוני ספרים</h2>
        
        <div className="settings-group-win11">
          <div className="setting-item-win11">
            <div className="setting-item-left">
              <DatabaseRegular className="setting-item-icon" />
              <div className="setting-item-content">
                <div className="setting-item-title">סנכרון ספרייה</div>
                <div className="setting-item-description">
                  סנכרן עם מאגר הספרים המרכזי
                </div>
              </div>
            </div>
            <div className="setting-item-right">
              <Button
                appearance="primary"
                icon={<ArrowSyncRegular />}
                size="small"
              >
                סנכרן עכשיו
              </Button>
            </div>
          </div>

          <div className="setting-item-win11">
            <div className="setting-item-left">
              <ArrowDownloadRegular className="setting-item-icon" />
              <div className="setting-item-content">
                <div className="setting-item-title">הורד ספרים חדשים</div>
                <div className="setting-item-description">
                  הורד ספרים שנוספו למאגר
                </div>
              </div>
            </div>
            <div className="setting-item-right">
              <Button
                appearance="secondary"
                size="small"
              >
                עיין בספרים זמינים
              </Button>
            </div>
          </div>

          <div className="setting-item-win11">
            <div className="setting-item-left">
              <ArrowSyncRegular className="setting-item-icon" />
              <div className="setting-item-content">
                <div className="setting-item-title">סנכרון אוטומטי</div>
                <div className="setting-item-description">
                  בדוק עדכוני ספרים באופן אוטומטי
                </div>
              </div>
            </div>
            <div className="setting-item-right">
              <Switch />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render About Section
  const renderAboutSection = () => (
    <div className="settings-container-win11">
      <div className="settings-header-win11">
        <h1 className="settings-title-win11">אודות האוצר</h1>
        <p className="settings-subtitle-win11">מידע על האפליקציה</p>
      </div>

      <div className="settings-section-win11">
        <h2 className="settings-section-title">מידע כללי</h2>
        
        <div className="settings-group-win11">
          <div className="setting-item-win11">
            <div className="setting-item-left">
              <AppsRegular className="setting-item-icon" />
              <div className="setting-item-content">
                <div className="setting-item-title">גרסה</div>
                <div className="setting-item-description">
                  מאגר ספרייה תורנית מתקדם
                </div>
              </div>
            </div>
            <div className="setting-item-right">
              <div className="setting-item-value">1.0.0</div>
            </div>
          </div>
        </div>

        <div className="settings-group-win11">
          <div className="setting-item-win11">
            <div className="setting-item-left">
              <PersonRegular className="setting-item-icon" />
              <div className="setting-item-content">
                <div className="setting-item-title">מפתח</div>
                <div className="setting-item-description">
                  @userbot
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-group-win11">
          <div className="setting-item-win11">
            <div className="setting-item-left">
              <InfoRegular className="setting-item-icon" />
              <div className="setting-item-content">
                <div className="setting-item-title">אודות</div>
                <div className="setting-item-description">
                  פרויקט אוצריה ו-Hebrew Books
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="settings-page-win11">
      {/* Sidebar Navigation */}
      <div className="settings-sidebar-win11">
        <div className="settings-sidebar-header">
          <h1 className="settings-sidebar-title">הגדרות</h1>
        </div>
        
        <div className="settings-nav-items">
          <button
            className={`settings-nav-item ${activeSection === 'personalization' ? 'active' : ''}`}
            onClick={() => setActiveSection('personalization')}
          >
            {activeSection === 'personalization' ? (
              <ColorFilled className="settings-nav-icon" />
            ) : (
              <ColorRegular className="settings-nav-icon" />
            )}
            <span>התאמה אישית</span>
          </button>
          
          <button
            className={`settings-nav-item ${activeSection === 'libraries' ? 'active' : ''}`}
            onClick={() => setActiveSection('libraries')}
          >
            {activeSection === 'libraries' ? (
              <FolderFilled className="settings-nav-icon" />
            ) : (
              <FolderRegular className="settings-nav-icon" />
            )}
            <span>ספריות</span>
          </button>
          
          <button
            className={`settings-nav-item ${activeSection === 'indexes' ? 'active' : ''}`}
            onClick={() => setActiveSection('indexes')}
          >
            {activeSection === 'indexes' ? (
              <SearchFilled className="settings-nav-icon" />
            ) : (
              <SearchRegular className="settings-nav-icon" />
            )}
            <span>אינדקסים</span>
          </button>
          
          <button
            className={`settings-nav-item ${activeSection === 'updates' ? 'active' : ''}`}
            onClick={() => setActiveSection('updates')}
          >
            {activeSection === 'updates' ? (
              <ArrowSyncFilled className="settings-nav-icon" />
            ) : (
              <ArrowSyncRegular className="settings-nav-icon" />
            )}
            <span>עדכונים</span>
          </button>
          
          <button
            className={`settings-nav-item ${activeSection === 'about' ? 'active' : ''}`}
            onClick={() => setActiveSection('about')}
          >
            {activeSection === 'about' ? (
              <InfoFilled className="settings-nav-icon" />
            ) : (
              <InfoRegular className="settings-nav-icon" />
            )}
            <span>אודות</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="settings-main-content">
        {activeSection === 'personalization' && renderPersonalizationSection()}
        {activeSection === 'libraries' && renderDataSection()}
        {activeSection === 'indexes' && renderIndexesSection()}
        {activeSection === 'updates' && renderUpdatesSection()}
        {activeSection === 'about' && renderAboutSection()}
      </div>
    </div>
  );
};

export default Settings;
