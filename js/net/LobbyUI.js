import { $, createElement, clearElement } from '../utils/dom.js';
import { bus } from '../utils/eventBus.js';
import { networkAdapter } from './NetworkAdapter.js';
import { MONSTERS } from '../data/monsters.js';
import { monsterSVG } from '../ui/SVGAssets.js';

class LobbyUI {
  constructor() {
    this.container = null;
    this.mode = null; // 'create' or 'join'
    this.players = [];
    this.hostIndex = 0;
    this.aiDifficulty = 'normal';
  }

  init(container) {
    this.container = container;
    this._setupListeners();
  }

  _setupListeners() {
    bus.on('net:lobbyUpdate', (msg) => {
      this.players = msg.players;
      this.hostIndex = msg.hostIndex;
      this._renderLobby();
    });
    bus.on('net:playerDisconnected', (msg) => {
      bus.emit('net:lobbyMessage', { text: `Player ${msg.playerIndex} disconnected` });
    });
    bus.on('net:error', (msg) => {
      this._showError(msg.message);
    });
  }

  showCreateOrJoin(autoJoinCode = null) {
    clearElement(this.container);

    if (autoJoinCode) {
      this._showJoinForm(autoJoinCode);
      return;
    }

    const screen = createElement('div', { className: 'setup-content lobby-content' }, [
      createElement('h1', { className: 'setup-title', textContent: 'Tokyo Rampage' }),
      createElement('div', { className: 'setup-subtitle', textContent: 'Online Multiplayer' }),
      createElement('div', { className: 'lobby-choice' }, [
        createElement('button', {
          className: 'btn lobby-btn',
          textContent: 'Create Room',
          onClick: () => this._showCreateForm(),
        }),
        createElement('button', {
          className: 'btn btn-secondary lobby-btn',
          textContent: 'Join Room',
          onClick: () => this._showJoinForm(),
        }),
      ]),
      createElement('button', {
        className: 'btn btn-secondary',
        textContent: 'Back',
        onClick: () => {
          networkAdapter.disconnect();
          bus.emit('lobby:back');
        },
      }),
    ]);
    this.container.appendChild(screen);
  }

  _showCreateForm() {
    clearElement(this.container);
    const nameInput = createElement('input', {
      className: 'player-name-input lobby-input',
      type: 'text',
      value: 'Player 1',
      placeholder: 'Your name',
    });
    const statusDiv = createElement('div', { className: 'lobby-status' });

    const screen = createElement('div', { className: 'setup-content lobby-content' }, [
      createElement('h1', { className: 'setup-title', textContent: 'Create Room' }),
      createElement('div', { className: 'lobby-field' }, [
        createElement('div', { className: 'setup-section-label', textContent: 'Your Name' }),
        nameInput,
      ]),
      statusDiv,
      createElement('button', {
        className: 'btn lobby-btn',
        textContent: 'Create',
        onClick: async () => {
          const name = nameInput.value.trim();
          if (!name) return;
          statusDiv.textContent = 'Connecting to server...';
          try {
            await networkAdapter.connect();
            statusDiv.textContent = 'Creating room...';
            await networkAdapter.createRoom(name);
            this.mode = 'create';
            // _renderLobby will be called by net:lobbyUpdate
          } catch (e) {
            statusDiv.textContent = `Error: ${e.message}`;
          }
        },
      }),
      createElement('button', {
        className: 'btn btn-secondary',
        textContent: 'Back',
        onClick: () => this.showCreateOrJoin(),
      }),
    ]);
    this.container.appendChild(screen);
  }

