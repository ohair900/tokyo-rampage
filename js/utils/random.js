import { DICE_FACES } from '../data/constants.js';

// Multiplayer override: when set, rollDice returns server-provided values
let _diceOverride = null;

export function setDiceOverride(fn) { _diceOverride = fn; }
export function clearDiceOverride() { _diceOverride = null; }

export function rollDie() {
  return DICE_FACES[Math.floor(Math.random() * DICE_FACES.length)];
}

export function rollDice(count) {
  if (_diceOverride) return _diceOverride(count);
  return Array.from({ length: count }, () => rollDie());
}

// Deterministic die roll from a seed (same seed = same result on all clients)
export function deterministicRollDie(seed) {
  const s = ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
  return DICE_FACES[Math.floor(s * DICE_FACES.length)];
}

// Deterministic index selection from a seed
export function deterministicIndex(seed, length) {
  const s = ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
  return Math.floor(s * length);
}

// Seeded PRNG for deterministic card deck shuffle in multiplayer
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function shuffle(array, seed) {
  const a = [...array];
  const rand = seed != null ? seededRandom(seed) : Math.random;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
