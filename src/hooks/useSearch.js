import { useState, useCallback } from 'react';
import searchEngine from '../utils/searchEngine';
import meilisearchEngine from '../utils/meilisearchEngine';
import { autoConvertSearch } from '../utils/hebrewConverter';

/**
 * Hook לניהול חיפוש
 * מנהל חיפוש בתוכן, autocomplete וחיפוש מתקדם
 */
export function useSearch(allFiles) {
  const [searchQuery, setSearchQuery] = useState('');
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [showHeaderAutocomplete, setShowHeaderAutocomplete] = useState(false);
  const [headerSuggestions, setHeaderSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);

  // חיפוש בתוכן
  const handleContentSearch = useCallback(async (query, advancedOptions = {}) => {
    if (!query || query.trim().length === 0) {
      console.log('❌ שאילתה ריקה');
      return [];
    }

    try {
      console.log('🔍 מתחיל חיפוש:', query);
      
      // המרה אוטומטית של החיפוש
      const effectiveQuery = autoConvertSearch(query);
      console.log('📝 שאילתה אפקטיבית:', effectiveQuery);
      
      // בחר מנוע חיפוש
      const isElectron = window.electron !== undefined;
      console.log('🔧 Environment:', { isElectron, meilisearchReady: meilisearchEngine.isReady() });
      
      const activeEngine = isElectron && meilisearchEngine.isReady() 
        ? meilisearchEngine 
        : searchEngine;
      
      console.log('🔧 Using engine:', activeEngine === meilisearchEngine ? 'Meilisearch' : 'FlexSearch');
      
      // טען אינדקס אם צריך (טעינה עצלה)
      if (activeEngine === searchEngine && !searchEngine.isReady()) {
        console.log('📋 טוען אינדקס FlexSearch...');
        const loaded = await searchEngine.loadIndexFromFile();
        if (!loaded) {
          console.warn('⚠️ לא נמצא אינדקס חיפוש - צריך לבנות אינדקס');
          return [];
        }
        console.log('✅ אינדקס FlexSearch נטען');
      }
      
      // מיזוג אופציות ברירת מחדל עם אופציות מתקדמות
      const searchOptions = {
        maxResults: 500,
        contextLength: 150,
        fullSpelling: advancedOptions.fullSpelling || false,
        partialWord: advancedOptions.partialWord || false,
        suffixes: advancedOptions.suffixes || false,
        prefixes: advancedOptions.prefixes || false,
        accuracy: advancedOptions.accuracy !== undefined ? advancedOptions.accuracy : 50,
        specificBook: advancedOptions.specificBook || '',
        matchingStrategy: advancedOptions.matchingStrategy || 'last',
        cropLength: advancedOptions.cropLength || 300,
        selectedIndexes: advancedOptions.selectedIndexes || []
      };
      
      console.log('📡 Calling search with:', { query: effectiveQuery, options: searchOptions });
      const results = await activeEngine.search(effectiveQuery, searchOptions);
      
      console.log(`✅ Got ${results.length} results from engine`);
      
      // תקן את התוצאות - מצא את הקבצים המקוריים מתוך allFiles
      const fixedResults = results.map(result => {
        const originalFile = allFiles.find(f => 
          f.name === result.file.name || 
          f.name === result.file.id ||
          f.id === result.file.id
        );
        
        if (originalFile) {
          return {
            ...result,
            file: originalFile
          };
        }
        
        return result;
      });
      
      console.log(`נמצאו ${fixedResults.length} קבצים עם התאמות`);
      return fixedResults;
    } catch (error) {
      console.error('❌ שגיאה בחיפוש:', error);
      return [];
    }
  }, [allFiles]);

  // חיפוש עם עדכון state
  const performSearch = useCallback(async (query, advancedOptions = {}) => {
    setIsSearching(true);
    try {
      const results = await handleContentSearch(query, advancedOptions);
      setSearchResults(results || []);
      return results;
    } finally {
      setIsSearching(false);
    }
  }, [handleContentSearch]);

  // סגירת autocomplete בסרגל העליון
  const closeHeaderAutocomplete = useCallback(() => {
    setShowHeaderAutocomplete(false);
    setHeaderSuggestions([]);
  }, []);

  return {
    // State
    searchQuery,
    headerSearchQuery,
    showHeaderAutocomplete,
    headerSuggestions,
    searchResults,
    isSearching,
    isAutocompleteOpen,
    
    // Setters
    setSearchQuery,
    setHeaderSearchQuery,
    setShowHeaderAutocomplete,
    setHeaderSuggestions,
    setSearchResults,
    setIsSearching,
    setIsAutocompleteOpen,
    
    // Actions
    handleContentSearch,
    performSearch,
    closeHeaderAutocomplete,
  };
}
