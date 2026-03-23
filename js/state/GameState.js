import { bus } from '../utils/eventBus.js';
import { PHASES, STARTING_HP, STARTING_VP, STARTING_ENERGY } from '../data/constants.js';

function createReactiveState(initial) {
  return new Proxy(initial, {
    set(target, prop, value) {
      const old = target[prop];
      target[prop] = value;
      if (old !== value) {
        bus.emit('state:changed', { prop, value, old });
      }
      return true;
    }
  });
}

export function createPlayerState(id, name, monster, isAI = false) {
  return {
    id,
    name,
    monster,
    hp: STARTING_HP,
    vp: STARTING_VP,
    energy: STARTING_ENERGY,
    isAI,
    inTokyo: false, // 'city', 'bay', or false
    cards: [],
    alive: true,
  };
}

class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.data = createReactiveState({
      phase: PHASES.SETUP,
      players: [],
      currentPlayerIndex: 0,
      round: 1,
      dice: [],
      keptDice: [],
      rerollsLeft: 0,
      cardStore: [],
      cardDeck: [],
      winner: null,
    });
  }

  get phase() { return this.data.phase; }
  set phase(v) { this.data.phase = v; }

  get players() { return this.data.players; }
  set players(v) { this.data.players = v; }

  get currentPlayerIndex() { return this.data.currentPlayerIndex; }
  set currentPlayerIndex(v) { this.data.currentPlayerIndex = v; }

  get currentPlayer() { return this.data.players[this.data.currentPlayerIndex]; }

  get round() { return this.data.round; }
  set round(v) { this.data.round = v; }

  get dice() { return this.data.dice; }
  set dice(v) { this.data.dice = v; }

  get keptDice() { return this.data.keptDice; }
  set keptDice(v) { this.data.keptDice = v; }

  get rerollsLeft() { return this.data.rerollsLeft; }
  set rerollsLeft(v) { this.data.rerollsLeft = v; }

  get cardStore() { return this.data.cardStore; }
  set cardStore(v) { this.data.cardStore = v; }

  get cardDeck() { return this.data.cardDeck; }
  set cardDeck(v) { this.data.cardDeck = v; }

  get winner() { return this.data.winner; }
  set winner(v) { this.data.winner = v; }

  get alivePlayers() {
    return this.data.players.filter(p => p.alive);
  }

  getPlayersInTokyo() {
    return this.data.players.filter(p => p.alive && p.inTokyo);
  }

  getPlayersOutsideTokyo() {
    return this.data.players.filter(p => p.alive && !p.inTokyo);
  }
}

export const gameState = new GameState();
