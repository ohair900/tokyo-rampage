import { gameState } from '../state/GameState.js';
import { enterTokyo, leaveTokyo } from '../state/actions.js';
import { TOKYO_BAY_THRESHOLD, TOKYO_START_TURN_VP } from '../data/constants.js';
import { addVP } from '../state/actions.js';
import { bus } from '../utils/eventBus.js';

export function isBayOpen() {
  return gameState.alivePlayers.length >= TOKYO_BAY_THRESHOLD;
}

export function getTokyoCity() {
  return gameState.players.find(p => p.alive && p.inTokyo === 'city') || null;
}

export function getTokyoBay() {
  return gameState.players.find(p => p.alive && p.inTokyo === 'bay') || null;
}

export function awardTokyoStartVP(player) {
  if (player.inTokyo) {
    const bonus = (player.monster.id === 'king') ? 1 : 0;
    const amount = TOKYO_START_TURN_VP + bonus;
    addVP(player, amount);
    bus.emit('tokyo:startTurnVP', { player, amount });
    if (bonus > 0) {
      bus.emit('ability:triggered', { player, ability: player.monster.ability, detail: '+1 bonus Tokyo VP' });
    }
  }
}

export function tryEnterTokyo(player) {
  // If nobody in City, enter City
  if (!getTokyoCity()) {
    enterTokyo(player, 'city');
    return true;
  }
  // If Bay is open and nobody in Bay, enter Bay
  if (isBayOpen() && !getTokyoBay()) {
    enterTokyo(player, 'bay');
    return true;
  }
  return false;
}

export function handleYield(yieldingPlayer, attacker) {
  const slot = yieldingPlayer.inTokyo;
  leaveTokyo(yieldingPlayer);
  enterTokyo(attacker, slot);
}
