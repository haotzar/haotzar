import { useState, useEffect, useRef } from 'react';
import {
  AddRegular,
  DismissRegular,
  DeleteRegular,
  NoteRegular
} from '@fluentui/react-icons';
import TooltipWrapper from './TooltipWrapper';
import customAlert from '../utils/customAlert';
import customConfirm from '../utils/customConfirm';
import './TextNotesPanel.css';

const TextNotesPanel = ({ bookName, currentLineIndex, onClose, autoOpenCreate = false, initialContent = '' }) => {
  const [notes, setNotes] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('textNotesPanelWidth');
    return saved ? parseInt(saved) : 240;
  });
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef(null);

  // Load notes from localStorage
  useEffect(() => {
    loadNotes();
  }, [bookName, currentLineIndex]);

  // פתח את טופס יצירת הערה חדשה אם נדרש
  useEffect(() => {
    if (autoOpenCreate) {
      setShowCreateForm(true);
      if (initialContent) {
        setNewNoteContent(initialContent);
      }
    }
  }, [autoOpenCreate, initialContent]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const panel = panelRef.current;
      if (!panel) return;
      
      const rect = panel.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      
      // הגבל רוחב בין 200 ל-600 פיקסלים
      if (newWidth >= 200 && newWidth <= 600) {
        setPanelWidth(newWidth);
        localStorage.setItem('textNotesPanelWidth', newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const loadNotes = () => {
    try {
      const savedNotes = localStorage.getItem('personalNotes');
      if (savedNotes) {
        const allNotes = JSON.parse(savedNotes);
        
        // Filter notes for current book and line
        const relevantNotes = allNotes.filter(note => {
          if (!note.context) return false;
          
          // Check if note is for this book
          const isBookMatch = note.context.bookName === bookName;
          
          // Check if note is for this line (or book-level note)
          const isLineMatch = 
            note.context.type === 'book' || // Book-level notes show on all lines
            (note.context.type === 'line' && note.context.lineIndex == currentLineIndex);
          
          return isBookMatch && isLineMatch;
        });
        
        setNotes(relevantNotes);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const handleCreateNote = () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      customAlert('נא למלא כותרת ותוכן להערה', { type: 'warning', title: 'שים לב' });
      return;
    }

    const newNote = {
      id: Date.now(),
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      context: {
        type: 'line',
        bookName: bookName,
        lineIndex: currentLineIndex
      },
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const savedNotes = localStorage.getItem('personalNotes');
      const allNotes = savedNotes ? JSON.parse(savedNotes) : [];
      const updatedNotes = [...allNotes, newNote];
      localStorage.setItem('personalNotes', JSON.stringify(updatedNotes));
      
      // Reset form
      setNewNoteTitle('');
      setNewNoteContent('');
      setShowCreateForm(false);
      
      // Reload notes
      loadNotes();
    } catch (error) {
      console.error('Error creating note:', error);
      customAlert('שגיאה בשמירת ההערה', { type: 'error', title: 'שגיאה' });
    }
  };

  const handleDeleteNote = async (noteId) => {
    const shouldDelete = await customConfirm(
      'האם אתה בטוח שברצונך למחוק הערה זו?',
      { type: 'warning', title: 'אישור מחיקה' }
    );
    if (shouldDelete) {
      try {
        const savedNotes = localStorage.getItem('personalNotes');
        const allNotes = savedNotes ? JSON.parse(savedNotes) : [];
        const updatedNotes = allNotes.filter(note => note.id !== noteId);
        localStorage.setItem('personalNotes', JSON.stringify(updatedNotes));
        loadNotes();
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="text-notes-panel-sidebar" ref={panelRef} style={{ width: `${panelWidth}px` }}>
      {/* Resize Handle */}
      <TooltipWrapper content="גרור לשינוי רוחב">
        <div 
          className="panel-resize-handle"
          onMouseDown={() => setIsResizing(true)}
        />
      </TooltipWrapper>
      
      {/* Header */}
      <div className="notes-sidebar-header">
        <div className="header-title-section">
          <NoteRegular className="header-icon" />
          <h3 className="header-title">הערות אישיות</h3>
          <span className="notes-count">({notes.length})</span>
        </div>
        <TooltipWrapper content="סגור">
          <button className="close-panel-btn" onClick={onClose}>
            <DismissRegular />
          </button>
        </TooltipWrapper>
      </div>

      {/* Content */}
      <div className="notes-sidebar-content">
        {/* Create Form */}
        {showCreateForm ? (
          <div className="create-note-form">
            <div className="form-header">
              <span>הערה חדשה - שורה {currentLineIndex + 1}</span>
            </div>
            <input
              type="text"
              placeholder="כותרת ההערה..."
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              className="note-title-input"
              autoFocus
            />
            <textarea
              placeholder="תוכן ההערה..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className="note-content-input"
              rows={6}
            />
            <div className="form-actions">
              <button onClick={handleCreateNote} className="save-note-btn">
                שמור
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewNoteTitle('');
                  setNewNoteContent('');
                }}
                className="cancel-note-btn"
              >
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <button
            className="add-note-btn"
            onClick={() => setShowCreateForm(true)}
          >
            <AddRegular />
            <span>הוסף הערה חדשה</span>
          </button>
        )}

        {/* Notes List */}
        <div className="notes-list">
          {notes.length === 0 ? (
            <div className="empty-notes">
              <NoteRegular className="empty-icon" />
              <p>אין הערות לשורה זו</p>
            </div>
          ) : (
            notes.map(note => (
              <div key={note.id} className="note-item">
                <div className="note-item-header">
                  <h4 className="note-item-title">{note.title}</h4>
                  <TooltipWrapper content="מחק הערה">
                    <button
                      className="delete-note-btn"
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <DeleteRegular />
                    </button>
                  </TooltipWrapper>
                </div>
                <p className="note-item-content">{note.content}</p>
                <div className="note-item-footer">
                  {note.context.type === 'book' && (
                    <span className="note-scope">הערה כללית לספר</span>
                  )}
                  {note.context.type === 'line' && (
                    <span className="note-scope">שורה {note.context.lineIndex + 1}</span>
                  )}
                  <span className="note-date">{formatDate(note.updatedAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TextNotesPanel;
