import { $, createElement } from '../utils/dom.js';
import { bus } from '../utils/eventBus.js';

const MAX_LOG_ENTRIES = 100;
const MAX_VISIBLE = 20;

class GameLog {
  constructor() {
    this.entries = [];
    this.container = null;
  }

  init() {
    this.container = $('#game-log-entries');
    this.setupListeners();
  }

  setupListeners() {
    bus.on('turn:start', ({ player, round }) => {
      this.addEntry(`--- Round ${round}: ${player.name}'s turn ---`, 'turn');
    });

    bus.on('dice:rolled', ({ dice, rerollsLeft }) => {
      const faces = dice.map(d => this.faceIcon(d)).join(' ');
      this.addEntry(`Rolled: ${faces} (${rerollsLeft} rerolls left)`, 'dice');
    });

    bus.on('scoring:diceVP', ({ player, amount }) => {
      this.addEntry(`${player.name} scored ${amount} VP from dice!`, 'vp');
    });

    bus.on('player:energyGained', ({ player, amount }) => {
      this.addEntry(`${player.name} gained ${amount} energy`, 'energy');
    });

    bus.on('combat:damage', ({ attacker, target, amount }) => {
      this.addEntry(`${attacker.name} dealt ${amount} damage to ${target.name}`, 'damage');
    });

    bus.on('player:healed', ({ player, amount }) => {
      this.addEntry(`${player.name} healed ${amount} HP`, 'heal');
    });

    bus.on('tokyo:entered', ({ player, slot }) => {
      this.addEntry(`${player.name} entered Tokyo ${slot === 'bay' ? 'Bay' : 'City'}! (+1 VP)`, 'tokyo');
    });

    bus.on('tokyo:left', ({ player }) => {
      this.addEntry(`${player.name} left Tokyo`, 'tokyo');
    });

    bus.on('tokyo:startTurnVP', ({ player }) => {
      this.addEntry(`${player.name} gains +2 VP for starting turn in Tokyo`, 'vp');
    });

    bus.on('player:eliminated', ({ player }) => {
      this.addEntry(`${player.name} has been eliminated!`, 'eliminated');
    });

    bus.on('cards:bought', ({ player, card }) => {
      this.addEntry(`${player.name} bought ${card.name} for ${card.cost} energy`, 'card');
    });

    bus.on('cards:swept', ({ player }) => {
      this.addEntry(`${player.name} swept the card store`, 'card');
    });

    bus.on('game:over', ({ winner }) => {
      this.addEntry(`${winner.name} wins the game!`, 'win');
    });

    bus.on('ability:triggered', ({ player, ability, detail }) => {
      this.addEntry(`${player.name}'s ${ability.name}: ${detail}`, 'ability');
    });
  }

  faceIcon(face) {
    const icons = { '1': '1\u20e3', '2': '2\u20e3', '3': '3\u20e3', claw: '\ud83d\udc3e', heart: '\u2764\ufe0f', lightning: '\u26a1' };
    return icons[face] || face;
  }

  addEntry(text, type = '') {
    this.entries.push({ text, type, time: Date.now() });
    if (this.entries.length > MAX_LOG_ENTRIES) {
      this.entries.shift();
    }

    if (!this.container) return;

    // Prepend new entry (most recent first)
    const el = createElement('div', {
      className: `log-entry log-${type}`,
      textContent: text
    });
    this.container.insertBefore(el, this.container.firstChild);

    // Trim excess visible entries from DOM
    while (this.container.children.length > MAX_VISIBLE) {
      this.container.removeChild(this.container.lastChild);
    }

    this.container.scrollTop = 0;
  }

  clear() {
    this.entries = [];
    if (this.container) {
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }
    }
  }
}

export const gameLog = new GameLog();
