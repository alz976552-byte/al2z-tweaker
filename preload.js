// Preload script for Electron
// Runs in a separate context with Node.js access
// Exposes safe APIs to the renderer via contextBridge

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  getBounds: () => ipcRenderer.invoke('window:getBounds'),

  // Persistent settings (theme, vines, tweaks)
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),
  
  // System info
  getSystemInfo: () => ipcRenderer.invoke('system:getInfo'),
  isAdmin: () => ipcRenderer.invoke('system:isAdmin'),
  restartExplorer: () => ipcRenderer.invoke('system:restartExplorer'),
  createRestorePoint: (description) => ipcRenderer.invoke('system:createRestorePoint', description),
  
  // UWP Apps
  getUwpApps: () => ipcRenderer.invoke('uwp:getList'),
  removeUwpApp: (packageFullName) => ipcRenderer.invoke('uwp:remove', packageFullName),
  removeUwpAppAll: (packageFullName) => ipcRenderer.invoke('uwp:removeAll', packageFullName),
  removeBloatware: () => ipcRenderer.invoke('uwp:removeBloatware'),
  
  // Installed Programs (Win32)
  getInstalledPrograms: () => ipcRenderer.invoke('programs:getList'),
  uninstallProgram: (uninstallString) => ipcRenderer.invoke('programs:uninstall', uninstallString),

  // Windows activation, updates, quick setup and recovery
  getActivationStatus: () => ipcRenderer.invoke('activation:get'),
  openSettings: (page) => ipcRenderer.invoke('settings:open', page),
  getUpdateStatus: () => ipcRenderer.invoke('update:status'),
  quickSetup: () => ipcRenderer.invoke('setup:quick'),
  pauseUpdates: (days) => ipcRenderer.invoke('update:pause', days),
  resumeUpdates: () => ipcRenderer.invoke('update:resume'),
  getRestorePoints: () => ipcRenderer.invoke('recovery:points'),
  openRecoveryTool: (name) => ipcRenderer.invoke('recovery:tool', name),
  
  // IPC for any future backend operations
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) => {
    ipcRenderer.on(channel, (event, ...args) => listener(...args));
    return () => ipcRenderer.removeListener(channel, listener);
  }
});

// Backwards-compatible alias used by older renderer code.
window.electron = window.electronAPI;