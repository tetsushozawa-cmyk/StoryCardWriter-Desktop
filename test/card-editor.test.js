const test = require('node:test');
const assert = require('node:assert/strict');
const codec = require('../document-codec.js');
const cardEditor = require('../card-editor.js');

function commit(story, body, overrides = {}) {
  return cardEditor.commit(story, {
    selectedType: 'inner',
    editingCardId: null,
    insertingAfterCardId: null,
    ...overrides,
  }, body, codec.createCard);
}

test('未確定入力を選択中の種類のカードとして保存データへ含める', () => {
  const story = codec.newDocument();
  const result = commit(story, '  忘れたくないアイデア\n');
  const reopened = codec.parse(codec.serialize(story));

  assert.deepEqual(result, { committed: true, action: 'added' });
  assert.equal(reopened.cards.length, 1);
  assert.equal(reopened.cards[0].type, 'inner');
  assert.equal(reopened.cards[0].body, '忘れたくないアイデア');
});

test('空または空白と改行だけの入力ではカードを作らない', () => {
  for (const body of ['', '   ', '\n \t\n']) {
    const story = codec.newDocument();
    assert.deepEqual(commit(story, body), { committed: false, action: 'empty' });
    assert.equal(story.cards.length, 0);
  }
});

test('一度確定して入力欄が空になった後の保存では二重追加しない', () => {
  const story = codec.newDocument();
  commit(story, '一度だけ');
  commit(story, '');
  const reopened = codec.parse(codec.serialize(story));
  assert.deepEqual(reopened.cards.map((card) => card.body), ['一度だけ']);
});

test('編集中の入力は新規追加せず既存カードを更新する', () => {
  const story = codec.newDocument();
  const existing = codec.createCard('action', '変更前');
  story.cards.push(existing);
  const result = commit(story, '変更後', { editingCardId: existing.id });

  assert.deepEqual(result, { committed: true, action: 'updated' });
  assert.equal(story.cards.length, 1);
  assert.equal(story.cards[0].body, '変更後');
  assert.equal(story.cards[0].type, 'inner');
});

test('「後に追加」中の入力は指定カードの直後へ追加する', () => {
  const story = codec.newDocument();
  const first = codec.createCard('action', '最初');
  const last = codec.createCard('sound', '最後');
  story.cards.push(first, last);
  commit(story, '途中', { insertingAfterCardId: first.id });

  assert.deepEqual(story.cards.map((card) => card.body), ['最初', '途中', '最後']);
});
