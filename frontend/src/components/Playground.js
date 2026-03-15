import React, { useCallback, useRef, useState } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { HiOutlinePencilAlt } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import PageTabs from './PageTabs';
import TLDrawWhiteboard from './TLDrawWhiteboard';
import UserProfile from './UserProfile';
import { useNotebooks } from '@/hooks/useNotebooks';
import { useWebSocket } from '@/hooks/useWebSocket';
import '@/styles/App.css';

function Playground() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const {
    notebooks,
    activeNotebook,
    activePage,
    activeNotebookId,
    activePageId,
    isLoading,
    createNotebook,
    renameNotebook,
    deleteNotebook,
    selectNotebook,
    createPage,
    renamePage,
    deletePage,
    selectPage,
    updatePageContent
  } = useNotebooks();

  const addTextElementFunctionRef = useRef(null);
  const whiteboardHandlersRef = useRef({});

  // Handle whiteboard messages from WebSocket
  const handleWhiteboardMessage = useCallback((message) => {
    console.log('Handling whiteboard message:', message.type);
    
    switch (message.type) {
      case 'whiteboard.add_pure_text':
        if (whiteboardHandlersRef.current.addPureText) {
          whiteboardHandlersRef.current.addPureText(message.data);
        }
        break;
      
      case 'whiteboard.add_shape':
        if (whiteboardHandlersRef.current.addShape) {
          whiteboardHandlersRef.current.addShape(message.data);
        }
        break;
      
      case 'whiteboard.add_text':
        // Legacy handler for backward compatibility
        if (addTextElementFunctionRef.current) {
          addTextElementFunctionRef.current(message.data);
        }
        break;
      
      case 'whiteboard.add_svg':
        // Handle SVG addition from AI
        if (whiteboardHandlersRef.current.addSvg) {
          whiteboardHandlersRef.current.addSvg(message.data);
        }
        break;
      
      case 'whiteboard.undo_action':
        // Handle undo action from AI
        if (whiteboardHandlersRef.current.undo) {
          whiteboardHandlersRef.current.undo();
        }
        break;
      
      default:
        console.warn('Unknown whiteboard message type:', message.type);
    }
  }, []);

  const {
    isConnected,
    isRecording,
    status,
    startRecording,
    stopRecording,
    sendImage,
    registerCaptureCallback
  } = useWebSocket(handleWhiteboardMessage);

  // Handle recording toggle (matches index.html flow)
  const handleRecordingToggle = useCallback(async () => {
    if (!isRecording) {
      // Just call startRecording - it will connect and auto-start audio
      await startRecording();
    } else {
      // Stop recording disconnects and cleans up everything
      stopRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Handle whiteboard content updates
  const handleContentUpdate = useCallback(async (pageId, content) => {
    if (activeNotebook) {
      await updatePageContent(activeNotebook.id, pageId, content);
    }
  }, [activeNotebook, updatePageContent]);

  // Handle image capture for AI
  const handleImageCapture = useCallback((imageData) => {
    if (isRecording) {
      sendImage(imageData);
    }
  }, [isRecording, sendImage]);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading your notebooks...</p>
      </div>
    );
  }

  return (
    <div className="app min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="app-header sticky top-0 z-50 backdrop-blur-md border-b border-white/10">
        <div className="header-content">
          <button 
            onClick={() => navigate('/')}
            className="app-title hover:opacity-80 transition-opacity text-left"
          >
            <h1 className="flex items-center space-x-2 text-white">
              <HiOutlinePencilAlt className="text-cyan-400" /> 
              <span>AISlate</span>
            </h1>
            <p className="text-gray-300">Digital whiteboard experience</p>
          </button>

          <div className="header-controls">
            <button
              className={`recording-btn ${isRecording ? 'recording' : ''}`}
              onClick={handleRecordingToggle}
              disabled={!activeNotebook || !activePage}
            >
              {isRecording ? (
                <>
                  <FaMicrophoneSlash />
                  Stop Session
                </>
              ) : (
                <>
                  <FaMicrophone />
                  Start Session
                </>
              )}
            </button>
            <UserProfile />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="app-main">
        {/* Sidebar */}
        <div className={`transition-all duration-300 flex-shrink-0 ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-[280px]'}`}>
          <Sidebar
            notebooks={notebooks}
            activeNotebookId={activeNotebookId}
            onSelectNotebook={async (id) => await selectNotebook(id)}
            onCreateNotebook={async (name) => await createNotebook(name)}
            onRenameNotebook={async (id, name) => await renameNotebook(id, name)}
            onDeleteNotebook={async (id) => await deleteNotebook(id)}
          />
        </div>

        {/* Content Area */}
        <div className="app-content flex-1 min-w-0">
          {/* Page Tabs */}
          <PageTabs
            notebook={activeNotebook}
            activePageId={activePageId}
            onSelectPage={async (id) => await selectPage(id)}
            onCreatePage={async (notebookId, name) => await createPage(notebookId, name)}
            onRenamePage={async (notebookId, pageId, name) => await renamePage(notebookId, pageId, name)}
            onDeletePage={async (notebookId, pageId) => await deletePage(notebookId, pageId)}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* TLDraw Whiteboard */}
          {activePage && (
            <>
              {console.log('Playground: Passing activePage to TLDrawWhiteboard:', activePage)}
              <TLDrawWhiteboard
                page={activePage}
                onContentUpdate={handleContentUpdate}
                onImageCapture={handleImageCapture}
                isRecording={isRecording}
                onAddTextElement={(fn) => { addTextElementFunctionRef.current = fn; }}
                onAddHandlers={(handlers) => { whiteboardHandlersRef.current = handlers; }}
                registerCaptureCallback={registerCaptureCallback}
              />
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      {activePage && (
        <footer className="app-footer">
          <div className="footer-info">
            <span>
              <strong>{activeNotebook?.name}</strong> • <strong>{activePage?.name}</strong>
            </span>
            <span>
              Last updated: {new Date(activePage?.updatedAt).toLocaleString()}
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}

export default Playground;
