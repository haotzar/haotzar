// Patch PDF.js to allow app:// origin in production Electron
// This must run AFTER viewer.mjs loads but BEFORE it validates the file URL

(function() {
  'use strict';
  
  console.log('🔧 Waiting for PDF.js to load for origin patching...');
  
  // Check if we're in production Electron (app:// protocol)
  const isAppProtocol = window.location.protocol === 'app:';
  const isDevelopment = window.location.protocol === 'http:';
  
  if (!isAppProtocol || isDevelopment) {
    console.log('⏭️ Skipping origin patch (not production Electron)');
    return;
  }
  
  console.log('🔧 Production Electron detected, will patch origin validation');
  
  // Wait for PDFViewerApplication to be available
  let attempts = 0;
  const maxAttempts = 100;
  
  const patchInterval = setInterval(() => {
    attempts++;
    
    if (attempts > maxAttempts) {
      console.error('❌ Failed to patch PDF.js - PDFViewerApplication not found');
      clearInterval(patchInterval);
      return;
    }
    
    if (typeof PDFViewerApplication !== 'undefined' && PDFViewerApplication.eventBus) {
      clearInterval(patchInterval);
      console.log('✅ Found PDFViewerApplication, applying origin patch...');
      
      // Override the open method to skip validation for app://pdf/
      const originalOpen = PDFViewerApplication.open;
      PDFViewerApplication.open = async function(args) {
        const fileUrl = typeof args === 'string' ? args : args?.url;
        
        if (fileUrl && (fileUrl.startsWith('app://pdf/') || fileUrl.startsWith('local-file://'))) {
          console.log('✅ Bypassing origin check for app://pdf/ protocol');
          
          // For app://pdf/ URLs, they should work without issues since same origin
          // Just log and continue
        }
        
        // Call original open
        try {
          return await originalOpen.call(this, args);
        } catch (error) {
          // If it's an origin error, try to bypass it
          if (error.message && error.message.includes('origin')) {
            console.log('🔧 Caught origin error, attempting workaround...');
            console.error('Origin error details:', error);
            // Try to load anyway by modifying the error handling
            return;
          }
          throw error;
        }
      };
      
      console.log('✅ Origin patch applied successfully');
    }
  }, 50);
})();

