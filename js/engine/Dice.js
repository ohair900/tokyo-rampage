import { NUM_DICE, MAX_REROLLS } from '../data/constants.js';
import { rollDice } from '../utils/random.js';
import { bus } from '../utils/eventBus.js';
import { gameState } from '../state/GameState.js';
import { hasCard } from '../state/actions.js';

export function startRolling() {
  const player = gameState.currentPlayer;
  const numDice = NUM_DICE + (hasCard(player, 'Extra Head') ? 1 : 0);
  const maxRerolls = MAX_REROLLS + (hasCard(player, 'Giant Brain') ? 1 : 0);

  gameState.dice = rollDice(numDice);
  gameState.keptDice = new Array(numDice).fill(false);
  gameState.rerollsLeft = maxRerolls;
  bus.emit('dice:rolled', { dice: gameState.dice, rerollsLeft: gameState.rerollsLeft });
}

export function toggleKeep(index) {
  const kept = [...gameState.keptDice];
  kept[index] = !kept[index];
  gameState.keptDice = kept;
  bus.emit('dice:keepChanged', { keptDice: kept });
}

export function reroll() {
  if (gameState.rerollsLeft <= 0) return false;
  const newDice = [...gameState.dice];
  const kept = gameState.keptDice;
  for (let i = 0; i < newDice.length; i++) {
    if (!kept[i]) {
      newDice[i] = rollDice(1)[0];
    }
  }
  gameState.dice = newDice;
  gameState.rerollsLeft--;
  bus.emit('dice:rolled', { dice: gameState.dice, rerollsLeft: gameState.rerollsLeft });
  return true;
}

export function confirmDice() {
  bus.emit('dice:confirmed', { dice: gameState.dice });
}

export function countDice(dice) {
  const counts = {};
  for (const face of dice) {
    counts[face] = (counts[face] || 0) + 1;
  }
  return counts;
}
