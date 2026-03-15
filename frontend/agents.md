# Frontend Architecture Notes

## TLDraw Whiteboard Storage System

### Storage Structure
- **Storage Manager**: `src/utils/storage.js` - Handles localStorage operations
- **Data Structure**: Notebooks contain Pages, each page has content with `tldrawData` field
- **Content Format**: `{ strokes: [], textElements: [], tldrawData: null, imageData: '' }`

### Key Components
1. **TLDrawWhiteboard.js**: Main whiteboard component using TLDraw library
2. **useNotebooks.js**: Hook managing notebook/page state and operations  
3. **PageTabs.js**: UI for page navigation and management
4. **App.js**: Main app orchestrating all components

### Storage Flow
- New pages created with `tldrawData: null` (blank state)
- Content auto-saved with 1s debounce via `saveContent()` 
- TLDraw snapshots stored in `page.content.tldrawData`
- Page switching triggers `handleMount()` to load/clear editor

### Fixed Issue: New Pages Showing Same Content
**Problem**: New pages displayed content from previous page instead of being blank
**Root Cause**: 
1. TLDraw editor retained previous state when `tldrawData: null`
2. `handleMount()` only runs once on component mount, not on page changes
3. Missing `useEffect` to handle page switching

**Solution**: 
1. Created `loadPageContent()` helper function for blank pages
2. Added `useEffect` that watches `page` prop changes and calls `loadPageContent()`
3. Reset camera position (`x: 0, y: 0, z: 1`) on each page switch
4. Use `editor.deleteShapes()` instead of `editor.store.clear()` to avoid breaking TLDraw's internal state
5. Added `previousPageRef` to save current page content before switching to prevent data loss
6. Clear undo/redo history (`editor.history.clear()`) on page switch for proper action isolation

### Auto-save & Content Management
- Changes trigger debounced save (1s delay)
- Content bounds automatically adjust to drawing area
- Image capture for AI integration via viewport export
- Auto-scroll to bottom when AI agent adds content (ensures user sees new additions)
