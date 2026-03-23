import { $ } from '../utils/dom.js';
import { bus } from '../utils/eventBus.js';
import { gameState } from '../state/GameState.js';
import { crownSVG } from './SVGAssets.js';
import { monsterPanel } from './MonsterPanel.js';
import { diceUI } from './DiceUI.js';
import { tokyoBoard } from './TokyoBoard.js';
import { cardStoreUI } from './CardStore.js';
import { gameLog } from './GameLog.js';
import { dialogs } from './Dialogs.js';
import { setupScreen } from './SetupScreen.js';
import { particleCanvas } from './ParticleCanvas.js';
import { audioManager } from './AudioManager.js';
import { floatingText } from './FloatingText.js';
import { gameOverScreen } from './GameOverScreen.js';
import { ambientSystem } from './AmbientSystem.js';

class Renderer {
  constructor() {
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    monsterPanel.init();
    diceUI.init();
    tokyoBoard.init();
    cardStoreUI.init();
    gameLog.init();
    dialogs.init();

    // Initialize particle canvas
    const canvas = $('#particle-canvas');
    if (canvas) particleCanvas.init(canvas);

    // Inject crown SVG into header title
    const h1 = $('.game-header h1');
    if (h1) h1.innerHTML = crownSVG(24) + ' Tokyo Rampage';

    // Init audio, floating text, game over screen, ambient system
    audioManager.init();
    floatingText.init();
    gameOverScreen.init();
    ambientSystem.start();
    this.setupMuteButton();

    // Wire particle effects to game events
    this.setupParticleEffects();

    // Wire combat animations on monster portraits
    this.setupCombatAnimations();

    // Wire help button
    this.setupHelpButton();

    // Update header info
    bus.on('turn:start', ({ player, round }) => {
      this.updateHeader(player, round);
    });

    // Show waiting indicator for remote player turns
    bus.on('net:remoteTurn', ({ player }) => {
      const phaseEl = $('#phase-info');
      if (phaseEl) phaseEl.textContent = `Waiting for ${player.name}...`;
    });
    // Only update phase indicator on actual phase changes, not every state mutation
    bus.on('state:changed', ({ prop }) => {
      if (prop === 'phase') this.updatePhaseIndicator();
    });
  }

  setupParticleEffects() {
    // Damage → explosion on target's monster-card + screen shake on big hits
    bus.on('combat:damage', ({ target, amount }) => {
      const el = this.findMonsterPanel(target);
      if (el) {
        const pos = particleCanvas.getElementCenter(el);
        particleCanvas.spawn('explosion', pos.x, pos.y);
      }
      if (amount >= 3) {
        const gameArea = document.getElementById('game-area');
        gameArea.classList.add('screen-shake');
        setTimeout(() => gameArea.classList.remove('screen-shake'), 400);
      }
    });

    // VP gained → sparkle on VP stat
    bus.on('player:vpGained', ({ player }) => {
      const panel = this.findMonsterPanel(player);
      if (panel) {
        const vpEl = panel.querySelector('.stat.vp');
        const pos = particleCanvas.getElementCenter(vpEl || panel);
        particleCanvas.spawn('sparkle', pos.x, pos.y);
      }
    });

    // Energy gained → lightning on energy stat
    bus.on('player:energyGained', ({ player }) => {
      const panel = this.findMonsterPanel(player);
      if (panel) {
        const enEl = panel.querySelector('.stat.energy');
        const pos = particleCanvas.getElementCenter(enEl || panel);
        particleCanvas.spawn('lightning', pos.x, pos.y);
      }
    });

    // Healed → hearts on monster-card
    bus.on('player:healed', ({ player }) => {
      const el = this.findMonsterPanel(player);
      if (el) {
        const pos = particleCanvas.getElementCenter(el);
        particleCanvas.spawn('hearts', pos.x, pos.y);
      }
    });

    // Eliminated → skull burst on monster-card
    bus.on('player:eliminated', ({ player }) => {
      const el = this.findMonsterPanel(player);
      if (el) {
        const pos = particleCanvas.getElementCenter(el);
        particleCanvas.spawn('skull', pos.x, pos.y);
      }
    });

    // Tokyo fire is now handled by AmbientSystem (persistent fire on occupied slots)

    // Game over → confetti x3 staggered from top center
    bus.on('game:over', () => {
      const cx = window.innerWidth / 2;
      const y = 50;
      particleCanvas.spawn('confetti', cx, y);
      setTimeout(() => particleCanvas.spawn('confetti', cx - 100, y), 300);
      setTimeout(() => particleCanvas.spawn('confetti', cx + 100, y), 600);
    });
  }

