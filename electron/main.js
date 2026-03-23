const { app, BrowserWindow, shell, ipcMain, protocol } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let meilisearchProcess = null;
let sharedMeiliClient = null; // client משותף לכל הבקשות
let clientLastUsed = null; // מתי השתמשנו ב-client בפעם האחרונה

// פונקציה לקבלת/יצירת client משותף
function getMeiliClient() {
  const now = Date.now();
  const CLIENT_MAX_AGE = 120000; // 2 דקות (הוגדל מ-30 שניות)
  
  // אם ה-client ישן מדי, אפס אותו
  if (sharedMeiliClient && clientLastUsed && (now - clientLastUsed > CLIENT_MAX_AGE)) {
    console.log('🔄 Client ישן מדי - יוצר חדש');
    sharedMeiliClient = null;
  }
  
  if (!sharedMeiliClient) {
    const { MeiliSearch } = require('meilisearch');
    sharedMeiliClient = new MeiliSearch({
      host: 'http://127.0.0.1:7700',
      timeout: 60000, // 60 שניות - השרת צריך זמן רב לטעון 42GB אינדקסים
      requestConfig: {
        headers: {
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=120' // החיבור יישאר פתוח 2 דקות
        }
      }
    });
    console.log('🔗 נוצר MeiliSearch client חדש (timeout: 60s)');
  }
  
  clientLastUsed = now;
  return sharedMeiliClient;
}

// פונקציה לאיפוס client (במקרה של שגיאה)
function resetMeiliClient() {
  sharedMeiliClient = null;
  clientLastUsed = null;
  console.log('🔄 MeiliSearch client אופס');
}

// פונקציה מתקדמת להסרת חסימת Windows מקובץ
async function attemptUnblockFile(filePath) {
  const { execSync, exec } = require('child_process');
  let success = false;
  
  console.log('🔓 מנסה להסיר חסימת Windows מהקובץ...');
  
  // שיטה 1: Unblock-File עם PowerShell
  try {
    execSync(`powershell -Command "Unblock-File -Path '${filePath}'"`, {
      stdio: 'ignore',
      windowsHide: true,
      timeout: 10000
    });
    console.log('✅ הוסרה חסימת Windows (Unblock-File)');
    success = true;
  } catch (e) {
    console.warn('⚠️ Unblock-File נכשל:', e.message);
  }
  
  // שיטה 2: הסר Zone.Identifier stream
  try {
    const zoneFile = filePath + ':Zone.Identifier';
    if (fs.existsSync(zoneFile)) {
      fs.unlinkSync(zoneFile);
      console.log('✅ הוסר Zone.Identifier stream');
      success = true;
    }
  } catch (e) {
    console.warn('⚠️ הסרת Zone.Identifier נכשלה');
  }
  
  // שיטה 3: שנה הרשאות
  try {
    fs.chmodSync(filePath, 0o755);
    console.log('✅ הרשאות שונו ל-755');
    success = true;
  } catch (e) {
    console.warn('⚠️ שינוי הרשאות נכשל');
  }
  
  // שיטה 4: נסה להעתיק את הקובץ למיקום חדש (עוקף חסימה)
  if (!success) {
    try {
      const tempPath = filePath + '.temp';
      fs.copyFileSync(filePath, tempPath);
      fs.unlinkSync(filePath);
      fs.renameSync(tempPath, filePath);
      fs.chmodSync(filePath, 0o755);
      console.log('✅ קובץ הועתק מחדש (עקיפת חסימה)');
      success = true;
    } catch (e) {
      console.warn('⚠️ העתקה מחדש נכשלה');
    }
  }
  
  // שיטה 5: בדיקה אם הקובץ ניתן להרצה
  if (success) {
    try {
      // נסה להריץ --help כדי לבדוק אם הקובץ עובד
      execSync(`"${filePath}" --help`, {
        stdio: 'ignore',
        windowsHide: true,
        timeout: 5000
      });
      console.log('✅ קובץ Meilisearch ניתן להרצה');
      return true;
    } catch (e) {
      console.warn('⚠️ הקובץ עדיין לא ניתן להרצה:', e.message);
      return false;
    }
  }
  
  return success;
}

// פונקציה לטיפול בשגיאות Meilisearch עם הצעות פתרון
function handleMeilisearchError(error, meilisearchPath) {
  console.error('❌ שגיאה בהפעלת Meilisearch:', error);
  
  const errorMessage = error.toString().toLowerCase();
  
  if (errorMessage.includes('access is denied') || errorMessage.includes('eftype')) {
    return {
      success: false,
      error: 'Access Denied - קובץ Meilisearch חסום',
      solution: 'הרץ את fix-meilisearch-simple.cmd כמנהל או מחק את התיקייה: ' + path.dirname(meilisearchPath),
      autoFix: true
    };
  }
  
  if (errorMessage.includes('file not found') || errorMessage.includes('enoent')) {
    return {
      success: false,
      error: 'Meilisearch file not found',
      solution: 'הורד Meilisearch מחדש או הפעל: npm run download:meilisearch'
    };
  }
  
  if (errorMessage.includes('port') || errorMessage.includes('address already in use')) {
    return {
      success: false,
      error: 'Port 7700 is already in use',
      solution: 'סגור תהליכי Meilisearch אחרים או הרץ: npm run kill-meilisearch'
    };
  }
  
  return {
    success: false,
    error: error.message || error.toString(),
    solution: 'בדוק את הלוגים או נסה להפעיל מחדש'
  };
}

