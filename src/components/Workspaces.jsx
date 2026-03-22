import { AddRegular, DeleteRegular, EditRegular, FolderRegular } from '@fluentui/react-icons';
import { useState } from 'react';
import './Workspaces.css';

const Workspaces = ({ workspaces, currentWorkspace, onSelectWorkspace, onCreateWorkspace, onDeleteWorkspace, onRenameWorkspace }) => {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleRename = (id) => {
    if (editName.trim()) {
      onRenameWorkspace(id, editName.trim());
      setEditingId(null);
      setEditName('');
    }
  };

  const startEdit = (workspace) => {
    setEditingId(workspace.id);
    setEditName(workspace.name);
  };

  return (
    <div className="workspaces-container">
      {/* רשימת שולחנות */}
      <div className="workspaces-list">
        {workspaces.map(workspace => (
          <div 
            key={workspace.id}
            className={`workspace-item ${currentWorkspace === workspace.id ? 'active' : ''}`}
          >
            {editingId === workspace.id ? (
              <div className="workspace-edit">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(workspace.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={() => handleRename(workspace.id)}
                  autoFocus
                  className="workspace-edit-input"
                />
              </div>
            ) : (
              <>
                <div 
                  className="workspace-content"
                  onClick={() => onSelectWorkspace(workspace.id)}
                >
                  <FolderRegular className="workspace-icon" />
                  <div className="workspace-info">
                    <div className="workspace-name">{workspace.name}</div>
                    <div className="workspace-tabs-count">
                      {workspace.tabs.length} {workspace.tabs.length === 1 ? 'כרטיסייה' : 'כרטיסיות'}
                    </div>
                  </div>
                </div>
                <div className="workspace-actions">
                  <button
                    className="workspace-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(workspace);
                    }}
                    title="שנה שם"
                  >
                    <EditRegular />
                  </button>
                  <button
                    className="workspace-action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`למחוק את שולחן העבודה "${workspace.name}"?`)) {
                        onDeleteWorkspace(workspace.id);
                      }
                    }}
                    title="מחק"
                  >
                    <DeleteRegular />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Workspaces;
