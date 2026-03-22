import React, { useState, useEffect } from 'react';
import './MetadataEditor.css';

const MetadataEditor = ({ onBack }) => {
  const [books, setBooks] = useState([]);
  const [selectedBookIndex, setSelectedBookIndex] = useState(null);
  const [editedBook, setEditedBook] = useState(null);
  const [isModified, setIsModified] = useState(false);

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

  // בחירת ספר לעריכה
  const selectBook = (index) => {
    setSelectedBookIndex(index);
    setEditedBook(JSON.parse(JSON.stringify(books[index])));
    setIsModified(false);
  };

  // יצירת ספר חדש
  const createNewBook = () => {
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
    setEditedBook(newBook);
    setSelectedBookIndex(null);
    setIsModified(true);
  };

  // עדכון שדה בספר
  const updateField = (field, value) => {
    setEditedBook({ ...editedBook, [field]: value });
    setIsModified(true);
  };

  // עדכון מערך (aliases או categories)
  const updateArray = (field, value) => {
    const array = value.split(',').map(item => item.trim()).filter(item => item);
    updateField(field, array);
  };

  // הוספת פריט לתוכן עניינים
  const addTocEntry = () => {
    const newEntry = { label: '', page: 1, keywords: [] };
    updateField('tableOfContents', [...editedBook.tableOfContents, newEntry]);
  };

  // עדכון פריט בתוכן עניינים
  const updateTocEntry = (index, field, value) => {
    const newToc = [...editedBook.tableOfContents];
    if (field === 'keywords') {
      newToc[index][field] = value.split(',').map(k => k.trim()).filter(k => k);
    } else {
      newToc[index][field] = field === 'page' ? parseInt(value) || 1 : value;
    }
    updateField('tableOfContents', newToc);
  };

  // מחיקת פריט מתוכן עניינים
  const deleteTocEntry = (index) => {
    const newToc = editedBook.tableOfContents.filter((_, i) => i !== index);
    updateField('tableOfContents', newToc);
  };

  // שמירת השינויים
  const saveChanges = () => {
    let updatedBooks;
    if (selectedBookIndex !== null) {
      updatedBooks = [...books];
      updatedBooks[selectedBookIndex] = editedBook;
    } else {
      updatedBooks = [...books, editedBook];
    }
    
    setBooks(updatedBooks);
    setIsModified(false);
    
    // הורדת הקובץ המעודכן
    downloadMetadata(updatedBooks);
  };

  // הורדת קובץ JSON
  const downloadMetadata = (booksData) => {
    const metadata = { books: booksData };
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'books-metadata.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // מחיקת ספר
  const deleteBook = () => {
    if (selectedBookIndex === null) return;
    if (!confirm(`האם למחוק את "${books[selectedBookIndex].title}"?`)) return;
    
    const updatedBooks = books.filter((_, i) => i !== selectedBookIndex);
    setBooks(updatedBooks);
    setEditedBook(null);
    setSelectedBookIndex(null);
    downloadMetadata(updatedBooks);
  };

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

  return (
    <div className="metadata-editor">
      <div className="editor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {onBack && (
            <button onClick={onBack} className="btn-back" title="חזור להגדרות">
              ←
            </button>
          )}
          <h1>עורך מטא-דאטה של ספרים</h1>
        </div>
        <button onClick={createNewBook} className="btn-new">+ ספר חדש</button>
      </div>

      <div className="editor-layout">
        {/* רשימת ספרים */}
        <div className="books-list">
          <h2>ספרים ({books.length})</h2>
          <div className="books-scroll">
            {books.map((book, index) => (
              <div
                key={book.id}
                className={`book-item ${selectedBookIndex === index ? 'selected' : ''}`}
                onClick={() => selectBook(index)}
              >
                <div className="book-title">{book.title}</div>
                <div className="book-author">{book.author}</div>
              </div>
            ))}
          </div>
        </div>

        {/* טופס עריכה */}
        {editedBook && (
          <div className="edit-form">
            <div className="form-header">
              <h2>{selectedBookIndex !== null ? 'עריכת ספר' : 'ספר חדש'}</h2>
              {isModified && <span className="modified-indicator">● שונה</span>}
            </div>

            <div className="form-scroll">
              <div className="form-section">
                <h3>פרטים בסיסיים</h3>
                
                <div className="form-group">
                  <label>מזהה (ID) *</label>
                  <input
                    type="text"
                    value={editedBook.id}
                    onChange={(e) => updateField('id', e.target.value)}
                    placeholder="rashba-berachot"
                  />
                  <small>מזהה ייחודי באנגלית עם מקפים</small>
                </div>

                <div className="form-group">
                  <label>שם קובץ *</label>
                  <input
                    type="text"
                    value={editedBook.fileName}
                    onChange={(e) => updateField('fileName', e.target.value)}
                    placeholder="רשבא על ברכות"
                  />
                  <small>שם הקובץ בתיקיית books (ללא סיומת)</small>
                </div>

                <div className="form-group">
                  <label>כותרת *</label>
                  <input
                    type="text"
                    value={editedBook.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder='רשב"א על מסכת ברכות'
                  />
                </div>

                <div className="form-group">
                  <label>מחבר *</label>
                  <input
                    type="text"
                    value={editedBook.author}
                    onChange={(e) => updateField('author', e.target.value)}
                    placeholder="רבי שלמה בן אדרת"
                  />
                </div>

                <div className="form-group">
                  <label>כינויים</label>
                  <input
                    type="text"
                    value={editedBook.aliases.join(', ')}
                    onChange={(e) => updateArray('aliases', e.target.value)}
                    placeholder='רשבא, רשב"א, חידושי הרשב"א'
                  />
                  <small>הפרד בפסיקים</small>
                </div>

                <div className="form-group">
                  <label>תיאור</label>
                  <textarea
                    value={editedBook.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder='חידושי הרשב"א על מסכת ברכות'
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>קטגוריות *</label>
                  <div className="categories-grid">
                    {categories.map(cat => (
                      <label key={cat.value} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={editedBook.categories.includes(cat.value)}
                          onChange={(e) => {
                            const newCategories = e.target.checked
                              ? [...editedBook.categories, cat.value]
                              : editedBook.categories.filter(c => c !== cat.value);
                            updateField('categories', newCategories);
                          }}
                        />
                        {cat.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <h3>תוכן עניינים</h3>
                  <button onClick={addTocEntry} className="btn-add">+ הוסף פריט</button>
                </div>

                {editedBook.tableOfContents.map((entry, index) => (
                  <div key={index} className="toc-entry">
                    <div className="toc-header">
                      <span>פריט {index + 1}</span>
                      <button onClick={() => deleteTocEntry(index)} className="btn-delete">×</button>
                    </div>
                    
                    <div className="form-group">
                      <label>תווית</label>
                      <input
                        type="text"
                        value={entry.label}
                        onChange={(e) => updateTocEntry(index, 'label', e.target.value)}
                        placeholder="דף ב"
                      />
                    </div>

                    <div className="form-group">
                      <label>עמוד</label>
                      <input
                        type="number"
                        value={entry.page}
                        onChange={(e) => updateTocEntry(index, 'page', e.target.value)}
                        min="1"
                      />
                    </div>

                    <div className="form-group">
                      <label>מילות מפתח</label>
                      <input
                        type="text"
                        value={entry.keywords.join(', ')}
                        onChange={(e) => updateTocEntry(index, 'keywords', e.target.value)}
                        placeholder="ב, דף ב"
                      />
                      <small>הפרד בפסיקים</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button onClick={saveChanges} className="btn-save" disabled={!isModified}>
                שמור והורד JSON
              </button>
              {selectedBookIndex !== null && (
                <button onClick={deleteBook} className="btn-delete-book">
                  מחק ספר
                </button>
              )}
            </div>
          </div>
        )}

        {!editedBook && (
          <div className="no-selection">
            <p>בחר ספר מהרשימה או צור ספר חדש</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetadataEditor;
