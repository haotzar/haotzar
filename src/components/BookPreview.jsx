import { DismissRegular } from '@fluentui/react-icons';
import PDFViewer from '../PDFViewer';
import TextViewer from '../TextViewer';
import './BookPreview.css';

const BookPreview = ({ selectedBook, onClose }) => {
  console.log('📖 BookPreview rendering:', {
    selectedBook,
    hasSelectedBook: !!selectedBook,
    type: selectedBook?.type,
    bookId: selectedBook?.bookId,
    path: selectedBook?.path
  });
  
  if (!selectedBook) {
    return (
      <div className="book-preview-container empty">
        <div className="preview-empty-state">
          <p>בחר ספר מהספרייה לתצוגה מקדימה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="book-preview-container">
      <div className="preview-header">
        <h3 className="preview-title">{selectedBook.name}</h3>
        <button className="preview-close-btn" onClick={onClose} title="סגור תצוגה מקדימה">
          <DismissRegular />
        </button>
      </div>
      
      <div className="preview-content">
        {selectedBook.type === 'pdf' ? (
          <PDFViewer 
            pdfPath={selectedBook.path} 
            title={selectedBook.name}
            isPreviewMode={true}
          />
        ) : selectedBook.type === 'otzaria' ? (
          <TextViewer
            bookId={selectedBook.bookId}
            bookType="otzaria"
            isPreviewMode={true}
          />
        ) : selectedBook.type === 'text' ? (
          <TextViewer 
            textPath={selectedBook.path}
            isPreviewMode={true}
          />
        ) : (
          <TextViewer 
            textPath={selectedBook.path}
            isPreviewMode={true}
          />
        )}
      </div>
    </div>
  );
};

export default BookPreview;
