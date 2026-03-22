import { useState, useEffect, useMemo } from 'react';
import { SearchRegular, ArrowSwapRegular, DismissRegular } from '@fluentui/react-icons';
import './AramaicDictionary.css';

const AramaicDictionary = () => {
  const [dictionary, setDictionary] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [translation, setTranslation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [direction, setDirection] = useState('aramaic-hebrew'); // aramaic-hebrew or hebrew-aramaic

  useEffect(() => {
    // טעינת המילון
    fetch('/dictionary.json')
      .then(res => res.json())
      .then(data => {
        const entries = data['מילון פשיטא'] || [];
        setDictionary(entries);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error loading dictionary:', err);
        setIsLoading(false);
      });
  }, []);

  // יצירת אינדקס הפוך לחיפוש מעברית לארמית
  const reverseIndex = useMemo(() => {
    const index = new Map();
    dictionary.forEach(entry => {
      const [aramaic, hebrew] = Object.entries(entry)[0];
      // ניקוי הטקסט העברי מסימנים מיוחדים
      const cleanHebrew = hebrew.replace(/[{}*]/g, '').trim();
      
      if (!index.has(cleanHebrew)) {
        index.set(cleanHebrew, []);
      }
      index.get(cleanHebrew).push(aramaic);
    });
    return index;
  }, [dictionary]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    
    if (!value.trim()) {
      setTranslation('');
      return;
    }

    const searchValue = value.trim();

    if (direction === 'aramaic-hebrew') {
      // חיפוש מארמית לעברית
      const found = dictionary.find(entry => {
        const [aramaic] = Object.entries(entry)[0];
        return aramaic === searchValue || aramaic.includes(searchValue);
      });

      if (found) {
        const [, hebrew] = Object.entries(found)[0];
        setTranslation(hebrew);
      } else {
        setTranslation('לא נמצא תרגום');
      }
    } else {
      // חיפוש מעברית לארמית
      const results = [];
      
      reverseIndex.forEach((aramaicWords, hebrewWord) => {
        if (hebrewWord.includes(searchValue)) {
          results.push(...aramaicWords);
        }
      });

      if (results.length > 0) {
        setTranslation(results.join(', '));
      } else {
        setTranslation('לא נמצא תרגום');
      }
    }
  };

  const handleSwapDirection = () => {
    setDirection(prev => 
      prev === 'aramaic-hebrew' ? 'hebrew-aramaic' : 'aramaic-hebrew'
    );
    setSearchTerm('');
    setTranslation('');
  };

  const handleClear = () => {
    setSearchTerm('');
    setTranslation('');
  };

  if (isLoading) {
    return (
      <div className="dictionary-loading">
        <div className="loading-spinner"></div>
        <p>טוען מילון...</p>
      </div>
    );
  }

  return (
    <div className="aramaic-dictionary">
      <div className="tool-content">
        <h2>מילון ארמי-עברי</h2>
        <p>תרגום מילים מארמית לעברית ולהיפך - מילון פשיטא</p>
        
        <div className="dictionary-container">
          {/* כותרת */}
          <div className="dictionary-header">
            <div className="language-selector">
              <span className={direction === 'aramaic-hebrew' ? 'active' : ''}>
                ארמית
              </span>
              <button 
                className="swap-button"
                onClick={handleSwapDirection}
                title="החלף כיוון"
              >
                <ArrowSwapRegular />
              </button>
              <span className={direction === 'hebrew-aramaic' ? 'active' : ''}>
                עברית
              </span>
            </div>
          </div>

        {/* אזור החיפוש */}
        <div className="dictionary-panels">
          {/* פאנל תוצאה - משמאל */}
          <div className="dictionary-panel output-panel">
            <div className="panel-header">
              <span className="language-label">
                {direction === 'aramaic-hebrew' ? 'עברית' : 'ארמית'}
              </span>
            </div>
            <div className="panel-content">
              <div className="dictionary-output" dir="rtl">
                {translation || (
                  <span className="placeholder-text">
                    התרגום יופיע כאן
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* פאנל קלט - מימין */}
          <div className="dictionary-panel input-panel">
            <div className="panel-header">
              <span className="language-label">
                {direction === 'aramaic-hebrew' ? 'ארמית' : 'עברית'}
              </span>
            </div>
            <div className="panel-content">
              <textarea
                className="dictionary-input"
                placeholder={direction === 'aramaic-hebrew' 
                  ? 'הקלד מילה בארמית...' 
                  : 'הקלד מילה בעברית...'}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                dir="rtl"
              />
              {searchTerm && (
                <button 
                  className="clear-button"
                  onClick={handleClear}
                  title="נקה"
                >
                  <DismissRegular />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* מידע נוסף */}        {/* מידע נוסף */}
        <div className="dictionary-info">
          <p>
            <SearchRegular /> 
            מילון פשיטא - {dictionary.length.toLocaleString('he-IL')} ערכים
          </p>
        </div>
      </div>
    </div>
  </div>
  );
};

export default AramaicDictionary;
