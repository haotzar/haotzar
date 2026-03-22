// Worker thread לסריקת קבצים - לא חוסם את ה-UI!
const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');

const { paths, maxFiles = 10000 } = workerData;

const allFiles = [];
let fileCount = 0;

function scanDirectory(dir, depth = 0) {
  if (depth > 10 || fileCount >= maxFiles) {
    return;
  }
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    const filteredEntries = entries.filter(entry => {
      const name = entry.name.toLowerCase();
      return !name.startsWith('.') && 
             name !== 'node_modules' && 
             name !== '$recycle.bin' &&
             name !== 'system volume information';
    });
    
    for (const entry of filteredEntries) {
      if (fileCount >= maxFiles) break;
      
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.pdf' || ext === '.txt') {
          allFiles.push(fullPath);
          fileCount++;
          
          // שלח עדכון כל 100 קבצים
          if (fileCount % 100 === 0) {
            parentPort.postMessage({ 
              type: 'progress', 
              count: fileCount 
            });
          }
        }
      }
    }
  } catch (error) {
    if (error.code !== 'EACCES' && error.code !== 'EPERM') {
      parentPort.postMessage({ 
        type: 'error', 
        message: error.message,
        path: dir
      });
    }
  }
}

// התחל סריקה
const startTime = Date.now();

for (const dirPath of paths) {
  if (fs.existsSync(dirPath)) {
    scanDirectory(dirPath);
  }
}

const scanTime = Date.now() - startTime;

// שלח תוצאות
parentPort.postMessage({ 
  type: 'complete', 
  files: allFiles,
  count: fileCount,
  time: scanTime
});
