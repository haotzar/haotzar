#!/usr/bin/env node

/**
 * Verification script for PDF.js build
 * Checks that all required PDF.js files are present in the dist folder
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════╗');
console.log('║   🔍 PDF.js Build Verification       ║');
console.log('╚════════════════════════════════════════╝');
console.log('');

const distPath = path.join(__dirname, '..', 'dist');

// Required files for PDF.js to work
const requiredFiles = [
  'pdfjs/web/viewer.html',
  'pdfjs/web/viewer.mjs',
  'pdfjs/web/viewer.css',
  'pdfjs/web/viewer-config.js', // NEW - our fix
  'pdfjs/build/pdf.mjs',
  'pdfjs/build/pdf.worker.mjs',
  'pdf.worker.min.mjs' // Root level worker (backup)
];

// Optional but recommended files
const optionalFiles = [
  'pdfjs/web/custom-search.js',
  'pdfjs/web/custom-outline-style.css',
  'pdfjs/build/pdf.sandbox.mjs'
];

let allGood = true;
let missingCount = 0;

console.log('📋 Checking required files...\n');

requiredFiles.forEach(file => {
  const fullPath = path.join(distPath, file);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    const stats = fs.statSync(fullPath);
    const size = (stats.size / 1024).toFixed(2);
    console.log(`✅ ${file} (${size} KB)`);
  } else {
    console.log(`❌ ${file} - MISSING!`);
    allGood = false;
    missingCount++;
  }
});

console.log('\n📋 Checking optional files...\n');

optionalFiles.forEach(file => {
  const fullPath = path.join(distPath, file);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    const stats = fs.statSync(fullPath);
    const size = (stats.size / 1024).toFixed(2);
    console.log(`✅ ${file} (${size} KB)`);
  } else {
    console.log(`⚠️  ${file} - Not found (optional)`);
  }
});

// Check for cmaps directory
console.log('\n📋 Checking support directories...\n');

const cmapsPath = path.join(distPath, 'pdfjs', 'web', 'cmaps');
if (fs.existsSync(cmapsPath)) {
  const cmapFiles = fs.readdirSync(cmapsPath);
  console.log(`✅ cmaps directory (${cmapFiles.length} files)`);
} else {
  console.log('⚠️  cmaps directory - Not found (may cause issues with some PDFs)');
}

const imagesPath = path.join(distPath, 'pdfjs', 'web', 'images');
if (fs.existsSync(imagesPath)) {
  const imageFiles = fs.readdirSync(imagesPath);
  console.log(`✅ images directory (${imageFiles.length} files)`);
} else {
  console.log('⚠️  images directory - Not found (UI icons may be missing)');
}

const standardFontsPath = path.join(distPath, 'pdfjs', 'web', 'standard_fonts');
if (fs.existsSync(standardFontsPath)) {
  const fontFiles = fs.readdirSync(standardFontsPath);
  console.log(`✅ standard_fonts directory (${fontFiles.length} files)`);
} else {
  console.log('⚠️  standard_fonts directory - Not found (may cause font issues)');
}

// Verify viewer-config.js content
console.log('\n📋 Verifying viewer-config.js content...\n');

const viewerConfigPath = path.join(distPath, 'pdfjs', 'web', 'viewer-config.js');
if (fs.existsSync(viewerConfigPath)) {
  const content = fs.readFileSync(viewerConfigPath, 'utf8');
  
  if (content.includes('PDFJS_WORKER_SRC')) {
    console.log('✅ viewer-config.js contains worker configuration');
  } else {
    console.log('❌ viewer-config.js is missing worker configuration!');
    allGood = false;
  }
  
  if (content.includes('isElectron')) {
    console.log('✅ viewer-config.js contains Electron detection');
  } else {
    console.log('⚠️  viewer-config.js may not detect Electron correctly');
  }
} else {
  console.log('❌ viewer-config.js not found - this is critical!');
  allGood = false;
}

// Verify viewer.html includes viewer-config.js
console.log('\n📋 Verifying viewer.html configuration...\n');

const viewerHtmlPath = path.join(distPath, 'pdfjs', 'web', 'viewer.html');
if (fs.existsSync(viewerHtmlPath)) {
  const content = fs.readFileSync(viewerHtmlPath, 'utf8');
  
  if (content.includes('viewer-config.js')) {
    console.log('✅ viewer.html loads viewer-config.js');
  } else {
    console.log('❌ viewer.html does NOT load viewer-config.js - PDF worker will fail!');
    allGood = false;
  }
  
  // Check if viewer-config.js is loaded BEFORE pdf.mjs
  const configIndex = content.indexOf('viewer-config.js');
  const pdfIndex = content.indexOf('pdf.mjs');
  
  if (configIndex > 0 && pdfIndex > 0 && configIndex < pdfIndex) {
    console.log('✅ viewer-config.js loads BEFORE pdf.mjs (correct order)');
  } else if (configIndex > 0 && pdfIndex > 0) {
    console.log('⚠️  viewer-config.js loads AFTER pdf.mjs - may cause issues!');
  }
} else {
  console.log('❌ viewer.html not found!');
  allGood = false;
}

// Summary
console.log('\n' + '═'.repeat(42));

if (allGood) {
  console.log('✅ All required files are present!');
  console.log('✅ Configuration is correct!');
  console.log('\n🎉 PDF viewer should work in production build!');
  console.log('\nNext steps:');
  console.log('  1. Run: npm run electron:build');
  console.log('  2. Test the built application');
  console.log('  3. Try opening a PDF file');
} else {
  console.log(`❌ ${missingCount} required file(s) missing!`);
  console.log('\n⚠️  PDF viewer may NOT work in production build!');
  console.log('\nTo fix:');
  console.log('  1. Run: npm run clean');
  console.log('  2. Run: npm run build:electron');
  console.log('  3. Run this script again: node scripts/verify-pdf-build.js');
}

console.log('═'.repeat(42) + '\n');

process.exit(allGood ? 0 : 1);
