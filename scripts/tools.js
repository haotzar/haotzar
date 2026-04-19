#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { spawnSync } = require('child_process');

function parseArgv(argv) {
  return require('minimist')(argv, {
    boolean: ['help', 'skipPdf', 'meili', 'reset', 'clean'],
    string: ['booksPath', 'outDir', 'chunkSize', 'meiliHost', 'meiliIndex', 'flushEvery', 'maxFiles'],
    alias: {
      h: 'help'
    },
    default: {}
  });
}

function printHelp() {
  console.log('Usage: node scripts/tools.js <command>');
  console.log('');
  console.log('Commands:');
  console.log('  index build [--meili] [--skipPdf] [--booksPath <path>] [--outDir <path>] [--chunkSize <n>] [--flushEvery <n>] [--maxFiles <n>] [--reset] [--clean]');
  console.log('  index ui');
  console.log('  index check');
  console.log('  meili download');
  console.log('  meili status');
  console.log('  pdf worker');
  console.log('  icons tauri');
  console.log('');
  console.log('Aliases (backward compatible):');
  console.log('  index:build, index:ui, index:check');
  console.log('  meili:download, meili:status');
  console.log('  pdf:worker');
  console.log('  icons:tauri');
  console.log('  postinstall');
}

function die(message) {
  console.error(message);
  process.exit(1);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyPdfWorker() {
  const source = path.join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
  const dest = path.join(__dirname, '../public/pdf.worker.min.mjs');

  try {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(source, dest);
    console.log('✅ PDF.js worker הועתק בהצלחה ל-public/');
  } catch (error) {
    console.error('❌ שגיאה בהעתקת PDF.js worker:', error);
    process.exit(1);
  }
}

function downloadMeilisearch() {
  const MEILISEARCH_VERSION = 'v1.5.1';
  let PLATFORM = process.platform;
  
  // Convert Node.js platform names to Meilisearch release names
  if (PLATFORM === 'win32') {
    PLATFORM = 'windows';
  } else if (PLATFORM === 'darwin') {
    PLATFORM = 'macos';
  }
  
  let ARCH = process.arch === 'x64' ? 'amd64' : 'arm64';
  
  // Special handling for macOS ARM
  let archSuffix = ARCH;
  if (PLATFORM === 'macos' && ARCH === 'arm64') {
    archSuffix = 'apple-silicon';
  }

  const downloadUrl = `https://github.com/meilisearch/meilisearch/releases/download/${MEILISEARCH_VERSION}/meilisearch-${PLATFORM}-${archSuffix}${PLATFORM === 'windows' ? '.exe' : ''}`;

  const outputDir = path.join(__dirname, '..', 'resources', 'meilisearch');
  const outputFile = path.join(outputDir, PLATFORM === 'windows' ? 'meilisearch.exe' : 'meilisearch');

  console.log(`📥 מוריד Meilisearch ${MEILISEARCH_VERSION} עבור ${PLATFORM}-${ARCH}...`);
  console.log(`URL: ${downloadUrl}`);

  ensureDir(outputDir);

  const file = fs.createWriteStream(outputFile);

  function finishDownload() {
    file.close();
    console.log('\n✅ Meilisearch הורד בהצלחה!');
    console.log(`📂 מיקום: ${outputFile}`);

    if (PLATFORM !== 'windows') {
      try {
        fs.chmodSync(outputFile, '755');
        console.log('✅ הרשאות הפעלה הוגדרו');
      } catch (error) {
        console.error('❌ שגיאה בהגדרת הרשאות:', error);
      }
    }
  }

  https
    .get(downloadUrl, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (redirectResponse) => {
          const totalSize = parseInt(redirectResponse.headers['content-length'] || '0', 10);
          let downloaded = 0;

          redirectResponse.on('data', (chunk) => {
            downloaded += chunk.length;
            if (totalSize > 0) {
              const percent = ((downloaded / totalSize) * 100).toFixed(1);
              process.stdout.write(`\r📥 הורדה: ${percent}%`);
            }
          });

          redirectResponse.pipe(file);

          file.on('finish', finishDownload);
        });
        return;
      }

      response.pipe(file);
      file.on('finish', finishDownload);
    })
    .on('error', (error) => {
      try {
        fs.unlinkSync(outputFile);
      } catch {
        // ignore
      }
      console.error('❌ שגיאה בהורדה:', error.message);
      process.exit(1);
    });
}

