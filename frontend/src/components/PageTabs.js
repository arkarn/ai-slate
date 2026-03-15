import React, { useState } from 'react';
import { FaPlus, FaEdit, FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { HiOutlineBookOpen } from 'react-icons/hi';
import '@/styles/PageTabs.css';

const PageTabs = ({ 
  notebook, 
  activePageId, 
  onSelectPage, 
  onCreatePage, 
  onRenamePage, 
  onDeletePage,
  sidebarCollapsed,
  onToggleSidebar
}) => {
  const [editingPageId, setEditingPageId] = useState(null);
  const [editingName, setEditingName] = useState('');

  if (!notebook) return null;

  const handleStartEdit = (page) => {
    setEditingPageId(page.id);
    setEditingName(page.name);
  };

  const handleSaveEdit = async () => {
    if (editingName.trim()) {
      await onRenamePage(notebook.id, editingPageId, editingName.trim());
    }
    setEditingPageId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingPageId(null);
    setEditingName('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleCreatePage = async () => {
    const name = prompt('Enter page name:');
    if (name && name.trim()) {
      await onCreatePage(notebook.id, name.trim());
    }
  };

  const handleDeletePage = async (pageId, e) => {
    e.stopPropagation();
    if (notebook.pages.length <= 1) {
      alert('Cannot delete the last page');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this page? This action cannot be undone.')) {
      await onDeletePage(notebook.id, pageId);
    }
  };


  return (
    <div className="page-tabs-container">
      <div className="page-tabs-header">
        <div className="notebook-section">
          <button
            onClick={onToggleSidebar}
            className="sidebar-toggle-btn"
            title={sidebarCollapsed ? 'Show Notebooks' : 'Hide Notebooks'}
          >
            {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
          <span className="notebook-title">
            <HiOutlineBookOpen /> {notebook.name}
          </span>
          <span className="notebook-info">
            ({notebook.pages.length} page{notebook.pages.length !== 1 ? 's' : ''})
          </span>
        </div>

        <div className="divider"></div>

        <div className="page-tabs-wrapper-inline">
          <div className="page-tabs">
            {notebook.pages.map((page) => (
            <div
              key={page.id}
              className={`page-tab ${activePageId === page.id ? 'active' : ''}`}
              onClick={async () => await onSelectPage(page.id)}
            >
              <div className="page-tab-content">
                {editingPageId === page.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="page-edit-input"
                  />
                ) : (
                  <div className="page-name">{page.name}</div>
                )}
              </div>

              <div className="page-tab-actions">
                {editingPageId !== page.id && (
                  <>
                    <button
                      className="tab-action-btn edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(page);
                      }}
                      title="Rename page"
                    >
                      <FaEdit size={10} />
                    </button>
                    {notebook.pages.length > 1 && (
                      <button
                        className="tab-action-btn delete-btn"
                        onClick={(e) => handleDeletePage(page.id, e)}
                        title="Delete page"
                      >
                        <FaTimes size={10} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

            <button
              className="page-tab add-page-tab"
              onClick={handleCreatePage}
              title="Add new page"
            >
              <FaPlus size={14} />
              <span>New Page</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageTabs;