// הגדרת custom protocol לטעינת קבצים מקומיים
// Protocol זה מאפשר ל-PDF.js לקרוא קבצים ישירות מהדיסק בצורה streaming
// ללא טעינת כל הקובץ לזיכרון - חשוב מאוד לביצועים!
function setupCustomProtocol() {
  // רשום את local-file כ-streaming protocol
  protocol.registerStreamProtocol('local-file', (request, callback) => {
    let url = request.url.replace('local-file://', '');
    
    // הסר slashes מיותרים בהתחלה
    url = url.replace(/^\/+/, '');
    
    const decodedPath = decodeURIComponent(url);
    
    console.log('📄 Custom protocol request:', request.url);
    console.log('📄 Decoded path:', decodedPath);
    
    try {
      // וודא שהקובץ קיים
      if (fs.existsSync(decodedPath)) {
        console.log('✅ File found, serving via streaming:', decodedPath);
        // החזר stream של הקובץ
        callback({
          statusCode: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Access-Control-Allow-Origin': '*'
          },
          data: fs.createReadStream(decodedPath)
        });
      } else {
        console.error('❌ File not found:', decodedPath);
        callback({ statusCode: 404 });
      }
    } catch (error) {
      console.error('❌ Error loading file:', error);
      callback({ statusCode: 500 });
    }
  });
  
  // הוסף protocol handler לקבצים סטטיים מ-dist
  protocol.interceptFileProtocol('file', (request, callback) => {
    let url = request.url.substr(7); // הסר 'file://'
    
    console.log('🔍 File protocol request:', url);
    
    // נרמל את הנתיב
    url = decodeURIComponent(url);
    
    // אם זה נתיב שמתחיל ב-/ ולא כולל : (כלומר לא C:/ וכו')
    if (url.startsWith('/') && !url.includes(':')) {
      // זה נתיב יחסי - חפש ב-dist
      const fileName = url.substring(1); // הסר את ה-/ הראשון
      const distPath = path.join(__dirname, '../dist', fileName);
      console.log('🔍 Looking for file in dist:', distPath);
      
      if (fs.existsSync(distPath)) {
        console.log('✅ Found in dist:', distPath);
        callback({ path: distPath });
        return;
      }
    }
    
    // אם זה נתיב מוחלט שמתחיל ב-C:/ (או כונן אחר) אבל הקובץ לא קיים
    // נסה לחפש אותו ב-dist
    if (url.includes(':') && !fs.existsSync(url)) {
      // קח רק את שם הקובץ
      const fileName = path.basename(url);
      const distPath = path.join(__dirname, '../dist', fileName);
      console.log('🔍 File not found at absolute path, trying dist:', distPath);
      
      if (fs.existsSync(distPath)) {
        console.log('✅ Found in dist:', distPath);
        callback({ path: distPath });
        return;
      }
    }
    
    // אחרת, השתמש בנתיב המקורי
    callback({ path: path.normalize(url) });
  });
}

