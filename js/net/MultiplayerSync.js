/**
 * MultiplayerSync — Wires the NetworkAdapter to the game engine.
 *
 * For the LOCAL player's turn: intercepts UI actions (dice, buy, yield)
 * and sends them to the server before applying locally.
 *
 * For REMOTE player turns: listens for server broadcasts and applies
 * them to local game state so the UI updates reactively.
 */

import { bus } from '../utils/eventBus.js';
import { gameState } from '../state/GameState.js';
import { game } from '../engine/Game.js';
import { toggleKeep, reroll, confirmDice } from '../engine/Dice.js';
import { buyCard, sweepStore } from '../engine/Cards.js';
import { healPlayer, spendEnergy } from '../state/actions.js';
import { MAX_HP } from '../data/constants.js';
import { networkAdapter } from './NetworkAdapter.js';

class MultiplayerSync {
  constructor() {
    this.active = false;
    this._localEndedTurn = false;
  }

  /**
   * Call once when a multiplayer game starts.
   * Hooks into both the local event bus and network adapter events.
   */
  enable() {
    if (this.active) return;
    this.active = true;
    this._localEndedTurn = false;
    this._setupLocalInterceptors();
    this._setupRemoteHandlers();
  }

  disable() {
    this.active = false;
    this._localEndedTurn = false;
    // Note: bus listeners persist but check this.active
  }

  // ── Local player action interceptors ──
  // These wrap the existing UI actions so they go through the server.

  _setupLocalInterceptors() {
    // Intercept dice keep changes for local player
    bus.on('dice:keepChanged', ({ keptDice }) => {
      if (!this.active) return;
      if (this._isLocalTurn()) {
        networkAdapter.sendKeepDice(keptDice);
      }
    });

    // Intercept reroll for local player
    bus.on('dice:rolled', () => {
      if (!this.active) return;
      // The dice:rolled event fires after reroll() is called locally.
      // In multiplayer, the local reroll uses server dice (via override),
      // so we just need to tell the server we rerolled.
    });

    // Intercept dice confirm for local player
    bus.on('dice:confirmed', () => {
      if (!this.active) return;
      if (this._isLocalTurn()) {
        networkAdapter.sendConfirmDice();
      }
    });

    // Intercept card purchases for local player
    bus.on('cards:bought', ({ player }) => {
      if (!this.active) return;
      // Already handled by the buy button click
    });

    // Track when a locally-controlled player (human or host's AI) ends their turn
    bus.on('turn:end', () => {
      if (!this.active) return;
      const player = gameState.currentPlayer;
      if (this._isLocalTurn() || (player && player.isAI)) {
        this._localEndedTurn = true;
      }
    });

    // Intercept game over
    bus.on('game:over', ({ winner }) => {
      if (!this.active) return;
      const winnerIdx = gameState.players.indexOf(winner);
      networkAdapter.sendGameOver(winnerIdx);
    });
  }

  // ── Remote action handlers ──
  // These receive server broadcasts and apply them to local state.

  _setupRemoteHandlers() {
    // Remote player rolled dice (initial roll at turn start)
    // For remote turns, the server sends dice via s:diceRolled
    // and the game engine already set them via the dice override in startRolling()

    // Remote player changed keeps
    bus.on('net:keepChanged', ({ playerIndex, keptDice }) => {
      if (!this.active) return;
      if (playerIndex === networkAdapter.localPlayerIndex) return; // ignore our own echo
      gameState.keptDice = keptDice;
      bus.emit('dice:keepChanged', { keptDice });
    });

    // Remote player rerolled — server sends new dice
    bus.on('net:diceRolled', ({ dice, rerollIndex, playerIndex }) => {
      if (!this.active) return;
      if (playerIndex === networkAdapter.localPlayerIndex) return; // our rerolls already applied locally
      // Apply the server dice to local state
      const newDice = [...gameState.dice];
      const kept = gameState.keptDice;
      for (let i = 0; i < dice.length && i < newDice.length; i++) {
        if (!kept[i]) {
          newDice[i] = dice[i];
        }
      }
      gameState.dice = newDice;
      gameState.rerollsLeft = Math.max(0, gameState.rerollsLeft - 1);
      bus.emit('dice:rolled', { dice: gameState.dice, rerollsLeft: gameState.rerollsLeft });
    });

    // Remote player confirmed dice
    bus.on('net:diceConfirmed', ({ playerIndex }) => {
      if (!this.active) return;
      if (playerIndex === networkAdapter.localPlayerIndex) return;
      confirmDice();
      game.resolveDice();
    });

    // Yield prompt for remote player — server asks them, we wait
    bus.on('net:yieldPrompt', ({ player, attacker, damage, resolve }) => {
      // This fires from Combat.js for isRemote players
      // We need to wait for the server to send back the result
      const yieldPromise = networkAdapter.createYieldPromise(player.playerIndex);
      yieldPromise.then((yielded) => resolve(yielded));
    });

    // Remote player bought a card
    bus.on('net:cardBought', ({ playerIndex, cardIndex }) => {
      if (!this.active) return;
      if (playerIndex === networkAdapter.localPlayerIndex) return;
      const player = gameState.players[playerIndex];
      if (player) {
        buyCard(player, cardIndex);
      }
    });

    // Remote player swept the store
    bus.on('net:storeSweep', ({ playerIndex }) => {
      if (!this.active) return;
      if (playerIndex === networkAdapter.localPlayerIndex) return;
      const player = gameState.players[playerIndex];
      if (player) {
        sweepStore(player);
      }
    });

    // Remote player used rapid healing
    bus.on('net:rapidHeal', ({ playerIndex }) => {
      if (!this.active) return;
      if (playerIndex === networkAdapter.localPlayerIndex) return;
      const player = gameState.players[playerIndex];
      if (player && spendEnergy(player, 2)) {
        player.hp = Math.min(player.hp + 1, player.maxHP || MAX_HP);
        bus.emit('player:healed', { player, amount: 1 });
      }
    });

    // Turn advance from server — move to next player
    bus.on('net:turnAdvance', ({ nextPlayerIndex, round, initialDice }) => {
      if (!this.active) return;
      networkAdapter.serverDice = initialDice;

      if (this._localEndedTurn) {
        // We initiated this turn end, already advanced locally
        this._localEndedTurn = false;
      } else {
        // Remote player ended their turn, advance the game
        game.endBuyPhase();
      }
    });
  }

  _isLocalTurn() {
    return gameState.currentPlayerIndex === networkAdapter.localPlayerIndex;
  }
}

export const multiplayerSync = new MultiplayerSync();