function getAppLocalDataPath() {
  const platform = os.platform();
  const homeDir = os.homedir();

  if (platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'), 'com.haotzer.app');
  }
  if (platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', 'com.haotzer.app');
  }
  return path.join(homeDir, '.local', 'share', 'com.haotzer.app');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function checkIndex() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   🔍 בדיקת אינדקס חיפוש - האוצר     ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  const appDataPath = getAppLocalDataPath();
  const indexPath = path.join(appDataPath, 'search-index.json');

  console.log('📁 נתיב אינדקס:', indexPath);
  console.log('');

  if (!fs.existsSync(appDataPath)) {
    console.log('❌ תיקיית AppData לא קיימת');
    console.log('💡 הרץ את האפליקציה פעם אחת כדי ליצור את התיקייה');
    process.exit(1);
  }

  console.log('✅ תיקיית AppData קיימת');

  if (!fs.existsSync(indexPath)) {
    console.log('❌ קובץ אינדקס לא נמצא');
    console.log('');
    console.log('💡 לבניית אינדקס, הרץ:');
    console.log('   npm run build:index:ui');
    console.log('   או');
    console.log('   npm run build:index');
    process.exit(1);
  }

  console.log('✅ קובץ אינדקס קיים');
  console.log('');

  try {
    const stats = fs.statSync(indexPath);
    const content = fs.readFileSync(indexPath, 'utf8');
    const indexData = JSON.parse(content);

    console.log('📊 פרטי אינדקס:');
    console.log('─────────────────────────────────────────');
    console.log(`  גודל קובץ: ${formatBytes(stats.size)}`);
    console.log(`  תאריך יצירה: ${stats.birthtime.toLocaleString('he-IL')}`);
    console.log(`  תאריך עדכון: ${stats.mtime.toLocaleString('he-IL')}`);
    console.log('');

    if (indexData.stats) {
      console.log('📈 סטטיסטיקות:');
      console.log('─────────────────────────────────────────');
      console.log(`  קבצים באינדקס: ${indexData.stats.totalFiles || 0}`);
      console.log(`  מילים ייחודיות: ${(indexData.stats.totalWords || 0).toLocaleString('he-IL')}`);
      if (indexData.stats.buildTime) {
        console.log(`  זמן בנייה: ${indexData.stats.buildTime}`);
      }
      console.log('');
    }

    if (indexData.filesMetadata) {
      const fileCount = Object.keys(indexData.filesMetadata).length;
      console.log(`📚 קבצים: ${fileCount}`);
    }

    console.log('');
    console.log('✅ האינדקס תקין ומוכן לשימוש!');
  } catch (error) {
    console.log('❌ שגיאה בקריאת האינדקס:', error.message);
    console.log('');
    console.log('💡 האינדקס עשוי להיות פגום. נסה לבנות מחדש:');
    console.log('   npm run build:index');
    process.exit(1);
  }
}

