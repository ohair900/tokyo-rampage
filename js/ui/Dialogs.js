import { $, createElement, clearElement } from '../utils/dom.js';
import { bus } from '../utils/eventBus.js';
import { monsterSVG } from './SVGAssets.js';
import { game } from '../engine/Game.js';
import { networkAdapter } from '../net/NetworkAdapter.js';
import { rollDie } from '../utils/random.js';

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

    bus.on('ui:defenseReaction', (payload) => {
      this.showDefenseDialog(payload);
    });
  }

  showYieldDialog(player, attacker, damage, resolve) {
    this.overlay.classList.add('visible');
    clearElement(this.overlay);

    const dialog = createElement('div', { className: 'dialog yield-dialog' }, [
      createElement('h2', { textContent: `${player.name} — Yield Tokyo?` }),
      createElement('p', {
        textContent: `${attacker.name} dealt ${damage} damage! You have ${player.hp} HP remaining.`,
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
          },
        }),
        createElement('button', {
          className: 'btn btn-stay',
          textContent: 'Stay in Tokyo',
          onClick: () => {
            this.hide();
            if (game.multiplayerAdapter) networkAdapter.sendYieldDecision(false);
            resolve(false);
          },
        }),
      ]),
    ]);

    this.overlay.appendChild(dialog);
  }

  showDefenseDialog({ reactionId, type, player, attacker, amount, maxSpend, cost, resolve }) {
    this.overlay.classList.add('visible');
    clearElement(this.overlay);

    const titleByType = {
      wings: `${player.name} — Use Wings?`,
      energyShield: `${player.name} — Use Energy Shield?`,
      camouflage: `${player.name} — Roll Camouflage`,
    };

    const body = [
      createElement('h2', { textContent: titleByType[type] || `${player.name} — Defend?` }),
      createElement('p', { textContent: `${attacker.name} is about to deal ${amount} damage.` }),
    ];

    if (type === 'wings') {
      body.push(createElement('p', { textContent: `Spend ${cost} energy to negate the whole attack?` }));
      body.push(createElement('div', { className: 'dialog-actions' }, [
        createElement('button', {
          className: 'btn btn-yield',
          textContent: `Spend ${cost} Energy`,
          onClick: () => this.finishDefense(reactionId, type, { use: true }, resolve),
        }),
        createElement('button', {
          className: 'btn btn-stay',
          textContent: 'Take Damage',
          onClick: () => this.finishDefense(reactionId, type, { use: false }, resolve),
        }),
      ]));
    } else if (type === 'energyShield') {
      body.push(createElement('p', {
        textContent: `Choose how much energy to spend (0-${maxSpend}) to reduce this hit.`,
      }));

      const spendInput = createElement('input', {
        className: 'player-name-input',
        type: 'number',
        min: '0',
        max: String(maxSpend),
        value: String(maxSpend),
      });

      body.push(spendInput);
      body.push(createElement('div', { className: 'dialog-actions' }, [
        createElement('button', {
          className: 'btn btn-yield',
          textContent: 'Spend Energy',
          onClick: () => {
            const spend = Math.max(0, Math.min(maxSpend, parseInt(spendInput.value || '0', 10) || 0));
            this.finishDefense(reactionId, type, { spend }, resolve);
          },
        }),
        createElement('button', {
          className: 'btn btn-stay',
          textContent: 'Spend 0',
          onClick: () => this.finishDefense(reactionId, type, { spend: 0 }, resolve),
        }),
      ]));
    } else if (type === 'camouflage') {
      body.push(createElement('p', { textContent: 'Roll a die. A heart blocks the remaining damage.' }));
      body.push(createElement('div', { className: 'dialog-actions' }, [
        createElement('button', {
          className: 'btn btn-yield',
          textContent: 'Roll Die',
          onClick: () => this.finishDefense(reactionId, type, { rolledFace: rollDie() }, resolve),
        }),
      ]));
    }

    this.overlay.appendChild(createElement('div', { className: 'dialog defense-dialog' }, body));
  }

  finishDefense(reactionId, type, result, resolve) {
    this.hide();
    if (game.multiplayerAdapter) {
      networkAdapter.sendReactionResult(reactionId, type, result);
    }
    resolve(result);
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
        },
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
