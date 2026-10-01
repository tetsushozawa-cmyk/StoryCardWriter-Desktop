const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('各カードの後に追加の隣にコピーボタンを置く', () => {
  const rendererSource = fs.readFileSync(path.join(root, 'renderer.js'), 'utf8');
  const actions = rendererSource.slice(
    rendererSource.indexOf('actions.append('),
    rendererSource.indexOf('top.append(label, actions)'),
  );

  assert.match(actions, /createButton\('後に追加',[\s\S]*createButton\('カードをコピー',[\s\S]*createButton\('編集'/);
});

test('コピー操作はカードを複製して未保存状態にする', () => {
  const rendererSource = fs.readFileSync(path.join(root, 'renderer.js'), 'utf8');
  const copyCard = rendererSource.slice(
    rendererSource.indexOf('function copyCard'),
    rendererSource.indexOf('function deleteCard'),
  );

  assert.match(copyCard, /cardEditor\.duplicate\(story, cardId, codec\.createCard\)/);
  assert.match(copyCard, /setDirty\(true\)/);
  assert.match(copyCard, /renderCards\(\)/);
  assert.match(copyCard, /showToast\('カードをコピーしました'\)/);
  assert.doesNotMatch(copyCard, /clipboard|copyText/);
});
