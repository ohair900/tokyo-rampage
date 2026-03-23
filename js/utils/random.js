import { DICE_FACES } from '../data/constants.js';

export function rollDie() {
  return DICE_FACES[Math.floor(Math.random() * DICE_FACES.length)];
}

export function rollDice(count) {
  return Array.from({ length: count }, () => rollDie());
}

export function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
