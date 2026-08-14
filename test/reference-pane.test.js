const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('参照ファイルはscwとjsonを読み取り専用IPCで開く', () => {
  const mainSource = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const preloadSource = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  const handler = mainSource.slice(
    mainSource.indexOf("ipcMain.handle('file:open-reference'"),
    mainSource.indexOf("ipcMain.handle('file:save'"),
  );

  assert.match(handler, /extensions: \['scw', 'json'\]/);
  assert.match(handler, /fs\.readFile/);
  assert.doesNotMatch(handler, /writeFile|authorizedPaths\.add/);
  assert.match(preloadSource, /openReference: \(\) => ipcRenderer\.invoke\('file:open-reference'\)/);
});

test('参照ペインには編集用フォームを置かない', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const pane = html.slice(html.indexOf('<aside id="reference-pane"'), html.indexOf('</aside>'));

  assert.match(pane, /reference-card-list/);
  assert.doesNotMatch(pane, /<input|<textarea|保存/);
});
