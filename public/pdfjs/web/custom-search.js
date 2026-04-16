// Custom search handler for automatic search on load
(function() {
  'use strict';

  console.log('🔍 Custom search script loaded');

  // כפה sidebarView=2 (outline) לכל הקבצים
  try {
    const pdfHistory = localStorage.getItem('pdfjs.history');
    if (pdfHistory) {
      const history = JSON.parse(pdfHistory);
      let modified = false;
      Object.keys(history.files || {}).forEach(key => {
        // כפה תמיד outline view (2)
        if (history.files[key].sidebarView !== 2) {
          console.log('🔄 Forcing sidebarView to 2 (outline) for:', key);
          history.files[key].sidebarView = 2;
          modified = true;
        }
      });
      if (modified) {
        localStorage.setItem('pdfjs.history', JSON.stringify(history));
        console.log('✅ Forced outline view for all files');
      }
    }
  } catch (e) {
    console.log('⚠️ Could not force sidebar preference:', e);
  }
  
  // גם מחק את ההעדפה הגלובלית
  try {
    localStorage.removeItem('pdfjs.sidebarView');
    console.log('✅ Cleared global sidebar view preference');
  } catch (e) {
    console.log('⚠️ Could not clear global preference:', e);
  }

  // הסתר את הסיידבר עד שהוא מוכן (CSP-safe with CSS classes)
  const hideSidebarUntilReady = function() {
    const sidebarContent = document.getElementById('sidebarContent');
    if (sidebarContent) {
      sidebarContent.classList.add('sidebar-hidden');
      sidebarContent.classList.remove('sidebar-visible');
    }
  };

  // Wait for PDFViewerApplication to be ready
  document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 DOM loaded, waiting for PDF viewer...');
    
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    const pageNum = urlParams.get('page');
    const previewMode = urlParams.get('previewMode');
    
    console.log('🔍 URL params:', { searchQuery, pageNum, previewMode });
    
    // אם זה מצב תצוגה מקדימה, אל תכפה outline ואל תפתח סיידבר
    if (previewMode === 'true') {
      console.log('👁️ Preview mode detected - skipping sidebar setup');
      return; // צא מהפונקציה - אל תעשה כלום
    }
    
    // הסתר את הסיידבר עד שהוא מוכן
    hideSidebarUntilReady();
    
    // פונקציה לכפיית outline view
    const forceOutlineView = function() {
      console.log('📖 Forcing outline view...');
      
      // כפה outline view
      if (window.PDFViewerApplication && window.PDFViewerApplication.pdfSidebar) {
        try {
          window.PDFViewerApplication.pdfSidebar.switchView(2); // 2 = outline
          console.log('✅ Switched to outline view');
          
          // עדכן את הכפתורים
          const outlineButton = document.getElementById('viewOutline');
          const thumbnailButton = document.getElementById('viewThumbnail');
          if (outlineButton) {
            outlineButton.classList.add('toggled');
            outlineButton.setAttribute('aria-checked', 'true');
          }
          if (thumbnailButton) {
            thumbnailButton.classList.remove('toggled');
            thumbnailButton.setAttribute('aria-checked', 'false');
          }
        } catch (e) {
          console.log('⚠️ Could not force outline view:', e);
        }
      }
      
      // הצג את הסיידבר (CSP-safe with CSS classes)
      const sidebarContent = document.getElementById('sidebarContent');
      if (sidebarContent) {
        sidebarContent.classList.remove('sidebar-hidden');
        sidebarContent.classList.add('sidebar-visible');
      }
    };
    
    let initialLoadComplete = false;
    
    // האזן לאירוע documentloaded של PDF.js
    if (window.PDFViewerApplication) {
      window.PDFViewerApplication.initializedPromise.then(function() {
        console.log('✅ PDFViewerApplication initialized');
        
        // כפה outline מיד
        setTimeout(forceOutlineView, 10);
        
        // האזן גם לאירוע documentloaded
        window.PDFViewerApplication.eventBus.on('documentloaded', function() {
          console.log('✅ Document loaded, forcing outline view again');
          setTimeout(forceOutlineView, 50);
          setTimeout(forceOutlineView, 200);
          
          // סמן שהטעינה הראשונית הושלמה
          setTimeout(function() {
            initialLoadComplete = true;
            console.log('✅ Initial load complete - user can now switch views freely');
          }, 500);
        });
        
        // אל תמנע מהמשתמש לעבור ל-thumbnails!
        // רק מחק את ההעדפה השמורה בטעינה הבאה
      });
    }
    
    // גם נסה עם polling כגיבוי
    const checkReady = setInterval(function() {
      if (window.PDFViewerApplication && 
          window.PDFViewerApplication.pdfDocument) {
        
        clearInterval(checkReady);
        console.log('✅ PDF document ready (polling)');
        forceOutlineView();
        
        // Continue with search if needed
        if (searchQuery || pageNum) {
          handleSearchAndNavigation();
        }
      }
    }, 100);
    
    // Timeout after 10 seconds
    setTimeout(function() {
      clearInterval(checkReady);
      console.log('⏱️ Timeout waiting for PDF viewer');
      // נסה בכל זאת לכפות outline
      forceOutlineView();
    }, 10000);
    
    // האזן לשינויים בסיידבר ומנע מעבר אוטומטי ל-thumbnails
    document.addEventListener('click', function(e) {
      const thumbnailButton = document.getElementById('viewThumbnail');
      if (thumbnailButton && e.target.closest('#viewThumbnail')) {
        console.log('👆 User clicked thumbnails button - allowing temporarily');
      }
    });
    
    function handleSearchAndNavigation() {
      if (!window.PDFViewerApplication.findController) {
        console.log('⚠️ Find controller not ready yet');
        return;
      }
      
      console.log('✅ Executing search and navigation...');
      
      // If there's a page number, navigate to it first
      if (pageNum) {
        const targetPage = parseInt(pageNum, 10);
        if (!isNaN(targetPage) && targetPage > 0) {
          console.log('📄 Navigating to page:', targetPage);
          window.PDFViewerApplication.page = targetPage;
        }
      }
      
      // If there's a search query, execute it
      if (searchQuery) {
        setTimeout(function() {
          console.log('🔍 Executing search for:', searchQuery);
          
          // Set the search input value
          const findInput = document.getElementById('findInput');
          if (findInput) {
            findInput.value = searchQuery;
          }
          
          // Execute the search using eventBus
          const eventBus = window.PDFViewerApplication.eventBus;
          
          // First, make sure highlight all is checked
          const highlightAllCheckbox = document.getElementById('findHighlightAll');
          if (highlightAllCheckbox) {
            highlightAllCheckbox.checked = true;
          }
          
          // Execute the find command
          if (eventBus) {
            eventBus.dispatch('find', {
              source: window,
              type: 'find',
              query: searchQuery,
              caseSensitive: false,
              entireWord: false,
              highlightAll: true,
              findPrevious: false,
              phraseSearch: false
            });
          }
          
          console.log('✅ Search command executed');
          
          // Listen for search results
          window.PDFViewerApplication.eventBus.on('updatefindmatchescount', function(evt) {
            console.log('📊 Search results:', evt.matchesCount);
            
            if (evt.matchesCount && evt.matchesCount.total > 0) {
              console.log('✅ Found', evt.matchesCount.total, 'matches');
              
              // Navigate to first match after a short delay
              setTimeout(function() {
                console.log('🎯 Navigating to first match...');
                findController.executeCommand('findagain', {
                  query: searchQuery,
                  caseSensitive: false,
                  entireWord: false,
                  highlightAll: true,
                  findPrevious: false,
                  phraseSearch: false
                });
              }, 200);
            } else {
              console.log('❌ No matches found for:', searchQuery);
            }
          }, { once: true });
          
        }, 500); // Wait a bit for the page to render
      }
    }
  });
})();
