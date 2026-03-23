import { $, createElement, clearElement } from '../utils/dom.js';
import { bus } from '../utils/eventBus.js';
import { monsterSVG } from './SVGAssets.js';
import { game } from '../engine/Game.js';
import { networkAdapter } from '../net/NetworkAdapter.js';

class Dialogs {
  constructor() {
    this.overlay = null;
  }

  init() {
    this.overlay = $('#dialog-overlay');
    this.setupListeners();
  }

  setupListeners() {
    bus.on('ui:yieldPrompt', ({ player, attacker, damage, resolve }) => {
      this.showYieldDialog(player, attacker, damage, resolve);
    });
    // game:over handling moved to GameOverScreen
  }

  showYieldDialog(player, attacker, damage, resolve) {
    this.overlay.classList.add('visible');
    clearElement(this.overlay);

    const dialog = createElement('div', { className: 'dialog yield-dialog' }, [
      createElement('h2', { textContent: `${player.name} — Yield Tokyo?` }),
      createElement('p', {
        textContent: `${attacker.name} dealt ${damage} damage! You have ${player.hp} HP remaining.`
      }),
      createElement('p', { textContent: 'Do you want to leave Tokyo?' }),
      createElement('div', { className: 'dialog-actions' }, [
        createElement('button', {
          className: 'btn btn-yield',
          textContent: 'Yield Tokyo',
          onClick: () => {
            this.hide();
            if (game.multiplayerAdapter) networkAdapter.sendYieldDecision(true);
            resolve(true);
          }
        }),
        createElement('button', {
          className: 'btn btn-stay',
          textContent: 'Stay in Tokyo',
          onClick: () => {
            this.hide();
            if (game.multiplayerAdapter) networkAdapter.sendYieldDecision(false);
            resolve(false);
          }
        }),
      ]),
    ]);

    this.overlay.appendChild(dialog);
  }

  showGameOverDialog(winner) {
    this.overlay.classList.add('visible');
    clearElement(this.overlay);

    const dialog = createElement('div', { className: 'dialog gameover-dialog' }, [
      createElement('div', { className: 'winner-emoji', innerHTML: monsterSVG(winner.monster.id, 80) }),
      createElement('h2', { textContent: `${winner.name} Wins!` }),
      createElement('p', { textContent: `${winner.vp} VP | ${winner.hp} HP remaining` }),
      createElement('button', {
        className: 'btn btn-newgame',
        textContent: 'New Game',
        onClick: () => {
          this.hide();
          bus.emit('ui:newGame');
        }
      }),
    ]);

    this.overlay.appendChild(dialog);
  }

  hide() {
    this.overlay.classList.remove('visible');
    clearElement(this.overlay);
  }
}

export const dialogs = new Dialogs();
