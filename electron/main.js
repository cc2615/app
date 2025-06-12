const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  // --- dynamic size based on screen dimensions ---
  const barWidth = Math.floor(screenWidth * 0.5);
  const barHeight = Math.floor(screenHeight * 0.08); 

  const win = new BrowserWindow({
    width: barWidth,
    height: barHeight,
    x: Math.floor((screenWidth - barWidth) / 2),
    y: 20,
    titleBarStyle: 'hidden',
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const forceRedraw = () => {
    win.setResizable(true);
    const [w, h] = win.getSize();
    win.setSize(w, h + 1);
    win.setSize(w, h);
    win.setResizable(false);
  };

  win.on('focus', forceRedraw);
  win.on('blur', forceRedraw);

  win.loadURL('http://localhost:3000/');
}

app.whenReady().then(createWindow);
