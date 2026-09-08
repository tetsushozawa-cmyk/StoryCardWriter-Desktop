(function attachCardEditor(globalObject) {
  function commitPendingCard(story, selectedType, rawBody, createCard) {
    return commit(story, {
      selectedType,
      editingCardId: null,
      insertingAfterCardId: null,
    }, rawBody, createCard);
  }

  function commit(story, editor, rawBody, createCard) {
    const body = String(rawBody ?? '').trim();
    if (!body) return { committed: false, action: 'empty' };

    if (editor.editingCardId) {
      const card = story.cards.find((item) => item.id === editor.editingCardId);
      if (card) {
        card.type = editor.selectedType;
        card.body = body;
        return { committed: true, action: 'updated' };
      }
    }

    const card = createCard(editor.selectedType, body);
    if (editor.insertingAfterCardId) {
      const index = story.cards.findIndex((item) => item.id === editor.insertingAfterCardId);
      story.cards.splice(index >= 0 ? index + 1 : story.cards.length, 0, card);
    } else {
      story.cards.push(card);
    }
    return { committed: true, action: 'added' };
  }

  const cardEditor = Object.freeze({ commit, commitPendingCard });
  globalObject.StoryCardEditor = cardEditor;
  if (typeof module !== 'undefined' && module.exports) module.exports = cardEditor;
})(typeof globalThis !== 'undefined' ? globalThis : window);
