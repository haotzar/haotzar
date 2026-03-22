import { useState } from 'react';
import './Bookshelf.css';

const Bookshelf = ({ title, books, onBookClick }) => {
  const [hoveredBook, setHoveredBook] = useState(null);

  // צבעים אמיתיים של ספרים עתיקים
  const bookColors = [
    { spine: '#8b4513', edge: '#654321', accent: '#d4af37' }, // חום כהה עם זהב
    { spine: '#654321', edge: '#4a3124', accent: '#c9a961' }, // חום בינוני
    { spine: '#3d2817', edge: '#2a1810', accent: '#b8860b' }, // חום כהה מאוד
    { spine: '#a0522d', edge: '#8b4513', accent: '#daa520' }, // חום בהיר
    { spine: '#6b4423', edge: '#5c3d2e', accent: '#cd853f' }, // חום אדמדם
    { spine: '#4a3124', edge: '#3d2817', accent: '#b8956f' }, // חום עמוק
    { spine: '#5c3d2e', edge: '#4a3124', accent: '#c4a574' }, // חום קלאסי
    { spine: '#7b5b3a', edge: '#654321', accent: '#e6c896' }, // חום בהיר יותר
  ];

  const generateBookStyle = (index) => {
    const colorScheme = bookColors[index % bookColors.length];
    const width = 18 + Math.random() * 0; // רוחב משתנה - עוד יותר קטן
    const height = 90 + Math.random() * 2; // גובה משתנה - עוד יותר קטן
    const tilt = -0.5 + Math.random() * 0; // הטיה מינימלית - כמעט ישר!
    
    return {
      width: `${width}px`,
      height: `${height}px`,
      transform: `rotateZ(${tilt}deg)`,
      '--spine-color': colorScheme.spine,
      '--edge-color': colorScheme.edge,
      '--accent-color': colorScheme.accent,
    };
  };

  return (
    <div className="bookshelf-section">
      <div className="shelf-container">
        <div className="shelf-label">
          <span className="shelf-label-text">{title}</span>
        </div>
        
        <div className="books-row">
          {books && books.length > 0 ? (
            books.map((book, index) => (
              <div
                key={book.id || index}
                className={`book ${hoveredBook === index ? 'hovered' : ''}`}
                style={generateBookStyle(index)}
                onMouseEnter={() => setHoveredBook(index)}
                onMouseLeave={() => setHoveredBook(null)}
                onClick={() => onBookClick(book)}
                title={book.name}
              >
                <div className="book-spine">
                  <div className="book-title-vertical">{book.name}</div>
                  <div className="book-decorations">
                    <div className="book-line"></div>
                    <div className="book-line"></div>
                  </div>
                </div>
                <div className="book-top"></div>
                <div className="book-cover"></div>
              </div>
            ))
          ) : (
            // ספרים דמה אם אין ספרים
            Array.from({ length: 12 }).map((_, index) => (
              <div
                key={`dummy-${index}`}
                className="book dummy-book"
                style={generateBookStyle(index)}
              >
                <div className="book-spine">
                  <div className="book-decorations">
                    <div className="book-line"></div>
                    <div className="book-line"></div>
                  </div>
                </div>
                <div className="book-top"></div>
              </div>
            ))
          )}
        </div>
        
        <div className="shelf-wood">
          <div className="shelf-edge"></div>
        </div>
      </div>
    </div>
  );
};

export default Bookshelf;
