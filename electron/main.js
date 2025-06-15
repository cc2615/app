const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let popupWindow;

function createMainWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  // --- dynamic size based on screen dimensions ---
  const barWidth = Math.floor(screenWidth * 0.5);
  const barHeight = Math.floor(screenHeight * 0.08);

  mainWindow = new BrowserWindow({
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
      preload: path.join(__dirname, 'preload.js'), // for ipc
    },
  });

  const forceRedraw = () => {
    mainWindow.setResizable(true);
    const [w, h] = mainWindow.getSize();
    mainWindow.setSize(w, h + 1);
    mainWindow.setSize(w, h);
    mainWindow.setResizable(false);
  };

  mainWindow.on('focus', forceRedraw);
  mainWindow.on('blur', forceRedraw);

  mainWindow.loadURL('http://localhost:3000/');
}

function createPopupWindow() {
  if (popupWindow) {
    popupWindow.focus();
    return;
  }

  popupWindow = new BrowserWindow({
    width: 500,
    height: 350,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
    const forceRedraw = () => {
    popupWindow.setResizable(true);
    const [w, h] = popupWindow.getSize();
    popupWindow.setSize(w, h + 1);
    popupWindow.setSize(w, h);
    popupWindow.setResizable(false);
  };

  popupWindow.on('focus', forceRedraw);
  popupWindow.on('blur', forceRedraw);

  popupWindow.loadURL('http://localhost:3000/popup');

  popupWindow.on('closed', () => {
    popupWindow = null;
  });
}

app.whenReady().then(createMainWindow);

// --- IPC listener ---
ipcMain.on('open-popup', () => {
  createPopupWindow();
});
