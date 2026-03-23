import { WIN_VP, MAX_HP } from '../data/constants.js';
import { hasCard } from '../state/actions.js';

/**
 * How close player is to winning by VP (0.0 - 1.0)
 */
export function vpProximity(player) {
  return player.vp / WIN_VP;
}

/**
 * VP still needed to win
 */
export function vpToWin(player) {
  return WIN_VP - player.vp;
}

/**
 * How damaged the player is (0.0 = full HP, 1.0 = dead)
 */
export function hpDanger(player) {
  const maxHP = player.maxHP || MAX_HP;
  return 1 - (player.hp / maxHP);
}

/**
 * Estimate expected incoming damage per round from opponents.
 * If player is in Tokyo, all outside opponents attack them.
 * If outside, only Tokyo occupants attack them.
 */
export function expectedIncomingDamage(player, gs) {
  const opponents = gs.players.filter(p => p.alive && p.id !== player.id);
  let totalExpected = 0;

  for (const opp of opponents) {
    const attacksPlayer = player.inTokyo
      ? !opp.inTokyo   // outside opponents attack Tokyo
      : !!opp.inTokyo; // Tokyo occupants attack outside

    if (!attacksPlayer) continue;

    const numDice = 6 + (hasCard(opp, 'Extra Head') ? 1 : 0);
    // Expected claws = numDice / 6
    let expected = numDice / 6;
    if (hasCard(opp, 'Fire Breathing')) expected += 1;
    if (!opp.inTokyo && hasCard(opp, 'Burrowing')) expected += 1;
    // Gigazaur Frenzy: +1 damage when rolling 3+ claws (roughly 30% chance with 6 dice)
    if (opp.monster.id === 'gigazaur') expected += 0.3;

    totalExpected += expected;
  }

  // Meka Dragon Shielded: first damage reduced by 1 per turn
  if (player.monster.id === 'mekadragon' && totalExpected > 0) {
    totalExpected = Math.max(0, totalExpected - 1);
  }

  return totalExpected;
}

/**
 * Estimated turns the player can survive at current damage rate
 */
export function survivalTurns(player, gs) {
  const dmg = expectedIncomingDamage(player, gs);
  if (dmg <= 0) return 99;
  return player.hp / dmg;
}

/**
 * Returns defensive keep cards the player owns
 */
export function hasDefensiveCards(player) {
  const defensiveNames = ['Armor Plating', 'Camouflage', 'Even Bigger', 'Regeneration', 'Rapid Healing', 'Reflective Hide', 'Spiked Tail', 'Energy Shield', 'Wings'];
  return player.cards.filter(c => defensiveNames.includes(c.name));
}

/**
 * Determine game phase based on max VP and alive player count
 */
export function gamePhase(gs) {
  const alive = gs.players.filter(p => p.alive);
  const maxVP = Math.max(...alive.map(p => p.vp), 0);

  if (maxVP >= 14 || alive.length <= 2) return 'late';
  if (maxVP >= 7 || alive.length <= 3) return 'mid';
  return 'early';
}

/**
 * Returns the opponent with the highest VP
 */
export function leadingOpponent(player, gs) {
  const opponents = gs.players.filter(p => p.alive && p.id !== player.id);
  if (opponents.length === 0) return null;
  return opponents.reduce((best, p) => p.vp > best.vp ? p : best, opponents[0]);
}

/**
 * Get a player's monster ability info
 */
export function getMonsterAbility(player) {
  return player.monster && player.monster.ability ? player.monster.ability : null;
}