function createWindow() {
  // קביעת נתיב האייקון - שונה בין dev ל-production
  const iconPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../public/icon.png')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'icon.png');
  
  // אם האייקון לא נמצא, נסה נתיבים נוספים
  let finalIconPath = iconPath;
  if (!fs.existsSync(iconPath)) {
    const alternativePaths = [
      path.join(__dirname, '../dist/icon.png'),
      path.join(__dirname, '../public/icon.png'),
      path.join(process.resourcesPath, 'icon.png')
    ];
    
    for (const altPath of alternativePaths) {
      if (fs.existsSync(altPath)) {
        finalIconPath = altPath;
        console.log('✅ Found icon at:', altPath);
        break;
      }
    }
  }
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'haotzar',
    icon: finalIconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // מאפשר טעינת קבצים מקומיים דרך custom protocol
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false // חשוב! מאפשר ל-preload להשתמש ב-Node modules
    },
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    frame: false, // הסרת ה-frame המקורי של Windows
    titleBarStyle: 'hidden', // הסתרת title bar
    titleBarOverlay: {
      color: '#ffffff',
      symbolColor: '#2a1810',
      height: 32
    }
  });

  // בסביבת פיתוח - טען מהשרת המקומי
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // בסביבת ייצור - טען מקבצים סטטיים
    const distPath = path.join(__dirname, '../dist/index.html');
    console.log('📂 Loading from:', distPath);
    mainWindow.loadFile(distPath);
  }

  // כפיית פתיחת קישורים חיצוניים ב-Edge במקום בדפדפן ברירת המחדל
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // פתיחה ב-Edge במקום בדפדפן ברירת המחדל
    openInEdge(url);
    return { action: 'deny' };
  });

  // טיפול בקישורים שנפתחים דרך navigation
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // אם זה לא ה-URL של האפליקציה עצמה, פתח ב-Edge
    if (!url.startsWith('http://localhost:5173') && 
        !url.startsWith('file://')) {
      event.preventDefault();
      openInEdge(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// פונקציה לפתיחת URL ב-Edge
function openInEdge(url) {
  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  let edgePath = edgePaths[0];
  
  // בדיקה איזה נתיב קיים
  const fs = require('fs');
  for (const path of edgePaths) {
    if (fs.existsSync(path)) {
      edgePath = path;
      break;
    }
  }

  exec(`"${edgePath}" "${url}"`, (error) => {
    if (error) {
      console.error('שגיאה בפתיחת Edge:', error);
      // אם נכשל, השתמש בדפדפן ברירת המחדל
      shell.openExternal(url);
    }
  });
}

// רשום את local-file כ-standard scheme - חייב להיות לפני app.whenReady!
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

// יצירת חלון כשהאפליקציה מוכנה
app.whenReady().then(() => {
  // הגדר custom protocol - חשוב לעשות זאת לפני יצירת החלון!
  setupCustomProtocol();
  
  // הגדר IPC handlers
  setupIpcHandlers();
  
  // פתח את החלון
  createWindow();
  
  // העתק Meilisearch binary אם צריך - בפרלל
  setupMeilisearch();
});

// רישום protocol schemes לפני שהאפליקציה מוכנה
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('local-file', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('local-file');
}

// הגדרת Meilisearch
function setupMeilisearch() {
  try {
    const userDataPath = app.getPath('userData');
    const meilisearchDir = path.join(userDataPath, 'meilisearch');
    const meilisearchExe = path.join(meilisearchDir, 'meilisearch.exe');
    
    // בדוק אם Meilisearch כבר קיים
    if (fs.existsSync(meilisearchExe)) {
      console.log('✅ Meilisearch כבר מותקן ב:', meilisearchExe);
      return;
    }
    
    // צור תיקייה
    if (!fs.existsSync(meilisearchDir)) {
      fs.mkdirSync(meilisearchDir, { recursive: true });
    }
    
    // נסה מספר נתיבים אפשריים
    let sourcePath = null;
    
    // במצב production
    if (process.resourcesPath) {
      sourcePath = path.join(process.resourcesPath, 'resources', 'meilisearch', 'meilisearch.exe');
    }
    
    // במצב development - נסה נתיבים שונים
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      const devPaths = [
        path.join(__dirname, '..', 'resources', 'meilisearch', 'meilisearch.exe'),
        path.join(process.cwd(), 'resources', 'meilisearch', 'meilisearch.exe'),
        path.join(__dirname, '..', '..', 'resources', 'meilisearch', 'meilisearch.exe')
      ];
      
      for (const devPath of devPaths) {
        console.log('מחפש ב:', devPath);
        if (fs.existsSync(devPath)) {
          sourcePath = devPath;
          break;
        }
      }
    }
    
    if (sourcePath && fs.existsSync(sourcePath)) {
      console.log('📦 מעתיק Meilisearch מ:', sourcePath);
      fs.copyFileSync(sourcePath, meilisearchExe);
      console.log('✅ Meilisearch הועתק בהצלחה ל:', meilisearchExe);
      
      // הסר חסימה מהקובץ (Windows Security) - בשלוש שיטות
      try {
        const { execSync } = require('child_process');
        
        // שיטה 1: Unblock-File
        try {
          execSync(`powershell -Command "Unblock-File -Path '${meilisearchExe}'"`, {
            stdio: 'ignore',
            windowsHide: true,
            timeout: 5000
          });
          console.log('🔓 הוסרה חסימת Windows מהקובץ (Unblock-File)');
        } catch (e) {
          console.warn('⚠️ Unblock-File נכשל');
        }
        
        // שיטה 2: הסר Zone.Identifier stream
        try {
          const zoneFile = meilisearchExe + ':Zone.Identifier';
          execSync(`powershell -Command "Remove-Item -Path '${zoneFile}' -ErrorAction SilentlyContinue"`, {
            stdio: 'ignore',
            windowsHide: true,
            timeout: 5000
          });
          console.log('🔓 הוסר Zone.Identifier stream');
        } catch (e) {
          console.warn('⚠️ הסרת Zone.Identifier נכשלה');
        }
        
        // שיטה 3: שנה הרשאות
        try {
          fs.chmodSync(meilisearchExe, 0o755);
          console.log('🔓 הרשאות שונו ל-755');
        } catch (e) {
          console.warn('⚠️ שינוי הרשאות נכשל');
        }
        
      } catch (unblockError) {
        console.warn('⚠️ לא הצלחתי להסיר חסימה אוטומטית:', unblockError.message);
        console.warn('💡 אנא הסר חסימה ידנית: לחץ ימני -> Properties -> Unblock');
      }
    } else {
      console.warn('⚠️ Meilisearch לא נמצא. חיפשתי ב:');
      console.warn('  - process.resourcesPath:', process.resourcesPath);
      console.warn('  - __dirname:', __dirname);
      console.warn('  - process.cwd():', process.cwd());
      console.warn('הורד את Meilisearch ידנית מ: https://github.com/meilisearch/meilisearch/releases');
      console.warn('והעתק ל:', meilisearchExe);
    }
  } catch (error) {
    console.error('❌ שגיאה בהגדרת Meilisearch:', error);
  }
}

// הגדרת IPC handlers
function setupIpcHandlers() {
  // פעולות חלון
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });
  
  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });
  
  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });
  
  ipcMain.handle('window-is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });
  
  // קבלת נתיב userData
  ipcMain.on('get-user-data-path', (event) => {
    event.returnValue = app.getPath('userData');
  });
  
  // קבלת נתיב האפליקציה
  ipcMain.on('get-app-path', (event) => {
    event.returnValue = app.getAppPath();
  });
  
  // בחירת תיקייה
  ipcMain.handle('select-folder', async () => {
    try {
      console.log('📁 Opening folder selection dialog...');
      const { dialog } = require('electron');
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'בחר תיקיית ספרים'
      });
      
      console.log('📁 Dialog result:', result);
      
      if (!result.canceled && result.filePaths.length > 0) {
        console.log('✅ Folder selected:', result.filePaths[0]);
        return { success: true, path: result.filePaths[0] };
      }
      console.log('❌ Dialog canceled');
      return { success: false };
    } catch (error) {
      console.error('❌ Error in select-folder:', error);
      return { success: false, error: error.message };
    }
  });
  
  // פתיחת תיקיית books
  ipcMain.handle('open-books-folder', async () => {
    try {
      const userDataPath = app.getPath('userData');
      const booksPath = path.join(userDataPath, 'books');
      
      // צור את התיקייה אם היא לא קיימת
      if (!fs.existsSync(booksPath)) {
        fs.mkdirSync(booksPath, { recursive: true });
      }
      
      console.log('📂 Opening books folder:', booksPath);
      await shell.openPath(booksPath);
      return { success: true, path: booksPath };
    } catch (error) {
      console.error('❌ Error opening books folder:', error);
      return { success: false, error: error.message };
    }
  });
  
  // פתיחת קישור חיצוני
  ipcMain.handle('open-external', async (event, url) => {
    try {
      console.log('🌐 Opening external URL:', url);
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('❌ Error opening external URL:', error);
      return { success: false, error: error.message };
    }
  });
  
  // הפעלת Meilisearch
  ipcMain.handle('start-meilisearch', async (event, config) => {
    try {
      if (meilisearchProcess) {
        console.log('⚠️ Meilisearch כבר רץ');
        return { success: true, message: 'Already running' };
      }
      
      const userDataPath = app.getPath('userData');
      const meilisearchExe = path.join(userDataPath, 'meilisearch', 'meilisearch.exe');
      
      if (!fs.existsSync(meilisearchExe)) {
        console.error('❌ Meilisearch לא נמצא ב:', meilisearchExe);
        return { success: false, error: 'Meilisearch not found at: ' + meilisearchExe };
      }
      
      // בדוק את גודל הקובץ
      const stats = fs.statSync(meilisearchExe);
      console.log(`📊 גודל Meilisearch: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
      
      if (stats.size < 1000000) { // פחות מ-1MB - כנראה פגום
        console.error('❌ קובץ Meilisearch נראה פגום (קטן מדי)');
        return { success: false, error: 'Meilisearch file appears corrupted (too small)' };
      }
      
      // נסה להסיר חסימה לפני הרצה - בשיטות מתקדמות
      const unblockSuccess = await attemptUnblockFile(meilisearchExe);
      if (!unblockSuccess) {
        console.warn('⚠️ לא הצלחתי להסיר חסימה מהקובץ - זה עלול לגרום לשגיאות');
      }
      
      const dbPath = path.join(userDataPath, 'meilisearch', 'data.ms');
      if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
      }
      
      const args = [
        '--db-path', dbPath,
        '--http-addr', `127.0.0.1:${config.port || 7700}`,
        '--no-analytics',
        '--max-indexing-memory', '1GB' // 1GB - סביר למחשב עם 8GB RAM
      ];
      
      // לא משתמשים ב-master key - רק לשימוש מקומי
      // const masterKey = config.masterKey || 'aSampleMasterKey';
      // args.push('--master-key', masterKey);
      
      console.log('🚀 מפעיל Meilisearch:', meilisearchExe, args);
      
      try {
        // ב-Windows, לפעמים צריך להריץ דרך cmd.exe כדי לעקוף בעיות EFTYPE
        if (process.platform === 'win32') {
          // בנה command line אחד
          const cmdArgs = ['/c', meilisearchExe, ...args];
          
          console.log('🪟 מריץ דרך cmd.exe:', cmdArgs);
          
          meilisearchProcess = spawn('cmd.exe', cmdArgs, {
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
            shell: false
          });
        } else {
          meilisearchProcess = spawn(meilisearchExe, args, {
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true
          });
        }
      } catch (spawnError) {
        console.error('❌ שגיאה ב-spawn:', spawnError);
        
        const errorResult = handleMeilisearchError(spawnError, meilisearchExe);
        
        // אם יש פתרון אוטומטי, נסה אותו
        if (errorResult.autoFix && spawnError.code === 'EFTYPE') {
          console.log('🔧 מנסה פתרון אוטומטי...');
          
          // נסה להסיר חסימה שוב בצורה יותר אגרסיבית
          const fixSuccess = await attemptUnblockFile(meilisearchExe);
          
          if (fixSuccess) {
            console.log('🔄 מנסה להפעיל שוב אחרי תיקון...');
            
            // נסה שוב
            try {
              if (process.platform === 'win32') {
                const cmdArgs = ['/c', meilisearchExe, ...args];
                meilisearchProcess = spawn('cmd.exe', cmdArgs, {
                  detached: false,
                  stdio: ['ignore', 'pipe', 'pipe'],
                  windowsHide: true,
                  shell: false
                });
              } else {
                meilisearchProcess = spawn(meilisearchExe, args, {
                  detached: false,
                  stdio: ['ignore', 'pipe', 'pipe'],
                  windowsHide: true
                });
              }
              
              console.log('✅ הפעלה מחדש הצליחה אחרי תיקון!');
            } catch (retryError) {
              console.error('❌ גם הניסיון השני נכשל:', retryError);
              return handleMeilisearchError(retryError, meilisearchExe);
            }
          } else {
            return errorResult;
          }
        } else {
          return errorResult;
        }
      }
      
      meilisearchProcess.stdout.on('data', (data) => {
        console.log(`Meilisearch: ${data}`);
      });
      
      meilisearchProcess.stderr.on('data', (data) => {
        const errorText = data.toString();
        console.error(`Meilisearch Error: ${errorText}`);
        
        // בדוק אם זו שגיאת הרשאות
        if (errorText.toLowerCase().includes('access is denied')) {
          console.error('❌ שגיאת הרשאות זוהתה!');
          console.error('💡 פתרון: הרץ את fix-meilisearch-simple.cmd כמנהל');
          
          // שלח הודעה לחלון הראשי
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('meilisearch-error', {
              type: 'permission_denied',
              message: 'Meilisearch חסום על ידי Windows Security',
              solution: 'הרץ את fix-meilisearch-simple.cmd כמנהל או מחק את התיקייה ונסה שוב'
            });
          }
        }
      });
      
      meilisearchProcess.on('error', (error) => {
        console.error('❌ שגיאה בהפעלת Meilisearch:', error);
        meilisearchProcess = null;
      });
      
      meilisearchProcess.on('exit', (code) => {
        console.log(`Meilisearch נסגר עם קוד: ${code}`);
        meilisearchProcess = null;
      });
      
      // המתן שהשרת יעלה
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return { success: true, message: 'Started successfully' };
    } catch (error) {
      console.error('❌ שגיאה בהפעלת Meilisearch:', error);
      return { success: false, error: error.message };
    }
  });
  
  // עצירת Meilisearch
  ipcMain.handle('stop-meilisearch', async () => {
    try {
      if (meilisearchProcess) {
        meilisearchProcess.kill();
        meilisearchProcess = null;
        // נקה את ה-client המשותף
        resetMeiliClient();
        console.log('🛑 Meilisearch נסגר וה-client נוקה');
        return { success: true };
      }
      return { success: true, message: 'Not running' };
    } catch (error) {
      console.error('❌ שגיאה בעצירת Meilisearch:', error);
      return { success: false, error: error.message };
    }
  });
  
  // בדיקת סטטוס Meilisearch
  ipcMain.handle('meilisearch-status', async () => {
    try {
      const userDataPath = app.getPath('userData');
      const meilisearchExe = path.join(userDataPath, 'meilisearch', 'meilisearch.exe');
      
      const status = {
        processRunning: meilisearchProcess !== null,
        fileExists: fs.existsSync(meilisearchExe),
        fileSize: 0,
        isBlocked: false,
        canExecute: false
      };
      
      if (status.fileExists) {
        const stats = fs.statSync(meilisearchExe);
        status.fileSize = stats.size;
        
        // בדוק אם הקובץ חסום
        try {
          const { execSync } = require('child_process');
          execSync(`"${meilisearchExe}" --help`, {
            stdio: 'ignore',
            windowsHide: true,
            timeout: 3000
          });
          status.canExecute = true;
        } catch (e) {
          if (e.message.toLowerCase().includes('access is denied')) {
            status.isBlocked = true;
          }
        }
      }
      
      return { success: true, status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // תיקון אוטומטי של Meilisearch
  ipcMain.handle('fix-meilisearch', async () => {
    try {
      const userDataPath = app.getPath('userData');
      const meilisearchExe = path.join(userDataPath, 'meilisearch', 'meilisearch.exe');
      
      if (!fs.existsSync(meilisearchExe)) {
        return { 
          success: false, 
          error: 'קובץ Meilisearch לא נמצא',
          solution: 'הפעל את האפליקציה כדי להוריד את Meilisearch'
        };
      }
      
      console.log('🔧 מתחיל תיקון אוטומטי של Meilisearch...');
      
      const fixSuccess = await attemptUnblockFile(meilisearchExe);
      
      if (fixSuccess) {
        return { 
          success: true, 
          message: 'Meilisearch תוקן בהצלחה!',
          canExecute: true
        };
      } else {
        return { 
          success: false, 
          error: 'לא הצלחתי לתקן את Meilisearch',
          solution: 'נסה להריץ fix-meilisearch-simple.cmd כמנהל או מחק את התיקייה'
        };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle('restart-meilisearch', async () => {
    try {
      console.log('🔄 מפעיל מחדש את Meilisearch...');
      
      // עצור את השרת הקיים
      if (meilisearchProcess) {
        meilisearchProcess.kill();
        meilisearchProcess = null;
        console.log('🛑 Meilisearch נסגר');
        
        // המתן שנייה לפני הפעלה מחדש
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // הפעל מחדש
      const userDataPath = app.getPath('userData');
      const meilisearchDir = path.join(userDataPath, 'meilisearch');
      const meilisearchPath = path.join(meilisearchDir, 'meilisearch.exe');
      const dbPath = path.join(meilisearchDir, 'data.ms');
      
      if (!fs.existsSync(meilisearchPath)) {
        return { success: false, error: 'Meilisearch not found' };
      }
      
      const args = [
        '--db-path', dbPath,
        '--http-addr', '127.0.0.1:7700',
        '--no-analytics',
        '--max-indexing-memory', '1GB' // 1GB - סביר למחשב עם 8GB RAM
      ];
      
      console.log('🚀 מפעיל Meilisearch:', meilisearchPath, args);
      
      meilisearchProcess = spawn('cmd.exe', ['/c', meilisearchPath, ...args], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      meilisearchProcess.stdout.on('data', (data) => {
        console.log('Meilisearch:', data.toString().trim());
      });
      
      meilisearchProcess.stderr.on('data', (data) => {
        console.log('Meilisearch Error:', data.toString().trim());
      });
      
      meilisearchProcess.on('close', (code) => {
        console.log(`Meilisearch נסגר עם קוד: ${code}`);
        meilisearchProcess = null;
      });
      
      console.log('✅ Meilisearch הופעל מחדש בהצלחה');
      return { success: true, message: 'Restarted' };
    } catch (error) {
      console.error('❌ שגיאה בהפעלה מחדש של Meilisearch:', error);
      return { success: false, error: error.message };
    }
  });

  // איפוס data directory של Meilisearch
  ipcMain.handle('reset-meilisearch-data', async () => {
    try {
      console.log('🗑️ מאפס את data directory של Meilisearch...');
      
      // עצור את השרת אם רץ
      if (meilisearchProcess) {
        meilisearchProcess.kill();
        meilisearchProcess = null;
        console.log('🛑 Meilisearch נסגר');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const userDataPath = app.getPath('userData');
      const dataPath = path.join(userDataPath, 'meilisearch', 'data.ms');
      
      // מחק את data.ms אם קיים
      if (fs.existsSync(dataPath)) {
        fs.rmSync(dataPath, { recursive: true, force: true });
        console.log('✅ data.ms נמחק');
      }
      
      return { success: true, message: 'Data directory reset' };
    } catch (error) {
      console.error('❌ שגיאה באיפוס data directory:', error);
      return { success: false, error: error.message };
    }
  });
  
  // קבלת רשימת אינדקסים מ-Meilisearch
  ipcMain.handle('get-meilisearch-indexes', async () => {
    try {
      // אם אין תהליך רץ, החזר שגיאה
      if (!meilisearchProcess) {
        console.warn('⚠️ שרת Meilisearch לא רץ');
        return { success: false, error: 'Server not running', indexes: [] };
      }
      
      let client = getMeiliClient(); // שונה מ-const ל-let
      
      console.log('📡 בודק זמינות שרת Meilisearch...');
      
      // בדיקת health עם retry - מקסימום 6 ניסיונות (6 שניות)
      let serverReady = false;
      for (let i = 0; i < 6; i++) {
        try {
          await client.health();
          serverReady = true;
          console.log(`✅ שרת Meilisearch זמין (ניסיון ${i + 1})`);
          break;
        } catch (error) {
          if (i < 5) {
            console.log(`⏳ ניסיון ${i + 1}/6 - ממתין 1000ms...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            // אחרי 6 ניסיונות, אפס את ה-client
            console.warn('⚠️ מאפס client אחרי כשלונות חוזרים');
            resetMeiliClient();
          }
        }
      }
      
      if (!serverReady) {
        console.warn('⚠️ שרת Meilisearch לא מגיב אחרי 6 שניות');
        return { success: false, error: 'Server starting', indexes: [] };
      }
      
      // השרת מוכן - קבל אינדקסים עם retry מופחת
      console.log('📡 מבקש אינדקסים מ-Meilisearch...');
      let indexes = null;
      let lastError = null;
      
      for (let i = 0; i < 3; i++) {
        try {
          console.log(`🔍 מנסה לקבל אינדקסים (ניסיון ${i + 1}/3, timeout: 60s)...`);
          const startTime = Date.now();
          indexes = await client.getIndexes();
          const duration = Date.now() - startTime;
          console.log(`✅ נמצאו ${indexes.results.length} אינדקסים (לקח ${duration}ms)`);
          break;
        } catch (err) {
          lastError = err;
          const duration = Date.now() - startTime;
          console.error(`❌ getIndexes ניסיון ${i + 1}/3 נכשל אחרי ${duration}ms:`, {
            message: err.message,
            code: err.code,
            type: err.type,
            httpStatus: err.httpStatus,
            cause: err.cause?.message
          });
          
          if (i < 2) {
            console.log(`⏳ ממתין 1000ms לפני ניסיון נוסף...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // אחרי כשלון ראשון, נסה ליצור client חדש
            if (i === 0) {
              console.log('🔄 יוצר client חדש אחרי כשלון...');
              resetMeiliClient();
              client = getMeiliClient();
            }
          } else {
            console.error(`❌ getIndexes נכשל אחרי 3 ניסיונות`);
            // אפס client במקרה של כשלון חוזר
            resetMeiliClient();
          }
        }
      }
      
      if (!indexes) {
        const errorMsg = lastError ? `${lastError.message} (${lastError.code || 'unknown'})` : 'Unknown error';
        console.error('❌ לא הצלחתי לקבל אינדקסים:', errorMsg);
        return { success: false, error: errorMsg, indexes: [] };
      }
      
      // קבל stats לכל אינדקס - זה קל ולא טוען את האינדקס המלא (רק מטא-דאטה)
      console.log('📊 מבקש stats לכל אינדקס...');
      const indexesWithStats = await Promise.all(
        indexes.results.map(async (index) => {
          try {
            const stats = await client.index(index.uid).getStats();
            return {
              uid: index.uid,
              primaryKey: index.primaryKey,
              createdAt: index.createdAt,
              updatedAt: index.updatedAt,
              numberOfDocuments: stats.numberOfDocuments || 0,
              isIndexing: stats.isIndexing || false
            };
          } catch (error) {
            console.warn(`⚠️ לא ניתן לקבל stats עבור ${index.uid}:`, error.message);
            return {
              uid: index.uid,
              primaryKey: index.primaryKey,
              createdAt: index.createdAt,
              updatedAt: index.updatedAt,
              numberOfDocuments: 0,
              isIndexing: false
            };
          }
        })
      );
      
      console.log(`✅ הוחזרו ${indexesWithStats.length} אינדקסים עם stats`);
      return { success: true, indexes: indexesWithStats };
    } catch (error) {
      console.error('❌ שגיאה בקבלת אינדקסים:', error);
      
      // אם השגיאה היא timeout, תן הודעה ברורה
      if (error.message && error.message.includes('timed out')) {
        return { success: false, error: 'Server starting', indexes: [] };
      }
      
      // אם השגיאה היא 401 - ה-data directory נוצר בלי master key
      if (error.message && (error.message.includes('401') || error.message.includes('Authorization'))) {
        console.warn('⚠️ שגיאת 401 - ה-data directory נוצר בלי master key. מנקה ומפעיל מחדש...');
        return { success: false, error: 'auth_mismatch', indexes: [] };
      }
      
      return { success: false, error: error.message, indexes: [] };
    }
  });

  // יצירת/מחיקת אינדקס ב-Meilisearch (דרך main process)
  ipcMain.handle('meilisearch-create-index', async (event, { indexName }) => {
    try {
      const { MeiliSearch } = require('meilisearch');
      const client = new MeiliSearch({
        host: 'http://127.0.0.1:7700',
        timeout: 10000
      });
      // מחק אם קיים
      try { await client.deleteIndex(indexName); } catch (_) {}
      await client.createIndex(indexName, { primaryKey: 'id' });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // הוספת מסמכים לאינדקס (דרך main process)
  ipcMain.handle('meilisearch-add-documents', async (event, { indexName, documents }) => {
    try {
      const { MeiliSearch } = require('meilisearch');
      const client = new MeiliSearch({
        host: 'http://127.0.0.1:7700',
        timeout: 60000
      });
      const index = client.index(indexName);
      await index.addDocuments(documents);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // עדכון הגדרות אינדקס (דרך main process)
  ipcMain.handle('meilisearch-update-settings', async (event, { indexName, settings }) => {
    try {
      const { MeiliSearch } = require('meilisearch');
      const client = new MeiliSearch({
        host: 'http://127.0.0.1:7700',
        timeout: 30000
      });
      await client.index(indexName).updateSettings(settings);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  // חיפוש גימטריה
  ipcMain.handle('search-gematria', async (event, options) => {
    try {
      const { searchGematriaInFiles } = require(path.join(__dirname, '../src/utils/gematriaSearchEngine.js'));
      const booksPath = path.join(app.getAppPath(), 'books');
      
      console.log('🔍 מחפש גימטריה:', options);
      console.log('📚 בתיקייה:', booksPath);
      
      const results = await searchGematriaInFiles(booksPath, options.targetValue, {
        method: options.method || 'regular',
        useKolel: options.useKolel || false,
        wholeVerseOnly: options.wholeVerseOnly || false,
        maxPhraseWords: options.maxPhraseWords || 8,
        fileLimit: 500
      });
      
      console.log('✅ נמצאו', results.length, 'תוצאות');
      
      return { success: true, results };
    } catch (error) {
      console.error('❌ שגיאה בחיפוש גימטריה:', error);
      return { success: false, error: error.message, results: [] };
    }
  });
  
  // הרצת סקריפט Node.js
  ipcMain.handle('run-script', async (event, scriptName) => {
    try {
      const scriptPath = path.join(app.getAppPath(), 'scripts', scriptName);
      
      if (!fs.existsSync(scriptPath)) {
        return { success: false, error: `הסקריפט ${scriptName} לא נמצא` };
      }
      
      console.log('🚀 מריץ סקריפט:', scriptPath);
      
      return new Promise((resolve) => {
        const child = spawn('node', [scriptPath], {
          cwd: app.getAppPath(),
          stdio: ['ignore', 'pipe', 'pipe']
        });
        
        let output = '';
        let errorOutput = '';
        
        child.stdout.on('data', (data) => {
          const text = data.toString();
          output += text;
          console.log(text);
        });
        
        child.stderr.on('data', (data) => {
          const text = data.toString();
          errorOutput += text;
          console.error(text);
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            console.log('✅ הסקריפט הסתיים בהצלחה');
            resolve({ success: true, output, code });
          } else {
            console.error('❌ הסקריפט נכשל עם קוד:', code);
            resolve({ success: false, error: errorOutput || 'הסקריפט נכשל', code, output });
          }
        });
        
        child.on('error', (error) => {
          console.error('❌ שגיאה בהרצת הסקריפט:', error);
          resolve({ success: false, error: error.message });
        });
      });
    } catch (error) {
      console.error('❌ שגיאה בהרצת סקריפט:', error);
      return { success: false, error: error.message };
    }
  });

  // בחירת קובץ
  ipcMain.handle('select-file', async (event, filters) => {
    const { dialog } = require('electron');
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: filters || [{ name: 'All Files', extensions: ['*'] }]
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }
      
      return { success: true, path: result.filePaths[0] };
    } catch (error) {
      console.error('❌ שגיאה בבחירת קובץ:', error);
      return { success: false, error: error.message };
    }
  });

  // הרצת indexer.exe
  ipcMain.handle('run-indexer', async (event, command) => {
    try {
      console.log('🔍 מריץ indexer:', command);
      
      return new Promise((resolve) => {
        const child = exec(command, {
          cwd: app.getAppPath(),
          windowsHide: true,
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });
        
        let output = '';
        let errorOutput = '';
        
        child.stdout.on('data', (data) => {
          const text = data.toString();
          output += text;
          console.log(text);
          // שלח עדכון לממשק
          if (mainWindow) {
            mainWindow.webContents.send('indexer-progress', text);
          }
        });
        
        child.stderr.on('data', (data) => {
          const text = data.toString();
          errorOutput += text;
          console.error(text);
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Indexer הסתיים בהצלחה');
            resolve({ success: true, output, code });
          } else {
            console.error('❌ Indexer נכשל עם קוד:', code);
            resolve({ success: false, error: errorOutput || output || 'Indexer נכשל', code });
          }
        });
        
        child.on('error', (error) => {
          console.error('❌ שגיאה בהרצת indexer:', error);
          resolve({ success: false, error: error.message });
        });
      });
    } catch (error) {
      console.error('❌ שגיאה בהרצת indexer:', error);
      return { success: false, error: error.message };
    }
  });
}

// סגירת האפליקציה כשכל החלונות נסגרים (למעט macOS)
app.on('window-all-closed', () => {
  // סגור Meilisearch ונקה client
  if (meilisearchProcess) {
    meilisearchProcess.kill();
    meilisearchProcess = null;
  }
  resetMeiliClient();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// יצירת חלון חדש כשהאפליקציה מופעלת מחדש (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
