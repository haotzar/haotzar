// Custom protocol support for Electron
// This file patches PDF.js to support custom protocols like local-file://

(function() {
  'use strict';
  
  console.log('🔧 Loading custom protocol support...');
  
  // Patch the URL constructor to support custom protocols
  const OriginalURL = window.URL;
  
  window.URL = function(url, base) {
    // If it's a custom protocol (local-file://, app://), don't validate it
    if (typeof url === 'string' && (url.startsWith('local-file://') || url.startsWith('app://'))) {
      // Create a fake URL object that PDF.js can work with
      const protocol = url.split('://')[0] + ':';
      return {
        href: url,
        protocol: protocol,
        origin: protocol + '//',
        hostname: '',
        host: '',
        pathname: url.substring(protocol.length + 2),
        toString: function() { return this.href; }
      };
    }
    
    // Otherwise, use the original URL constructor
    return new OriginalURL(url, base);
  };
  
  // Copy static methods from original URL
  window.URL.createObjectURL = OriginalURL.createObjectURL.bind(OriginalURL);
  window.URL.revokeObjectURL = OriginalURL.revokeObjectURL.bind(OriginalURL);
  
  // Override window.origin for app:// protocol
  if (window.location.protocol === 'app:') {
    console.log('🔧 Detected app:// protocol, setting up origin override');
    
    // Store original location
    const originalLocation = window.location;
    
    // Create a proxy for location that returns 'null' as origin
    // 'null' is a trusted origin in PDF.js HOSTED_VIEWER_ORIGINS
    Object.defineProperty(window, 'origin', {
      get: function() {
        return 'null';
      },
      configurable: true
    });
    
    console.log('✅ Origin set to "null" for PDF.js compatibility');
  }
  
  console.log('✅ Custom protocol support loaded');
})();

