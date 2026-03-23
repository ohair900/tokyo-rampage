import { evaluateDiceKeeping } from './diceStrategy.js';
import { evaluateCard } from './cardEvaluation.js';
import { vpProximity, vpToWin, hpDanger, survivalTurns, hasDefensiveCards, leadingOpponent } from './gameAnalysis.js';

// --- Easy: Original strategies (unchanged) ---

const easyStrategies = {
  aggressive: {
    name: 'Aggressive',
    keepDice(dice, player, gameState) {
      return dice.map((face) => {
        if (face === 'claw') return true;
        if (face === 'lightning') return true;
        if (face === 'heart' && player.hp <= 4 && !player.inTokyo) return true;
        return false;
      });
    },
    shouldYield(player, damage) {
      return player.hp <= 3;
    },
    shouldBuyCard(card, player) {
      return { buy: player.energy >= card.cost, score: player.energy >= card.cost ? 0.5 : 0 };
    },
    shouldSweep() { return false; },
    shouldUseRapidHealing() { return false; },
  },

  defensive: {
    name: 'Defensive',
    keepDice(dice, player, gameState) {
      return dice.map((face) => {
        if (face === 'heart' && !player.inTokyo) return true;
        if (face === 'lightning') return true;
        if (face === 'claw') return player.inTokyo;
        const count = dice.filter(d => d === face).length;
        if (['1', '2', '3'].includes(face) && count >= 2) return true;
        return false;
      });
    },
    shouldYield(player, damage) {
      return player.hp <= 6;
    },
    shouldBuyCard(card, player) {
      const buy = player.energy >= card.cost && player.energy >= 3;
      return { buy, score: buy ? 0.5 : 0 };
    },
    shouldSweep() { return false; },
    shouldUseRapidHealing() { return false; },
  },

  balanced: {
    name: 'Balanced',
    keepDice(dice, player, gameState) {
      return dice.map((face) => {
        if (face === 'claw') return true;
        if (face === 'heart' && player.hp <= 6 && !player.inTokyo) return true;
        if (face === 'lightning') return true;
        const count = dice.filter(d => d === face).length;
        if (['1', '2', '3'].includes(face) && count >= 2) return true;
        return false;
      });
    },
    shouldYield(player, damage) {
      return player.hp <= 4;
    },
    shouldBuyCard(card, player) {
      return { buy: player.energy >= card.cost, score: player.energy >= card.cost ? 0.5 : 0 };
    },
    shouldSweep() { return false; },
    shouldUseRapidHealing() { return false; },
  }
};

function getRandomEasyStrategy() {
  const keys = Object.keys(easyStrategies);
  return easyStrategies[keys[Math.floor(Math.random() * keys.length)]];
}

// --- Normal Strategy ---

class NormalStrategy {
  constructor() {
    this.name = 'Normal';
  }

  keepDice(dice, player, gameState) {
    return evaluateDiceKeeping(dice, player, gameState, 'normal');
  }

  shouldYield(player, damage, gameState) {
    // Always yield if critically low
    if (player.hp <= 3) return true;

    const survival = survivalTurns(player, gameState);
    const toWin = vpToWin(player);

    // Stay if very close to winning (Tokyo VP will help)
    if (toWin <= 4) return false;

    // Yield if survival is dangerously low
    const opponents = gameState.players.filter(p => p.alive && p.id !== player.id);
    const survivalThreshold = 2 + (opponents.length > 3 ? 0.5 : 0);
    if (survival <= survivalThreshold) return true;

    return false;
  }

  shouldBuyCard(card, player, gameState) {
    if (player.energy < card.cost) return { buy: false, score: 0 };
    const score = evaluateCard(card, player, gameState, 'normal');
    return { buy: score >= 0.35, score };
  }

  shouldSweep(player, gameState) {
    if (player.energy < 4) return false; // Need 2 for sweep + at least 2 left
    const bestScore = Math.max(
      ...gameState.cardStore.map(c => evaluateCard(c, player, gameState, 'normal')),
      0
    );
    return bestScore < 0.20;
  }

  shouldUseRapidHealing(player, gameState) {
    if (player.energy < 2) return false;
    const danger = hpDanger(player);
    if (danger < 0.5) return false;
    // Don't use if saving for a great card
    const bestScore = Math.max(
      ...gameState.cardStore.map(c => evaluateCard(c, player, gameState, 'normal')),
      0
    );
    const canBarelyAffordGood = bestScore > 0.6 && player.energy <= gameState.cardStore.find(
      c => evaluateCard(c, player, gameState, 'normal') > 0.6
    )?.cost + 2;
    if (canBarelyAffordGood) return false;
    return true;
  }
}

// --- Hard Strategy ---

class HardStrategy {
  constructor() {
    this.name = 'Hard';
  }

  keepDice(dice, player, gameState) {
    return evaluateDiceKeeping(dice, player, gameState, 'hard');
  }

  shouldYield(player, damage, gameState) {
    // Always yield if critically low
    if (player.hp <= 2) return true;

    const survival = survivalTurns(player, gameState);
    const toWin = vpToWin(player);
    const proximity = vpProximity(player);
    const defensiveCards = hasDefensiveCards(player);
    const leader = leadingOpponent(player, gameState);
    const opponents = gameState.players.filter(p => p.alive && p.id !== player.id);

    // Stay if very close to winning
    if (toWin <= 3) return false;

    // Effective survival considers defensive cards
    const effectiveSurvival = survival + defensiveCards.length * 0.5;

    // VP proximity bonus: more willing to stay when close to winning
    const survivalThreshold = 2 + (opponents.length > 3 ? 0.5 : 0) - proximity * 0.5;

    if (effectiveSurvival <= survivalThreshold) return true;

    // Opponent denial: stay if leader is close to winning and they're NOT in Tokyo
    // (blocking their entry is valuable)
    if (leader && leader.vp >= 14 && !leader.inTokyo && player.hp > 4) {
      return false;
    }

    return false;
  }

  shouldBuyCard(card, player, gameState) {
    if (player.energy < card.cost) return { buy: false, score: 0 };
    const score = evaluateCard(card, player, gameState, 'hard');
    return { buy: score >= 0.30, score };
  }

  shouldSweep(player, gameState) {
    if (player.energy < 5) return false; // Need 2 for sweep + at least 3 left for cards
    const bestScore = Math.max(
      ...gameState.cardStore.map(c => evaluateCard(c, player, gameState, 'hard')),
      0
    );
    return bestScore < 0.25;
  }

  shouldUseRapidHealing(player, gameState) {
    if (player.energy < 2) return false;
    const danger = hpDanger(player);
    const threshold = player.inTokyo ? 0.3 : 0.5;
    if (danger < threshold) return false;
    // Don't use if saving for a great card
    const bestScore = Math.max(
      ...gameState.cardStore.map(c => evaluateCard(c, player, gameState, 'hard')),
      0
    );
    const goodCard = gameState.cardStore.find(
      c => evaluateCard(c, player, gameState, 'hard') > 0.6
    );
    if (goodCard && bestScore > 0.6 && player.energy <= goodCard.cost + 2) return false;
    return true;
  }
}

// --- Factory ---

export function createStrategy(difficulty) {
  if (difficulty === 'easy') return getRandomEasyStrategy();
  if (difficulty === 'hard') return new HardStrategy();
  return new NormalStrategy();
}

// Backward compatibility
export { easyStrategies as strategies };
export function getRandomStrategy() {
  return getRandomEasyStrategy();
}
