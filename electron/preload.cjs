const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('kadr', {
  exportMedia: (payload) => ipcRenderer.invoke('export-media', payload),
});
