import { addVP } from '../state/actions.js';
import { bus } from '../utils/eventBus.js';

export function resolveVP(player, diceCounts) {
  let totalVP = 0;
  let triplesCount = 0;
  for (const num of ['1', '2', '3']) {
    const count = diceCounts[num] || 0;
    if (count >= 3) {
      const baseVP = parseInt(num);
      const bonusVP = count - 3;
      const vp = baseVP + bonusVP;
      totalVP += vp;
      triplesCount++;
    }
  }

  // Alienoid: Telepathic — +1 bonus VP per number triple scored
  if (player.monster.id === 'alienoid' && triplesCount > 0) {
    totalVP += triplesCount;
    bus.emit('ability:triggered', { player, ability: player.monster.ability, detail: `+${triplesCount} VP from triples` });
  }

  if (triplesCount > 0) {
    player._triplesScoredThisGame = (player._triplesScoredThisGame || 0) + triplesCount;
  }

  if (totalVP > 0) {
    addVP(player, totalVP);
    bus.emit('scoring:diceVP', { player, amount: totalVP });
  }
  return totalVP;
}
