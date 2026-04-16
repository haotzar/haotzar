// Dynamic PDF.js loader for Tauri
// טוען את pdf.mjs עם הנתיב הנכון בהתאם לסביבה

(function() {
  'use strict';
  
  console.log('📦 Loading PDF.js dynamically...');
  
  // Detect environment
  const isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
  const isElectron = typeof window !== 'undefined' && window.electron !== undefined;
  const isDevelopment = window.location.protocol === 'http:' && window.location.hostname === 'localhost';
  
  let pdfPath;
  
  if (isTauri && isDevelopment) {
    // Tauri development - use absolute path
    pdfPath = '/pdfjs/build/pdf.mjs';
  } else if (isTauri) {
    // Tauri production - use full URL
    pdfPath = new URL('/pdfjs/build/pdf.mjs', window.location.origin).href;
  } else if (isElectron) {
    // Electron - use relative path
    pdfPath = '../build/pdf.mjs';
  } else {
    // Default - relative path
    pdfPath = '../build/pdf.mjs';
  }
  
  console.log('📦 PDF.js path:', pdfPath);
  
  // Create and inject script tag
  const script = document.createElement('script');
  script.type = 'module';
  script.src = pdfPath;
  
  script.onload = () => {
    console.log('✅ PDF.js loaded successfully');
  };
  
  script.onerror = (error) => {
    console.error('❌ Failed to load PDF.js:', error);
    console.error('   Tried path:', pdfPath);
    
    // Try fallback with relative path
    if (pdfPath !== '../build/pdf.mjs') {
      console.log('🔄 Trying fallback path: ../build/pdf.mjs');
      const fallbackScript = document.createElement('script');
      fallbackScript.type = 'module';
      fallbackScript.src = '../build/pdf.mjs';
      document.head.appendChild(fallbackScript);
    }
  };
  
  document.head.appendChild(script);
})();
