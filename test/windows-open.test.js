const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

const source = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const content = JSON.stringify({ cards: [{ type: '主人公', text: '日本語の本文' }] });

function launch({ platform = 'win32', argv = ['C:\\アプリ\\StoryCardWriter Desktop.exe'],
  lock = true, packaged = true } = {}) {
  const app = new EventEmitter();
  const windows = [], reads = [], messages = [];
  const handlers = new Map();
  let readyCallback, ready = false, quitCount = 0, lockCount = 0;
  Object.assign(app, {
    isPackaged: packaged,
    isReady: () => ready,
    whenReady: () => ({ then: (callback) => { readyCallback = callback; } }),
    requestSingleInstanceLock: () => { lockCount++; return lock; },
    quit: () => { quitCount++; },
  });
  class BrowserWindow extends EventEmitter {
    constructor() {
      super();
      this.webContents = new EventEmitter();
      this.webContents.send = (channel, payload) => messages.push({ channel, payload });
      this.restored = false;
      this.focused = false;
      windows.push(this);
    }
    loadFile() {}
    isDestroyed() { return false; }
    isMinimized() { return true; }
    restore() { this.restored = true; }
    show() {}
    focus() { this.focused = true; }
  }
  BrowserWindow.getAllWindows = () => windows;
  const electron = {
    app, BrowserWindow,
    dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: ['C:\\作品 フォルダ\\手動.scw'] }) },
    ipcMain: { handle: (name, handler) => handlers.set(name, handler), on() {} },
    Menu: { buildFromTemplate: (template) => template, setApplicationMenu() {} },
  };
  vm.runInNewContext(source, {
    require: (name) => {
      if (name === 'electron') return electron;
      if (name === 'node:path') return path.win32;
      if (name === 'node:fs/promises') return {
        readFile: async (filePath, encoding) => {
          reads.push({ filePath, encoding });
          return content;
        },
      };
      return require(name);
    },
    process: { platform, argv, cwd: () => 'C:\\初回 作業場所' },
    __dirname: 'C:\\アプリ',
  });
  return {
    app, windows, reads, messages, handlers,
    ready: () => { ready = true; readyCallback?.(); },
    loaded: () => windows[0].webContents.emit('did-finish-load'),
    quitCount: () => quitCount,
    lockCount: () => lockCount,
  };
}

const settled = () => new Promise((resolve) => setImmediate(resolve));

test('Windows初回起動は日本語・空白を含むscwをRenderer準備後に通知する', async () => {
  const filePath = 'C:\\作品 フォルダ\\日本語の作品.scw';
  const run = launch({ argv: ['C:\\アプリ\\StoryCardWriter Desktop.exe', '--inspect=0', filePath] });
  run.ready();
  assert.equal(run.reads.length, 0);
  run.loaded();
  await settled();
  assert.equal(run.lockCount(), 1);
  assert.equal(run.reads.length, 1);
  assert.equal(run.reads[0].filePath, filePath);
  assert.equal(run.reads[0].encoding, 'utf8');
  assert.equal(run.messages[0].channel, 'app:open-file');
  assert.equal(run.messages[0].payload.fileName, '日本語の作品.scw');
  assert.equal(run.messages[0].payload.content, content);
});

test('Windows second-instanceは別のscwを既存ウインドウへ渡して復元する', async () => {
  const run = launch();
  run.ready();
  run.loaded();
  const filePath = 'C:\\別の作品 フォルダ\\次の作品.SCW';
  run.app.emit('second-instance', {}, ['app.exe', filePath], 'C:\\別の作業場所');
  await settled();
  assert.equal(run.windows.length, 1);
  assert.equal(run.messages.length, 1);
  assert.equal(run.messages[0].payload.filePath, filePath);
  assert.equal(run.messages[0].payload.content, content);
  assert.equal(run.windows[0].restored, true);
  assert.equal(run.windows[0].focused, true);
});

test('Windows second-instanceがRenderer準備前に来ても相対パスを失わない', async () => {
  const run = launch();
  run.app.emit('second-instance', {}, ['app.exe', '作品 フォルダ\\日本語.scw'], 'D:\\別の 作業場所');
  run.ready();
  assert.equal(run.reads.length, 0);
  run.loaded();
  await settled();
  assert.equal(run.messages[0].payload.filePath, 'D:\\別の 作業場所\\作品 フォルダ\\日本語.scw');
});

test('Windowsの二次プロセスは終了してウインドウや読み込みを作らない', async () => {
  const run = launch({ lock: false, argv: ['app.exe', 'C:\\作品.scw'] });
  run.ready();
  await settled();
  assert.equal(run.quitCount(), 1);
  assert.equal(run.windows.length, 0);
  assert.equal(run.reads.length, 0);
});

test('Windows開発起動はアプリのパスとオプションを文書として扱わない', async () => {
  const run = launch({ packaged: false, argv: ['electron.exe', 'C:\\開発.scw', '--log-file=C:\\ログ.scw', 'C:\\本文.scw'] });
  run.ready();
  run.loaded();
  await settled();
  assert.equal(run.reads.length, 1);
  assert.equal(run.reads[0].filePath, 'C:\\本文.scw');
});

test('macOSは単一起動制御を追加せず既存open-file経路を使用する', async () => {
  const run = launch({ platform: 'darwin' });
  let prevented = false;
  run.app.emit('open-file', { preventDefault: () => { prevented = true; } }, 'C:\\Mac文書.scw');
  run.ready();
  run.loaded();
  await settled();
  assert.equal(run.lockCount(), 0);
  assert.equal(run.app.listenerCount('second-instance'), 0);
  assert.equal(prevented, true);
  assert.equal(run.messages[0].payload.content, content);
});

test('Windowsのアプリ内「開く」は既存IPC経路から読み込める', async () => {
  const run = launch();
  run.ready();
  const result = await run.handlers.get('file:open')();
  assert.equal(result.filePath, 'C:\\作品 フォルダ\\手動.scw');
  assert.equal(result.content, content);
  assert.equal(run.messages.length, 0);
});
