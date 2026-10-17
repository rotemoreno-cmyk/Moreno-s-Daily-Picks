(function () {
  const selectedGames = [];
  const selectedPicks = [];
  const odds = [];
  const systemForms = [];

  const gamesListEl = document.getElementById('games-list');
  const systemFormEl = document.getElementById('system-form');

  let clearFormBtn = document.getElementById('clear-form');

  if (!clearFormBtn && gamesListEl && gamesListEl.parentElement) {
    clearFormBtn = document.createElement('button');
    clearFormBtn.type = 'button';
    clearFormBtn.id = 'clear-form';
    clearFormBtn.className = 'clear-form-btn';
    clearFormBtn.textContent = 'Clear Form';
    gamesListEl.parentElement.insertBefore(clearFormBtn, gamesListEl);
  }

  function parseOdds(value) {
    const number = parseFloat(value);
    return isFinite(number) ? number : null;
  }

  function getSelectedPick(card) {
    const checkedRadio = card.querySelector('input[type="radio"]:checked');
    return checkedRadio ? checkedRadio.value : 'N/A';
  }

  function getOdds(card) {
    const oddsValue = card.querySelector('.odds-value');
    return oddsValue ? oddsValue.textContent.trim() : '';
  }

  function isGameInSystem(card) {
    const systemCheckbox = card.querySelector('.system-checkbox');
    return systemCheckbox ? systemCheckbox.checked : false;
  }

  function computeCombinedOdds(oddsList) {
    if (!oddsList.length) return null;
    return oddsList.reduce(function (total, currentOdds) {
      return total * currentOdds;
    }, 1);
  }

  function createRemoveButton(gameId) {
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-game-btn';
    removeButton.setAttribute('aria-label', 'Remove game');
    removeButton.title = 'Remove';
    removeButton.textContent = '×';

    removeButton.addEventListener('click', function (event) {
      event.stopPropagation();
      removeGame(gameId);
    });

    return removeButton;
  }

  function removeGame(gameId) {
    const gameIndex = selectedGames.findIndex(function (game) {
      return game.id === gameId;
    });

    if (gameIndex === -1) return;

    selectedGames.splice(gameIndex, 1);
    selectedPicks.splice(gameIndex, 1);
    odds.splice(gameIndex, 1);
    systemForms.splice(gameIndex, 1);

    const gameCard = document.querySelector(
      `.game-card[data-game-id="${CSS.escape(gameId)}"]`
    );

    if (gameCard) {
      gameCard.classList.remove('selected');
      gameCard.setAttribute('aria-pressed', 'false');
    }

    renderSelected();
  }

  function clearAllGames() {
    selectedGames.length = 0;
    selectedPicks.length = 0;
    odds.length = 0;
    systemForms.length = 0;

    document.querySelectorAll('.game-card.selected').forEach(function (card) {
      card.classList.remove('selected');
      card.setAttribute('aria-pressed', 'false');
    });

    renderSelected();
  }

  function renderSelected() {
    if (gamesListEl) {
      gamesListEl.innerHTML = '';

      if (selectedGames.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'empty-selection';
        emptyItem.textContent = 'No games selected.';
        gamesListEl.appendChild(emptyItem);
      }

      selectedGames.forEach(function (game) {
        const listItem = document.createElement('li');
        listItem.className = 'selected-game';
        listItem.dataset.gameId = game.id;

        const gameText = document.createElement('span');
        gameText.className = 'selected-game-text';
        gameText.textContent =
          `${game.title} — ${game.pick} (${game.odds})` +
          (game.system ? ' • System' : '');

        listItem.appendChild(gameText);
        listItem.appendChild(createRemoveButton(game.id));
        gamesListEl.appendChild(listItem);
      });
    }

    if (systemFormEl) {
      systemFormEl
        .querySelectorAll('input[data-managed="true"]')
        .forEach(function (input) {
          input.remove();
        });

      selectedGames.forEach(function (game, index) {
        const fields = [
          [`game_${index + 1}_id`, game.id],
          [`game_${index + 1}_title`, game.title],
          [`game_${index + 1}_pick`, game.pick],
          [`game_${index + 1}_odds`, game.odds],
          [`game_${index + 1}_system`, game.system ? 'yes' : 'no']
        ];

        fields.forEach(function (field) {
          const hiddenInput = document.createElement('input');
          hiddenInput.type = 'hidden';
          hiddenInput.name = field[0];
          hiddenInput.value = field[1];
          hiddenInput.dataset.managed = 'true';
          systemFormEl.appendChild(hiddenInput);
        });
      });

      const combinedOdds = computeCombinedOdds(odds);
      const combinedInput = document.createElement('input');
      combinedInput.type = 'hidden';
      combinedInput.name = 'combined_odds';
      combinedInput.value = combinedOdds ? combinedOdds.toFixed(4) : '';
      combinedInput.dataset.managed = 'true';
      systemFormEl.appendChild(combinedInput);
    }

    if (clearFormBtn) {
      clearFormBtn.disabled = selectedGames.length === 0;
    }
  }

  function toggleGameSelection(card) {
    const gameId = card.dataset.gameId;
    if (!gameId) return;

    const existingIndex = selectedGames.findIndex(function (game) {
      return game.id === gameId;
    });

    if (existingIndex !== -1) {
      removeGame(gameId);
      return;
    }

    selectedGames.push({
      id: gameId,
      title: card.dataset.title || `Game ${gameId}`,
      pick: getSelectedPick(card),
      odds: getOdds(card),
      system: isGameInSystem(card)
    });

    selectedPicks.push(getSelectedPick(card));
    odds.push(parseOdds(getOdds(card)) || 1);
    systemForms.push(isGameInSystem(card));

    card.classList.add('selected');
    card.setAttribute('aria-pressed', 'true');

    renderSelected();
  }

  function wireUpGameCards() {
    document.querySelectorAll('.game-card').forEach(function (card) {
      card.addEventListener('click', function () {
        toggleGameSelection(card);
      });

      card.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleGameSelection(card);
        }
      });

      if (!card.hasAttribute('tabindex')) {
        card.setAttribute('tabindex', '0');
      }

      if (!card.hasAttribute('role')) {
        card.setAttribute('role', 'button');
      }

      if (!card.hasAttribute('aria-pressed')) {
        card.setAttribute('aria-pressed', 'false');
      }
    });

    if (clearFormBtn) {
      clearFormBtn.addEventListener('click', function () {
        if (selectedGames.length === 0) return;

        if (window.confirm('Clear all selected games?')) {
          clearAllGames();
        }
      });
    }

    renderSelected();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireUpGameCards);
  } else {
    wireUpGameCards();
  }

  window.__gameSelection = {
    selectedGames: selectedGames,
    selectedPicks: selectedPicks,
    odds: odds,
    systemForms: systemForms,
    toggleGameSelection: toggleGameSelection,
    removeGame: removeGame,
    clearAllGames: clearAllGames,
    renderSelected: renderSelected
  };
})();