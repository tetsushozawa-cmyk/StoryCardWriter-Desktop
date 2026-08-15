const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('メニューとツールバーから標準印刷を実行できる', () => {
  const mainSource = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const preloadSource = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  assert.match(mainSource, /label: '印刷…', accelerator: 'CmdOrCtrl\+P'/);
  assert.match(mainSource, /webContents\.print\(\{[\s\S]*pageSize: 'A4'/);
  assert.match(preloadSource, /print: \(\) => ipcRenderer\.invoke\('app:print'\)/);
  assert.match(html, /<button id="print-button"[^>]*>印刷<\/button>/);
});

test('印刷専用文書から操作UIと参照ペインを除外する', () => {
  const rendererSource = fs.readFileSync(path.join(root, 'renderer.js'), 'utf8');
  const printRenderer = rendererSource.slice(
    rendererSource.indexOf('function renderPrintDocument()'),
    rendererSource.indexOf('async function printDocument()'),
  );

  assert.match(printRenderer, /story\.cards\.map/);
  assert.match(printRenderer, /inlineMarkdown\.render/);
  assert.doesNotMatch(printRenderer, /reference|createButton|input|textarea/);
});

test('印刷CSSはA4縦・白黒でカード本文の改ページを許可する', () => {
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

  assert.match(css, /@page\s*{[\s\S]*size: A4 portrait/);
  assert.match(css, /body > :not\(\.print-document\)\s*{ display: none !important; }/);
  assert.match(css, /\.print-card\s*{[\s\S]*border: 1px solid #000;[\s\S]*break-inside: auto/);
});
