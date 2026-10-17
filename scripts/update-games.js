const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'games.json');

const fallbackGames = [
  {
    id: 'g001',
    title: 'Barcelona vs Real Madrid',
    sport: 'Soccer',
    time: '21:00',
    odds: 1.85,
    pickOptions: [
      { label: 'Barcelona', value: 'Barcelona' },
      { label: 'Draw', value: 'Draw' },
      { label: 'Real Madrid', value: 'Real Madrid' }
    ],
    defaultPick: 'Barcelona'
  },
  {
    id: 'g002',
    title: 'Lakers vs Celtics',
    sport: 'Basketball',
    time: '19:30',
    odds: 2.1,
    pickOptions: [
      { label: 'Lakers', value: 'Lakers' },
      { label: 'Celtics', value: 'Celtics' }
    ],
    defaultPick: 'Lakers'
  },
  {
    id: 'g003',
    title: 'Milan vs Inter',
    sport: 'Soccer',
    time: '20:45',
    odds: 1.7,
    pickOptions: [
      { label: 'Milan', value: 'Milan' },
      { label: 'Inter', value: 'Inter' }
    ],
    defaultPick: 'Milan'
  },
  {
    id: 'g004',
    title: 'Toulouse vs Nantes',
    sport: 'Soccer',
    time: '18:00',
    odds: 2.4,
    pickOptions: [
      { label: 'Toulouse', value: 'Toulouse' },
      { label: 'Nantes', value: 'Nantes' }
    ],
    defaultPick: 'Toulouse'
  }
];

function normalizeGames(rawGames) {
  if (!Array.isArray(rawGames)) return fallbackGames;

  return rawGames.map((game, index) => ({
    id: game.id || `g${String(index + 1).padStart(3, '0')}`,
    title: game.title || `Game ${index + 1}`,
    sport: game.sport || 'Sports',
    time: game.time || '--:--',
    odds: Number(game.odds ?? 1.5),
    pickOptions: Array.isArray(game.pickOptions) && game.pickOptions.length
      ? game.pickOptions.map(option => ({
          label: option.label || option.value || 'Pick',
          value: option.value || option.label || 'Pick'
        }))
      : [{ label: 'Pick', value: 'Pick' }],
    defaultPick: game.defaultPick || (Array.isArray(game.pickOptions) && game.pickOptions[0]?.value) || 'Pick'
  }));
}

async function loadRemoteGames() {
  const sourceUrl = process.env.DATA_SOURCE_URL;
  if (!sourceUrl) return fallbackGames;

  const response = await fetch(sourceUrl, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch source data: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (Array.isArray(payload)) return normalizeGames(payload);
  if (Array.isArray(payload.games)) return normalizeGames(payload.games);
  if (Array.isArray(payload.data)) return normalizeGames(payload.data);
  return fallbackGames;
}

async function main() {
  try {
    const games = await loadRemoteGames();
    const doc = {
      updatedAt: new Date().toISOString(),
      games: normalizeGames(games)
    };

    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
    console.log(`Updated ${games.length} games in ${dataPath}`);
  } catch (error) {
    console.error('Failed to refresh game data:', error.message);
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, `${JSON.stringify({ updatedAt: new Date().toISOString(), games: fallbackGames }, null, 2)}\n`, 'utf8');
    process.exitCode = 1;
  }
}

main();
