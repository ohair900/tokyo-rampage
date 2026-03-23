import { $, $$, createElement, clearElement } from '../utils/dom.js';
import { bus } from '../utils/eventBus.js';
import { MONSTERS } from '../data/monsters.js';
import { monsterSVG } from './SVGAssets.js';
import { tutorialOverlay } from './TutorialOverlay.js';

class SetupScreen {
  constructor() {
    this.container = null;
    this.playerCount = 2;
    this.playerConfigs = [];
    this.aiDifficulty = 'normal';
    this.gameMode = 'single';
    this.seriesLength = 3;
  }

  init() {
    this.container = $('#setup-screen');
    this.initConfigs();
    this.render();
  }

  initConfigs() {
    this.playerConfigs = [];
    const shuffled = [...MONSTERS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 6; i++) {
      this.playerConfigs.push({
        name: `Player ${i + 1}`,
        monster: shuffled[i],
        isAI: i >= 1, // First player human, rest AI by default
      });
    }
  }

  render() {
    if (!this.container) return;
    clearElement(this.container);

    const children = [
      createElement('h1', { className: 'setup-title', textContent: 'Tokyo Rampage' }),
      createElement('div', { className: 'setup-subtitle', textContent: 'Choose your monsters and prepare for battle!' }),
      this.createPlayerCountSelector(),
      this.createDifficultySelector(),
      this.createGameModeSelector(),
    ];

    if (this.gameMode === 'tournament') {
      children.push(this.createSeriesSelector());
    }

    children.push(
      this.createPlayerList(),
      createElement('button', {
        className: 'btn btn-secondary btn-how-to-play',
        textContent: 'How to Play',
        onClick: () => tutorialOverlay.show()
      }),
      createElement('button', {
        className: 'btn btn-start',
        textContent: this.gameMode === 'tournament' ? 'Start Tournament!' : 'Start Game!',
        onClick: () => this.startGame()
      }),
    );

    const screen = createElement('div', { className: 'setup-content' }, children);
    this.container.appendChild(screen);
  }

  createPlayerCountSelector() {
    const selector = createElement('div', { className: 'player-count-selector' }, [
      createElement('div', { className: 'setup-section-label', textContent: 'Players' }),
    ]);

    for (let n = 2; n <= 6; n++) {
      selector.appendChild(createElement('button', {
        className: `btn btn-count ${n === this.playerCount ? 'selected' : ''}`,
        textContent: String(n),
        onClick: () => {
          this.playerCount = n;
          this.render();
        }
      }));
    }
    return selector;
  }

  createDifficultySelector() {
    const descriptions = {
      easy: 'Relaxed play, forgiving AI',
      normal: 'Balanced challenge',
      hard: 'Ruthless strategy',
    };

    const selector = createElement('div', { className: 'difficulty-selector' }, [
      createElement('div', { className: 'setup-section-label', textContent: 'AI Difficulty' }),
    ]);

    for (const level of ['easy', 'normal', 'hard']) {
      const label = level.charAt(0).toUpperCase() + level.slice(1);
      selector.appendChild(createElement('button', {
        className: `btn-difficulty ${level === this.aiDifficulty ? 'selected' : ''}`,
        onClick: () => {
          this.aiDifficulty = level;
          this.render();
        }
      }, [
        createElement('span', { className: 'difficulty-label', textContent: label }),
        createElement('span', { className: 'difficulty-desc', textContent: descriptions[level] }),
      ]));
    }
    return selector;
  }

  createGameModeSelector() {
    const selector = createElement('div', { className: 'gamemode-selector' }, [
      createElement('div', { className: 'setup-section-label', textContent: 'Game Mode' }),
    ]);

    for (const mode of ['single', 'tournament']) {
      selector.appendChild(createElement('button', {
        className: `btn btn-count ${mode === this.gameMode ? 'selected' : ''}`,
        textContent: mode === 'single' ? 'Single Game' : 'Tournament',
        onClick: () => {
          this.gameMode = mode;
          this.render();
        }
      }));
    }
    return selector;
  }

