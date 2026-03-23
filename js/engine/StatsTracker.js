import { bus } from '../utils/eventBus.js';

class StatsTracker {
  constructor() {
    this.stats = new Map();
    this.unsubscribes = [];
    this.lastAttacker = new Map(); // track last attacker per player for kill attribution
  }

  init(players) {
    // Cleanup previous game listeners
    for (const unsub of this.unsubscribes) unsub();
    this.unsubscribes = [];
    this.stats.clear();
    this.lastAttacker.clear();

    for (const p of players) {
      this.stats.set(p.id, {
        playerId: p.id,
        playerName: p.name,
        monsterId: p.monster.id,
        damageDealt: 0,
        damageTaken: 0,
        kills: 0,
        vpFromDice: 0,
        vpFromTokyo: 0,
        vpFromCards: 0,
        cardsBought: 0,
        energySpent: 0,
        turnsInTokyo: 0,
        timesEnteredTokyo: 0,
        hpHealed: 0,
      });
    }

    this.unsubscribes.push(
      bus.on('combat:damage', ({ attacker, target, amount }) => {
        const aStats = this.stats.get(attacker.id);
        const tStats = this.stats.get(target.id);
        if (aStats) aStats.damageDealt += amount;
        if (tStats) tStats.damageTaken += amount;
        this.lastAttacker.set(target.id, attacker.id);
      }),

      bus.on('player:eliminated', ({ player }) => {
        const attackerId = this.lastAttacker.get(player.id);
        if (attackerId != null) {
          const aStats = this.stats.get(attackerId);
          if (aStats) aStats.kills += 1;
        }
      }),

      bus.on('scoring:diceVP', ({ player, amount }) => {
        const s = this.stats.get(player.id);
        if (s) s.vpFromDice += amount;
      }),

      bus.on('tokyo:entered', ({ player }) => {
        const s = this.stats.get(player.id);
        if (s) {
          s.vpFromTokyo += 1; // +1 VP on entry
          s.timesEnteredTokyo += 1;
        }
      }),

      bus.on('tokyo:startTurnVP', ({ player, amount }) => {
        const s = this.stats.get(player.id);
        if (s) {
          s.vpFromTokyo += amount;
          s.turnsInTokyo += 1;
        }
      }),

      bus.on('cards:bought', ({ player, card }) => {
        const s = this.stats.get(player.id);
        if (s) {
          s.cardsBought += 1;
          s.energySpent += card.cost;
        }
      }),

      bus.on('player:healed', ({ player, amount }) => {
        const s = this.stats.get(player.id);
        if (s) s.hpHealed += amount;
      })
    );
  }

  getStats(playerId) {
    return this.stats.get(playerId) || null;
  }

  getAllStats() {
    // Derive vpFromCards for each player
    const result = [];
    for (const [, s] of this.stats) {
      result.push({ ...s });
    }
    return result;
  }
}

export const statsTracker = new StatsTracker();
