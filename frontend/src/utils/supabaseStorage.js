// Supabase Storage utility for notebooks and pages
// Maintains the same API as the original StorageManager for minimal code changes

import { supabase } from '@/lib/supabase.js';

export class SupabaseStorageManager {
  constructor() {
    this.user = null;
    this.initializeUser();
  }

  async initializeUser() {
    const { data: { session } } = await supabase.auth.getSession();
    this.user = session?.user || null;
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      this.user = session?.user || null;
    });
  }

  generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async getData() {
    // Wait for user authentication if not ready
    if (!this.user) {
      await this.initializeUser();
      if (!this.user) {
        console.warn('No authenticated user');
        return { notebooks: [], activeNotebook: null, activePage: null };
      }
    }

    try {
      // Get user preferences (may not exist for new users)
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('active_notebook_id, active_page_id')
        .eq('user_id', this.user.id)
        .maybeSingle();

      // Get notebooks first
      const { data: notebooks, error: notebooksError } = await supabase
        .from('notebooks')
        .select('id, name, created_at')
        .eq('user_id', this.user.id)
        .order('created_at', { ascending: true });

      if (notebooksError) {
        console.error('Error fetching notebooks:', notebooksError);
        return { notebooks: [], activeNotebook: null, activePage: null };
      }

      // If no notebooks exist, return empty state (will trigger initialization)
      if (!notebooks || notebooks.length === 0) {
        return { notebooks: [], activeNotebook: null, activePage: null };
      }

      // Get pages for each notebook
      const transformedNotebooks = [];
      for (const notebook of notebooks) {
        const { data: pages } = await supabase
          .from('pages')
          .select(`
            id,
            name,
            created_at,
            updated_at,
            page_contents (
              tldraw_data,
              image_data
            )
          `)
          .eq('notebook_id', notebook.id)
          .order('created_at', { ascending: true });

        transformedNotebooks.push({
          id: notebook.id,
          name: notebook.name,
          createdAt: new Date(notebook.created_at).getTime(),
          pages: (pages || []).map(page => {
            // Handle both array and object responses from Supabase
            const contentData = Array.isArray(page.page_contents) 
              ? page.page_contents[0] 
              : page.page_contents;
            
            return {
              id: page.id,
              name: page.name,
              createdAt: new Date(page.created_at).getTime(),
              updatedAt: new Date(page.updated_at).getTime(),
              content: {
                strokes: [], // Legacy format for backward compatibility
                textElements: [], // Legacy format for backward compatibility
                tldrawData: contentData?.tldraw_data || null,
                imageData: contentData?.image_data || ''
              }
            };
          })
        });
      }

      return {
        notebooks: transformedNotebooks,
        activeNotebook: preferences?.active_notebook_id || null,
        activePage: preferences?.active_page_id || null
      };
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
      return { notebooks: [], activeNotebook: null, activePage: null };
    }
  }

  async saveData(data) {
    // This method is not used in the new architecture
    // Individual operations handle their own saves
    return true;
  }

  async initializeStorage() {
    // Wait for user authentication if not ready
    if (!this.user) {
      await this.initializeUser();
      if (!this.user) return;
    }

    const data = await this.getData();
    
    // If no notebooks exist, create initial notebook
    if (!data.notebooks || data.notebooks.length === 0) {
      await this.createNotebook('My First Notebook');
    }
  }

  // Notebook operations
  async createNotebook(name = 'New Notebook') {
    if (!this.user) return null;

    try {
      // Create notebook
      const { data: notebook, error: notebookError } = await supabase
        .from('notebooks')
        .insert([{
          user_id: this.user.id,
          name
        }])
        .select()
        .single();

      if (notebookError) {
        console.error('Error creating notebook:', notebookError);
        return null;
      }

      // Create first page
      const { data: page, error: pageError } = await supabase
        .from('pages')
        .insert([{
          notebook_id: notebook.id,
          name: 'Page 1'
        }])
        .select()
        .single();

      if (pageError) {
        console.error('Error creating first page:', pageError);
        return null;
      }

      // Don't create initial page content - let it be created on first save
      // This ensures new pages start completely empty

      // Update user preferences
      await this.setActiveNotebook(notebook.id);
      await this.setActivePage(page.id);

      // Return transformed notebook
      return {
        id: notebook.id,
        name: notebook.name,
        createdAt: new Date(notebook.created_at).getTime(),
        pages: [{
          id: page.id,
          name: page.name,
          createdAt: new Date(page.created_at).getTime(),
          updatedAt: new Date(page.updated_at).getTime(),
          content: {
            strokes: [],
            textElements: [],
            tldrawData: null,
            imageData: ''
          }
        }]
      };
    } catch (error) {
      console.error('Error creating notebook:', error);
      return null;
    }
  }

  async renameNotebook(notebookId, newName) {
    if (!this.user) return false;

    try {
      const { error } = await supabase
        .from('notebooks')
        .update({ name: newName })
        .eq('id', notebookId)
        .eq('user_id', this.user.id);

      return !error;
    } catch (error) {
      console.error('Error renaming notebook:', error);
      return false;
    }
  }

  async deleteNotebook(notebookId) {
    if (!this.user) return false;

    try {
      // Check if this is the last notebook
      const { data: notebooks } = await supabase
        .from('notebooks')
        .select('id')
        .eq('user_id', this.user.id);

      if (notebooks.length <= 1) return false; // Keep at least one notebook

      // Delete notebook (cascade will handle pages and content)
      const { error } = await supabase
        .from('notebooks')
        .delete()
        .eq('id', notebookId)
        .eq('user_id', this.user.id);

      if (error) {
        console.error('Error deleting notebook:', error);
        return false;
      }

      // Update preferences if this was the active notebook
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('active_notebook_id')
        .eq('user_id', this.user.id)
        .maybeSingle();

      if (preferences?.active_notebook_id === notebookId) {
        const remainingNotebooks = notebooks.filter(n => n.id !== notebookId);
        if (remainingNotebooks.length > 0) {
          await this.setActiveNotebook(remainingNotebooks[0].id);
        }
      }

      return true;
    } catch (error) {
      console.error('Error deleting notebook:', error);
      return false;
    }
  }

  // Page operations
  async createPage(notebookId, name = 'New Page') {
    if (!this.user) return null;

    try {
      // Create page
      const { data: page, error: pageError } = await supabase
        .from('pages')
        .insert([{
          notebook_id: notebookId,
          name
        }])
        .select()
        .single();

      if (pageError) {
        console.error('Error creating page:', pageError);
        return null;
      }

      // Don't create initial page content - let it be created on first save
      // This ensures new pages start completely empty

      // Set as active page
      await this.setActivePage(page.id);

      return {
        id: page.id,
        name: page.name,
        createdAt: new Date(page.created_at).getTime(),
        updatedAt: new Date(page.updated_at).getTime(),
        content: {
          strokes: [],
          textElements: [],
          tldrawData: null,
          imageData: ''
        }
      };
    } catch (error) {
      console.error('Error creating page:', error);
      return null;
    }
  }

  async renamePage(notebookId, pageId, newName) {
    if (!this.user) return false;

    try {
      const { error } = await supabase
        .from('pages')
        .update({ name: newName })
        .eq('id', pageId)
        .in('notebook_id', [notebookId]); // Ensure page belongs to notebook

      return !error;
    } catch (error) {
      console.error('Error renaming page:', error);
      return false;
    }
  }

  async deletePage(notebookId, pageId) {
    if (!this.user) return false;

    try {
      // Check if this is the last page in the notebook
      const { data: pages } = await supabase
        .from('pages')
        .select('id')
        .eq('notebook_id', notebookId);

      if (pages.length <= 1) return false; // Keep at least one page

      // Delete page (cascade will handle content)
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId)
        .eq('notebook_id', notebookId);

      if (error) {
        console.error('Error deleting page:', error);
        return false;
      }

      // Update preferences if this was the active page
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('active_page_id')
        .eq('user_id', this.user.id)
        .maybeSingle();

      if (preferences?.active_page_id === pageId) {
        const remainingPages = pages.filter(p => p.id !== pageId);
        if (remainingPages.length > 0) {
          await this.setActivePage(remainingPages[0].id);
        }
      }

      return true;
    } catch (error) {
      console.error('Error deleting page:', error);
      return false;
    }
  }

  // Content operations
  async updatePageContent(notebookId, pageId, content) {
    if (!this.user) return false;

    try {
      // Check if content exists
      const { data: existingContent } = await supabase
        .from('page_contents')
        .select('id')
        .eq('page_id', pageId)
        .maybeSingle();

      if (existingContent) {
        // Update existing content
        const { error } = await supabase
          .from('page_contents')
          .update({
            tldraw_data: content.tldrawData,
            image_data: content.imageData || ''
          })
          .eq('page_id', pageId);

        if (error) {
          console.error('Error updating page content:', error);
          return false;
        }
      } else {
        // Insert new content
        const { error } = await supabase
          .from('page_contents')
          .insert([{
            page_id: pageId,
            tldraw_data: content.tldrawData,
            image_data: content.imageData || ''
          }]);

        if (error) {
          console.error('Error inserting page content:', error);
          return false;
        }
      }

      // Update page timestamp
      await supabase
        .from('pages')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', pageId);

      return true;
    } catch (error) {
      console.error('Error updating page content:', error);
      return false;
    }
  }

  // Active state management
  async setActiveNotebook(notebookId) {
    if (!this.user) return false;

    try {
      // Get first page of the notebook
      const { data: pages } = await supabase
        .from('pages')
        .select('id')
        .eq('notebook_id', notebookId)
        .order('created_at')
        .limit(1);

      const firstPageId = pages?.[0]?.id;

      // Check if preferences exist
      const { data: existingPrefs } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', this.user.id)
        .maybeSingle();

      let error;
      if (existingPrefs) {
        // Update existing preferences
        ({ error } = await supabase
          .from('user_preferences')
          .update({
            active_notebook_id: notebookId,
            active_page_id: firstPageId
          })
          .eq('user_id', this.user.id));
      } else {
        // Insert new preferences
        ({ error } = await supabase
          .from('user_preferences')
          .insert([{
            user_id: this.user.id,
            active_notebook_id: notebookId,
            active_page_id: firstPageId
          }]));
      }

      return !error;
    } catch (error) {
      console.error('Error setting active notebook:', error);
      return false;
    }
  }

  async setActivePage(pageId) {
    if (!this.user) return false;

    try {
      // Check if preferences exist
      const { data: existingPrefs } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', this.user.id)
        .maybeSingle();

      let error;
      if (existingPrefs) {
        // Update existing preferences
        ({ error } = await supabase
          .from('user_preferences')
          .update({ active_page_id: pageId })
          .eq('user_id', this.user.id));
      } else {
        // Insert new preferences
        ({ error } = await supabase
          .from('user_preferences')
          .insert([{
            user_id: this.user.id,
            active_page_id: pageId
          }]));
      }

      return !error;
    } catch (error) {
      console.error('Error setting active page:', error);
      return false;
    }
  }

  // Session management
  async createSession() {
    if (!this.user) return null;

    try {
      const { data: session, error } = await supabase
        .from('sessions')
        .insert([{
          user_id: this.user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        return null;
      }

      return session.id;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  }
}

export const supabaseStorage = new SupabaseStorageManager();
