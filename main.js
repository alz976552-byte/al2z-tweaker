const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const utils = require('./utils');

let mainWindow = null;
let boundsTimer = null;

function getSettingsPath() {
  // Stable across --user-data-dir changes: lives in %APPDATA%\Al2zTweaker.
  return path.join(app.getPath('appData'), 'Al2zTweaker', 'settings.json');
}

function readSettings() {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeSettings(patch) {
  try {
    const data = { ...readSettings(), ...(patch || {}) };
    const file = getSettingsPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (_) {
    return false;
  }
}

function registerIpcHandlers() {
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return;
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:getBounds', () => mainWindow?.getBounds());

  ipcMain.handle('settings:load', () => readSettings());
  ipcMain.handle('settings:save', (_event, patch) => writeSettings(patch));

  ipcMain.handle('system:getInfo', () => utils.getSystemInfo());
  ipcMain.handle('system:isAdmin', () => utils.isAdmin());
  ipcMain.handle('system:restartExplorer', () => utils.restartExplorer());
  ipcMain.handle('system:createRestorePoint', (_event, desc) => utils.createRestorePoint(desc));

  ipcMain.handle('uwp:getList', () => utils.getUwpApps());
  ipcMain.handle('uwp:remove', (_event, packageFullName) => utils.removeUwpApp(packageFullName));
  ipcMain.handle('uwp:removeAll', (_event, packageFullName) => utils.removeUwpAppForAll(packageFullName));
  ipcMain.handle('uwp:removeBloatware', () => utils.removeBloatware());

  ipcMain.handle('programs:getList', () => utils.getInstalledPrograms());
  ipcMain.handle('programs:uninstall', (_event, uninstallString) => utils.uninstallWin32Program(uninstallString));

  ipcMain.handle('activation:get', () => utils.getActivationStatus());
  ipcMain.handle('settings:open', (_event, page) => utils.openSettings(page));
  ipcMain.handle('update:status', () => utils.getUpdateStatus());
  ipcMain.handle('setup:quick', () => utils.quickSetup());
  ipcMain.handle('update:pause', (_event, days) => utils.pauseUpdates(days));
  ipcMain.handle('update:resume', () => utils.resumeUpdates());
  ipcMain.handle('recovery:points', () => utils.getRestorePoints());
  ipcMain.handle('recovery:tool', (_event, name) => utils.openTool(name));
}

function createWindow() {
  const savedWindow = (readSettings().window || {});
  const width = Number.isFinite(savedWindow.width) ? Math.max(1000, savedWindow.width) : 1320;
  const height = Number.isFinite(savedWindow.height) ? Math.max(700, savedWindow.height) : 840;

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    }
  });

  if ([savedWindow.x, savedWindow.y, savedWindow.width, savedWindow.height].every(Number.isFinite)) {
    mainWindow.setBounds({ x: savedWindow.x, y: savedWindow.y, width, height });
  }
  if (savedWindow.maximized) mainWindow.maximize();

  const saveBounds = (immediate = false) => {
    const apply = () => {
      if (!mainWindow || mainWindow.isMinimized()) return;
      writeSettings({ window: { ...mainWindow.getBounds(), maximized: mainWindow.isMaximized() } });
    };
    clearTimeout(boundsTimer);
    if (immediate) apply();
    else boundsTimer = setTimeout(apply, 350);
  };
  mainWindow.on('resize', () => saveBounds());
  mainWindow.on('move', () => saveBounds());
  mainWindow.on('close', () => saveBounds(true));

  // Never open any external page or browser window from this app.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

process.on('uncaughtException', (error) => console.error('Uncaught Exception:', error));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
