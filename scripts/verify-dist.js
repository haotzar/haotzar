#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 בודק שקבצי PDF.js קיימים ב-dist...\n');

const filesToCheck = [
  'dist/pdfjs/web/viewer.html',
  'dist/pdfjs/web/viewer-config.js',
  'dist/pdfjs/web/pdf-loader.js',
  'dist/pdfjs/build/pdf.mjs',
  'dist/pdfjs/build/pdf.worker.mjs',
  'dist/pdf.worker.min.mjs'
];

let allExist = true;

filesToCheck.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    const stats = fs.statSync(fullPath);
    const size = (stats.size / 1024).toFixed(2);
    console.log(`✅ ${file} (${size} KB)`);
  } else {
    console.log(`❌ ${file} - לא קיים!`);
    allExist = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allExist) {
  console.log('✅ כל הקבצים קיימים ב-dist!');
  process.exit(0);
} else {
  console.log('❌ חסרים קבצים ב-dist!');
  console.log('\nהרץ: npm run build:tauri');
  process.exit(1);
}
