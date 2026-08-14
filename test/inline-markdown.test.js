const test = require('node:test');
const assert = require('node:assert/strict');
const inlineMarkdown = require('../inline-markdown.js');

test('イタリックと太字だけをトークンへ変換する', () => {
  assert.deepEqual(
    inlineMarkdown.tokenize('これは *斜体* と **太字** です'),
    [
      { type: 'text', value: 'これは ' },
      { type: 'em', value: '斜体' },
      { type: 'text', value: ' と ' },
      { type: 'strong', value: '太字' },
      { type: 'text', value: ' です' },
    ],
  );
});

test('全角アスタリスクのイタリックと太字に対応する', () => {
  assert.deepEqual(
    inlineMarkdown.tokenize('これは ＊斜体＊ と ＊＊太字＊＊ です'),
    [
      { type: 'text', value: 'これは ' },
      { type: 'em', value: '斜体' },
      { type: 'text', value: ' と ' },
      { type: 'strong', value: '太字' },
      { type: 'text', value: ' です' },
    ],
  );
});

test('半角と全角のMarkdownを同じ本文で個別に解析する', () => {
  assert.deepEqual(
    inlineMarkdown.tokenize('*半角斜体* ＊全角斜体＊ **半角太字** ＊＊全角太字＊＊'),
    [
      { type: 'em', value: '半角斜体' },
      { type: 'text', value: ' ' },
      { type: 'em', value: '全角斜体' },
      { type: 'text', value: ' ' },
      { type: 'strong', value: '半角太字' },
      { type: 'text', value: ' ' },
      { type: 'strong', value: '全角太字' },
    ],
  );
});

test('HTMLは実行可能な要素へ変換せずプレーンテキストとして扱う', () => {
  assert.deepEqual(
    inlineMarkdown.tokenize('<img src=x onerror=alert(1)> **<script>危険</script>**'),
    [
      { type: 'text', value: '<img src=x onerror=alert(1)> ' },
      { type: 'strong', value: '<script>危険</script>' },
    ],
  );
});

test('閉じていないMarkdown記号は元のテキストを維持する', () => {
  assert.deepEqual(
    inlineMarkdown.tokenize('未完の *斜体'),
    [{ type: 'text', value: '未完の *斜体' }],
  );
});
