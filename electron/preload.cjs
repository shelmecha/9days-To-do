// Bridges the app's Win95 title-bar buttons to real window controls.
// The window is frameless, so these are the only way to minimise or close it.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('win95', {
  minimize: () => ipcRenderer.send('win:minimize'),
  /** Hides to the system tray rather than quitting, so reminders keep working. */
  close: () => ipcRenderer.send('win:close'),
})
