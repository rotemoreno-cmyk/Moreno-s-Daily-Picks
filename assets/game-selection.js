const selectedGames = [];
const selectedPicks = [];
const odds = [];
const systemForms = [];

function parseOdds(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function computeCombinedOdds(values) {
  if (!values.length) return null;
  return values.reduce((total, value) => total * (value || 1), 1);
}

function findSelectedIndexById(id) {
  return selectedGames.findIndex(game => game.id === id);
}

function updateDerivedArrays() {
  selectedPicks.length = 0;
  odds.length = 0;
  systemForms.length = 0;

  selectedGames.forEach(game => {
    selectedPicks.push(game.pick);
    odds.push(typeof game.odds === 'number' && Number.isFinite(game.odds) ? game.odds : 1);
    systemForms.push({ id: game.id, system: game.system });
  });
}

function renderSelected() {
  const gamesListEl = document.getElementById('games-list');
  const pickEl = document.getElementById('pick');
  const oddsEl = document.getElementById('odds');
  const systemFormEl = document.getElementById('system-form');

  if (gamesListEl) {
    gamesListEl.innerHTML = '';
    selectedGames.forEach(game => {
      const item = document.createElement('li');
      item.textContent = `${game.title} — ${game.pick} (${game.odds != null ? game.odds : '-'})${game.system ? ' [system]' : ''}`;
      item.dataset.gameId = game.id;
      gamesListEl.appendChild(item);
    });
  }

  if (pickEl) {
    pickEl.value = selectedPicks.join(', ');
  }

  if (oddsEl) {
    const combined = computeCombinedOdds(odds);
    oddsEl.textContent = combined ? combined.toFixed(2) : '-';
  }

  if (systemFormEl) {
    systemFormEl.querySelectorAll('input[data-managed="true"]').forEach(node => node.remove());

    selectedGames.forEach((game, index) => {
      const idInput = document.createElement('input');
      idInput.type = 'hidden';
      idInput.name = `game_${index + 1}_id`;
      idInput.value = game.id;
      idInput.dataset.managed = 'true';
      systemFormEl.appendChild(idInput);

      const pickInput = document.createElement('input');
      pickInput.type = 'hidden';
      pickInput.name = `game_${index + 1}_pick`;
      pickInput.value = game.pick;
      pickInput.dataset.managed = 'true';
      systemFormEl.appendChild(pickInput);

      const oddInput = document.createElement('input');
      oddInput.type = 'hidden';
      oddInput.name = `game_${index + 1}_odds`;
      oddInput.value = game.odds != null ? String(game.odds) : '';
      oddInput.dataset.managed = 'true';
      systemFormEl.appendChild(oddInput);

      const systemInput = document.createElement('input');
      systemInput.type = 'hidden';
      systemInput.name = `game_${index + 1}_system`;
      systemInput.value = game.system || '';
      systemInput.dataset.managed = 'true';
      systemFormEl.appendChild(systemInput);
    });

    const combined = computeCombinedOdds(odds);
    const combinedInput = document.createElement('input');
    combinedInput.type = 'hidden';
    combinedInput.name = 'combined_odds';
    combinedInput.value = combined ? combined.toFixed(4) : '';
    combinedInput.dataset.managed = 'true';
    systemFormEl.appendChild(combinedInput);
  }
}

function readCardData(card) {
  const id = card.dataset.gameId || card.getAttribute('data-game-id');
  const title = card.dataset.title || card.getAttribute('data-title') || card.querySelector('h3')?.textContent?.trim() || `Game ${id || '?'}`;

  let pick = card.dataset.pick || card.getAttribute('data-pick') || '';
  const checkedRadio = card.querySelector('input[type="radio"]:checked');
  const pickSelect = card.querySelector('select.pick-select');

  if (checkedRadio) {
    pick = checkedRadio.value;
  } else if (pickSelect) {
    pick = pickSelect.value;
  } else {
    const pickText = card.querySelector('.pick')?.textContent;
    if (pickText) pick = pickText.replace(/^Pick:\s*/i, '').trim();
  }

  let oddsRaw = card.dataset.odds || card.getAttribute('data-odds') || '';
  const oddsSpan = card.querySelector('.odds-value');
  const oddsInput = card.querySelector('input.odds-input');

  if (!oddsRaw && oddsSpan) oddsRaw = oddsSpan.textContent.trim();
  if (oddsInput && oddsInput.value) oddsRaw = oddsInput.value.trim();

  const oddsValue = parseOdds(oddsRaw);

  let systemValue = card.dataset.system || card.getAttribute('data-system') || '';
  const systemCheckbox = card.querySelector('input.system-checkbox');
  const systemSelect = card.querySelector('select.system-select');
  if (systemCheckbox) {
    systemValue = systemCheckbox.checked ? systemCheckbox.value || 'system' : '';
  } else if (systemSelect) {
    systemValue = systemSelect.value;
  }

  return {
    id,
    title,
    pick: pick || 'N/A',
    odds: oddsValue != null ? oddsValue : (oddsRaw || null),
    system: systemValue || ''
  };
}

function toggleGameSelection(card) {
  const { id } = readCardData(card);
  if (!id) return;

  const index = findSelectedIndexById(id);
  if (index >= 0) {
    selectedGames.splice(index, 1);
    card.classList.remove('selected');
    card.setAttribute('aria-pressed', 'false');
    updateDerivedArrays();
    renderSelected();
    return;
  }

  selectedGames.push(readCardData(card));
  card.classList.add('selected');
  card.setAttribute('aria-pressed', 'true');
  updateDerivedArrays();
  renderSelected();
}

function onInnerControlChange(control) {
  const card = control.closest('.game-card');
  if (!card) return;
  const selectedIndex = findSelectedIndexById(card.dataset.gameId || card.getAttribute('data-game-id'));
  if (selectedIndex < 0) return;

  selectedGames[selectedIndex] = readCardData(card);
  updateDerivedArrays();
  renderSelected();
}

function makeCardAccessible(card) {
  if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
  if (!card.hasAttribute('role')) card.setAttribute('role', 'button');
  if (!card.hasAttribute('aria-pressed')) card.setAttribute('aria-pressed', 'false');
}

function bindCardEvents() {
  document.querySelectorAll('.game-card').forEach(card => {
    makeCardAccessible(card);

    card.addEventListener('click', event => {
      const target = event.target;
      const interactive = target.closest('input, select, button, a, textarea, label');
      if (interactive && interactive.dataset.toggle !== 'true') {
        if (interactive.matches('input, select, textarea')) {
          setTimeout(() => onInnerControlChange(interactive), 0);
        }
        return;
      }

      toggleGameSelection(card);
    });

    card.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const interactive = document.activeElement && document.activeElement.matches('input, select, button, a, textarea, label');
      if (interactive && document.activeElement.dataset.toggle !== 'true') return;
      event.preventDefault();
      toggleGameSelection(card);
    });
  });
}

function init() {
  bindCardEvents();

  document.querySelectorAll('.game-card.selected').forEach(card => {
    const gameId = card.dataset.gameId || card.getAttribute('data-game-id');
    if (gameId && findSelectedIndexById(gameId) < 0) {
      selectedGames.push(readCardData(card));
    }
  });

  updateDerivedArrays();
  renderSelected();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.__gameSelection = {
  selectedGames,
  selectedPicks,
  odds,
  systemForms,
  toggleGameSelection,
  renderSelected,
  readCardData
};
