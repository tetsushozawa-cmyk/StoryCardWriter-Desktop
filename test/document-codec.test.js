const test = require('node:test');
const assert = require('node:assert/strict');
const codec = require('../document-codec.js');

test('Android版JSONをorder順で読み込み、6種類へ変換する', () => {
  const document = codec.parse(JSON.stringify({
    title: '雨の日',
    templateName: 'シナリオ',
    protagonistName: '葵',
    partnerName: '蓮',
    cards: [
      { type: '相手', text: '先のカード', order: 1 },
      { type: '主人公', text: '後のカード', order: 0 },
      { type: '心情', text: '心の中', order: 2 },
    ],
  }));

  assert.equal(document.settings.title, '雨の日');
  assert.deepEqual(document.cards.map((card) => card.type), ['protagonist', 'partner', 'inner']);
  assert.deepEqual(document.cards.map((card) => card.body), ['後のカード', '先のカード', '心の中']);
});

test('保存時にAndroid版形式を保ち、未知の項目を残す', () => {
  const document = codec.parse(JSON.stringify({
    title: '作品',
    futureRootField: { enabled: true },
    cards: [{ type: 'Partner', text: '元の文', order: 8, futureCardField: 42 }],
  }));
  document.cards[0].body = '変更後';
  document.cards.push(codec.createCard('action', '走り出す。'));
  const saved = JSON.parse(codec.serialize(document));

  assert.deepEqual(saved.futureRootField, { enabled: true });
  assert.equal(saved.cards[0].futureCardField, 42);
  assert.equal(saved.cards[0].type, 'Partner');
  assert.equal(saved.cards[0].text, '変更後');
  assert.equal(saved.cards[0].order, 0);
  assert.equal(saved.cards[1].type, 'アクション');
  assert.equal(saved.cards[1].order, 1);
});

test('settings入れ子形式を壊さずに保存する', () => {
  const document = codec.parse(JSON.stringify({
    settings: { title: '入れ子', protagonistName: 'A', custom: 'keep' },
    cards: [],
  }));
  document.settings.title = '変更';
  const saved = JSON.parse(codec.serialize(document));
  assert.equal(saved.settings.title, '変更');
  assert.equal(saved.settings.custom, 'keep');
  assert.equal(Object.hasOwn(saved, 'title'), false);
});

test('cardsのないJSONは明確なエラーにする', () => {
  assert.throws(() => codec.parse('{"title":"作品"}'), /cards が見つかりません/);
});
