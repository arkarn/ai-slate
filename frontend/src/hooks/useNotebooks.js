import { useState, useEffect, useCallback } from 'react';
import { supabaseStorage } from '@/utils/supabaseStorage';

export const useNotebooks = () => {
  const [notebooks, setNotebooks] = useState([]);
  const [activeNotebookId, setActiveNotebookId] = useState(null);
  const [activePageId, setActivePageId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      const data = await supabaseStorage.getData();
      if (data) {
        setNotebooks(data.notebooks);
        setActiveNotebookId(data.activeNotebook);
        setActivePageId(data.activePage);
        
        // If no notebooks exist, create initial notebook
        if (data.notebooks.length === 0) {
          console.log('No notebooks found, creating initial notebook...');
          await supabaseStorage.initializeStorage();
          // Reload data after initialization
          const newData = await supabaseStorage.getData();
          if (newData) {
            setNotebooks(newData.notebooks);
            setActiveNotebookId(newData.activeNotebook);
            setActivePageId(newData.activePage);
          }
        }
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Refresh state from storage
  const refreshState = useCallback(async () => {
    const data = await supabaseStorage.getData();
    if (data) {
      setNotebooks(data.notebooks);
      setActiveNotebookId(data.activeNotebook);
      setActivePageId(data.activePage);
    }
  }, []);

  // Notebook operations
  const createNotebook = useCallback(async (name) => {
    const newNotebook = await supabaseStorage.createNotebook(name);
    await refreshState();
    return newNotebook;
  }, [refreshState]);

  const renameNotebook = useCallback(async (notebookId, newName) => {
    const success = await supabaseStorage.renameNotebook(notebookId, newName);
    if (success) await refreshState();
    return success;
  }, [refreshState]);

  const deleteNotebook = useCallback(async (notebookId) => {
    const success = await supabaseStorage.deleteNotebook(notebookId);
    if (success) await refreshState();
    return success;
  }, [refreshState]);

  const selectNotebook = useCallback(async (notebookId) => {
    const success = await supabaseStorage.setActiveNotebook(notebookId);
    if (success) await refreshState();
    return success;
  }, [refreshState]);

  // Page operations
  const createPage = useCallback(async (notebookId, name) => {
    const newPage = await supabaseStorage.createPage(notebookId, name);
    await refreshState();
    return newPage;
  }, [refreshState]);

  const renamePage = useCallback(async (notebookId, pageId, newName) => {
    const success = await supabaseStorage.renamePage(notebookId, pageId, newName);
    if (success) await refreshState();
    return success;
  }, [refreshState]);

  const deletePage = useCallback(async (notebookId, pageId) => {
    const success = await supabaseStorage.deletePage(notebookId, pageId);
    if (success) await refreshState();
    return success;
  }, [refreshState]);

  const selectPage = useCallback(async (pageId) => {
    // Skip if already on the same page to prevent unnecessary re-renders
    if (activePageId === pageId) return true;
    
    const success = await supabaseStorage.setActivePage(pageId);
    if (success) await refreshState();
    return success;
  }, [refreshState, activePageId]);

  // Content operations
  const updatePageContent = useCallback(async (notebookId, pageId, content) => {
    const success = await supabaseStorage.updatePageContent(notebookId, pageId, content);
    // Don't refresh state on content update to avoid unnecessary re-renders
    // The content is already updated in the whiteboard component
    return success;
  }, []);

  // Computed values
  const activeNotebook = notebooks.find(n => n.id === activeNotebookId);
  const activePage = activeNotebook?.pages.find(p => p.id === activePageId);

  return {
    // State
    notebooks,
    activeNotebook,
    activePage,
    activeNotebookId,
    activePageId,
    isLoading,

    // Operations
    createNotebook,
    renameNotebook,
    deleteNotebook,
    selectNotebook,
    
    createPage,
    renamePage,
    deletePage,
    selectPage,
    
    updatePageContent,
    refreshState
  };
};



