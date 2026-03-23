import { hasCard } from '../state/actions.js';
import { vpProximity, hpDanger, leadingOpponent, hasDefensiveCards } from './gameAnalysis.js';
import { evaluateCard } from './cardEvaluation.js';

/**
 * Context-aware dice keeping decisions.
 * Returns boolean[] indicating which dice to keep.
 */
export function evaluateDiceKeeping(dice, player, gameState, difficulty) {
  const threshold = difficulty === 'hard' ? 0.5 : 0.6;
  const scores = dice.map((face, i) => scoreDieFace(face, i, dice, player, gameState, difficulty));
  return scores.map(s => s >= threshold);
}

function scoreDieFace(face, index, dice, player, gameState, difficulty) {
  const proximity = vpProximity(player);
  const danger = hpDanger(player);
  const posture = difficulty === 'hard' ? computePosture(player, gameState) : 0;

  switch (face) {
    case 'claw':
      return scoreClaws(player, gameState, proximity, danger, posture, difficulty);
    case 'heart':
      return scoreHearts(player, danger, posture, difficulty);
    case 'lightning':
      return scoreLightning(player, gameState, danger, posture, difficulty);
    default:
      return scoreNumber(face, dice, player, proximity, posture, difficulty);
  }
}

function scoreClaws(player, gameState, proximity, danger, posture, difficulty) {
  const opponents = gameState.players.filter(p => p.alive && p.id !== player.id);
  let score = 1.0;

  // In Tokyo: hitting all opponents is very valuable
  if (player.inTokyo) {
    score += 0.3 * opponents.length;
  }

  // Attack card bonuses
  if (hasCard(player, 'Fire Breathing')) score += 0.4;
  if (!player.inTokyo && hasCard(player, 'Burrowing')) score += 0.4;
  if (hasCard(player, 'Alpha Monster')) score += 0.5;

  // Herbivore anti-synergy: claws lose the +1 VP
  if (hasCard(player, 'Herbivore')) score -= 1.5;

  // Hard mode: VP faces better for closing out
  if (difficulty === 'hard' && proximity > 0.75) {
    score -= 0.5;
  }

  // Hard mode: posture adjustment
  if (difficulty === 'hard') {
    score += posture * 0.5;
  }

  return score;
}

function scoreHearts(player, danger, posture, difficulty) {
  // Can't heal in Tokyo
  if (player.inTokyo) return -0.5;

  // Scale with danger
  let score = danger * 2.5;

  // At full HP, hearts are worthless
  if (danger <= 0) return -0.3;

  // Regeneration makes hearts slightly less needed
  if (hasCard(player, 'Regeneration')) score -= 0.3;

  // Hard mode: posture adjustment
  if (difficulty === 'hard') {
    score -= posture * 0.3;
  }

  return score;
}

function scoreLightning(player, gameState, danger, posture, difficulty) {
  let score = 0.8;

  // Check if store has good cards
  const bestStoreScore = Math.max(
    ...gameState.cardStore.map(c => evaluateCard(c, player, gameState, difficulty)),
    0
  );
  if (bestStoreScore > 0.5 && player.energy < 5) {
    score += 0.4;
  }

  // Energy Hoarder synergy
  if (hasCard(player, 'Energy Hoarder')) {
    const toNext6 = 6 - (player.energy % 6);
    score += toNext6 <= 3 ? 0.5 : 0.3;
  }

  // Rapid Healing synergy
  if (hasCard(player, 'Rapid Healing') && danger > 0.3) {
    score += 0.4;
  }

  // Solar Powered anti-synergy when at 0 energy (will get free one)
  if (hasCard(player, 'Solar Powered') && player.energy === 0) {
    score -= 0.2;
  }

  return score;
}

function scoreNumber(face, dice, player, proximity, posture, difficulty) {
  const count = dice.filter(d => d === face).length;
  let score;

  if (count >= 3) {
    // Triple confirmed — high value
    score = 2.0 + proximity * 1.5;
  } else if (count === 2) {
    // Pair — decent triple chance
    score = 0.8 + proximity * 0.5;
    if (face === '3') score += 0.2; // Higher VP for triples of 3
  } else {
    // Single — low triple chance
    score = 0.1;
    if (hasCard(player, 'Omnivore')) score += 0.5; // Want variety for Omnivore
  }

  // Close to winning with a pair: big bonus
  if (proximity > 0.7 && count >= 2) {
    score += 1.0;
  }

  // Hard mode: Omnivore optimization — keep first of each unique face
  if (difficulty === 'hard' && hasCard(player, 'Omnivore') && count === 1 && score > 0.2) {
    const uniqueFaces = new Set(dice);
    if (uniqueFaces.size >= 4) score += 0.4; // Close to all 6 faces
  }

  return score;
}

/**
 * Compute adaptive posture for Hard mode.
 * Returns -1.0 (defensive) to +1.0 (aggressive).
 */
function computePosture(player, gameState) {
  const proximity = vpProximity(player);
  const danger = hpDanger(player);
  const opponents = gameState.players.filter(p => p.alive && p.id !== player.id);
  const leader = leadingOpponent(player, gameState);
  const defensiveCards = hasDefensiveCards(player);

  let posture = 0;

  // More aggressive when close to winning
  posture += proximity * 0.6;

  // More defensive when hurt
  posture -= danger * 0.5;

  // In Tokyo: lean aggressive (want claws to hit everyone)
  if (player.inTokyo) posture += 0.3;

  // Fewer opponents: more aggressive (less incoming damage)
  if (opponents.length <= 2) posture += 0.2;

  // Leader is close to winning: more aggressive to keep pace
  if (leader && leader.vp >= 14) posture += 0.3;

  // Defensive cards make us bolder
  posture += defensiveCards.length * 0.1;

  // Clamp to [-1, 1]
  return Math.max(-1, Math.min(1, posture));
}
