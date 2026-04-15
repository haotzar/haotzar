// PDF.js Worker Configuration for Electron Production Build
// This file must be loaded BEFORE viewer.mjs to configure the worker path correctly

(function() {
  'use strict';
  
  console.log('🔧 Configuring PDF.js worker path...');
  
  // Detect environment
  const isElectron = typeof window !== 'undefined' && window.electron !== undefined;
  const isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
  const isDevelopment = window.location.protocol === 'http:' && window.location.hostname === 'localhost';
  const isFileProtocol = window.location.protocol === 'file:';
  const isTauriProtocol = window.location.protocol === 'tauri:' || window.location.protocol === 'https:';
  
  // Configure worker path based on environment
  let workerPath;
  
  if (isTauri && isDevelopment) {
    // Tauri development mode - use Vite dev server
    // The viewer.html is loaded from http://localhost:5173/pdfjs/web/viewer.html
    // So ../build/pdf.worker.mjs resolves to http://localhost:5173/pdfjs/build/pdf.worker.mjs
    workerPath = '../build/pdf.worker.mjs';
    console.log('🦀 Tauri development mode - worker path:', workerPath);
  } else if (isTauri) {
    // Tauri production - use absolute path from asset protocol
    workerPath = '/pdfjs/build/pdf.worker.mjs';
    console.log('🦀 Tauri production mode - worker path:', workerPath, { protocol: window.location.protocol });
  } else if (isElectron && !isDevelopment) {
    // Production Electron build
    // In packaged apps the renderer typically runs on file:// and Vite base is './'.
    // Leading '/' would resolve to file:///pdfjs/... which does not exist on Windows.
    // Use a relative path from /pdfjs/web/viewer.html to /pdfjs/build/pdf.worker.mjs
    workerPath = '../build/pdf.worker.mjs';
    console.log('📦 Electron production mode - worker path:', workerPath, { isFileProtocol });
  } else if (isDevelopment) {
    // Development mode - use relative path
    workerPath = '../build/pdf.worker.mjs';
    console.log('🔧 Development mode - worker path:', workerPath);
  } else {
    // Fallback - try relative path
    workerPath = '../build/pdf.worker.mjs';
    console.log('⚠️ Unknown environment - using fallback worker path:', workerPath);
  }

  // Extra hardening: if for some reason the relative path fails in a non-file protocol
  // (e.g. custom scheme), allow a root-based fallback.
  if (!isFileProtocol && workerPath === '../build/pdf.worker.mjs') {
    // Keep as-is; root fallback is only intended when the host is an HTTP server.
  }
  
  // Store the worker path globally so viewer.mjs can use it
  window.PDFJS_WORKER_SRC = workerPath;
  
  // Also set it on AppOptions if available (will be used by viewer.mjs)
  if (typeof window.AppOptions === 'undefined') {
    window.AppOptions = {};
  }
  window.AppOptions.workerSrc = workerPath;
  
  console.log('✅ PDF.js worker configured successfully');
})();
