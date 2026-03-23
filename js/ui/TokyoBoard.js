import { $, createElement, clearElement } from '../utils/dom.js';
import { bus } from '../utils/eventBus.js';
import { gameState } from '../state/GameState.js';
import { getTokyoCity, getTokyoBay, isBayOpen } from '../engine/Tokyo.js';
import { monsterSVG, tokyoSkylineSVG } from './SVGAssets.js';

class TokyoBoard {
  constructor() {
    this.container = null;
  }

  init() {
    this.container = $('#tokyo-board');
    this.setupListeners();
  }

  setupListeners() {
    const renderEvents = [
      'game:initialized', 'tokyo:entered', 'tokyo:left',
      'tokyo:vacated', 'player:eliminated', 'state:changed'
    ];
    for (const event of renderEvents) {
      bus.on(event, () => this.render());
    }
  }

  render() {
    if (!this.container) return;
    clearElement(this.container);

    const cityPlayer = getTokyoCity();
    const bayPlayer = getTokyoBay();
    const bayOpen = isBayOpen();

    // Skyline backdrop
    const skyline = createElement('div', { className: 'tokyo-skyline', innerHTML: tokyoSkylineSVG() });
    this.container.appendChild(skyline);

    // Tokyo City
    const citySlot = this.createSlot('Tokyo City', cityPlayer);
    this.container.appendChild(citySlot);

    // Tokyo Bay (only for 5+ players)
    const baySlot = this.createSlot('Tokyo Bay', bayPlayer, !bayOpen);
    this.container.appendChild(baySlot);
  }

  createSlot(label, occupant, hidden = false) {
    const slot = createElement('div', {
      className: `tokyo-slot ${occupant ? 'occupied' : 'empty'} ${hidden ? 'hidden-slot' : ''}`
    }, [
      createElement('div', { className: 'tokyo-label', textContent: label }),
      createElement('div', { className: 'tokyo-occupant' }, [
        occupant
          ? createElement('div', { className: 'tokyo-monster', style: { color: occupant.monster.color } }, [
              createElement('span', { className: 'tokyo-emoji', innerHTML: monsterSVG(occupant.monster.id, 48) }),
              createElement('span', { className: 'tokyo-name', textContent: occupant.name }),
            ])
          : createElement('span', { className: 'tokyo-empty-text', textContent: 'Empty' })
      ]),
    ]);
    return slot;
  }
}

export const tokyoBoard = new TokyoBoard();
