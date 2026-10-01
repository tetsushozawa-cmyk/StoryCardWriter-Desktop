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

test('新規入力中に過去カードの編集を始めても入力が通常カードとして残る', () => {
  const story = codec.newDocument();
  const existing = codec.createCard('action', '過去のカード');
  story.cards.push(existing);

  const result = cardEditor.commitPendingCard(
    story,
    'inner',
    '入力中の新規カード',
    codec.createCard,
  );

  assert.deepEqual(result, { committed: true, action: 'added' });
  assert.deepEqual(story.cards.map((card) => card.body), [
    '過去のカード',
    '入力中の新規カード',
  ]);
  assert.equal(story.cards[1].type, 'inner');
});

test('新規入力を確定後に編集モードへ入っても同じ内容を二重登録しない', () => {
  const story = codec.newDocument();
  const existing = codec.createCard('action', '過去のカード');
  story.cards.push(existing);

  cardEditor.commitPendingCard(story, 'inner', '入力中の新規カード', codec.createCard);
  commit(story, existing.body, { editingCardId: existing.id });

  assert.deepEqual(story.cards.map((card) => card.body), [
    '過去のカード',
    '入力中の新規カード',
  ]);
});

test('空白入力中に過去カードの編集を始めてもカードは増えない', () => {
  const story = codec.newDocument();
  story.cards.push(codec.createCard('action', '過去のカード'));

  const result = cardEditor.commitPendingCard(story, 'inner', ' \n\t ', codec.createCard);

  assert.deepEqual(result, { committed: false, action: 'empty' });
  assert.equal(story.cards.length, 1);
});

test('カードを同じ種類と本文で直後に複製する', () => {
  const story = codec.newDocument();
  const source = codec.createCard('action', '1行目\n2行目');
  const last = codec.createCard('sound', '最後');
  story.cards.push(source, last);

  const copy = cardEditor.duplicate(story, source.id, codec.createCard);

  assert.equal(story.cards.length, 3);
  assert.equal(story.cards[1], copy);
  assert.equal(copy.type, source.type);
  assert.equal(copy.body, source.body);
  assert.notEqual(copy.id, source.id);
});

test('複製したカードはコピー元と独立して編集・削除できる', () => {
  const story = codec.newDocument();
  const source = codec.createCard('inner', 'コピー元');
  story.cards.push(source);
  const copy = cardEditor.duplicate(story, source.id, codec.createCard);

  copy.type = 'protagonist';
  copy.body = '複製側だけ変更';
  story.cards = story.cards.filter((card) => card.id !== copy.id);

  assert.deepEqual(story.cards, [source]);
  assert.equal(source.type, 'inner');
  assert.equal(source.body, 'コピー元');
});
