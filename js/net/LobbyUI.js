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
    bus.on('net:playerJoined', () => {}); // lobbyUpdate handles it
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
            const result = await networkAdapter.createRoom(name);
            this.mode = 'create';
            this._renderLobby();
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
            this._renderLobby();
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

    const playerList = createElement('div', { className: 'lobby-player-list' });
    for (const p of this.players) {
      const isLocal = p.index === networkAdapter.localPlayerIndex;
      const entryChildren = [
        createElement('span', {
          className: 'lobby-player-name',
          textContent: p.name + (p.index === this.hostIndex ? ' (Host)' : '') + (p.isAI ? ' [AI]' : ''),
        }),
        createElement('span', {
          className: 'lobby-player-status',
          textContent: p.isAI ? 'AI' : (p.connected ? 'Ready' : 'Disconnected'),
        }),
      ];
      if (isHost && p.isAI) {
        entryChildren.push(createElement('button', {
          className: 'btn btn-secondary lobby-remove-ai',
          textContent: 'X',
          onClick: () => networkAdapter.sendRemoveAI(p.index),
        }));
      }
      const entry = createElement('div', {
        className: `lobby-player ${isLocal ? 'lobby-player-local' : ''} ${!p.connected && !p.isAI ? 'lobby-player-disconnected' : ''} ${p.isAI ? 'lobby-player-ai' : ''}`,
      }, entryChildren);
      playerList.appendChild(entry);
    }

    const children = [
      createElement('h1', { className: 'setup-title', textContent: 'Game Lobby' }),
      createElement('div', { className: 'lobby-room-code' }, [
        createElement('div', { className: 'setup-section-label', textContent: 'Room Code' }),
        createElement('div', { className: 'lobby-code-display', textContent: networkAdapter.roomCode }),
      ]),
      createElement('div', { className: 'lobby-share' }, [
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
      createElement('div', { className: 'setup-section-label', textContent: `Players (${this.players.length}/6)` }),
      playerList,
    ];

    if (isHost) {
      if (this.players.length < 6) {
        children.push(createElement('button', {
          className: 'btn btn-secondary lobby-btn',
          textContent: '+ Add AI Player',
          onClick: () => networkAdapter.sendAddAI(),
        }));
      }
      children.push(createElement('button', {
        className: 'btn btn-start lobby-btn',
        textContent: 'Start Game',
        ...(this.players.filter(p => p.connected || p.isAI).length < 2 ? { disabled: 'disabled' } : {}),
        onClick: () => networkAdapter.startGame(),
      }));
    } else {
      children.push(createElement('div', { className: 'lobby-status', textContent: 'Waiting for host to start...' }));
    }

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

  _showError(message) {
    const el = this.container.querySelector('.lobby-status');
    if (el) el.textContent = `Error: ${message}`;
  }
}

export const lobbyUI = new LobbyUI();
