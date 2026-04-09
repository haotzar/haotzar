// Electron-specific patches for PDF.js
// This file patches PDF.js security checks to work with Electron custom protocols in PRODUCTION

(function() {
  'use strict';
  
  console.log('🔧 Loading Electron patches for PDF.js...');
  
  // Detect if we're in Electron production
  // In production, the viewer runs on app:// protocol
  const isElectron = window.electron !== undefined;
  const isAppProtocol = window.location.protocol === 'app:';
  const isDevelopment = window.location.protocol === 'http:' && window.location.hostname === 'localhost';
  
  if (!isElectron && !isAppProtocol) {
    console.log('⏭️ Skipping Electron patches (not Electron)');
    return;
  }
  
  if (isDevelopment) {
    console.log('⏭️ Skipping Electron patches (development mode)');
    return;
  }
  
  console.log('🔧 Applying Electron production patches...');
  console.log('   Protocol:', window.location.protocol);
  console.log('   Origin:', window.location.origin);
  
  // Mark that we're in Electron production
  window.isElectronProduction = true;
  
  // Patch to allow local-file:// protocol
  // We need to intercept the origin check in PDF.js
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    // If it's a local-file:// URL, handle it specially
    if (typeof url === 'string' && url.startsWith('local-file://')) {
      console.log('🔧 Intercepting fetch for local-file protocol:', url.substring(0, 50) + '...');
      // The Electron main process will handle this via the registered protocol
      return originalFetch(url, options);
    }
    return originalFetch(url, options);
  };
  
  console.log('✅ Electron production patches loaded');
})();



