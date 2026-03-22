import { useState, useEffect } from 'react';
import {
  AddRegular,
  DeleteRegular,
  EditRegular,
  SaveRegular,
  DismissRegular,
  SearchRegular,
  BookRegular,
  CalendarRegular,
  TagRegular
} from '@fluentui/react-icons';
import './PersonalNotes.css';

const PersonalNotes = () => {
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' or 'create'
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  
  // Create/Edit form state
  const [editingNote, setEditingNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteContext, setNoteContext] = useState({
    type: 'general', // 'general', 'book', 'page'
    bookName: '',
    pageNumber: ''
  });
  const [noteTags, setNoteTags] = useState([]);
  const [newTag, setNewTag] = useState('');

  // Load notes from localStorage
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('personalNotes');
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  }, []);

  // Save notes to localStorage
  const saveNotesToStorage = (updatedNotes) => {
    try {
      localStorage.setItem('personalNotes', JSON.stringify(updatedNotes));
      setNotes(updatedNotes);
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  // Create new note
  const handleCreateNote = () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      alert('נא למלא כותרת ותוכן להערה');
      return;
    }

    const newNote = {
      id: Date.now(),
      title: noteTitle.trim(),
      content: noteContent.trim(),
      context: noteContext,
      tags: noteTags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedNotes = [...notes, newNote];
    saveNotesToStorage(updatedNotes);
    
    // Reset form
    resetForm();
    setActiveTab('browse');
  };

  // Update existing note
  const handleUpdateNote = () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      alert('נא למלא כותרת ותוכן להערה');
      return;
    }

    const updatedNotes = notes.map(note => 
      note.id === editingNote.id 
        ? {
            ...note,
            title: noteTitle.trim(),
            content: noteContent.trim(),
            context: noteContext,
            tags: noteTags,
            updatedAt: new Date().toISOString()
          }
        : note
    );

    saveNotesToStorage(updatedNotes);
    resetForm();
    setActiveTab('browse');
  };

  // Delete note
  const handleDeleteNote = (noteId) => {
    if (confirm('האם אתה בטוח שברצונך למחוק הערה זו?')) {
      const updatedNotes = notes.filter(note => note.id !== noteId);
      saveNotesToStorage(updatedNotes);
    }
  };

  // Edit note
  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteContext(note.context);
    setNoteTags(note.tags || []);
    setActiveTab('create');
  };

  // Reset form
  const resetForm = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteContext({ type: 'general', bookName: '', pageNumber: '' });
    setNoteTags([]);
    setNewTag('');
  };

  // Add tag
  const handleAddTag = () => {
    if (newTag.trim() && !noteTags.includes(newTag.trim())) {
      setNoteTags([...noteTags, newTag.trim()]);
      setNewTag('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove) => {
    setNoteTags(noteTags.filter(tag => tag !== tagToRemove));
  };

  // Get all unique tags
  const getAllTags = () => {
    const allTags = new Set();
    notes.forEach(note => {
      if (note.tags) {
        note.tags.forEach(tag => allTags.add(tag));
      }
    });
    return Array.from(allTags);
  };

  // Filter notes
  const getFilteredNotes = () => {
    return notes.filter(note => {
      const matchesSearch = 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTag = 
        filterTag === 'all' || 
        (note.tags && note.tags.includes(filterTag));
      
      return matchesSearch && matchesTag;
    });
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get context icon
  const getContextIcon = (type) => {
    switch (type) {
      case 'book':
        return <BookRegular />;
      case 'page':
        return <BookRegular />;
      default:
        return <CalendarRegular />;
    }
  };

  // Get context text
  const getContextText = (context) => {
    if (context.type === 'book' && context.bookName) {
      return `ספר: ${context.bookName}`;
    }
    if (context.type === 'page' && context.bookName && context.pageNumber) {
      return `${context.bookName} - עמוד ${context.pageNumber}`;
    }
    return 'כללי';
  };

  const filteredNotes = getFilteredNotes();
  const allTags = getAllTags();

  return (
    <div className="personal-notes-container">
      {/* Tabs */}
      <div className="notes-tabs">
        <button
          className={`notes-tab ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('browse');
            resetForm();
          }}
        >
          סייר
        </button>
        <button
          className={`notes-tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          {editingNote ? 'ערוך' : 'צור'}
        </button>
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div className="notes-browse">
          {/* Search and Filter */}
          <div className="notes-controls">
            <div className="search-box">
              <SearchRegular className="search-icon" />
              <input
                type="text"
                placeholder="חפש הערות..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="filter-tags">
              <button
                className={`filter-tag ${filterTag === 'all' ? 'active' : ''}`}
                onClick={() => setFilterTag('all')}
              >
                הכל ({notes.length})
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`filter-tag ${filterTag === tag ? 'active' : ''}`}
                  onClick={() => setFilterTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Notes Grid */}
          <div className="notes-grid">
            {filteredNotes.length === 0 ? (
              <div className="no-notes">
                <p>אין הערות להצגה</p>
                <button
                  className="create-first-note-btn"
                  onClick={() => setActiveTab('create')}
                >
                  <AddRegular />
                  צור הערה ראשונה
                </button>
              </div>
            ) : (
              filteredNotes.map(note => (
                <div key={note.id} className="note-card">
                  <div className="note-card-header">
                    <h3 className="note-title">{note.title}</h3>
                    <div className="note-actions">
                      <button
                        className="note-action-btn edit"
                        onClick={() => handleEditNote(note)}
                        title="ערוך"
                      >
                        <EditRegular />
                      </button>
                      <button
                        className="note-action-btn delete"
                        onClick={() => handleDeleteNote(note.id)}
                        title="מחק"
                      >
                        <DeleteRegular />
                      </button>
                    </div>
                  </div>
                  
                  <div className="note-content">
                    {note.content}
                  </div>
                  
                  <div className="note-footer">
                    <div className="note-context">
                      {getContextIcon(note.context.type)}
                      <span>{getContextText(note.context)}</span>
                    </div>
                    
                    {note.tags && note.tags.length > 0 && (
                      <div className="note-tags">
                        {note.tags.map(tag => (
                          <span key={tag} className="note-tag">
                            <TagRegular />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="note-date">
                      {formatDate(note.updatedAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Tab */}
      {activeTab === 'create' && (
        <div className="notes-create">
          <div className="create-form">
            <div className="form-group">
              <label htmlFor="note-title">כותרת</label>
              <input
                id="note-title"
                type="text"
                placeholder="הזן כותרת להערה..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="note-content">תוכן</label>
              <textarea
                id="note-content"
                placeholder="כתוב את ההערה שלך כאן..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="form-textarea"
                rows={10}
              />
            </div>

            <div className="form-group">
              <label>הקשר</label>
              <div className="context-selector">
                <select
                  value={noteContext.type}
                  onChange={(e) => setNoteContext({ ...noteContext, type: e.target.value })}
                  className="form-select"
                >
                  <option value="general">כללי</option>
                  <option value="book">ספר</option>
                  <option value="page">עמוד בספר</option>
                </select>

                {(noteContext.type === 'book' || noteContext.type === 'page') && (
                  <input
                    type="text"
                    placeholder="שם הספר"
                    value={noteContext.bookName}
                    onChange={(e) => setNoteContext({ ...noteContext, bookName: e.target.value })}
                    className="form-input"
                  />
                )}

                {noteContext.type === 'page' && (
                  <input
                    type="text"
                    placeholder="מספר עמוד"
                    value={noteContext.pageNumber}
                    onChange={(e) => setNoteContext({ ...noteContext, pageNumber: e.target.value })}
                    className="form-input"
                  />
                )}
              </div>
            </div>

            <div className="form-group">
              <label>תגיות</label>
              <div className="tags-input">
                <div className="tags-list">
                  {noteTags.map(tag => (
                    <span key={tag} className="tag-item">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="tag-remove"
                      >
                        <DismissRegular />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="add-tag">
                  <input
                    type="text"
                    placeholder="הוסף תגית..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="form-input"
                  />
                  <button onClick={handleAddTag} className="add-tag-btn">
                    <AddRegular />
                  </button>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                onClick={editingNote ? handleUpdateNote : handleCreateNote}
                className="save-btn"
              >
                <SaveRegular />
                {editingNote ? 'עדכן הערה' : 'שמור הערה'}
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setActiveTab('browse');
                }}
                className="cancel-btn"
              >
                <DismissRegular />
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalNotes;