  createSeriesSelector() {
    const selector = createElement('div', { className: 'series-selector' }, [
      createElement('div', { className: 'setup-section-label', textContent: 'Best of' }),
    ]);

    for (const n of [3, 5, 7]) {
      selector.appendChild(createElement('button', {
        className: `btn btn-count ${n === this.seriesLength ? 'selected' : ''}`,
        textContent: String(n),
        onClick: () => {
          this.seriesLength = n;
          this.render();
        }
      }));
    }
    return selector;
  }

  createPlayerList() {
    const list = createElement('div', { className: 'player-list' });

    for (let i = 0; i < this.playerCount; i++) {
      const config = this.playerConfigs[i];
      const usedMonsters = this.playerConfigs
        .slice(0, this.playerCount)
        .filter((_, idx) => idx !== i)
        .map(c => c.monster.id);

      const rowChildren = [
        // Monster portrait preview
        createElement('div', { className: 'player-monster-preview' }, [
          createElement('span', { className: 'player-preview-svg', innerHTML: monsterSVG(config.monster.id, 56) }),
          createElement('span', {
            className: 'player-preview-name',
            textContent: config.monster.name,
            style: { color: config.monster.color }
          }),
        ]),
        // Name input
        createElement('input', {
          className: 'player-name-input',
          type: 'text',
          value: config.name,
          onInput: (e) => { config.name = e.target.value; }
        }),
        // Monster picker grid
        this.createMonsterPicker(i, config, usedMonsters),
        // AI toggle
        createElement('button', {
          className: `btn btn-toggle-ai ${config.isAI ? 'is-ai' : 'is-human'}`,
          textContent: config.isAI ? 'AI' : 'Human',
          onClick: () => {
            config.isAI = !config.isAI;
            this.render();
          }
        }),
      ];

      // Ability info inside the row
      if (config.monster.ability) {
        rowChildren.push(createElement('div', { className: 'ability-info' }, [
          createElement('strong', { textContent: `${config.monster.ability.name}: ` }),
          document.createTextNode(config.monster.ability.description),
        ]));
      }

      const row = createElement('div', { className: 'player-setup-row' }, rowChildren);
      list.appendChild(row);
    }
    return list;
  }

  createMonsterPicker(playerIndex, config, usedMonsters) {
    const grid = createElement('div', { className: 'monster-picker-grid' });

    for (const monster of MONSTERS) {
      const isSelected = config.monster.id === monster.id;
      const isUsed = usedMonsters.includes(monster.id);

      let tileClass = 'monster-picker-tile';
      if (isSelected) tileClass += ' selected';
      if (isUsed) tileClass += ' disabled';

      const tile = createElement('div', {
        className: tileClass,
        style: isSelected ? { '--tile-color': monster.color } : {},
        title: monster.name,
        onClick: () => {
          if (isUsed) return;
          config.monster = monster;
          this.render();
        }
      }, [
        createElement('span', { innerHTML: monsterSVG(monster.id, 36) }),
      ]);

      grid.appendChild(tile);
    }
    return grid;
  }

  startGame() {
    const configs = this.playerConfigs.slice(0, this.playerCount);
    // Validate unique monsters
    const ids = new Set(configs.map(c => c.monster.id));
    if (ids.size !== configs.length) {
      alert('Each player must choose a different monster!');
      return;
    }
    // Validate names
    for (const c of configs) {
      if (!c.name.trim()) {
        alert('All players must have a name!');
        return;
      }
    }

    // Crossfade transition
    this.container.classList.add('fade-out');
    setTimeout(() => {
      this.container.classList.add('hidden');
      this.container.classList.remove('fade-out');
      bus.emit('setup:complete', {
        configs,
        aiDifficulty: this.aiDifficulty,
        gameMode: this.gameMode,
        seriesLength: this.seriesLength
      });
    }, 400);
  }

  show() {
    this.container.classList.remove('hidden');
    this.container.classList.remove('fade-out');
    this.initConfigs();
    this.render();
  }
}

export const setupScreen = new SetupScreen();
