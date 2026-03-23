import { $, createElement, clearElement } from '../utils/dom.js';
import { bus } from '../utils/eventBus.js';
import { gameState } from '../state/GameState.js';
import { toggleKeep, reroll, confirmDice } from '../engine/Dice.js';
import { game } from '../engine/Game.js';
import { PHASES, DICE_FACES } from '../data/constants.js';
import { diceFaceSVG } from './SVGAssets.js';

const FACE_DISPLAY = {
  '1': { svg: diceFaceSVG('1', 28), className: 'face-number' },
  '2': { svg: diceFaceSVG('2', 28), className: 'face-number' },
  '3': { svg: diceFaceSVG('3', 28), className: 'face-number' },
  'claw': { svg: diceFaceSVG('claw', 28), className: 'face-claw' },
  'heart': { svg: diceFaceSVG('heart', 28), className: 'face-heart' },
  'lightning': { svg: diceFaceSVG('lightning', 28), className: 'face-lightning' },
};

class DiceUI {
  constructor() {
    this.container = null;
    this.rollBtn = null;
    this.confirmBtn = null;
    this.rerollInfo = null;
    this.animating = false;
  }

  init() {
    this.container = $('#dice-container');
    this.rollBtn = $('#btn-reroll');
    this.confirmBtn = $('#btn-confirm-dice');
    this.rerollInfo = $('#reroll-info');

    this.rollBtn.addEventListener('click', () => this.onReroll());
    this.confirmBtn.addEventListener('click', () => this.onConfirm());

    bus.on('dice:rolled', () => this.renderWithAnimation());
    bus.on('dice:keepChanged', () => this.render());
  }

  render() {
    if (gameState.phase !== PHASES.ROLLING) {
      this.container.parentElement.classList.add('dice-inactive');
      return;
    }

    this.container.parentElement.classList.remove('dice-inactive');
    clearElement(this.container);

    const player = gameState.currentPlayer;
    const isHuman = !player.isAI && !player.isRemote;

    gameState.dice.forEach((face, i) => {
      const kept = gameState.keptDice[i];
      const display = FACE_DISPLAY[face];
      const die = createElement('div', {
        className: `die ${display.className} ${kept ? 'kept' : ''} ${isHuman ? 'clickable' : ''}`,
        innerHTML: display.svg,
        onClick: () => {
          if (isHuman && gameState.phase === PHASES.ROLLING && !this.animating) {
            toggleKeep(i);
          }
        }
      });
      this.container.appendChild(die);
    });

    this.rerollInfo.textContent = `${gameState.rerollsLeft} reroll${gameState.rerollsLeft !== 1 ? 's' : ''} left`;

    if (isHuman) {
      this.rollBtn.style.display = gameState.rerollsLeft > 0 ? '' : 'none';
      this.confirmBtn.style.display = '';
      this.rollBtn.disabled = this.animating;
      this.confirmBtn.disabled = this.animating;
    } else {
      this.rollBtn.style.display = 'none';
      this.confirmBtn.style.display = 'none';
    }
  }

  renderWithAnimation() {
    if (gameState.phase !== PHASES.ROLLING) {
      this.container.parentElement.classList.add('dice-inactive');
      return;
    }

    this.animating = true;
    this.container.parentElement.classList.remove('dice-inactive');
    clearElement(this.container);

    const player = gameState.currentPlayer;
    const isHuman = !player.isAI && !player.isRemote;
    const finalDice = [...gameState.dice];
    const intervals = [];
    const dieElements = [];

    gameState.dice.forEach((face, i) => {
      const kept = gameState.keptDice[i];
      const display = FACE_DISPLAY[face];
      const die = createElement('div', {
        className: `die ${display.className} ${kept ? 'kept' : ''} ${isHuman ? 'clickable' : ''}`,
        innerHTML: display.svg,
        onClick: () => {
          if (isHuman && gameState.phase === PHASES.ROLLING && !this.animating) {
            toggleKeep(i);
          }
        }
      });
      this.container.appendChild(die);
      dieElements.push(die);

      // Animate non-kept dice: cycle random faces rapidly
      if (!kept) {
        die.classList.add('rolling');
        const interval = setInterval(() => {
          const randomFace = DICE_FACES[Math.floor(Math.random() * DICE_FACES.length)];
          const randomDisplay = FACE_DISPLAY[randomFace];
          die.innerHTML = randomDisplay.svg;
          // Update face class
          die.className = `die ${randomDisplay.className} ${isHuman ? 'clickable' : ''} rolling`;
        }, 50);
        intervals.push({ interval, index: i, die });
      }
    });

    this.rerollInfo.textContent = `${gameState.rerollsLeft} reroll${gameState.rerollsLeft !== 1 ? 's' : ''} left`;

    // Disable buttons during animation
    if (isHuman) {
      this.rollBtn.style.display = gameState.rerollsLeft > 0 ? '' : 'none';
      this.confirmBtn.style.display = '';
      this.rollBtn.disabled = true;
      this.confirmBtn.disabled = true;
    } else {
      this.rollBtn.style.display = 'none';
      this.confirmBtn.style.display = 'none';
    }

    // After 400ms: stop cycling, show final face, add landed effect
    setTimeout(() => {
      for (const { interval, index, die } of intervals) {
        clearInterval(interval);
        const finalFace = finalDice[index];
        const finalDisplay = FACE_DISPLAY[finalFace];
        die.innerHTML = finalDisplay.svg;
        die.className = `die ${finalDisplay.className} ${isHuman ? 'clickable' : ''} landed`;
      }

      // After another 400ms: remove landed, re-enable controls
      setTimeout(() => {
        for (const { die } of intervals) {
          die.classList.remove('landed');
        }
        this.animating = false;
        if (isHuman) {
          this.rollBtn.disabled = false;
          this.confirmBtn.disabled = false;
        }
      }, 400);
    }, 400);
  }

  onReroll() {
    if (gameState.phase !== PHASES.ROLLING || this.animating) return;
    reroll();
  }

  onConfirm() {
    if (gameState.phase !== PHASES.ROLLING || this.animating) return;
    this.rollBtn.disabled = true;
    this.confirmBtn.disabled = true;
    confirmDice();
    game.resolveDice();
  }

  hide() {
    if (this.container) {
      this.container.parentElement.classList.add('dice-inactive');
    }
  }
}

export const diceUI = new DiceUI();