async function checkMeiliStatus() {
  let MeiliSearch;
  try {
    ({ MeiliSearch } = require('meilisearch'));
  } catch (e) {
    console.error('❌ meilisearch package not installed');
    process.exit(1);
  }

  try {
    const client = new MeiliSearch({ host: 'http://127.0.0.1:7700' });
    const index = client.index('books');

    console.log('📊 Meilisearch Status:\n');
    const stats = await index.getStats();
    console.log('Index Stats:');
    console.log(`  Documents: ${stats.numberOfDocuments}`);
    console.log(`  Indexing: ${stats.isIndexing}`);
    console.log('');

    console.log('🔍 Testing search with "שבת"...\n');
    const results = await index.search('שבת', { limit: 5 });
    console.log(`Found ${results.hits.length} results`);
    if (results.hits.length > 0) {
      console.log('\nFirst result:');
      console.log(JSON.stringify(results.hits[0], null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function generateTauriIcons() {
  const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
  const sourceIcon = path.join(__dirname, '..', 'public', 'icon.png');
  
  // Check if required icons already exist
  const requiredIcons = [
    'icon.png',
    '32x32.png',
    '128x128.png',
    '128x128@2x.png',
    'icon.ico',
    'icon.icns'
  ];
  
  const allExist = requiredIcons.every(icon => 
    fs.existsSync(path.join(iconsDir, icon))
  );
  
  if (allExist) {
    console.log('✅ All Tauri icons already exist, skipping generation');
    return;
  }
  
  // If source icon doesn't exist, fail
  if (!fs.existsSync(sourceIcon)) {
    die(`❌ Source icon not found: ${sourceIcon}`);
  }
  
  console.log('⚠️  Some icons are missing. Please run: npx tauri icon public/icon.png');
  console.log('Or manually copy icons to src-tauri/icons/');
  process.exit(1);
}

function buildIndex(options = {}) {
  const script = path.join(__dirname, 'build-index-optimized.js');
  const args = [];

  if (options.booksPath) args.push('--booksPath', options.booksPath);
  if (options.outDir) args.push('--outDir', options.outDir);
  if (options.chunkSize) args.push('--chunkSize', String(options.chunkSize));
  if (options.flushEvery) args.push('--flushEvery', String(options.flushEvery));
  if (options.maxFiles) args.push('--maxFiles', String(options.maxFiles));
  if (options.skipPdf) args.push('--skipPdf');
  if (options.meili) args.push('--meili');
  if (options.meiliHost) args.push('--meiliHost', options.meiliHost);
  if (options.meiliIndex) args.push('--meiliIndex', options.meiliIndex);
  if (options.reset) args.push('--reset');
  if (options.clean) args.push('--clean');

  const res = spawnSync(process.execPath, ['--expose-gc', script, ...args], { stdio: 'inherit' });
  process.exit(res.status || 0);
}

function runIndexUi() {
  const PORT = 3456;
  const HTML_FILE = path.join(__dirname, 'index-builder-ui.html');

  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      fs.readFile(HTML_FILE, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('שגיאה בטעינת הממשק');
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      });
      return;
    }

    if (req.url === '/api/build-index' && req.method === 'POST') {
      console.log('🚀 מתחיל בניית אינדקס...');

      const resBuild = spawnSync(process.execPath, [path.join(__dirname, 'build-index-optimized.js')], {
        encoding: 'utf8'
      });

      const output = `${resBuild.stdout || ''}${resBuild.stderr || ''}`;
      const ok = resBuild.status === 0;

      res.writeHead(ok ? 200 : 500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          success: ok,
          output,
          message: ok ? 'אינדקס נבנה בהצלחה' : 'שגיאה בבניית אינדקס'
        })
      );
      return;
    }

    res.writeHead(404);
    res.end('לא נמצא');
  });

  server.listen(PORT, () => {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   🔨 בונה אינדקס חיפוש - האוצר      ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log(`✅ השרת רץ על: http://localhost:${PORT}`);
    console.log('');
    console.log('📖 פתח את הדפדפן בכתובת הזו כדי להתחיל');
    console.log('');
    console.log('⏹️  לעצירה: Ctrl+C');
    console.log('');
  });

  process.on('SIGINT', () => {
    console.log('\n\n👋 סוגר את השרת...');
    server.close(() => {
      console.log('✅ השרת נסגר');
      process.exit(0);
    });
  });
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const argv = parseArgv(rawArgs);

  const cmd = rawArgs[0];
  const sub = rawArgs[1];

  if (!cmd || argv.help || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printHelp();
    process.exit(cmd ? 0 : 1);
  }

  switch (cmd) {
    case 'postinstall':
      copyPdfWorker();
      downloadMeilisearch();
      return;
    case 'pdf:worker':
      copyPdfWorker();
      return;
    case 'meili:download':
      downloadMeilisearch();
      return;
    case 'icons:tauri':
      generateTauriIcons();
      return;
    case 'meili:status':
      await checkMeiliStatus();
      return;
    case 'index:build':
      buildIndex(argv);
      return;
    case 'index:ui':
      runIndexUi();
      return;
    case 'index:check':
      checkIndex();
      return;
    case 'index':
      if (sub === 'build') {
        buildIndex(parseArgv(rawArgs.slice(2)));
        return;
      }
      if (sub === 'ui') {
        runIndexUi();
        return;
      }
      if (sub === 'check') {
        checkIndex();
        return;
      }
      printHelp();
      process.exit(1);
      return;
    case 'meili':
      if (sub === 'download') {
        downloadMeilisearch();
        return;
      }
      if (sub === 'status') {
        await checkMeiliStatus();
        return;
      }
      printHelp();
      process.exit(1);
      return;
    case 'pdf':
      if (sub === 'worker') {
        copyPdfWorker();
        return;
      }
      printHelp();
      process.exit(1);
      return;
    case 'icons':
      if (sub === 'tauri') {
        generateTauriIcons();
        return;
      }
      printHelp();
      process.exit(1);
      return;
    default:
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Error:', err && err.message ? err.message : err);
  process.exit(1);
});
