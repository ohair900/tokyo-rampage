import { bus } from './utils/eventBus.js';
import { game } from './engine/Game.js';
import { renderer } from './ui/Renderer.js';
import { setupScreen } from './ui/SetupScreen.js';
import { aiController } from './ai/AIPlayer.js';
import { POWER_CARDS } from './data/powerCards.js';
import { gameState } from './state/GameState.js';
import { PHASES } from './data/constants.js';
import { reroll, confirmDice, toggleKeep } from './engine/Dice.js';
import { tournamentManager } from './engine/TournamentManager.js';
import { statsTracker } from './engine/StatsTracker.js';
import { tutorialOverlay } from './ui/TutorialOverlay.js';
import { lobbyUI } from './net/LobbyUI.js';
import { networkAdapter } from './net/NetworkAdapter.js';
import { multiplayerSync } from './net/MultiplayerSync.js';

// Mobile viewport height fix (avoids 100vh including URL bar)
function setVH() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
setVH();
window.addEventListener('resize', setVH);

// Initialize tutorial (before setup screen, so auto-show works)
tutorialOverlay.init();

// Initialize setup screen
setupScreen.init();

// Listen for setup completion
bus.on('setup:complete', ({ configs, aiDifficulty, gameMode, seriesLength }) => {
  const gameArea = document.getElementById('game-area');
  gameArea.classList.remove('hidden');
  requestAnimationFrame(() => gameArea.classList.add('visible'));

  aiController.setDifficulty(aiDifficulty || 'normal');
  renderer.init();

  if (gameMode === 'tournament') {
    tournamentManager.start(seriesLength, configs, aiDifficulty);
  } else {
    tournamentManager.reset();
  }

  game.initGame(configs, POWER_CARDS);
});

// Listen for new game request (back to setup)
bus.on('ui:newGame', () => {
  const gameArea = document.getElementById('game-area');
  gameArea.classList.remove('visible');
  setTimeout(() => {
    gameArea.classList.add('hidden');
    tournamentManager.reset();
    setupScreen.show();
  }, 400);
});

// Tournament: next game
bus.on('ui:nextGame', () => {
  const tm = tournamentManager;
  if (!tm.active) return;

  // Record win from most recent game
  const winner = gameState.winner;
  if (winner) {
    tm.recordWin(winner.name, statsTracker.getAllStats());
  }

  if (tm.isSeriesOver()) {
    // Series is over, the GameOverScreen will show champion
    return;
  }

  // Start next game with same configs
  aiController.setDifficulty(tm.aiDifficulty);
  game.initGame(tm.playerConfigs, POWER_CARDS);
});

// Tournament: new tournament (back to setup)
bus.on('ui:newTournament', () => {
  const gameArea = document.getElementById('game-area');
  gameArea.classList.remove('visible');
  setTimeout(() => {
    gameArea.classList.add('hidden');
    tournamentManager.reset();
    setupScreen.show();
  }, 400);
});

// ── Online Multiplayer ──

// Check URL for auto-join
const urlParams = new URLSearchParams(location.search);
const autoJoinRoom = urlParams.get('room');

bus.on('setup:multiplayer', () => {
  const container = document.getElementById('setup-screen');
  lobbyUI.init(container);
  lobbyUI.showCreateOrJoin(autoJoinRoom);
});

// If URL has ?room=, go directly to multiplayer join
if (autoJoinRoom) {
  const container = document.getElementById('setup-screen');
  lobbyUI.init(container);
  lobbyUI.showCreateOrJoin(autoJoinRoom);
}

bus.on('lobby:back', () => {
  setupScreen.show();
});

bus.on('net:gameStart', (msg) => {
  const gameArea = document.getElementById('game-area');
  const setupEl = document.getElementById('setup-screen');
  setupEl.classList.add('fade-out');
  setTimeout(() => {
    setupEl.classList.add('hidden');
    setupEl.classList.remove('fade-out');
    gameArea.classList.remove('hidden');
    requestAnimationFrame(() => gameArea.classList.add('visible'));

    renderer.init();

    // Build configs from server data, look up full monster objects
    import('./data/monsters.js').then(({ MONSTERS }) => {
      const configs = msg.players.map((p) => {
        const monster = MONSTERS.find(m => m.id === p.monsterId) || MONSTERS[0];
        return {
          name: p.name,
          monster,
          isAI: p.isAI,
          isRemote: p.index !== networkAdapter.localPlayerIndex && !p.isAI,
          playerIndex: p.index,
        };
      });

      game.setMultiplayerAdapter(networkAdapter);
      multiplayerSync.enable();
      game.initGame(configs, POWER_CARDS, msg.cardDeckSeed);
    });
  }, 400);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (gameState.phase !== PHASES.ROLLING) return;
  const player = gameState.currentPlayer;
  if (!player || player.isAI || player.isRemote) return;

  if (e.key === 'Enter') {
    if (gameState.rerollsLeft > 0) {
      if (game.multiplayerAdapter) networkAdapter.sendReroll();
      reroll();
    } else {
      if (game.multiplayerAdapter) networkAdapter.sendConfirmDice();
      confirmDice();
      game.resolveDice();
    }
  }

  // Number keys 1-6 to toggle dice keep
  const num = parseInt(e.key);
  if (num >= 1 && num <= 6) {
    toggleKeep(num - 1);
  }
});
