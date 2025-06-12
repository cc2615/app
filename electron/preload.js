const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  openPopup: () => ipcRenderer.send('open-popup'),
});