  _showJoinForm(autoCode = null) {
    clearElement(this.container);
    const nameInput = createElement('input', {
      className: 'player-name-input lobby-input',
      type: 'text',
      value: '',
      placeholder: 'Your name',
    });
    const codeInput = createElement('input', {
      className: 'player-name-input lobby-input lobby-code-input',
      type: 'text',
      value: autoCode || '',
      placeholder: 'ABCD',
      maxLength: '4',
    });
    codeInput.style.textTransform = 'uppercase';
    codeInput.style.textAlign = 'center';
    codeInput.style.fontSize = '1.5rem';
    codeInput.style.letterSpacing = '8px';

    const statusDiv = createElement('div', { className: 'lobby-status' });

    const screen = createElement('div', { className: 'setup-content lobby-content' }, [
      createElement('h1', { className: 'setup-title', textContent: 'Join Room' }),
      createElement('div', { className: 'lobby-field' }, [
        createElement('div', { className: 'setup-section-label', textContent: 'Your Name' }),
        nameInput,
      ]),
      createElement('div', { className: 'lobby-field' }, [
        createElement('div', { className: 'setup-section-label', textContent: 'Room Code' }),
        codeInput,
      ]),
      statusDiv,
      createElement('button', {
        className: 'btn lobby-btn',
        textContent: 'Join',
        onClick: async () => {
          const name = nameInput.value.trim();
          const code = codeInput.value.trim().toUpperCase();
          if (!name || code.length !== 4) return;
          statusDiv.textContent = 'Connecting...';
          try {
            await networkAdapter.connect();
            statusDiv.textContent = 'Joining room...';
            await networkAdapter.joinRoom(code, name);
            this.mode = 'join';
            // _renderLobby will be called by net:lobbyUpdate
          } catch (e) {
            statusDiv.textContent = `Error: ${e.message}`;
          }
        },
      }),
      createElement('button', {
        className: 'btn btn-secondary',
        textContent: 'Back',
        onClick: () => this.showCreateOrJoin(),
      }),
    ]);
    this.container.appendChild(screen);
  }

  _renderLobby() {
    clearElement(this.container);
    const isHost = networkAdapter.localPlayerIndex === this.hostIndex;
    const shareUrl = `${location.origin}${location.pathname}?room=${networkAdapter.roomCode}`;
    const playerCount = this.players.length;
    const usedMonsters = this.players.filter(p => p.monsterId).map(p => p.monsterId);

    const children = [
      createElement('h1', { className: 'setup-title', textContent: 'Tokyo Rampage' }),
      // Room code + share
      createElement('div', { className: 'lobby-room-header' }, [
        createElement('div', { className: 'lobby-room-code' }, [
          createElement('span', { className: 'setup-section-label', textContent: 'Room ' }),
          createElement('span', { className: 'lobby-code-inline', textContent: networkAdapter.roomCode }),
        ]),
        createElement('button', {
          className: 'btn btn-secondary lobby-share-btn',
          textContent: 'Copy Link',
          onClick: (e) => {
            navigator.clipboard.writeText(shareUrl).then(() => {
              e.target.textContent = 'Copied!';
              setTimeout(() => { e.target.textContent = 'Copy Link'; }, 2000);
            });
          },
        }),
      ]),
    ];

    // Player count selector (host only)
    if (isHost) {
      const countSelector = createElement('div', { className: 'player-count-selector' }, [
        createElement('div', { className: 'setup-section-label', textContent: 'Players' }),
      ]);
      for (let n = 2; n <= 6; n++) {
        countSelector.appendChild(createElement('button', {
          className: `btn btn-count ${n === playerCount ? 'selected' : ''}`,
          textContent: String(n),
          onClick: () => networkAdapter.sendSetPlayerCount(n),
        }));
      }
      children.push(countSelector);
    }

    // Player list (setup-screen style)
    const list = createElement('div', { className: 'player-list' });
    for (let i = 0; i < this.players.length; i++) {
      list.appendChild(this._createPlayerRow(i, usedMonsters));
    }
    children.push(list);

    // AI Difficulty (host only, if any AI)
    if (isHost && this.players.some(p => p.isAI)) {
      children.push(this._createDifficultySelector());
    }

    // Start / waiting
    if (isHost) {
      const hasOpenSlots = this.players.some(p => p.isOpen);
      children.push(createElement('button', {
        className: 'btn btn-start lobby-btn',
        textContent: hasOpenSlots ? 'Waiting for Players...' : 'Start Game!',
        ...(hasOpenSlots || this.players.length < 2 ? { disabled: 'disabled' } : {}),
        onClick: () => networkAdapter.send({ type: 'c:start', aiDifficulty: this.aiDifficulty }),
      }));
    } else {
      children.push(createElement('div', { className: 'lobby-status', textContent: 'Waiting for host to start...' }));
    }

    // Leave
    children.push(createElement('button', {
      className: 'btn btn-secondary',
      textContent: 'Leave',
      onClick: () => {
        networkAdapter.disconnect();
        bus.emit('lobby:back');
      },
    }));

    const screen = createElement('div', { className: 'setup-content lobby-content' }, children);
    this.container.appendChild(screen);
  }

