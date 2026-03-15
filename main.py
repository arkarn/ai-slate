import logging
from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from websocket import voice_chat_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Slate - Realtime Voice Chat with Whiteboard", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "AI Slate"}

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time voice chat with whiteboard"""
    await voice_chat_service.handle_websocket_connection(websocket, session_id)

# Catch-all route for React Router (SPA routing)
@app.get("/{full_path:path}")
async def serve_spa(request: Request, full_path: str):
    """Serve React SPA for all unmatched routes"""
    import os
    
    # Define the build directory path
    build_dir = "frontend/build"
    
    # If path is empty (root), serve index.html
    if not full_path:
        return FileResponse(os.path.join(build_dir, "index.html"))
    
    # Check if the requested file exists in the build directory (handles assets/, worklets, etc.)
    file_path = os.path.join(build_dir, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # For all other routes (React Router paths), serve index.html
    return FileResponse(os.path.join(build_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Use environment to determine local vs production
    is_production = os.getenv("ENVIRONMENT") == "production"
    port = int(os.getenv("PORT", 8000))
    
    # Only use SSL locally (not in production)
    ssl_config = {}
    if not is_production:
        ssl_config = {
            "ssl_keyfile": "key.pem",
            "ssl_certfile": "cert.pem"
        }
    
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=not is_production,  # Only reload locally
        **ssl_config
    )
