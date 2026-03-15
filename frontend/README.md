# 🎙️ AI Slate - React Frontend

A Microsoft OneNote-like React application with real-time audio recording and whiteboard functionality.

## 🚀 Quick Start

1. **Start the React app** (if not already running):
   ```bash
   cd frontend
   npm start
   ```
   
2. **Start the Python backend** (in another terminal):
   ```bash
   cd ..
   python main.py
   ```

3. **Open in browser**: `http://localhost:3000`

## ✨ Features

### 📚 Notebook Management
- Create, rename, and delete notebooks
- Left sidebar with visual notebook list
- Persistent storage using localStorage

### 📄 Page Management
- Multiple pages per notebook
- Top tab navigation
- Create, rename, and delete pages
- Last updated timestamps

### 🎨 Whiteboard Drawing
- Smooth HTML5 Canvas drawing
- Pen and eraser tools
- Adjustable stroke width (1-20px)
- Undo functionality and clear canvas
- Auto-save with 1-second debounce
- Touch support for mobile devices

### 🎙️ Real-time AI Integration
- Click "Start Recording" to begin audio capture
- Real-time audio streaming to AI via WebSocket
- Automatic whiteboard image capture
- AI can see your drawings and hear your voice simultaneously
- Visual recording indicators

## 🎯 How to Use

1. **Create Notebooks**: Use the "+" button in the left sidebar
2. **Add Pages**: Use the "New Page" tab at the top
3. **Draw**: Select pen/eraser tools and draw on the canvas
4. **Talk to AI**: 
   - Click "Start Recording" 
   - Draw and speak - AI sees and hears everything
   - Click "Stop Recording" when done

## 🔧 Technical Details

- **Frontend**: React 18 with hooks
- **Canvas**: HTML5 Canvas with high-DPI support
- **Storage**: localStorage for persistence
- **WebSocket**: Real-time audio/image streaming
- **Responsive**: Works on desktop and mobile

## 📁 Project Structure

```
src/
├── components/
│   ├── Sidebar.js          # Notebook management
│   ├── PageTabs.js         # Page navigation
│   └── Whiteboard.js       # Drawing canvas
├── hooks/
│   ├── useNotebooks.js     # State management
│   └── useWebSocket.js     # Real-time communication
├── utils/
│   └── storage.js          # Data persistence
└── styles/                 # CSS styling
```

## 🎨 Slate-like Interface

- **Left Panel**: Notebook list with create/rename/delete
- **Top Tabs**: Page navigation within notebooks  
- **Main Area**: Drawing canvas with toolbar
- **Header**: Recording controls and status
- **Footer**: Current notebook/page info

## 🚀 Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

Enjoy your AI-powered Slate experience! 🚀

