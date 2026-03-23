import { bus } from '../utils/eventBus.js';
import { gameState } from '../state/GameState.js';
import { reroll, confirmDice } from '../engine/Dice.js';
import { buyCard, sweepStore } from '../engine/Cards.js';
import { game } from '../engine/Game.js';
import { createStrategy } from './strategies.js';
import { hasCard, spendEnergy } from '../state/actions.js';
import { PHASES, MAX_HP } from '../data/constants.js';
import { networkAdapter } from '../net/NetworkAdapter.js';

const AI_DELAY = 800; // ms between AI actions
const MAX_BUYS_PER_TURN = 5;

class AIController {
  constructor() {
    this.strategies = new Map(); // playerId -> strategy
    this.difficulty = 'normal';
    this.setupListeners();
  }

  setDifficulty(level) {
    this.difficulty = level || 'normal';
  }

  setupListeners() {
    bus.on('game:initialized', ({ players }) => {
      for (const p of players) {
        if (p.isAI) {
          this.strategies.set(p.id, createStrategy(this.difficulty));
        }
      }
    });

    bus.on('ai:turn', ({ player }) => {
      this.handleTurn(player);
    });

    bus.on('ai:yieldDecision', ({ player, attacker, damage, resolve }) => {
      this.handleYield(player, damage, resolve);
    });

    bus.on('ai:buy', ({ player }) => {
      this.handleBuy(player);
    });
  }

  async handleTurn(player) {
    const strategy = this.strategies.get(player.id);
    if (!strategy) return;

    // AI dice-keeping and rerolling
    await this.delay();

    // Up to 2 rerolls
    for (let roll = 0; roll < 2; roll++) {
      if (gameState.phase !== PHASES.ROLLING) return;

      const keepDecisions = strategy.keepDice(gameState.dice, player, gameState);

      // Set kept dice
      gameState.keptDice = keepDecisions;
      if (game.multiplayerAdapter) networkAdapter.sendKeepDice(keepDecisions);
      bus.emit('dice:keepChanged', { keptDice: keepDecisions });

      // Check if all kept
      const allKept = keepDecisions.every(k => k);
      if (allKept || gameState.rerollsLeft <= 0) break;

      await this.delay();
      if (game.multiplayerAdapter) networkAdapter.sendReroll();
      reroll();
    }

    await this.delay();

    // Confirm dice
    if (gameState.phase === PHASES.ROLLING) {
      if (game.multiplayerAdapter) networkAdapter.sendConfirmDice();
      confirmDice();
      game.resolveDice();
    }
  }

  handleYield(player, damage, resolve) {
    const strategy = this.strategies.get(player.id);
    const shouldYield = strategy
      ? strategy.shouldYield(player, damage, gameState)
      : player.hp <= 4;
    setTimeout(() => {
      if (game.multiplayerAdapter) networkAdapter.sendYieldDecision(shouldYield);
      resolve(shouldYield);
    }, AI_DELAY / 2);
  }

  async handleBuy(player) {
    const strategy = this.strategies.get(player.id);
    if (!strategy) {
      if (game.multiplayerAdapter) networkAdapter.sendEndBuy();
      game.endBuyPhase();
      return;
    }

    await this.delay();

    // 1. Use Rapid Healing if strategy says yes
    if (hasCard(player, 'Rapid Healing')) {
      this.tryRapidHealing(player, strategy);
    }

    // 2. Multi-card buying loop
    let buyCount = 0;
    let boughtAny = false;

    while (buyCount < MAX_BUYS_PER_TURN && gameState.cardStore.length > 0) {
      // Evaluate all store cards
      const scored = gameState.cardStore.map((card, i) => {
        const result = strategy.shouldBuyCard(card, player, gameState);
        return { card, index: i, ...result };
      });

      // Filter affordable cards above threshold, sort by score descending
      const candidates = scored
        .filter(s => s.buy && player.energy >= s.card.cost)
        .sort((a, b) => b.score - a.score);

      if (candidates.length > 0) {
        const best = candidates[0];

        // Check if sweep is better (before first buy)
        if (!boughtAny && strategy.shouldSweep(player, gameState)) {
          if (game.multiplayerAdapter) networkAdapter.sendSweepStore();
          if (sweepStore(player)) {
            await this.delay();
            continue; // Re-evaluate new store
          }
        }

        // Buy the best card
        if (game.multiplayerAdapter) networkAdapter.sendBuyCard(best.index);
        if (buyCard(player, best.index)) {
          boughtAny = true;
          buyCount++;
          await this.delay();

          // Try Rapid Healing again after buying (may have gained energy from cards)
          if (hasCard(player, 'Rapid Healing')) {
            this.tryRapidHealing(player, strategy);
          }

          continue; // Try to buy more
        }
      }

      // No affordable card worth buying — try sweep if haven't bought yet
      if (!boughtAny && strategy.shouldSweep(player, gameState)) {
        if (game.multiplayerAdapter) networkAdapter.sendSweepStore();
        if (sweepStore(player)) {
          await this.delay();
          boughtAny = true; // Count sweep as an action
          continue; // Re-evaluate new store
        }
      }

      break; // Nothing more to do
    }

    if (game.multiplayerAdapter) networkAdapter.sendEndBuy();
    game.endBuyPhase();
  }

  tryRapidHealing(player, strategy) {
    const maxHP = player.maxHP || MAX_HP;
    // Heal repeatedly while strategy says yes and we can afford it
    let heals = 0;
    while (
      heals < 5 &&
      player.hp < maxHP &&
      player.energy >= 2 &&
      strategy.shouldUseRapidHealing(player, gameState)
    ) {
      if (spendEnergy(player, 2)) {
        if (game.multiplayerAdapter) networkAdapter.sendRapidHeal();
        player.hp = Math.min(player.hp + 1, maxHP);
        bus.emit('player:healed', { player, amount: 1 });
        heals++;
      } else {
        break;
      }
    }
  }

  delay(ms = AI_DELAY) {
    return new Promise(r => setTimeout(r, ms));
  }
}

export const aiController = new AIController();
