import { useState, useEffect } from 'react';
import {
  AddRegular,
  DeleteRegular,
  PlayRegular,
  InfoRegular,
  PlugDisconnectedRegular,
} from '@fluentui/react-icons';
import { Button, Switch } from '@fluentui/react-components';
import TooltipWrapper from './TooltipWrapper';
import './PluginsManager.css';

const PluginsManager = ({ onOpenPlugin }) => {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(false);

  // טעינת רשימת תוספים מ-localStorage
  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = () => {
    try {
      const savedPlugins = localStorage.getItem('installedPlugins');
      if (savedPlugins) {
        setPlugins(JSON.parse(savedPlugins));
      }
    } catch (error) {
      console.error('Error loading plugins:', error);
    }
  };

  const savePlugins = (updatedPlugins) => {
    try {
      localStorage.setItem('installedPlugins', JSON.stringify(updatedPlugins));
      setPlugins(updatedPlugins);
    } catch (error) {
      console.error('Error saving plugins:', error);
    }
  };

  // בחירת תיקיית תוסף
  const handleSelectPluginFolder = async () => {
    try {
      setLoading(true);
      
      // בקשת גישה לתיקייה
      const dirHandle = await window.showDirectoryPicker();
      
      // קריאת קובץ manifest.json
      let manifestData = null;
      try {
        const manifestFile = await dirHandle.getFileHandle('manifest.json');
        const file = await manifestFile.getFile();
        const text = await file.text();
        manifestData = JSON.parse(text);
      } catch (error) {
        alert('לא נמצא קובץ manifest.json בתיקייה. אנא ודא שהתיקייה מכילה את הקבצים הנדרשים.');
        setLoading(false);
        return;
      }

      // בדיקת שדות חובה
      if (!manifestData.name || !manifestData.version || !manifestData.main) {
        alert('קובץ manifest.json חסר שדות חובה (name, version, main)');
        setLoading(false);
        return;
      }

      // קריאת קבצי התוסף
      const pluginFiles = {};
      
      // קריאת קובץ HTML ראשי
      try {
        const htmlFile = await dirHandle.getFileHandle(manifestData.main);
        const file = await htmlFile.getFile();
        pluginFiles.html = await file.text();
      } catch (error) {
        alert(`לא נמצא קובץ HTML ראשי: ${manifestData.main}`);
        setLoading(false);
        return;
      }

      // קריאת קבצי CSS (אופציונלי)
      if (manifestData.styles) {
        for (const styleFile of manifestData.styles) {
          try {
            const cssFile = await dirHandle.getFileHandle(styleFile);
            const file = await cssFile.getFile();
            const cssContent = await file.text();
            pluginFiles[styleFile] = cssContent;
          } catch (error) {
            console.warn(`CSS file not found: ${styleFile}`);
          }
        }
      }

      // קריאת קבצי JS (אופציונלי)
      if (manifestData.scripts) {
        for (const scriptFile of manifestData.scripts) {
          try {
            const jsFile = await dirHandle.getFileHandle(scriptFile);
            const file = await jsFile.getFile();
            const jsContent = await file.text();
            pluginFiles[scriptFile] = jsContent;
          } catch (error) {
            console.warn(`JS file not found: ${scriptFile}`);
          }
        }
      }

      // קריאת אייקון (אופציונלי)
      if (manifestData.icon) {
        try {
          const iconFile = await dirHandle.getFileHandle(manifestData.icon);
          const file = await iconFile.getFile();
          const reader = new FileReader();
          reader.onload = (e) => {
            pluginFiles.icon = e.target.result;
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.warn('Icon file not found');
        }
      }

      // יצירת אובייקט תוסף
      const newPlugin = {
        id: `plugin-${Date.now()}`,
        name: manifestData.name,
        version: manifestData.version,
        description: manifestData.description || '',
        author: manifestData.author || '',
        icon: pluginFiles.icon || null,
        files: pluginFiles,
        manifest: manifestData,
        installedAt: new Date().toISOString(),
      };

      // הוספת התוסף לרשימה
      const updatedPlugins = [...plugins, newPlugin];
      savePlugins(updatedPlugins);
      
      setLoading(false);
      alert(`התוסף "${newPlugin.name}" הותקן בהצלחה!`);
    } catch (error) {
      console.error('Error selecting plugin folder:', error);
      setLoading(false);
      if (error.name !== 'AbortError') {
        alert('שגיאה בטעינת התוסף. אנא נסה שוב.');
      }
    }
  };

  // הסרת תוסף
  const handleRemovePlugin = (pluginId) => {
    if (confirm('האם אתה בטוח שברצונך להסיר תוסף זה?')) {
      const updatedPlugins = plugins.filter(p => p.id !== pluginId);
      savePlugins(updatedPlugins);
    }
  };

  // הרצת תוסף - פתיחה בטאב חדש
  const handleRunPlugin = (plugin) => {
    if (onOpenPlugin) {
      onOpenPlugin(plugin);
    }
  };

  return (
    <div className="plugins-manager">
      <div className="plugins-header">
        <div className="plugins-header-content">
          <h2>מנהל תוספים</h2>
          <p>טען והפעל תוספים מותאמים אישית לאפליקציה</p>
        </div>
        <Button
          appearance="primary"
          icon={<AddRegular />}
          onClick={handleSelectPluginFolder}
          disabled={loading}
        >
          {loading ? 'טוען...' : 'הוסף תוסף'}
        </Button>
      </div>

      <div className="plugins-content">
        {/* רשימת תוספים */}
        <div className="plugins-list-container">
          <div className="plugins-list-header">
            <h3>תוספים מותקנים ({plugins.length})</h3>
          </div>
          
          {plugins.length === 0 ? (
            <div className="plugins-empty-state">
              <PlugDisconnectedRegular className="empty-icon" />
              <p>אין תוספים מותקנים</p>
              <p className="empty-hint">לחץ על "הוסף תוסף" כדי להתחיל</p>
            </div>
          ) : (
            <div className="plugins-grid">
              {plugins.map(plugin => (
                <div
                  key={plugin.id}
                  className="plugin-card"
                >
                  <div className="plugin-card-header">
                    {plugin.icon ? (
                      <img src={plugin.icon} alt={plugin.name} className="plugin-icon" />
                    ) : (
                      <div className="plugin-icon-placeholder">
                        <PlugDisconnectedRegular />
                      </div>
                    )}
                    <div className="plugin-info">
                      <h4>{plugin.name}</h4>
                      <span className="plugin-version">v{plugin.version}</span>
                    </div>
                  </div>
                  
                  {plugin.description && (
                    <p className="plugin-description">{plugin.description}</p>
                  )}
                  
                  {plugin.author && (
                    <p className="plugin-author">מאת: {plugin.author}</p>
                  )}
                  
                  <div className="plugin-actions">
                    <div className="plugin-switch-container">
                      <Switch
                        label="הפעל"
                        onChange={() => handleRunPlugin(plugin)}
                      />
                    </div>
                    <TooltipWrapper content="הסר תוסף">
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<DeleteRegular />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePlugin(plugin.id);
                        }}
                      />
                    </TooltipWrapper>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* הוראות */}
        <div className="plugins-instructions-panel">
          <div className="plugin-instructions">
            <InfoRegular className="instructions-icon" />
            <h4>כיצד ליצור תוסף?</h4>
            <ol>
              <li>צור תיקייה חדשה לתוסף שלך</li>
              <li>הוסף קובץ <code>manifest.json</code> עם המידע הבא:
                <pre>{`{
  "name": "שם התוסף",
  "version": "1.0.0",
  "description": "תיאור התוסף",
  "author": "שם המפתח",
  "main": "index.html",
  "icon": "icon.png",
  "styles": ["style.css"],
  "scripts": ["script.js"]
}`}</pre>
              </li>
              <li>צור קובץ HTML ראשי (למשל <code>index.html</code>)</li>
              <li>הוסף קבצי CSS ו-JS לפי הצורך</li>
              <li>הוסף אייקון (אופציונלי)</li>
              <li>לחץ על "הוסף תוסף" ובחר את התיקייה</li>
            </ol>
            <p className="instructions-note">
              💡 התוספים ייפתחו בטאבים נפרדים ויכללו אייקון משלהם
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PluginsManager;
