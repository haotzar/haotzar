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
} from '@fluentui/react-icons';
import { useState, useEffect, useRef } from 'react';
import meilisearchEngine from './utils/meilisearchEngine';
import { 
  exportSettingsToFile, 
  importSettingsFromFile, 
  clearAllSettings,
  getSetting,
  updateSetting
} from './utils/settingsManager';
import './Settings.css';

const Settings = ({ isDark, setIsDark, onNavigateToMetadata }) => {
  const [activeSection, setActiveSection] = useState('personalization');
  const [selectedColor, setSelectedColor] = useState(() => getSetting('accentColor', '#5c3d2e'));
  const [libraryFolders, setLibraryFolders] = useState(() => getSetting('libraryFolders', ['books']));
  const [backgroundMode, setBackgroundMode] = useState(() => getSetting('backgroundMode', 'with-image'));

  // state לבניית אינדקס
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
        // שימוש ב-Tauri dialog API דרך window.__TAURI__
        const selectedPath = await window.__TAURI__.dialog.open({
          directory: true,
          multiple: false,
          title: 'בחר תיקיית ספרים'
        });
        
        if (selectedPath && typeof selectedPath === 'string') {
          const folderName = selectedPath.split(/[/\\]/).pop();
          
          if (!libraryFolders.includes(selectedPath)) {
            const updatedFolders = [...libraryFolders, selectedPath];
            setLibraryFolders(updatedFolders);
            updateSetting('libraryFolders', updatedFolders);
            
            alert(`התיקייה "${folderName}" נוספה בהצלחה!\n\nנתיב: ${selectedPath}\n\nהאפליקציה תתרענן כעת כדי לטעון את הספרים החדשים.`);
            window.location.reload();
          } else {
            alert(`התיקייה "${folderName}" כבר קיימת בספרייה.`);
          }
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
            
            if (window.confirm(`התיקייה "${folderName}" נוספה בהצלחה!\n\nנתיב: ${selectedPath}\n\nהאפליקציה תתרענן כעת כדי לטעון את הספרים החדשים.\n\nלחץ OK להמשך.`)) {
              window.location.reload();
            }
          } else {
            alert(`התיקייה "${folderName}" כבר קיימת בספרייה.`);
          }
        }
      } else if (isTauri) {
        // שימוש ב-Tauri dialog API דרך window.__TAURI__
        try {
          const selectedPath = await window.__TAURI__.dialog.open({
            directory: true,
            multiple: false,
            title: 'בחר תיקיית ספרים'
          });
          
          if (selectedPath && typeof selectedPath === 'string') {
            const folderName = selectedPath.split(/[/\\]/).pop();
            
            if (!libraryFolders.includes(selectedPath)) {
              const updatedFolders = [...libraryFolders, selectedPath];
              setLibraryFolders(updatedFolders);
              updateSetting('libraryFolders', updatedFolders);
              
              if (window.confirm(`התיקייה "${folderName}" נוספה בהצלחה!\n\nנתיב: ${selectedPath}\n\nהאפליקציה תתרענן כעת כדי לטעון את הספרים החדשים.\n\nלחץ OK להמשך.`)) {
                window.location.reload();
              }
            } else {
              alert(`התיקייה "${folderName}" כבר קיימת בספרייה.`);
            }
          }
        } catch (error) {
          console.error('❌ שגיאה בפתיחת דיאלוג Tauri:', error);
          alert('שגיאה בבחירת תיקייה: ' + error.message);
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;
        
        input.onchange = (e) => {
          const files = Array.from(e.target.files);
          if (files.length > 0) {
            const folderPath = files[0].webkitRelativePath.split('/')[0];
            
            if (!libraryFolders.includes(folderPath)) {
              const updatedFolders = [...libraryFolders, folderPath];
              setLibraryFolders(updatedFolders);
              updateSetting('libraryFolders', updatedFolders);
              
              if (window.confirm(`התיקייה "${folderPath}" נוספה בהצלחה!\n\nהאפליקציה תתרענן כעת כדי לטעון את הספרים החדשים.\n\nלחץ OK להמשך.`)) {
                window.location.reload();
              }
            } else {
              alert(`התיקייה "${folderPath}" כבר קיימת בספרייה.`);
            }
          }
        };
        
        input.click();
      }
    } catch (error) {
      console.error('שגיאה בהוספת תיקייה:', error);
      alert('שגיאה בהוספת התיקייה: ' + error.message);
    }
  };

  const handleRemoveFolder = (folderName) => {
    if (folderName === 'books') {
      alert('לא ניתן להסיר את תיקיית books הראשית');
      return;
    }
    
    if (confirm(`האם אתה בטוח שברצונך להסיר את התיקייה "${folderName}" מהספרייה?\n\nהאפליקציה תתרענן אחרי ההסרה.`)) {
      const updatedFolders = libraryFolders.filter(folder => folder !== folderName);
      setLibraryFolders(updatedFolders);
      updateSetting('libraryFolders', updatedFolders);
      
      alert(`התיקייה "${folderName}" הוסרה מהספרייה`);
      window.location.reload();
    }
  };

  const handleExportSettings = async () => {
    const success = await exportSettingsToFile();
    if (success) {
      alert('ההגדרות יוצאו בהצלחה לקובץ JSON');
    } else {
      alert('שגיאה בייצוא ההגדרות');
    }
  };

  const handleImportSettings = async () => {
    try {
      const settings = await importSettingsFromFile();
      
      if (settings.theme) {
        setIsDark(settings.theme === 'dark');
      }
      
      alert('ההגדרות יובאו בהצלחה! רענן את הדף כדי לראות את השינויים.');
    } catch (error) {
      alert('שגיאה בייבוא ההגדרות: ' + error.message);
    }
  };

  const handleClearSettings = () => {
    if (confirm('האם אתה בטוח שברצונך למחוק את כל ההגדרות?')) {
      const success = clearAllSettings();
      if (success) {
        alert('כל ההגדרות נמחקו בהצלחה! רענן את הדף.');
      } else {
        alert('שגיאה במחיקת ההגדרות');
      }
    }
  };

  const handleSelectIndexFolder = async () => {
    try {
      const isTauri = window.__TAURI__ !== undefined;
      const isElectron = window.electron !== undefined;
      
      if (isTauri) {
        // שימוש ב-Tauri dialog API דרך window.__TAURI__
        try {
          const selectedPath = await window.__TAURI__.dialog.open({
            directory: true,
            multiple: false,
            title: 'בחר תיקייה לאינדקס'
          });
          
          if (selectedPath && typeof selectedPath === 'string') {
            setIndexFolder(selectedPath);
            const folderName = selectedPath.split(/[/\\]/).pop().toLowerCase().replace(/\s+/g, '_');
            setIndexName(folderName || 'books');
            setIndexDone(false);
            setIndexStatus('');
          }
        } catch (error) {
          console.error('❌ שגיאה בפתיחת דיאלוג Tauri:', error);
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
        setIndexStatus('בחירת תיקיות זמינה רק בגרסת Tauri או Electron');
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
        // שימוש ב-Tauri dialog API דרך window.__TAURI__
        try {
          const selectedPath = await window.__TAURI__.dialog.open({
            directory: false,
            multiple: false,
            title: 'בחר קובץ מסד נתונים של אוצריא',
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
          console.error('❌ שגיאה בפתיחת דיאלוג Tauri:', error);
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
        setIndexStatus('בחירת קבצים זמינה רק בגרסת Tauri או Electron');
      }
    } catch (error) {
      setIndexStatus('שגיאה בבחירת קובץ: ' + error.message);
    }
  };

  const handleBuildIndex = async () => {
    if (indexType === 'pdf' && !indexFolder) {
      setIndexStatus('יש לבחור תיקייה תחילה');
      return;
    }
    if ((indexType === 'books' || indexType === 'lines') && !otzariaDbPath) {
      setIndexStatus('יש לבחור קובץ מסד נתונים של אוצריא');
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

      setIndexStatus('מוודא ש-Meilisearch רץ...');
      setIndexProgress(5);
      await meilisearchEngine.startServer();
      
      setIndexStatus('בודק שהשרת מוכן...');
      let serverReady = false;
      for (let i = 0; i < 30; i++) {
        try {
          // רק בדוק שהשרת מוכן - אל תבקש אינדקסים
          if (meilisearchEngine.isReady()) {
            serverReady = true;
            break;
          }
          // אם לא מוכן, המתן קצת
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          console.warn('שגיאה בבדיקת מוכנות שרת:', e);
        }
        
        setIndexProgress(5 + i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (!serverReady) {
        setIndexStatus('שגיאה: שרת Meilisearch לא הגיב');
        setIndexBuilding(false);
        setCanCancelIndex(false);
        return;
      }
      
      setIndexProgress(35);
      setIndexStatus('מריץ indexer.exe...');
      setIndexProgress(40);
      
      let command = `resources\\meilisearch\\indexer.exe ${indexType} --index "${indexName.trim()}"`;
      
      if (indexType === 'pdf') {
        command += ` --input "${indexFolder}"`;
      } else if (indexType === 'books' || indexType === 'lines') {
        command += ` --db "${otzariaDbPath}"`;
      }

      const progressInterval = setInterval(() => {
        setIndexProgress(prev => {
          if (prev < 90) return prev + 1;
          return prev;
        });
      }, 2000);

      const result = await window.electron.runIndexer(command);
      
      clearInterval(progressInterval);
      
      if (result.success) {
        setIndexProgress(100);
        setIndexStatus(`האינדקס "${indexName}" נבנה בהצלחה!`);
        setIndexDone(true);
      } else {
        const errorMsg = result.error || result.output || 'תהליך נכשל';
        setIndexStatus('שגיאה: ' + errorMsg);
      }
    } catch (error) {
      setIndexStatus('שגיאה בבניית האינדקס: ' + error.message);
    } finally {
      setIndexBuilding(false);
      setCanCancelIndex(false);
    }
  };

  useEffect(() => {
    const savedColor = getSetting('accentColor', '#5c3d2e');
    const savedBackgroundMode = getSetting('backgroundMode', 'with-image');
    
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
        <h2 className="settings-section-title">מראה</h2>
        
        {/* Theme Toggle */}
        <div className="settings-group-win11">
          <div className="setting-item-win11">
            <div className="setting-item-left">
              <DarkThemeRegular className="setting-item-icon" />
              <div className="setting-item-content">
                <div className="setting-item-title">מצב תצוגה</div>
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

        {/* Color Picker */}
        <div className="settings-group-win11">
          <div className="setting-item-win11">
            <div className="setting-item-left">
              <ColorRegular className="setting-item-icon" />
              <div className="setting-item-content">
                <div className="setting-item-title">צבע בסיס</div>
                <div className="setting-item-description">
                  {colorOptions.find(c => c.value === selectedColor)?.name || 'מותאם אישית'}
                </div>
              </div>
            </div>
            <div className="setting-item-right">
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {colorOptions.map((color) => (
                  <div
                    key={color.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleColorChange(color);
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: color.value,
                      cursor: 'pointer',
                      border: selectedColor === color.value ? '2px solid #0067c0' : '1px solid rgba(0,0,0,0.15)',
                      transition: 'all 0.1s ease',
                      boxShadow: selectedColor === color.value ? '0 0 0 1px rgba(0,103,192,0.3)' : 'none'
                    }}
                    title={color.name}
                  />
                ))}
              </div>
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
                  appearance={backgroundMode === 'none' ? 'primary' : 'secondary'}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBackgroundModeChange('none');
                  }}
                >
                  ללא
                </Button>
                <Button
                  appearance={backgroundMode === 'with-image' ? 'primary' : 'secondary'}
                  size="small"
                  onClick={(e) => {
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
        <h1 className="settings-title-win11">ניהול נתונים</h1>
        <p className="settings-subtitle-win11">נהל את הספרייה, הגדרות והאינדקס שלך</p>
      </div>

      <div className="settings-section-win11">
        <h2 className="settings-section-title">ספרייה</h2>
        
        <div className="settings-group-win11">
          {/* Library Folders */}
          <div className="setting-item-win11" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px', padding: '16px', overflow: 'visible' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
              <FolderRegular className="setting-item-icon" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                <div className="setting-item-title">תיקיות ספרייה</div>
                <div className="setting-item-description">
                  נהל את התיקיות שמכילות את הספרים שלך
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
                  ערוך את המטא-דאטה של הספרים
                </div>
              </div>
            </div>
            <div className="setting-item-right">
              <ChevronRightRegular className="setting-item-arrow" />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section-win11">
        <h2 className="settings-section-title">גיבוי</h2>
        
        {/* Export Settings */}
        <div className="settings-group-win11">
          <div className="setting-item-win11 clickable" onClick={handleExportSettings}>
            <div className="setting-item-left">
              <ArrowDownloadRegular className="setting-item-icon" />
              <div className="setting-item-content">
                <div className="setting-item-title">ייצא הגדרות</div>
                <div className="setting-item-description">
                  שמור את כל ההגדרות לקובץ JSON
                </div>
              </div>
            </div>
            <div className="setting-item-right">
              <ChevronRightRegular className="setting-item-arrow" />
            </div>
          </div>
        </div>

        {/* Import Settings */}
        <div className="settings-group-win11">
          <div className="setting-item-win11 clickable" onClick={handleImportSettings}>
            <div className="setting-item-left">
              <ArrowUploadRegular className="setting-item-icon" />
              <div className="setting-item-content">
                <div className="setting-item-title">ייבא הגדרות</div>
                <div className="setting-item-description">
                  טען הגדרות מקובץ JSON
                </div>
              </div>
            </div>
            <div className="setting-item-right">
              <ChevronRightRegular className="setting-item-arrow" />
            </div>
          </div>
        </div>

        {/* Clear Settings */}
        <div className="settings-group-win11">
          <div className="setting-item-win11 clickable" onClick={handleClearSettings}>
            <div className="setting-item-left">
              <DeleteRegular className="setting-item-icon" style={{ color: '#d13438' }} />
              <div className="setting-item-content">
                <div className="setting-item-title" style={{ color: '#d13438' }}>מחק הגדרות</div>
                <div className="setting-item-description">
                  מחק את כל ההגדרות והכרטיסיות השמורות
                </div>
              </div>
            </div>
            <div className="setting-item-right">
              <ChevronRightRegular className="setting-item-arrow" style={{ color: '#d13438' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section-win11">
        <h2 className="settings-section-title">אינדקס חיפוש</h2>
        
        {/* Build Index */}
        <div className="settings-group-win11">
          <div className="setting-item-win11" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px', padding: '16px', overflow: 'visible' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
              <SearchRegular className="setting-item-icon" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                <div className="setting-item-title">בניית אינדקס</div>
                <div className="setting-item-description">
                  בנה אינדקס חיפוש מלא ב-Meilisearch
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
                    ספרים
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
                    <Text size={200} style={{ opacity: 0.7, wordBreak: 'break-word' }}>{indexStatus}</Text>
                  )}
                </div>
              )}

              {/* Build Button */}
              <Button
                appearance="primary"
                icon={<SearchRegular />}
                onClick={handleBuildIndex}
                disabled={indexBuilding || (indexType === 'pdf' && !indexFolder) || ((indexType === 'books' || indexType === 'lines') && !otzariaDbPath)}
                style={{ width: '100%', marginTop: '8px', boxSizing: 'border-box' }}
                size="small"
              >
                {indexBuilding ? 'בונה אינדקס...' : indexDone ? 'בנה מחדש' : 'בנה אינדקס'}
              </Button>
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
                  מאגר ספרים תורני מתקדם
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
                <div className="setting-item-title">תודות</div>
                <div className="setting-item-description">
                  לפרוייקט אוצריא ול-Hebrew Books
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
            <ColorFilled className="settings-nav-icon" primaryFill="#667eea" />
            <span>התאמה אישית</span>
          </button>
          
          <button
            className={`settings-nav-item ${activeSection === 'data' ? 'active' : ''}`}
            onClick={() => setActiveSection('data')}
          >
            <DatabaseFilled className="settings-nav-icon" primaryFill="#f5576c" />
            <span>ניהול נתונים</span>
          </button>
          
          <button
            className={`settings-nav-item ${activeSection === 'about' ? 'active' : ''}`}
            onClick={() => setActiveSection('about')}
          >
            <InfoFilled className="settings-nav-icon" primaryFill="#00f2fe" />
            <span>אודות</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="settings-main-content">
        {activeSection === 'personalization' && renderPersonalizationSection()}
        {activeSection === 'data' && renderDataSection()}
        {activeSection === 'about' && renderAboutSection()}
      </div>
    </div>
  );
};

export default Settings;