  /**
   * Find a player's monster-card panel by player index in gameState.
   * Uses cached NodeList, invalidated on game:initialized.
   */
  findMonsterPanel(player) {
    const idx = gameState.players.indexOf(player);
    if (idx < 0) return null;
    // querySelectorAll returns a live-ish snapshot; re-query when needed
    // This is still fast since it's a simple ID + class selector
    const panels = document.querySelectorAll('#players-panel .monster-card');
    return panels[idx] || null;
  }

  updateHeader(player, round) {
    const turnInfo = $('#turn-info');
    const roundInfo = $('#round-info');
    if (turnInfo) {
      turnInfo.textContent = `Turn: ${player.name}`;
      turnInfo.style.color = player.monster.color;
    }
    if (roundInfo) {
      roundInfo.textContent = `Round: ${round}`;
    }
  }

  setupMuteButton() {
    const btn = $('#btn-mute');
    if (!btn) return;

    const speakerOn = `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8.5v7a4.49 4.49 0 0 0 2.5-3.5zM14 3.23v2.06a7.007 7.007 0 0 1 0 13.42v2.06A9.013 9.013 0 0 0 14 3.23z"/></svg>`;
    const speakerOff = `<svg viewBox="0 0 24 24"><path d="M16.5 12A4.5 4.5 0 0 0 14 8.5v2.09l2.41 2.41c.06-.31.09-.63.09-1zm2.5 0a7 7 0 0 1-.57 2.8l1.53 1.53A8.93 8.93 0 0 0 21 12a9.01 9.01 0 0 0-7-8.77v2.06A7.007 7.007 0 0 1 19 12zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;

    const updateIcon = () => {
      btn.innerHTML = audioManager.muted ? speakerOff : speakerOn;
    };
    updateIcon();

    btn.addEventListener('click', () => {
      audioManager.toggleMute();
      updateIcon();
    });
  }

  setupCombatAnimations() {
    // On damage: add .hit to target's portrait
    bus.on('combat:damage', ({ target }) => {
      const panel = this.findMonsterPanel(target);
      if (!panel) return;
      const portrait = panel.querySelector('.monster-portrait');
      if (portrait) {
        portrait.classList.remove('hit');
        void portrait.offsetWidth; // force reflow for re-trigger
        portrait.classList.add('hit');
        portrait.addEventListener('animationend', () => portrait.classList.remove('hit'), { once: true });
      }
    });

    // On dice resolving: add .attacking to current player's portrait
    bus.on('dice:resolving', ({ player }) => {
      const panel = this.findMonsterPanel(player);
      if (!panel) return;
      const portrait = panel.querySelector('.monster-portrait');
      if (portrait) {
        portrait.classList.remove('attacking');
        void portrait.offsetWidth;
        portrait.classList.add('attacking');
        portrait.addEventListener('animationend', () => portrait.classList.remove('attacking'), { once: true });
      }
    });
  }

  setupHelpButton() {
    const btn = $('#btn-help');
    if (!btn) return;
    btn.addEventListener('click', () => {
      import('./TutorialOverlay.js').then(m => m.tutorialOverlay.show());
    });
  }

  updatePhaseIndicator() {
    const phaseEl = $('#phase-info');
    if (phaseEl) {
      const phaseLabels = {
        setup: 'Setup',
        startTurn: 'Start Turn',
        rolling: 'Rolling Dice',
        resolvingDice: 'Resolving...',
        enteringTokyo: 'Entering Tokyo',
        buying: 'Buy Cards',
        endTurn: 'End Turn',
        gameOver: 'Game Over',
      };
      phaseEl.textContent = phaseLabels[gameState.phase] || gameState.phase;
      phaseEl.classList.add('phase-highlight');
      setTimeout(() => phaseEl.classList.remove('phase-highlight'), 600);
    }
  }
}

export const renderer = new Renderer();
