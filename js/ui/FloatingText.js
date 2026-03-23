import { bus } from '../utils/eventBus.js';
import { gameState } from '../state/GameState.js';

class FloatingText {
  constructor() {
    this.panelCache = null;
    this.cacheValid = false;
  }

  init() {
    // Invalidate cache on full re-render
    bus.on('game:initialized', () => { this.cacheValid = false; });

    bus.on('combat:damage', ({ target, amount }) => {
      this.spawn(target, `-${amount}`, 'floating-damage');
    });

    bus.on('player:vpGained', ({ player, amount }) => {
      this.spawn(player, `+${amount} VP`, 'floating-vp');
    });

    bus.on('player:energyGained', ({ player, amount }) => {
      this.spawn(player, `+${amount}`, 'floating-energy');
    });

    bus.on('player:healed', ({ player, amount }) => {
      this.spawn(player, `+${amount} HP`, 'floating-heal');
    });

    bus.on('ability:triggered', ({ player, ability }) => {
      this.spawn(player, ability.name, 'floating-ability');
    });
  }

  spawn(player, text, cssClass) {
    const panel = this.findPanel(player);
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = `floating-text ${cssClass}`;
    el.textContent = text;
    el.style.position = 'fixed';
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top + rect.height / 2}px`;
    document.body.appendChild(el);

    el.addEventListener('animationend', () => el.remove());
  }

  findPanel(player) {
    const idx = gameState.players.indexOf(player);
    if (idx < 0) return null;

    if (!this.cacheValid) {
      this.panelCache = document.querySelectorAll('#players-panel .monster-card');
      this.cacheValid = true;
    }

    return this.panelCache[idx] || null;
  }
}

export const floatingText = new FloatingText();
