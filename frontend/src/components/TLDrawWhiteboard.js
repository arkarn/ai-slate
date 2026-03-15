import React, { useRef, useEffect, useState, useCallback, useMemo, useLayoutEffect } from 'react';
import { Tldraw, loadSnapshot, createShapeId, AssetRecordType, toRichText, getSnapshot, createTLStore } from 'tldraw';
import 'tldraw/tldraw.css';
import '@/styles/Whiteboard.css';

const TLDrawWhiteboard = ({ 
  page, 
  onContentUpdate,
  onImageCapture,
  isRecording,
  onAddTextElement,
  onAddHandlers,
  registerCaptureCallback
}) => {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const previousPageRef = useRef(null);
  const lastSavedContentRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  
  // Create TLDraw store using the recommended pattern
  // Create new store when page changes to ensure complete isolation
  const store = useMemo(() => createTLStore(), [page?.id]);
  const [loadingState, setLoadingState] = useState({ status: 'loading' });

  // Proper TLDraw v3 persistence pattern
  useLayoutEffect(() => {
    if (!page) return;
    
    console.log('Setting up TLDraw persistence for page:', page.id, page.content);
    setLoadingState({ status: 'loading' });
    
    // Reset saved content reference when switching pages
    lastSavedContentRef.current = null;

    // Load existing content if available, or start with blank page
    if (page.content && page.content.tldrawData) {
      try {
        console.log('Loading existing tldrawData from page content...');
        loadSnapshot(store, page.content.tldrawData);
        console.log('Successfully loaded TLDraw data for page:', page.id);
        setLoadingState({ status: 'ready' });
      } catch (error) {
        console.error('Error loading TLDraw data:', error);
        setLoadingState({ status: 'error', error: error.message });
      }
    } else {
      console.log('No existing data, starting with blank page');
      // For new pages, we don't need to do anything special
      // The store is already fresh due to the useMemo dependency on page.id
      setLoadingState({ status: 'ready' });
    }

    // Set up smart auto-save listener with change detection and debouncing
    const cleanup = store.listen(() => {
      if (!page) return;
      
      try {
        const snapshot = getSnapshot(store);
        
        // Only check document store for actual content changes (ignore session/UI state)
        const currentShapes = Object.keys(snapshot.document.store).filter(key => 
          key.startsWith('shape:') || key.startsWith('binding:')
        );
        
        // Create a content hash to detect actual changes
        const contentHash = JSON.stringify(
          currentShapes.map(key => snapshot.document.store[key]).sort()
        );
        
        // Skip if content hasn't actually changed
        if (lastSavedContentRef.current === contentHash) {
          return;
        }
        
        // Debounce saves - clear existing timeout and set new one
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        saveTimeoutRef.current = setTimeout(() => {
          const content = {
            tldrawData: snapshot,
            imageData: ''
          };
          
          console.log('Auto-saving TLDraw content for page:', page.id, '(shapes:', currentShapes.length, ')');
          onContentUpdate(page.id, content);
          lastSavedContentRef.current = contentHash;
        }, 1000); // 1 second debounce
        
      } catch (error) {
        console.error('Error auto-saving content:', error);
      }
    });

    return () => {
      cleanup();
      // Clear any pending save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [store, page, onContentUpdate]);

  // Export the current viewport as a PNG base64 string
  const exportViewportPng = useCallback(async () => {
    if (!editorRef.current) return null;
    try {
      const editor = editorRef.current;
      
      // Get shapes that are visible in the viewport
      const viewportBounds = editor.getViewportPageBounds();
      const allShapes = editor.getCurrentPageShapes();
      const visibleShapeIds = allShapes
        .filter(shape => {
          const shapeBounds = editor.getShapePageBounds(shape.id);
          return shapeBounds && viewportBounds.collides(shapeBounds);
        })
        .map(shape => shape.id);
      
      // Export with bounds option to crop to viewport
      const { blob } = await editor.toImage(visibleShapeIds.length > 0 ? visibleShapeIds : undefined, {
        format: 'png',
        background: true,
        bounds: viewportBounds,
        padding: 0
      });
      
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error exporting viewport PNG:', error);
      return null;
    }
  }, []);

  // Get viewport width for dynamic canvas sizing
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update camera bounds based on content
  const updateCameraBounds = useCallback(() => {
    if (!editorRef.current) return;
    
    const shapes = editorRef.current.getCurrentPageShapes();
    
    if (shapes.length === 0) {
      // No content - allow minimal scrolling area
      editorRef.current.setCameraOptions({
        constraints: {
          initialZoom: 'default',
          baseZoom: 'default',
          bounds: { x: 0, y: -200, w: Math.min(viewportWidth - 50, 1200), h: 1000 },
          behavior: { x: 'contain', y: 'contain' },
          padding: { x: 25, y: 50 },
          origin: { x: 0.5, y: 0 }
        },
        zoomSteps: [0.75, 0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2, 1.25],
        wheelBehavior: 'pan'
      });
      return;
    }
    
    // Find content bounds
    let minY = Infinity, maxY = -Infinity;
    
    shapes.forEach(shape => {
      const bounds = editorRef.current.getShapePageBounds(shape.id);
      if (bounds) {
        minY = Math.min(minY, bounds.minY);
        maxY = Math.max(maxY, bounds.maxY);
      }
    });
    
    // Add padding: little bit before top, almost new page after bottom
    const topPadding = 150;        // Small space above first content
    const bottomPadding = 500;     // Almost full page below last content
    
    editorRef.current.setCameraOptions({
      constraints: {
        initialZoom: 'default',
        baseZoom: 'default',
        bounds: {
          x: 0,
          y: minY - topPadding,           // Start slightly above first content
          w: Math.min(viewportWidth - 50, 1200),  // Fixed width
          h: (maxY - minY) + topPadding + bottomPadding  // Dynamic height
        },
        behavior: { 
          x: 'contain',  // No horizontal scroll
          y: 'contain'   // Limit vertical to content bounds + padding
        },
        padding: { x: 25, y: 50 },
        origin: { x: 0.5, y: 0 }
      },
      zoomSteps: [0.75, 0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2, 1.25],
      wheelBehavior: 'pan'
    });
  }, [viewportWidth]);






  // Capture and send image to AI (called on-demand)
  const captureAndSendImage = useCallback(async () => {
    if (!editorRef.current || !isRecording || !onImageCapture) return;

    try {
      const base64Png = await exportViewportPng();
      if (base64Png) {
        onImageCapture(base64Png);
      }
    } catch (error) {
      console.error('Error capturing image:', error);
    }
  }, [isRecording, onImageCapture, exportViewportPng]);


  // Get the bottom-most Y coordinate of all shapes
  const getBottomMostY = useCallback(() => {
    if (!editorRef.current) return 100;
    
    const shapes = editorRef.current.getCurrentPageShapes();
    if (shapes.length === 0) return 100;
    
    let maxY = 100;
    shapes.forEach(shape => {
      const bounds = editorRef.current.getShapePageBounds(shape.id);
      if (bounds) {
        maxY = Math.max(maxY, bounds.maxY);
      }
    });
    
    return maxY + 50; // Add some padding
  }, []);

  // Auto-scroll to show newly added content
  const scrollToBottom = useCallback(() => {
    if (!editorRef.current) return;
    
    const shapes = editorRef.current.getCurrentPageShapes();
    if (shapes.length === 0) return;
    
    // Find the bottom-most content
    let maxY = 0;
    shapes.forEach(shape => {
      const bounds = editorRef.current.getShapePageBounds(shape.id);
      if (bounds) {
        maxY = Math.max(maxY, bounds.maxY);
      }
    });
    
    // Get viewport height to calculate proper scroll position
    const viewportBounds = editorRef.current.getViewportPageBounds();
    const viewportHeight = viewportBounds.height;
    
    // In TLDraw: negative camera Y scrolls down to show bottom content
    const targetY = -(maxY - viewportHeight + 100); // Show bottom with 100px padding
    
    const camera = editorRef.current.getCamera();
    console.log('Scrolling to bottom - maxY:', maxY, 'viewport height:', viewportHeight, 'target Y:', targetY);
    
    editorRef.current.setCamera({ 
      x: camera.x, 
      y: targetY, // Correct: negative Y scrolls down to show bottom content
      z: camera.z 
    });
  }, []);

  // Add pure text element to whiteboard (no background)
  const addPureTextElement = useCallback((textData) => {
    if (!textData || !editorRef.current) return;
    
    console.log('Adding pure text element from AI:', textData);
    
    // Get position at bottom of existing content
    const y = getBottomMostY();
    const textContent = textData.content || textData.text || '';
    
    // Calculate max width based on viewport (with padding)
    const maxWidth = Math.min(viewportWidth - 100, 800); // Leave 100px total padding, max 800px
    
    // Create a pure text shape with wrapping
    editorRef.current.createShape({
      id: createShapeId(),
      type: 'text',
      x: 50,
      y: y,
      props: {
        richText: toRichText(textContent), // Always use richText with toRichText wrapper
        size: textData.size || 'l', // Default to large text size
        color: textData.color || 'black',
        font: textData.font || 'sans',
        textAlign: textData.align || 'start', // Use textAlign for text shapes, not align
        w: maxWidth, // Set width for text wrapping
        autoSize: false // Disable auto-sizing to enable wrapping
      }
    });

    console.log('Created pure text at Y:', y, textContent);
    
    // Auto-save after adding text and update bounds
    setTimeout(() => {
      // Auto-save handled by store listener
      updateCameraBounds();
      // Delay scroll to ensure updateCameraBounds doesn't override it
      setTimeout(() => scrollToBottom(), 50);
    }, 100);
  }, [getBottomMostY, viewportWidth, scrollToBottom]);

  // Add shape with optional text to whiteboard
  const addShapeWithText = useCallback((shapeData) => {
    if (!shapeData || !editorRef.current) return;
    
    console.log('Adding shape element from AI:', shapeData);
    
    // Get position at bottom of existing content
    const y = getBottomMostY();
    const textContent = shapeData.text || '';
    
    // Calculate max width based on viewport (with padding)
    const maxWidth = Math.min(viewportWidth - 100, 800);
    
    // Create a geo shape with optional text
    editorRef.current.createShape({
      id: createShapeId(),
      type: 'geo',
      x: 50,
      y: y,
      props: {
        geo: shapeData.shape || 'rectangle',
        w: shapeData.width || Math.min(maxWidth, 300),
        h: shapeData.height || 150,
        richText: toRichText(textContent || ''), // Always pass a string, even if empty
        size: shapeData.size || 'l', // Default to large text size
        color: shapeData.color || 'black',
        fill: shapeData.fill || 'semi',
        dash: shapeData.dash || 'solid',
        font: 'sans',
        align: 'start',
        verticalAlign: 'middle'
      }
    });

    console.log(`Created ${shapeData.shape} shape at Y:`, y, textContent);
    
    // Auto-save after adding shape and update bounds
    setTimeout(() => {
      // Auto-save handled by store listener
      updateCameraBounds();
      // Delay scroll to ensure updateCameraBounds doesn't override it
      setTimeout(() => scrollToBottom(), 50);
    }, 100);
  }, [getBottomMostY, viewportWidth, scrollToBottom]);

  // Legacy text element handler (for backward compatibility)
  const addTextElement = useCallback((textData) => {
    if (!textData || !editorRef.current) return;
    
    console.log('Adding text element from AI (legacy):', textData);
    
    // Get position at bottom of existing content
    const y = getBottomMostY();
    const textContent = textData.content || textData.text || '';
    
    // Calculate max width based on viewport (with padding)
    const maxWidth = Math.min(viewportWidth - 100, 800);
    
    // Create a geo shape (rectangle) with richText label
    editorRef.current.createShape({
      id: createShapeId(),
      type: 'geo',
      x: 50,
      y: y,
      props: {
        geo: 'rectangle',
        w: maxWidth,
        h: 100,
        size: 'l', // Default to large text size
        color: 'yellow',
        fill: 'solid',
        richText: toRichText(textContent), // Using richText with toRichText wrapper
        font: 'sans',
        align: 'start',
        verticalAlign: 'start'
      }
    });

    console.log('Created shape with richText at Y:', y, textContent);
    
    // Auto-save after adding text and update bounds
    setTimeout(() => {
      // Auto-save handled by store listener
      updateCameraBounds();
      // Delay scroll to ensure updateCameraBounds doesn't override it
      setTimeout(() => scrollToBottom(), 50);
    }, 100);
  }, [getBottomMostY, viewportWidth, scrollToBottom]);

  // Add SVG image to whiteboard
  const addSvgImage = useCallback(async (svgData) => {
    if (!svgData?.svg_data_url || !editorRef.current) return;
    
    console.log('Adding SVG image from AI:', svgData);
    
    // Get position at bottom of existing content
    const y = getBottomMostY();
    
    // Step 1: Create asset first
    const assetId = AssetRecordType.createId();
    
    await editorRef.current.createAssets([{
      id: assetId,
      type: 'image',
      typeName: 'asset',
      props: {
        name: 'ai-generated-svg.svg',
        src: svgData.svg_data_url,
        w: svgData.width || 300,
        h: svgData.height || 200,
        mimeType: 'image/svg+xml',
        isAnimated: false
      },
      meta: {}
    }]);
    
    // Step 2: Create image shape referencing the asset
    editorRef.current.createShape({
      id: createShapeId(),
      type: 'image',
      x: 50,
      y: y,
      props: {
        assetId: assetId,
        w: svgData.width || 300,
        h: svgData.height || 200
      }
    });

    console.log('Created SVG image at Y:', y, svgData.description);
    
    // Auto-save after adding SVG and update bounds
    setTimeout(() => {
      // Auto-save handled by store listener
      updateCameraBounds();
      // Delay scroll to ensure updateCameraBounds doesn't override it
      setTimeout(() => scrollToBottom(), 50);
    }, 100);
  }, [getBottomMostY, scrollToBottom]);

  // Undo last action
  const undoAction = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.undo();
    }
  }, []);

  // Redo last action
  const redoAction = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.redo();
    }
  }, []);

  // Expose handler functions to parent
  useEffect(() => {
    // For backward compatibility, keep onAddTextElement
    if (onAddTextElement) {
      onAddTextElement(addTextElement);
    }
    
    // New handler registration
    if (onAddHandlers) {
      onAddHandlers({
        addPureText: addPureTextElement,
        addShape: addShapeWithText,
        addSvg: addSvgImage,
        addText: addTextElement, // Legacy
        undo: undoAction // Expose undo function
      });
    }
  }, [onAddTextElement, onAddHandlers, addTextElement, addPureTextElement, addShapeWithText, addSvgImage, undoAction]);

  // Register capture callback with WebSocket hook
  useEffect(() => {
    if (registerCaptureCallback) {
      registerCaptureCallback(captureAndSendImage);
    }
  }, [registerCaptureCallback, captureAndSendImage]);


  // Capture visible area for AI
  const captureVisibleArea = useCallback(async () => {
    return await exportViewportPng();
  }, [exportViewportPng]);

  // Send initial screenshot when recording starts
  useEffect(() => {
    if (isRecording && onImageCapture && editorRef.current) {
      setTimeout(async () => {
        const visibleImageData = await captureVisibleArea();
        if (visibleImageData) {
          onImageCapture(visibleImageData);
        }
      }, 500); // Small delay to ensure canvas is ready
    }
  }, [isRecording, onImageCapture, captureVisibleArea]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    if (!window.confirm('Are you sure you want to clear the canvas?')) return;
    
    if (editorRef.current) {
      editorRef.current.selectAll();
      editorRef.current.deleteShapes(editorRef.current.getSelectedShapeIds());
      
      // Save empty state
      setTimeout(() => {
        // Auto-save handled by store listener
      }, 100);
    }
  }, []);

  // Save image for manual verification
  const saveImageForVerification = useCallback(async () => {
    const base64Png = await exportViewportPng();
    if (!base64Png) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64Png}`;
    a.download = `whiteboard-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [exportViewportPng]);

  if (!page) {
    return (
      <div className="whiteboard-container">
        <div className="whiteboard-placeholder">
          Select a page to start drawing
        </div>
      </div>
    );
  }

  if (loadingState.status === 'loading') {
    return (
      <div className="whiteboard-container">
        <div className="whiteboard-placeholder">
          Loading page content...
        </div>
      </div>
    );
  }

  if (loadingState.status === 'error') {
    return (
      <div className="whiteboard-container">
        <div className="whiteboard-placeholder">
          Error loading page: {loadingState.error}
        </div>
      </div>
    );
  }

  return (
    <div className="whiteboard-container">
      <div className="whiteboard-toolbar">
        <div className="tool-group">
          <button
            className="tool-btn"
            onClick={undoAction}
            title="Undo"
          >
            ↶ Undo
          </button>
          <button
            className="tool-btn"
            onClick={redoAction}
            title="Redo"
          >
            ↷ Redo
          </button>
          <button
            className="tool-btn"
            onClick={clearCanvas}
            title="Clear"
          >
            🗑️ Clear
          </button>
          <button
            className="tool-btn"
            onClick={saveImageForVerification}
            title="Save visible area PNG"
          >
            💾 Save
          </button>
        </div>

      </div>

      {/* TLDraw needs a clean container without interference */}
      <div ref={containerRef} style={{ 
        flex: 1, 
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 120px)', // Account for header and toolbar
        display: 'flex',
        touchAction: 'none' // Fix passive event listener preventDefault issue
      }}>
        
        <Tldraw 
          store={store}
          onMount={(editor) => {
            console.log('TLDraw editor mounted with store:', editor);
            editorRef.current = editor;
            editor.setCurrentTool('draw');
          }}
          components={{
            // Hide specific panels but keep zoom controls
            HelpMenu: () => null,        // Hide help menu (removes "Made with TLDraw")
            MenuPanel: () => null,       // Hide the top menu bar
            // Custom NavigationPanel with Reset Zoom button
            NavigationPanel: ({ children }) => {
              const resetZoom = () => {
                if (editorRef.current) {
                  const camera = editorRef.current.getCamera();
                  editorRef.current.setCamera({ x: camera.x, y: camera.y, z: 1 });
                }
              };
              
              return (
                <div style={{ 
                  position: 'absolute', 
                  bottom: '8px', 
                  left: '8px', 
                  display: 'flex', 
                  gap: '4px',
                  zIndex: 1000
                }}>
                  {/* Keep zoom in/out buttons from original children */}
                  {children}
                  {/* Replace zoom percentage with Reset Zoom button */}
                  <button
                    onClick={resetZoom}
                    onMouseDown={(e) => e.stopPropagation()} // Prevent whiteboard interaction
                    onMouseUp={(e) => e.stopPropagation()}   // Prevent whiteboard interaction
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      pointerEvents: 'auto', // Ensure button is clickable
                      userSelect: 'none',     // Prevent text selection
                      zIndex: 1001           // Higher than parent container
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#e9ecef';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#f8f9fa';
                    }}
                    title="Reset zoom to 100%"
                  >
                    Reset Zoom
                  </button>
                </div>
              );
            },
            // Toolbar: () => null,      // Keep this - it's the bottom tool selector
          }}
        />
      </div>
    </div>
  );
};

export default TLDrawWhiteboard;