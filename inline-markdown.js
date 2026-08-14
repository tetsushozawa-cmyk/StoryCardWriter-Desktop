(function attachInlineMarkdown(globalObject) {
  function tokenize(text) {
    const source = String(text ?? '');
    const tokens = [];
    const pattern = /\*\*([^*\n]+)\*\*|＊＊([^＊\n]+)＊＊|\*([^*\n]+)\*|＊([^＊\n]+)＊/g;
    let position = 0;
    let match;

    while ((match = pattern.exec(source)) !== null) {
      if (match.index > position) {
        tokens.push({ type: 'text', value: source.slice(position, match.index) });
      }
      tokens.push({
        type: match[1] === undefined && match[2] === undefined ? 'em' : 'strong',
        value: match[1] ?? match[2] ?? match[3] ?? match[4],
      });
      position = pattern.lastIndex;
    }

    if (position < source.length) {
      tokens.push({ type: 'text', value: source.slice(position) });
    }
    return tokens;
  }

  function render(container, text) {
    const nodes = tokenize(text).map((token) => {
      if (token.type === 'text') return document.createTextNode(token.value);
      const element = document.createElement(token.type);
      element.textContent = token.value;
      return element;
    });
    container.replaceChildren(...nodes);
  }

  const inlineMarkdown = Object.freeze({ tokenize, render });
  globalObject.InlineMarkdown = inlineMarkdown;
  if (typeof module !== 'undefined' && module.exports) module.exports = inlineMarkdown;
})(typeof globalThis !== 'undefined' ? globalThis : window);
