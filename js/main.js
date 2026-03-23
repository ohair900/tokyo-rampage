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
  gameArea.classList.add('hidden');
  tournamentManager.reset();
  setupScreen.show();
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
  gameArea.classList.add('hidden');
  tournamentManager.reset();
  setupScreen.show();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (gameState.phase !== PHASES.ROLLING) return;
  const player = gameState.currentPlayer;
  if (!player || player.isAI) return;

  if (e.key === 'Enter') {
    if (gameState.rerollsLeft > 0) {
      reroll();
    } else {
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
