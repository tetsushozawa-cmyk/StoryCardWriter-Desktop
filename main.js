const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const authorizedPaths = new Set();
let mainWindow = null;
let rendererIsDirty = false;
let allowWindowClose = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 900,
    minWidth: 760,
    minHeight: 640,
    backgroundColor: '#f7f7f5',
    title: 'StoryCardWriter Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('close', async (event) => {
    if (allowWindowClose || !rendererIsDirty) return;
    event.preventDefault();
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: '未保存の変更があります',
      message: '保存していない変更があります。終了しますか？',
      detail: '「終了」を選ぶと、保存していない変更は失われます。',
      buttons: ['キャンセル', '終了'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    if (result.response === 1) {
      allowWindowClose = true;
      mainWindow.close();
    }
  });
}

function ensureJsonExtension(filePath) {
  return filePath.toLowerCase().endsWith('.json') ? filePath : `${filePath}.json`;
}

function validateJsonText(jsonText) {
  if (typeof jsonText !== 'string') throw new Error('保存内容が不正です。');
  JSON.parse(jsonText);
}

async function writeJsonAtomically(filePath, content) {
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  try {
    await fs.writeFile(temporaryPath, content, 'utf8');
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'StoryCardWriterのJSONを開く',
    properties: ['openFile'],
    filters: [
      { name: 'JSONファイル', extensions: ['json'] },
      { name: 'すべてのファイル', extensions: ['*'] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };

  const filePath = path.resolve(result.filePaths[0]);
  const content = await fs.readFile(filePath, 'utf8');
  authorizedPaths.add(filePath);
  return { canceled: false, filePath, fileName: path.basename(filePath), content };
});

ipcMain.handle('file:save', async (_event, payload) => {
  const filePath = path.resolve(String(payload?.filePath || ''));
  if (!authorizedPaths.has(filePath)) throw new Error('この保存先は許可されていません。');
  validateJsonText(payload?.content);
  await writeJsonAtomically(filePath, payload.content);
  return { filePath, fileName: path.basename(filePath) };
});

ipcMain.handle('file:save-as', async (_event, payload) => {
  validateJsonText(payload?.content);
  const defaultName = String(payload?.suggestedName || 'untitled.json')
    .replace(/[\\/:*?"<>|]/g, '_');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '名前を付けて保存',
    defaultPath: defaultName,
    filters: [{ name: 'JSONファイル', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };

  const filePath = path.resolve(ensureJsonExtension(result.filePath));
  await writeJsonAtomically(filePath, payload.content);
  authorizedPaths.add(filePath);
  return { canceled: false, filePath, fileName: path.basename(filePath) };
});

ipcMain.on('app:dirty-state', (_event, dirty) => {
  rendererIsDirty = Boolean(dirty);
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