  _createPlayerRow(index, usedMonsters) {
    const p = this.players[index];
    const isHost = networkAdapter.localPlayerIndex === this.hostIndex;
    const isLocal = p.index === networkAdapter.localPlayerIndex;
    const isOpen = p.isOpen;
    const monster = p.monsterId ? MONSTERS.find(m => m.id === p.monsterId) : null;

    // Can this user edit this row?
    const canEditName = isLocal || (isHost && p.isAI);
    const canEditMonster = isLocal || (isHost && p.isAI);
    const canToggleAI = isHost && !isLocal;

    // Monster preview
    const previewChildren = [];
    if (monster) {
      previewChildren.push(
        createElement('span', { className: 'player-preview-svg', innerHTML: monsterSVG(monster.id, 44) }),
        createElement('span', { className: 'player-preview-name', textContent: monster.name, style: { color: monster.color } }),
      );
      if (monster.ability) {
        previewChildren.push(createElement('span', { className: 'player-preview-ability', textContent: monster.ability.name }));
      }
    } else {
      previewChildren.push(
        createElement('span', { className: 'player-preview-svg lobby-preview-empty', textContent: '?' }),
        createElement('span', { className: 'player-preview-name', textContent: 'Pick' }),
      );
    }
    const preview = createElement('div', { className: 'player-monster-preview' }, previewChildren);

    // Name input
    let nameEl;
    if (isOpen) {
      nameEl = createElement('div', { className: 'player-name-input lobby-open-slot', textContent: 'Waiting for player...' });
    } else if (canEditName) {
      nameEl = createElement('input', {
        className: 'player-name-input',
        type: 'text',
        value: p.name,
        onInput: (e) => {
          if (isLocal) {
            networkAdapter.sendUpdateName(e.target.value);
          } else if (isHost && p.isAI) {
            networkAdapter.sendSetSlotName(p.index, e.target.value);
          }
        }
      });
    } else {
      nameEl = createElement('div', {
        className: 'player-name-input lobby-readonly-name',
        textContent: p.name + (p.index === this.hostIndex ? ' (Host)' : ''),
      });
    }

    // Monster picker (compact grid)
    const pickerGrid = createElement('div', { className: 'monster-picker-grid' });
    if (canEditMonster && !isOpen) {
      const otherMonsters = usedMonsters.filter(m => m !== p.monsterId);
      for (const m of MONSTERS) {
        const isSelected = p.monsterId === m.id;
        const isUsed = otherMonsters.includes(m.id);
        const tile = createElement('div', {
          className: `monster-picker-tile ${isSelected ? 'selected' : ''} ${isUsed ? 'disabled' : ''}`,
          style: isSelected ? { '--tile-color': m.color } : {},
          title: m.name,
          onClick: () => {
            if (isUsed) return;
            if (isLocal) {
              networkAdapter.updateMonster(m.id);
            } else if (isHost && p.isAI) {
              networkAdapter.sendSetSlotMonster(p.index, m.id);
            }
          }
        }, [createElement('span', { innerHTML: monsterSVG(m.id, 28) })]);
        pickerGrid.appendChild(tile);
      }
    }

    // AI/Human toggle (host only, not own slot)
    let toggleEl = null;
    if (canToggleAI) {
      if (p.connected && !p.isAI) {
        // Connected human player — show status, can't toggle
        toggleEl = createElement('span', { className: 'lobby-player-status-badge', textContent: 'Online' });
      } else {
        toggleEl = createElement('button', {
          className: `btn btn-toggle-ai ${p.isAI ? 'is-ai' : 'is-human'}`,
          textContent: p.isAI ? 'AI' : 'Human',
          onClick: () => {
            networkAdapter.sendSetSlotType(p.index, p.isAI ? 'human' : 'ai');
          }
        });
      }
    } else if (isLocal) {
      toggleEl = createElement('span', { className: 'lobby-player-status-badge lobby-you-badge', textContent: 'You' });
    }

    const rowChildren = [preview, nameEl, pickerGrid];
    if (toggleEl) rowChildren.push(toggleEl);

    return createElement('div', {
      className: `player-setup-row ${isLocal ? 'lobby-row-local' : ''} ${isOpen ? 'lobby-row-open' : ''}`,
    }, rowChildren);
  }

  _createDifficultySelector() {
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
          this._renderLobby();
        }
      }, [
        createElement('span', { className: 'difficulty-label', textContent: label }),
        createElement('span', { className: 'difficulty-desc', textContent: descriptions[level] }),
      ]));
    }
    return selector;
  }

  _showError(message) {
    const el = this.container.querySelector('.lobby-status');
    if (el) el.textContent = `Error: ${message}`;
  }
}

export const lobbyUI = new LobbyUI();
