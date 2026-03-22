import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SearchRegular, DeleteRegular, SettingsRegular, DismissRegular } from '@fluentui/react-icons';
import './GematriaTool.css';

const GematriaTool = () => {
  const [inputText, setInputText] = useState('');
  const [gematriaMethod, setGematriaMethod] = useState('regular');
  const [useKolel, setUseKolel] = useState(false);
  const [wholeVerseOnly, setWholeVerseOnly] = useState(false);
  const [maxPhraseWords, setMaxPhraseWords] = useState(8);
  const [gematriaValue, setGematriaValue] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // מפות ערכי גימטריה
  const gematriaValues = {
    regular: {
      'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
      'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
      'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200,
      'ש': 300, 'ת': 400
    },
    small: {
      'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
      'י': 1, 'כ': 2, 'ך': 2, 'ל': 3, 'מ': 4, 'ם': 4, 'נ': 5, 'ן': 5,
      'ס': 6, 'ע': 7, 'פ': 8, 'ף': 8, 'צ': 9, 'ץ': 9, 'ק': 1, 'ר': 2,
      'ש': 3, 'ת': 4
    },
    finalLetters: {
      'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
      'י': 10, 'כ': 20, 'ך': 500, 'ל': 30, 'מ': 40, 'ם': 600, 'נ': 50, 'ן': 700,
      'ס': 60, 'ע': 70, 'פ': 80, 'ף': 800, 'צ': 90, 'ץ': 900, 'ק': 100, 'ר': 200,
      'ש': 300, 'ת': 400
    }
  };

  // חישוב גימטריה
  const calculateGematria = (text, method = 'regular', withKolel = false) => {
    const values = gematriaValues[method];
    let sum = 0;
    let wordCount = 0;

    // ספירת מילים
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    wordCount = words.length;

    // חישוב סכום האותיות
    for (const char of text) {
      if (values[char]) {
        sum += values[char];
      }
    }

    // הוספת כולל אם נדרש
    if (withKolel && wordCount > 0) {
      sum += wordCount;
    }

    return sum;
  };

  // עדכון ערך הגימטריה כאשר הטקסט משתנה
  useEffect(() => {
    if (inputText.trim()) {
      const value = calculateGematria(inputText, gematriaMethod, useKolel);
      setGematriaValue(value);
    } else {
      setGematriaValue(0);
    }
  }, [inputText, gematriaMethod, useKolel]);

  // חיפוש בספרים
  const handleSearchInBooks = async () => {
    if (gematriaValue === 0) return;

    setIsSearching(true);
    setSearchResults([]);
    setSearchError('');
    setSearchMessage('מחפש בספרים...');

    try {
      // קבלת כל קבצי הטקסט בתיקיית תנך
      const textModules = import.meta.glob('/books/האויצר ספריה/תנך/**/*.txt', { 
        eager: false,
        query: '?raw',
        import: 'default'
      });
      
      const textFiles = Object.keys(textModules);
      console.log(`Found ${textFiles.length} text files to search`);
      
      if (textFiles.length === 0) {
        setSearchError('לא נמצאו קבצי טקסט לחיפוש');
        setSearchMessage('');
        return;
      }

      const results = [];
      const maxResults = 100;
      
      // חיפוש בכל קובץ
      for (const filePath of textFiles) {
        if (results.length >= maxResults) break;
        
        try {
          // טעינת תוכן הקובץ
          const loadFile = textModules[filePath];
          const content = await loadFile();
          
          // חיפוש בתוכן
          const fileResults = searchInText(
            content,
            filePath,
            gematriaValue,
            {
              method: gematriaMethod,
              useKolel: useKolel,
              wholeVerseOnly: wholeVerseOnly,
              maxPhraseWords: maxPhraseWords
            }
          );
          
          results.push(...fileResults);
          
          if (results.length >= maxResults) {
            results.splice(maxResults);
            break;
          }
        } catch (error) {
          console.error(`Error reading file ${filePath}:`, error);
        }
      }

      setSearchResults(results);
      setSearchMessage(
        results.length > 0
          ? `נמצאו ${results.length} תוצאות`
          : 'לא נמצאו תוצאות'
      );
    } catch (error) {
      console.error('Error searching gematria:', error);
      setSearchError('אירעה שגיאה בחיפוש. אנא נסה שוב.');
      setSearchMessage('');
    } finally {
      setIsSearching(false);
    }
  };

  // פונקציה לחיפוש בתוך טקסט
  const searchInText = (content, filePath, targetValue, options) => {
    const { method, useKolel, wholeVerseOnly, maxPhraseWords } = options;
    const results = [];
    const lines = content.split('\n');
    const fileName = filePath.split('/').pop().replace('.txt', '');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // דילוג על שורות כותרות
      if (/<h[1-6][^>]*>/.test(line)) {
        continue;
      }

      // חילוץ מספר הפסוק
      const verseMatch = line.match(/^\(([^\)]+)\)/);
      const verseNumber = verseMatch ? verseMatch[1] : '';

      // הסרת הסוגריים עם מספר הפסוק
      let cleanLine = line.replace(/^\([^\)]+\)\s*/, '');

      // הסרת סוגריים מסולסלות עם תוכן
      cleanLine = cleanLine.replace(/\{[^\}]*\}/g, '');

      // ניקוי תגיות HTML
      const lineWithoutHtml = cleanLine.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

      const words = lineWithoutHtml
        .split(/\s+/)
        .filter(w => w.trim().length > 0);

      if (words.length === 0) continue;

      // חיפוש פסוק שלם
      if (wholeVerseOnly) {
        const totalValue = calculateGematria(words.join(' '), method, useKolel);
        
        if (totalValue === targetValue) {
          results.push({
            text: words.join(' '),
            path: fileName,
            verseNumber: verseNumber,
            contextBefore: '',
            contextAfter: ''
          });
        }
      } else {
        // חיפוש רגיל - כל קטע
        for (let start = 0; start < words.length; start++) {
          for (let offset = 0; offset < maxPhraseWords && start + offset < words.length; offset++) {
            const phrase = words.slice(start, start + offset + 1).join(' ');
            const phraseValue = calculateGematria(phrase, method, useKolel);
            
            if (phraseValue === targetValue) {
              // חילוץ הקשר
              const contextWordsCount = 3;
              const contextStart = Math.max(0, start - contextWordsCount);
              const contextEnd = Math.min(words.length, start + offset + 1 + contextWordsCount);
              
              const contextBefore = start > contextStart
                ? words.slice(contextStart, start).join(' ')
                : '';
              const contextAfter = start + offset + 1 < contextEnd
                ? words.slice(start + offset + 1, contextEnd).join(' ')
                : '';
              
              results.push({
                text: phrase,
                path: fileName,
                verseNumber: verseNumber,
                contextBefore: contextBefore,
                contextAfter: contextAfter
              });
            } else if (phraseValue > targetValue) {
              break;
            }
          }
        }
      }
    }

    return results;
  };

  const clearInput = () => {
    setInputText('');
    setSearchResults([]);
    setSearchError('');
    setSearchMessage('');
  };

  // טיפול ב-Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && gematriaValue > 0 && !isSearching) {
      handleSearchInBooks();
    }
  };

  return (
    <div className="gematria-tool">
      {/* כותרת */}
      <div className="tool-header">
        <h2>מחשבון גימטריות</h2>
        <p>חישוב גימטריה בשיטות שונות וחיפוש בספרים</p>
      </div>

      {/* כרטיס מחשבון */}
      <div className="gematria-card">
        {/* שורת קלט עם תוצאה */}
        <div className="input-row">
          <div className="input-wrapper">
            <input
              type="text"
              className="gematria-input"
              placeholder="הזן טקסט לחישוב ולחץ Enter לחיפוש..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              dir="rtl"
            />
            {inputText && (
              <button className="clear-btn" onClick={clearInput}>
                <DeleteRegular />
              </button>
            )}
          </div>
          
          {gematriaValue > 0 && (
            <div className="gematria-value-display">
              <span className="value-number">{gematriaValue}</span>
            </div>
          )}

          <button 
            className="settings-btn" 
            onClick={() => setShowSettings(true)}
            title="הגדרות"
          >
            <SettingsRegular />
          </button>
        </div>

        {/* הודעות */}
        {isSearching && (
          <div className="message info">מחפש בספרים...</div>
        )}
        {searchMessage && !searchError && !isSearching && (
          <div className="message success">{searchMessage}</div>
        )}
        {searchError && (
          <div className="message error">{searchError}</div>
        )}
      </div>

      {/* דיאלוג הגדרות - rendered via Portal to escape stacking context */}
      {showSettings && createPortal(
        <>
          <div className="settings-overlay" onClick={() => setShowSettings(false)} />
          <div className="settings-dialog">
            <div className="settings-header">
              <h3>הגדרות גימטריה</h3>
              <button className="close-dialog-btn" onClick={() => setShowSettings(false)}>
                <DismissRegular />
              </button>
            </div>

            <div className="settings-content">
              {/* שיטת חישוב */}
              <div className="settings-section">
                <div className="settings-section-title">שיטת חישוב</div>
                <div className="method-selector">
                  <label className="radio-compact">
                    <input
                      type="radio"
                      name="method"
                      value="regular"
                      checked={gematriaMethod === 'regular'}
                      onChange={(e) => setGematriaMethod(e.target.value)}
                    />
                    <span>רגילה</span>
                  </label>
                  <label className="radio-compact">
                    <input
                      type="radio"
                      name="method"
                      value="small"
                      checked={gematriaMethod === 'small'}
                      onChange={(e) => setGematriaMethod(e.target.value)}
                    />
                    <span>קטנה</span>
                  </label>
                  <label className="radio-compact">
                    <input
                      type="radio"
                      name="method"
                      value="finalLetters"
                      checked={gematriaMethod === 'finalLetters'}
                      onChange={(e) => setGematriaMethod(e.target.value)}
                    />
                    <span>סופיות</span>
                  </label>
                </div>

                <label className="checkbox-compact">
                  <input
                    type="checkbox"
                    checked={useKolel}
                    onChange={(e) => setUseKolel(e.target.checked)}
                  />
                  <span>כולל</span>
                </label>
              </div>

              {/* הגדרות חיפוש */}
              <div className="settings-section">
                <div className="settings-section-title">הגדרות חיפוש</div>
                <label className="checkbox-compact">
                  <input
                    type="checkbox"
                    checked={wholeVerseOnly}
                    onChange={(e) => setWholeVerseOnly(e.target.checked)}
                  />
                  <span>פסוקים שלמים בלבד</span>
                </label>

                {!wholeVerseOnly && (
                  <div className="number-input-control">
                    <label>מספר מילים מקסימלי:</label>
                    <input
                      type="number"
                      min="2"
                      max="15"
                      value={maxPhraseWords}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 2;
                        setMaxPhraseWords(Math.min(Math.max(val, 2), 15));
                      }}
                      className="number-input"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="settings-footer">
              <button className="settings-done-btn" onClick={() => setShowSettings(false)}>
                סגור
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* תוצאות */}
      {searchResults.length > 0 && (
        <div className="results-container">
          <div className="results-header">
            <span>{searchResults.length} תוצאות</span>
          </div>
          <div className="results-list">
            {searchResults.map((result, index) => (
              <div key={index} className="result-item">
                <div className="result-main">
                  <span className="result-text">{result.text}</span>
                  {result.verseNumber && (
                    <span className="result-badge">{result.verseNumber}</span>
                  )}
                </div>
                {result.path && (
                  <div className="result-path">{result.path}</div>
                )}
                {(result.contextBefore || result.contextAfter) && (
                  <div className="result-context">
                    <span className="context-dim">{result.contextBefore} </span>
                    <span className="context-highlight">{result.text}</span>
                    <span className="context-dim"> {result.contextAfter}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GematriaTool;
