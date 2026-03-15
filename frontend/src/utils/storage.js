// Storage utility for notebooks and pages
// Uses localStorage for simplicity (can be upgraded to IndexedDB for larger datasets)

const STORAGE_KEY = 'aislate_data';

// Data structure:
// {
//   notebooks: [
//     {
//       id: 'notebook-id',
//       name: 'Notebook Name', 
//       createdAt: timestamp,
//       pages: [
//         {
//           id: 'page-id',
//           name: 'Page Name',
//           createdAt: timestamp,
//           updatedAt: timestamp,
//           content: {
//             strokes: [], // Array of drawing strokes
//             imageData: '' // Base64 image data for quick preview
//           }
//         }
//       ]
//     }
//   ],
//   activeNotebook: 'notebook-id',
//   activePage: 'page-id'
// }

export class StorageManager {
  constructor() {
    this.initializeStorage();
  }

  initializeStorage() {
    const existingData = this.getData();
    if (!existingData || !existingData.notebooks) {
      const initialData = {
        notebooks: [
          {
            id: this.generateId(),
            name: 'My First Notebook',
            createdAt: Date.now(),
            pages: [
              {
                id: this.generateId(),
                name: 'Page 1',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                content: {
                  strokes: [], // Legacy format for backward compatibility
                  textElements: [], // Legacy format for backward compatibility
                  tldrawData: null, // New TLDraw format
                  imageData: ''
                }
              }
            ]
          }
        ],
        activeNotebook: null,
        activePage: null
      };
      initialData.activeNotebook = initialData.notebooks[0].id;
      initialData.activePage = initialData.notebooks[0].pages[0].id;
      this.saveData(initialData);
    }
  }

  getData() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading data:', error);
      return null;
    }
  }

  saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving data:', error);
      return false;
    }
  }

  generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Notebook operations
  createNotebook(name = 'New Notebook') {
    const data = this.getData();
    const newNotebook = {
      id: this.generateId(),
      name,
      createdAt: Date.now(),
      pages: [
        {
          id: this.generateId(),
          name: 'Page 1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          content: {
            strokes: [], // Legacy format for backward compatibility
            textElements: [], // Legacy format for backward compatibility
            tldrawData: null, // New TLDraw format
            imageData: ''
          }
        }
      ]
    };
    
    data.notebooks.push(newNotebook);
    data.activeNotebook = newNotebook.id;
    data.activePage = newNotebook.pages[0].id;
    
    this.saveData(data);
    return newNotebook;
  }

  renameNotebook(notebookId, newName) {
    const data = this.getData();
    const notebook = data.notebooks.find(n => n.id === notebookId);
    if (notebook) {
      notebook.name = newName;
      this.saveData(data);
      return true;
    }
    return false;
  }

  deleteNotebook(notebookId) {
    const data = this.getData();
    if (data.notebooks.length <= 1) return false; // Keep at least one notebook
    
    data.notebooks = data.notebooks.filter(n => n.id !== notebookId);
    
    // Update active references if needed
    if (data.activeNotebook === notebookId) {
      data.activeNotebook = data.notebooks[0].id;
      data.activePage = data.notebooks[0].pages[0].id;
    }
    
    this.saveData(data);
    return true;
  }

  // Page operations
  createPage(notebookId, name = 'New Page') {
    const data = this.getData();
    const notebook = data.notebooks.find(n => n.id === notebookId);
    if (!notebook) return null;

    const newPage = {
      id: this.generateId(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      content: {
        strokes: [], // Legacy format for backward compatibility
        textElements: [], // Legacy format for backward compatibility
        tldrawData: null, // New TLDraw format
        imageData: ''
      }
    };

    notebook.pages.push(newPage);
    data.activePage = newPage.id;
    
    this.saveData(data);
    return newPage;
  }

  renamePage(notebookId, pageId, newName) {
    const data = this.getData();
    const notebook = data.notebooks.find(n => n.id === notebookId);
    if (!notebook) return false;

    const page = notebook.pages.find(p => p.id === pageId);
    if (page) {
      page.name = newName;
      page.updatedAt = Date.now();
      this.saveData(data);
      return true;
    }
    return false;
  }

  deletePage(notebookId, pageId) {
    const data = this.getData();
    const notebook = data.notebooks.find(n => n.id === notebookId);
    if (!notebook || notebook.pages.length <= 1) return false; // Keep at least one page

    notebook.pages = notebook.pages.filter(p => p.id !== pageId);
    
    // Update active page if needed
    if (data.activePage === pageId) {
      data.activePage = notebook.pages[0].id;
    }
    
    this.saveData(data);
    return true;
  }

  // Content operations
  updatePageContent(notebookId, pageId, content) {
    const data = this.getData();
    const notebook = data.notebooks.find(n => n.id === notebookId);
    if (!notebook) return false;

    const page = notebook.pages.find(p => p.id === pageId);
    if (page) {
      page.content = { ...page.content, ...content };
      page.updatedAt = Date.now();
      this.saveData(data);
      return true;
    }
    return false;
  }

  // Active state management
  setActiveNotebook(notebookId) {
    const data = this.getData();
    const notebook = data.notebooks.find(n => n.id === notebookId);
    if (notebook) {
      data.activeNotebook = notebookId;
      data.activePage = notebook.pages[0].id; // Switch to first page
      this.saveData(data);
      return true;
    }
    return false;
  }

  setActivePage(pageId) {
    const data = this.getData();
    data.activePage = pageId;
    this.saveData(data);
    return true;
  }
}

export const storage = new StorageManager();

