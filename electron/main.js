const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
const win = new BrowserWindow({
  width: 800,
  height: 40,
  x: 0,
  y: 0,
  frame: false,
  transparent: true,
  resizable: false,
  alwaysOnTop: true,
  hasShadow: false,
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
  },
});


  win.loadURL('http://localhost:3000');
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
