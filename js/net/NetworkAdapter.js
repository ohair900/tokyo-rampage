import { bus } from '../utils/eventBus.js';
import { setDiceOverride, clearDiceOverride } from '../utils/random.js';

const WS_URL = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? `ws://${location.hostname}:3001`
  : 'wss://tokyo-rampage-server.onrender.com';

class NetworkAdapter {
  constructor() {
    this.ws = null;
    this.roomCode = null;
    this.playerToken = null;
    this.localPlayerIndex = null;
    this.connected = false;
    this.pendingYieldResolvers = new Map(); // playerIndex -> resolve fn
    this.serverDice = null; // current server-provided dice
    this._reconnectAttempts = 0;
    this._maxReconnectDelay = 15000;
    this._listeners = [];
  }

  // ── Connection ──

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.connected = true;
        this._reconnectAttempts = 0;
        bus.emit('net:connected');
        resolve();
      };

      this.ws.onclose = () => {
        this.connected = false;
        bus.emit('net:disconnected');
        if (this.roomCode && this.playerToken) {
          this._attemptReconnect();
        }
      };

      this.ws.onerror = () => {
        if (!this.connected) reject(new Error('Connection failed'));
      };

      this.ws.onmessage = (e) => this._onMessage(JSON.parse(e.data));
    });
  }

  _attemptReconnect() {
    const delay = Math.min(1000 * Math.pow(2, this._reconnectAttempts), this._maxReconnectDelay);
    this._reconnectAttempts++;
    bus.emit('net:reconnecting', { attempt: this._reconnectAttempts });

    setTimeout(async () => {
      try {
        await this.connect();
        this.send({ type: 'c:reconnect', roomCode: this.roomCode, playerToken: this.playerToken });
      } catch {
        this._attemptReconnect();
      }
    }, delay);
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  disconnect() {
    clearDiceOverride();
    this.roomCode = null;
    this.playerToken = null;
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  // ── Room Actions ──

  createRoom(playerName) {
    return new Promise((resolve) => {
      this._once('s:roomCreated', (msg) => {
        this.roomCode = msg.roomCode;
        this.playerToken = msg.playerToken;
        this.localPlayerIndex = msg.playerIndex;
        sessionStorage.setItem('tr-room', this.roomCode);
        sessionStorage.setItem('tr-token', this.playerToken);
        resolve(msg);
      });
      this.send({ type: 'c:create', playerName });
    });
  }

  joinRoom(roomCode, playerName) {
    return new Promise((resolve, reject) => {
      this._once('s:joined', (msg) => {
        this.roomCode = msg.roomCode;
        this.playerToken = msg.playerToken;
        this.localPlayerIndex = msg.playerIndex;
        sessionStorage.setItem('tr-room', this.roomCode);
        sessionStorage.setItem('tr-token', this.playerToken);
        resolve(msg);
      });
      this._once('s:error', (msg) => reject(new Error(msg.message)));
      this.send({ type: 'c:join', roomCode, playerName });
    });
  }

  startGame() {
    this.send({ type: 'c:start' });
  }

  updateMonster(monsterId) {
    this.send({ type: 'c:updateMonster', monsterId });
  }

  // ── Game Actions (local player sends these) ──

  sendKeepDice(keptDice) {
    this.send({ type: 'c:keepDice', keptDice });
  }

  sendReroll() {
    this.send({ type: 'c:reroll' });
  }

  sendConfirmDice() {
    this.send({ type: 'c:confirmDice' });
  }

  sendYieldDecision(yielded) {
    this.send({ type: 'c:yieldDecision', yielded });
  }

  sendBuyCard(cardIndex) {
    this.send({ type: 'c:buyCard', cardIndex });
  }

  sendSweepStore() {
    this.send({ type: 'c:sweepStore' });
  }

  sendRapidHeal() {
    this.send({ type: 'c:rapidHeal' });
  }

  sendEndBuy() {
    this.send({ type: 'c:endBuy' });
  }

  sendAddAI(name) {
    this.send({ type: 'c:addAI', name });
  }

  sendRemoveAI(playerIndex) {
    this.send({ type: 'c:removeAI', playerIndex });
  }

  sendGameOver(winnerIndex) {
    this.send({ type: 'c:gameOver', winnerIndex });
  }

  // ── Helpers ──

  isLocalPlayer(player) {
    return player && player.playerIndex === this.localPlayerIndex;
  }

  isLocalPlayerTurn(gameState) {
    return gameState.currentPlayerIndex === this.localPlayerIndex;
  }

  // Set up dice override for multiplayer
  enableDiceOverride() {
    setDiceOverride(() => {
      // Return whatever dice the server last sent us
      return this.serverDice || [];
    });
  }

  // ── Yield Promise ──

  createYieldPromise(playerIndex) {
    return new Promise((resolve) => {
      this.pendingYieldResolvers.set(playerIndex, resolve);
    });
  }

  // ── Message Handling ──

  _once(type, handler) {
    const wrapped = (msg) => {
      if (msg._type === type) {
        handler(msg);
        this._listeners = this._listeners.filter(l => l !== wrapped);
      }
    };
    this._listeners.push(wrapped);
  }

  _onMessage(msg) {
    // Store type for _once matching
    msg._type = msg.type;

    // Fire _once listeners
    for (const listener of [...this._listeners]) {
      listener(msg);
    }

    // Route to bus events
    switch (msg.type) {
      case 's:lobbyUpdate':
        bus.emit('net:lobbyUpdate', msg);
        break;

      case 's:playerJoined':
        bus.emit('net:playerJoined', msg);
        break;

      case 's:playerDisconnected':
        bus.emit('net:playerDisconnected', msg);
        break;

      case 's:playerReconnected':
        bus.emit('net:playerReconnected', msg);
        break;

      case 's:gameStart':
        this.enableDiceOverride();
        this.serverDice = msg.initialDice;
        bus.emit('net:gameStart', msg);
        break;

      case 's:diceRolled':
        this.serverDice = msg.dice;
        bus.emit('net:diceRolled', msg);
        break;

      case 's:keepChanged':
        bus.emit('net:keepChanged', msg);
        break;

      case 's:diceConfirmed':
        bus.emit('net:diceConfirmed', msg);
        break;

      case 's:yieldPrompt':
        if (msg.playerIndex === this.localPlayerIndex) {
          // This is our yield prompt — show local UI
          bus.emit('net:localYieldPrompt', msg);
        } else {
          bus.emit('net:remoteYieldPrompt', msg);
        }
        break;

      case 's:yieldResult':
        // Resolve any pending yield promise
        const resolver = this.pendingYieldResolvers.get(msg.playerIndex);
        if (resolver) {
          resolver(msg.yielded);
          this.pendingYieldResolvers.delete(msg.playerIndex);
        }
        bus.emit('net:yieldResult', msg);
        break;

      case 's:cardBought':
        bus.emit('net:cardBought', msg);
        break;

      case 's:storeSweep':
        bus.emit('net:storeSweep', msg);
        break;

      case 's:rapidHeal':
        bus.emit('net:rapidHeal', msg);
        break;

      case 's:buyPhaseEnd':
        bus.emit('net:buyPhaseEnd', msg);
        break;

      case 's:turnAdvance':
        this.serverDice = msg.initialDice;
        bus.emit('net:turnAdvance', msg);
        break;

      case 's:gameOver':
        bus.emit('net:gameOver', msg);
        break;

      case 's:sync':
        bus.emit('net:sync', msg);
        break;

      case 's:reconnected':
        bus.emit('net:reconnected', msg);
        break;

      case 's:roomClosed':
        bus.emit('net:roomClosed', msg);
        break;

      case 's:error':
        bus.emit('net:error', msg);
        break;
    }
  }
}

export const networkAdapter = new NetworkAdapter();
