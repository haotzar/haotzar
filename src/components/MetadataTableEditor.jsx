import React, { useState, useEffect } from 'react';
import './MetadataTableEditor.css';

const MetadataTableEditor = ({ onBack }) => {
  const [books, setBooks] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [isModified, setIsModified] = useState(false);

  const categories = [
    { value: 'tanach', label: 'תנ"ך' },
    { value: 'shas', label: 'ש"ס' },
    { value: 'halacha', label: 'הלכה' },
    { value: 'shut', label: 'שו"ת' },
    { value: 'machshava', label: 'מחשבה ומוסר' },
    { value: 'contemporary', label: 'מחברי זמננו' },
    { value: 'chassidut', label: 'חסידות' },
    { value: 'kabbalah', label: 'קבלה' },
    { value: 'journals', label: 'כתבי עת' },
    { value: 'prayers', label: 'תפלות' },
    { value: 'reference', label: 'ספרות עזר' }
  ];

  // טעינת המטא-דאטה הקיימת
  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      const response = await fetch('/books-metadata.json');
      const data = await response.json();
      setBooks(data.books || []);
    } catch (error) {
      console.error('שגיאה בטעינת מטא-דאטה:', error);
      setBooks([]);
    }
  };

  // עדכון תא
  const updateCell = (rowIndex, field, value) => {
    const newBooks = [...books];
    newBooks[rowIndex][field] = value;
    setBooks(newBooks);
    setIsModified(true);
  };

  // עדכון מערך (aliases או categories)
  const updateArrayCell = (rowIndex, field, value) => {
    const array = value.split(',').map(item => item.trim()).filter(item => item);
    updateCell(rowIndex, field, array);
  };

  // הוספת שורה חדשה
  const addNewRow = () => {
    const newBook = {
      id: '',
      fileName: '',
      title: '',
      aliases: [],
      author: '',
      categories: [],
      description: '',
      tableOfContents: []
    };
    setBooks([...books, newBook]);
    setIsModified(true);
  };

  // מחיקת שורה
  const deleteRow = (index) => {
    if (confirm(`האם למחוק את "${books[index].title || 'ספר ללא שם'}"?`)) {
      const newBooks = books.filter((_, i) => i !== index);
      setBooks(newBooks);
      setIsModified(true);
    }
  };

  // שכפול שורה
  const duplicateRow = (index) => {
    const duplicated = { ...books[index], id: books[index].id + '-copy' };
    const newBooks = [...books];
    newBooks.splice(index + 1, 0, duplicated);
    setBooks(newBooks);
    setIsModified(true);
  };

  // שמירה והורדה
  const saveAndDownload = () => {
    const metadata = { books };
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'books-metadata.json';
    a.click();
    URL.revokeObjectURL(url);
    setIsModified(false);
  };

  // ייבוא מ-CSV
  const importFromCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        let csv = event.target.result;
        
        // הסרת BOM אם קיים
        if (csv.charCodeAt(0) === 0xFEFF) {
          csv = csv.slice(1);
        }
        
        const lines = csv.split('\n');
        const newBooks = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const parts = line.split('\t');
          if (parts.length >= 5) {
            newBooks.push({
              id: parts[0] || '',
              fileName: parts[1] || '',
              title: parts[2] || '',
              author: parts[3] || '',
              aliases: parts[4] ? parts[4].split(',').map(s => s.trim()) : [],
              categories: parts[5] ? parts[5].split(',').map(s => s.trim()) : [],
              description: parts[6] || '',
              tableOfContents: []
            });
          }
        }
        
        if (newBooks.length > 0) {
          setBooks([...books, ...newBooks]);
          setIsModified(true);
          alert(`נוספו ${newBooks.length} ספרים בהצלחה!`);
        } else {
          alert('לא נמצאו ספרים תקינים בקובץ');
        }
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  };

  // ייצוא ל-CSV
  const exportToCSV = () => {
    // BOM (Byte Order Mark) לתמיכה בעברית באקסל
    const BOM = '\uFEFF';
    let csv = BOM + 'ID\tשם קובץ\tכותרת\tמחבר\tכינויים\tקטגוריות\tתיאור\n';
    books.forEach(book => {
      csv += `${book.id}\t${book.fileName}\t${book.title}\t${book.author}\t${book.aliases.join(', ')}\t${book.categories.join(', ')}\t${book.description}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'books-metadata.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCategoryLabel = (value) => {
    const cat = categories.find(c => c.value === value);
    return cat ? cat.label : value;
  };

  return (
    <div className="table-editor">
      <div className="table-header">
        <div className="header-right">
          {onBack && (
            <button onClick={onBack} className="btn-back" title="חזור להגדרות">
              ← חזור
            </button>
          )}
          <h1>עורך מטא-דאטה - תצוגת טבלה</h1>
          {isModified && <span className="modified-badge">● שונה</span>}
        </div>
        <div className="header-actions">
          <button onClick={addNewRow} className="btn-add-row">+ שורה חדשה</button>
          <button onClick={importFromCSV} className="btn-import">📥 ייבא CSV</button>
          <button onClick={exportToCSV} className="btn-export">📤 ייצא CSV</button>
          <button onClick={saveAndDownload} className="btn-save" disabled={!isModified}>
            💾 שמור והורד JSON
          </button>
        </div>
      </div>

      <div className="table-info">
        <span>סה"כ {books.length} ספרים</span>
        <span className="tip">💡 טיפ: לחץ פעמיים על תא לעריכה, Enter לשמירה, Esc לביטול</span>
      </div>

      <div className="table-container">
        <table className="metadata-table">
          <thead>
            <tr>
              <th className="col-actions">פעולות</th>
              <th className="col-id">מזהה (ID)</th>
              <th className="col-filename">שם קובץ</th>
              <th className="col-title">כותרת</th>
              <th className="col-author">מחבר</th>
              <th className="col-aliases">כינויים</th>
              <th className="col-categories">קטגוריות</th>
              <th className="col-description">תיאור</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'even' : 'odd'}>
                <td className="col-actions">
                  <button 
                    onClick={() => duplicateRow(rowIndex)} 
                    className="btn-icon" 
                    title="שכפל"
                  >
                    📋
                  </button>
                  <button 
                    onClick={() => deleteRow(rowIndex)} 
                    className="btn-icon btn-delete" 
                    title="מחק"
                  >
                    🗑️
                  </button>
                </td>
                
                <td 
                  className="col-id editable"
                  onDoubleClick={() => setEditingCell({ row: rowIndex, col: 'id' })}
                >
                  {editingCell?.row === rowIndex && editingCell?.col === 'id' ? (
                    <input
                      type="text"
                      value={book.id}
                      onChange={(e) => updateCell(rowIndex, 'id', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingCell(null);
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className={!book.id ? 'empty' : ''}>{book.id || 'לחץ פעמיים לעריכה'}</span>
                  )}
                </td>

                <td 
                  className="col-filename editable"
                  onDoubleClick={() => setEditingCell({ row: rowIndex, col: 'fileName' })}
                >
                  {editingCell?.row === rowIndex && editingCell?.col === 'fileName' ? (
                    <input
                      type="text"
                      value={book.fileName}
                      onChange={(e) => updateCell(rowIndex, 'fileName', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingCell(null);
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className={!book.fileName ? 'empty' : ''}>{book.fileName || 'לחץ פעמיים לעריכה'}</span>
                  )}
                </td>

                <td 
                  className="col-title editable"
                  onDoubleClick={() => setEditingCell({ row: rowIndex, col: 'title' })}
                >
                  {editingCell?.row === rowIndex && editingCell?.col === 'title' ? (
                    <input
                      type="text"
                      value={book.title}
                      onChange={(e) => updateCell(rowIndex, 'title', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingCell(null);
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className={!book.title ? 'empty' : ''}>{book.title || 'לחץ פעמיים לעריכה'}</span>
                  )}
                </td>

                <td 
                  className="col-author editable"
                  onDoubleClick={() => setEditingCell({ row: rowIndex, col: 'author' })}
                >
                  {editingCell?.row === rowIndex && editingCell?.col === 'author' ? (
                    <input
                      type="text"
                      value={book.author}
                      onChange={(e) => updateCell(rowIndex, 'author', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingCell(null);
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className={!book.author ? 'empty' : ''}>{book.author || 'לחץ פעמיים לעריכה'}</span>
                  )}
                </td>

                <td 
                  className="col-aliases editable"
                  onDoubleClick={() => setEditingCell({ row: rowIndex, col: 'aliases' })}
                >
                  {editingCell?.row === rowIndex && editingCell?.col === 'aliases' ? (
                    <input
                      type="text"
                      value={book.aliases.join(', ')}
                      onChange={(e) => updateArrayCell(rowIndex, 'aliases', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingCell(null);
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                      placeholder="הפרד בפסיקים"
                      autoFocus
                    />
                  ) : (
                    <span className={book.aliases.length === 0 ? 'empty' : ''}>
                      {book.aliases.length > 0 ? book.aliases.join(', ') : 'לחץ פעמיים לעריכה'}
                    </span>
                  )}
                </td>

                <td 
                  className="col-categories editable"
                  onDoubleClick={() => setEditingCell({ row: rowIndex, col: 'categories' })}
                >
                  {editingCell?.row === rowIndex && editingCell?.col === 'categories' ? (
                    <select
                      multiple
                      value={book.categories}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        updateCell(rowIndex, 'categories', selected);
                      }}
                      onBlur={() => setEditingCell(null)}
                      autoFocus
                      size="5"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={book.categories.length === 0 ? 'empty' : ''}>
                      {book.categories.length > 0 
                        ? book.categories.map(c => getCategoryLabel(c)).join(', ')
                        : 'לחץ פעמיים לעריכה'}
                    </span>
                  )}
                </td>

                <td 
                  className="col-description editable"
                  onDoubleClick={() => setEditingCell({ row: rowIndex, col: 'description' })}
                >
                  {editingCell?.row === rowIndex && editingCell?.col === 'description' ? (
                    <textarea
                      value={book.description}
                      onChange={(e) => updateCell(rowIndex, 'description', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) setEditingCell(null);
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                      autoFocus
                      rows="2"
                    />
                  ) : (
                    <span className={!book.description ? 'empty' : ''}>
                      {book.description || 'לחץ פעמיים לעריכה'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {books.length === 0 && (
        <div className="empty-table">
          <p>אין ספרים. לחץ על "שורה חדשה" להתחלה.</p>
        </div>
      )}
    </div>
  );
};

export default MetadataTableEditor;
