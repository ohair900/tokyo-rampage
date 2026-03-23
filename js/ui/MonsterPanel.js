import { $, createElement, clearElement } from '../utils/dom.js';
import { bus } from '../utils/eventBus.js';
import { gameState } from '../state/GameState.js';
import { MAX_HP } from '../data/constants.js';
import { monsterSVG } from './SVGAssets.js';

class MonsterPanel {
  constructor() {
    this.container = null;
    this.panels = [];         // cached DOM references per player index
    this.renderQueued = false; // debounce flag
  }

  init() {
    this.container = $('#players-panel');
    this.setupListeners();
  }

  setupListeners() {
    // Full rebuild only on game init
    bus.on('game:initialized', () => this.fullRender());

    // Targeted updates for specific stats
    bus.on('combat:damage', ({ target }) => this.updatePlayer(target));
    bus.on('player:healed', ({ player }) => this.updatePlayer(player));
    bus.on('player:vpGained', ({ player }) => this.updatePlayer(player));
    bus.on('player:energyGained', ({ player }) => this.updatePlayer(player));
    bus.on('player:eliminated', ({ player }) => this.updatePlayer(player));
    bus.on('cards:bought', ({ player }) => this.updatePlayer(player));

    // Tokyo badge changes affect specific players
    bus.on('tokyo:entered', ({ player }) => this.updatePlayer(player));
    bus.on('tokyo:left', ({ player }) => this.updatePlayer(player));

    // Turn start highlights active player — update old + new
    bus.on('turn:start', () => this.updateActiveHighlight());

    // HP bar flash effects
    bus.on('combat:damage', ({ target }) => {
      requestAnimationFrame(() => this.flashHP(target, 'damage'));
    });
    bus.on('player:healed', ({ player }) => {
      requestAnimationFrame(() => this.flashHP(player, 'heal'));
    });
  }

  flashHP(player, type) {
    const panel = this.getPanel(player);
    if (!panel) return;
    const hpBar = panel.querySelector('.hp-bar-container');
    if (!hpBar) return;
    const cls = type === 'damage' ? 'hp-flash-damage' : 'hp-flash-heal';
    hpBar.classList.add(cls);
    setTimeout(() => hpBar.classList.remove(cls), 500);
  }

  getPanel(player) {
    const idx = gameState.players.indexOf(player);
    return idx >= 0 ? this.panels[idx] : null;
  }

  /** Full rebuild — only on game init */
  fullRender() {
    if (!this.container) return;
    clearElement(this.container);
    this.panels = [];

    for (const player of gameState.players) {
      const panel = this.buildCard(player);
      this.panels.push(panel);
      this.container.appendChild(panel);
    }
  }

  /** Build a single monster card DOM element */
  buildCard(player) {
    const isCurrent = gameState.currentPlayer === player;
    const panel = createElement('div', {
      className: `monster-card ${!player.alive ? 'dead' : ''} ${isCurrent ? 'active' : ''}`,
      style: { '--monster-color': player.monster.color }
    }, [
      createElement('div', { className: 'monster-header' }, [
        createElement('span', { className: 'monster-emoji', innerHTML: monsterSVG(player.monster.id, 22) }),
        createElement('span', { className: 'monster-name', textContent: player.name }),
        player.monster.ability ? createElement('span', {
          className: 'ability-tag',
          textContent: player.monster.ability.name,
          title: player.monster.ability.description
        }) : null,
        player.isAI ? createElement('span', { className: 'ai-badge', textContent: 'AI' }) : null,
        player.inTokyo ? createElement('span', {
          className: 'tokyo-badge',
          textContent: player.inTokyo === 'bay' ? 'BAY' : 'TOKYO'
        }) : null,
      ].filter(Boolean)),
      createElement('div', { className: 'monster-stats' }, [
        this.createHPBar(player),
        createElement('div', { className: 'stat-row' }, [
          createElement('span', { className: 'stat vp', textContent: `\u2b50 ${player.vp} VP` }),
          createElement('span', { className: 'stat energy', textContent: `\u26a1 ${player.energy}` }),
        ]),
      ]),
      player.cards.length > 0 ? createElement('div', { className: 'monster-cards' },
        player.cards.map(c => createElement('span', { className: 'card-pip', textContent: c.name, title: c.description }))
      ) : null,
    ].filter(Boolean));

    return panel;
  }

  /** Targeted update of a single player's card */
  updatePlayer(player) {
    const idx = gameState.players.indexOf(player);
    if (idx < 0 || !this.panels[idx]) return;

    const oldPanel = this.panels[idx];
    const newPanel = this.buildCard(player);
    this.panels[idx] = newPanel;
    oldPanel.replaceWith(newPanel);
    // Signal that DOM nodes changed so caches can invalidate
    this._dirtyFlag = true;
  }

  /** Update active/inactive highlight on all panels */
  updateActiveHighlight() {
    for (let i = 0; i < gameState.players.length; i++) {
      const panel = this.panels[i];
      if (!panel) continue;
      const player = gameState.players[i];
      const isCurrent = gameState.currentPlayer === player;
      panel.classList.toggle('active', isCurrent);
    }
  }

  createHPBar(player) {
    const maxHP = player.maxHP || MAX_HP;
    const pct = Math.max(0, (player.hp / maxHP) * 100);
    const hpColor = pct > 60 ? '#2ecc71' : pct > 30 ? '#f39c12' : '#e74c3c';
    return createElement('div', { className: 'hp-bar-container' }, [
      createElement('div', { className: 'hp-bar', style: { width: `${pct}%`, backgroundColor: hpColor } }),
      createElement('span', { className: 'hp-text', textContent: `${player.hp}/${maxHP} HP` }),
    ]);
  }
}

export const monsterPanel = new MonsterPanel();
