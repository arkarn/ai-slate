import React, { useState } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { HiOutlineBookOpen } from 'react-icons/hi';
import '@/styles/Sidebar.css';

const Sidebar = ({ 
  notebooks, 
  activeNotebookId, 
  onSelectNotebook, 
  onCreateNotebook, 
  onRenameNotebook, 
  onDeleteNotebook 
}) => {
  const [editingNotebookId, setEditingNotebookId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const handleStartEdit = (notebook) => {
    setEditingNotebookId(notebook.id);
    setEditingName(notebook.name);
  };

  const handleSaveEdit = async () => {
    if (editingName.trim()) {
      await onRenameNotebook(editingNotebookId, editingName.trim());
    }
    setEditingNotebookId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingNotebookId(null);
    setEditingName('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleCreateNotebook = async () => {
    const name = prompt('Enter notebook name:');
    if (name && name.trim()) {
      await onCreateNotebook(name.trim());
    }
  };

  const handleDeleteNotebook = async (notebookId, e) => {
    e.stopPropagation();
    if (notebooks.length <= 1) {
      alert('Cannot delete the last notebook');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this notebook? This action cannot be undone.')) {
      await onDeleteNotebook(notebookId);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3><HiOutlineBookOpen /> Notebooks</h3>
      </div>

      <div className="notebooks-list">
        {notebooks.map(notebook => (
          <div
            key={notebook.id}
            className={`notebook-item ${activeNotebookId === notebook.id ? 'active' : ''}`}
            onClick={async () => await onSelectNotebook(notebook.id)}
          >
            <div className="notebook-icon">
              <HiOutlineBookOpen />
            </div>
            
            <div className="notebook-content">
              {editingNotebookId === notebook.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="notebook-edit-input"
                />
              ) : (
                <div className="notebook-info">
                  <div className="notebook-name">{notebook.name}</div>
                  <div className="notebook-meta">
                    {notebook.pages.length} page{notebook.pages.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>

            <div className="notebook-actions">
              {editingNotebookId !== notebook.id && (
                <>
                  <button
                    className="action-btn edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(notebook);
                    }}
                    title="Rename notebook"
                  >
                    <FaEdit size={12} />
                  </button>
                  {notebooks.length > 1 && (
                    <button
                      className="action-btn delete-btn"
                      onClick={(e) => handleDeleteNotebook(notebook.id, e)}
                      title="Delete notebook"
                    >
                      <FaTrash size={12} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button
          className="create-notebook-btn"
          onClick={handleCreateNotebook}
          title="Create new notebook"
        >
          <FaPlus size={16} />
          <span>New Notebook</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;



