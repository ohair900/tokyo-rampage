import { $, createElement, clearElement } from '../utils/dom.js';
import { bus } from '../utils/eventBus.js';
import { monsterSVG } from './SVGAssets.js';
import { game } from '../engine/Game.js';
import { networkAdapter } from '../net/NetworkAdapter.js';
import { rollDie } from '../utils/random.js';
import { DICE_FACES } from '../data/constants.js';
import { diceFaceSVG } from './SVGAssets.js';

const FACE_DISPLAY = {
  '1': { svg: diceFaceSVG('1', 28), className: 'face-number' },
  '2': { svg: diceFaceSVG('2', 28), className: 'face-number' },
  '3': { svg: diceFaceSVG('3', 28), className: 'face-number' },
  claw: { svg: diceFaceSVG('claw', 28), className: 'face-claw' },
  heart: { svg: diceFaceSVG('heart', 28), className: 'face-heart' },
  lightning: { svg: diceFaceSVG('lightning', 28), className: 'face-lightning' },
};

class Dialogs {
  constructor() {
    this.overlay = null;
    this.pendingTimers = [];
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
      const status = createElement('p', {
        className: 'camouflage-roll-status',
        textContent: 'Roll a die. A heart blocks the remaining damage.',
      });
      const previewDie = this.createPreviewDie('heart');
      const preview = createElement('div', { className: 'camouflage-roll-preview' }, [previewDie]);
      let rolling = false;

      body.push(status);
      body.push(preview);
      body.push(createElement('div', { className: 'dialog-actions' }, [
        createElement('button', {
          className: 'btn btn-yield',
          textContent: 'Roll Die',
          onClick: (event) => {
            if (rolling) return;
            rolling = true;
            const rollButton = event.currentTarget;
            rollButton.disabled = true;
            this.animateSingleDieRoll(previewDie, rollDie(), ({ rolledFace }) => {
              status.textContent = rolledFace === 'heart'
                ? 'Rolled a heart. Camouflage blocks the damage!'
                : `Rolled ${rolledFace}. Camouflage does not block this hit.`;
              this.finishDefense(reactionId, type, { rolledFace }, resolve);
            });
          },
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
    this.clearPendingTimers();
    this.overlay.classList.remove('visible');
    clearElement(this.overlay);
  }

  createPreviewDie(face) {
    const display = FACE_DISPLAY[face];
    return createElement('div', {
      className: `die ${display.className}`,
      innerHTML: display.svg,
    });
  }

  setPreviewDieFace(die, face, extraClass = '') {
    const display = FACE_DISPLAY[face];
    die.innerHTML = display.svg;
    die.className = `die ${display.className} ${extraClass}`.trim();
  }

  animateSingleDieRoll(die, finalFace, onComplete) {
    bus.emit('dice:singleRolled', { die: finalFace });
    die.classList.add('rolling');

    const interval = setInterval(() => {
      const randomFace = DICE_FACES[Math.floor(Math.random() * DICE_FACES.length)];
      this.setPreviewDieFace(die, randomFace, 'rolling');
    }, 50);
    this.pendingTimers.push(interval);

    const revealTimer = setTimeout(() => {
      this.clearPendingTimer(revealTimer);
      this.clearPendingTimer(interval);
      clearInterval(interval);
      this.setPreviewDieFace(die, finalFace, 'landed');

      const finishTimer = setTimeout(() => {
        this.clearPendingTimer(finishTimer);
        die.classList.remove('landed');
        onComplete({ rolledFace: finalFace });
      }, 400);
      this.pendingTimers.push(finishTimer);
    }, 400);
    this.pendingTimers.push(revealTimer);
  }

  clearPendingTimers() {
    for (const timer of this.pendingTimers) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    this.pendingTimers = [];
  }

  clearPendingTimer(timer) {
    this.pendingTimers = this.pendingTimers.filter((pending) => pending !== timer);
  }
}

export const dialogs = new Dialogs();
