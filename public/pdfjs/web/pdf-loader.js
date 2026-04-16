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
    // Tauri production - use relative path (works better than absolute)
    // viewer.html is at /pdfjs/web/viewer.html
    // so ../build/pdf.mjs resolves correctly
    pdfPath = '../build/pdf.mjs';
  } else if (isElectron) {
    // Electron - use relative path
    pdfPath = '../build/pdf.mjs';
  } else {
    // Default - relative path
    pdfPath = '../build/pdf.mjs';
  }
  
  console.log('📦 PDF.js path:', pdfPath);
  console.log('📦 Current location:', window.location.href);
  
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
    console.error('   Resolved to:', new URL(pdfPath, window.location.href).href);
    
    // Try absolute path as fallback
    if (!pdfPath.startsWith('/')) {
      console.log('🔄 Trying absolute path: /pdfjs/build/pdf.mjs');
      const fallbackScript = document.createElement('script');
      fallbackScript.type = 'module';
      fallbackScript.src = '/pdfjs/build/pdf.mjs';
      
      fallbackScript.onerror = () => {
        console.error('❌ Absolute path also failed');
        console.error('   PDF.js cannot be loaded - viewer will not work');
      };
      
      document.head.appendChild(fallbackScript);
    }
  };
  
  document.head.appendChild(script);
})();
