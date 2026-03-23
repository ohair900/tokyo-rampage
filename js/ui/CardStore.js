import { $, createElement, clearElement } from '../utils/dom.js';
import { bus } from '../utils/eventBus.js';
import { gameState } from '../state/GameState.js';
import { buyCard, sweepStore } from '../engine/Cards.js';
import { game } from '../engine/Game.js';
import { PHASES, SWEEP_COST, MAX_HP } from '../data/constants.js';
import { cardFrameSVG } from './SVGAssets.js';
import { hasCard, spendEnergy } from '../state/actions.js';

class CardStoreUI {
  constructor() {
    this.container = null;
    this.purchasing = false;
  }

  init() {
    this.container = $('#card-store');
    this.setupListeners();
  }

  setupListeners() {
    bus.on('cards:storeUpdated', () => this.render());
    bus.on('phase:buying', () => this.render());
    bus.on('turn:start', () => this.render());
    bus.on('state:changed', () => this.render());
  }

  render() {
    if (!this.container) return;
    clearElement(this.container);

    const player = gameState.currentPlayer;
    const isBuying = gameState.phase === PHASES.BUYING && player && !player.isAI;

    // Card slots
    const cardsContainer = createElement('div', { className: 'card-slots' });
    for (let i = 0; i < gameState.cardStore.length; i++) {
      const card = gameState.cardStore[i];
      const canAfford = player && player.energy >= card.cost;
      const cardEl = createElement('div', {
        className: `store-card ${isBuying && canAfford ? 'buyable' : ''} ${card.type === 'keep' ? 'card-keep' : 'card-discard'}`,
      }, [
        createElement('div', { className: 'card-frame', innerHTML: cardFrameSVG() }),
        createElement('div', { className: 'card-name', textContent: card.name }),
        createElement('div', { className: 'card-cost', textContent: `\u26a1 ${card.cost}` }),
        createElement('div', { className: 'card-type', textContent: card.type }),
        createElement('div', { className: 'card-description', textContent: card.description }),
      ]);
      if (isBuying && canAfford) {
        cardEl.addEventListener('click', () => {
          if (this.purchasing) return;
          this.purchasing = true;
          cardEl.classList.add('card-exit');
          cardEl.addEventListener('animationend', () => {
            buyCard(player, i);
            this.purchasing = false;
            this.render();
          }, { once: true });
        });
      }
      cardsContainer.appendChild(cardEl);
    }
    this.container.appendChild(cardsContainer);

    // Sweep and Done buttons
    if (isBuying) {
      const actions = createElement('div', { className: 'card-actions' });
      const canSweep = player.energy >= SWEEP_COST;
      actions.appendChild(createElement('button', {
        className: `btn btn-sweep ${canSweep ? '' : 'disabled'}`,
        textContent: `Sweep (\u26a1${SWEEP_COST})`,
        onClick: () => {
          if (canSweep) {
            sweepStore(player);
            this.render();
          }
        }
      }));
      // Rapid Healing button
      const maxHP = player.maxHP || MAX_HP;
      if (hasCard(player, 'Rapid Healing') && player.hp < maxHP && player.energy >= 2) {
        actions.appendChild(createElement('button', {
          className: 'btn btn-heal',
          textContent: 'Heal 1 HP (\u26a12)',
          onClick: () => {
            if (spendEnergy(player, 2)) {
              player.hp = Math.min(player.hp + 1, maxHP);
              bus.emit('player:healed', { player, amount: 1 });
              this.render();
            }
          }
        }));
      }
      actions.appendChild(createElement('button', {
        className: 'btn btn-done',
        textContent: 'Done Buying',
        onClick: () => game.endBuyPhase()
      }));
      this.container.appendChild(actions);
    }
  }
}

export const cardStoreUI = new CardStoreUI();
