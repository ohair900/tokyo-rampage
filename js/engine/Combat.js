import { gameState } from '../state/GameState.js';
import { dealDamage, hasCard, addVP, addEnergy } from '../state/actions.js';
import { bus } from '../utils/eventBus.js';

export async function resolveAttack(player, clawCount) {
  if (clawCount <= 0 || !player.alive || gameState.winner) return [];

  // Keep card damage bonuses
  let damageBonus = 0;
  if (hasCard(player, 'Fire Breathing')) damageBonus++;
  if (!player.inTokyo && hasCard(player, 'Burrowing')) damageBonus++;
  const totalDamage = clawCount + damageBonus;

  const yieldRequests = [];
  const damagedTargets = [];
  const attackEnded = () => !player.alive || !!gameState.winner;

  if (player.inTokyo) {
    // In Tokyo: damage everyone outside
    const targets = gameState.getPlayersOutsideTokyo();
    for (const target of targets) {
      const result = await dealDamage(player, target, totalDamage);
      if (result.damageApplied > 0) damagedTargets.push(target);
      if (attackEnded()) return yieldRequests;
    }
  } else {
    // Outside Tokyo: damage everyone inside
    const targets = gameState.getPlayersInTokyo();
    for (const target of targets) {
      const result = await dealDamage(player, target, totalDamage);
      if (result.damageApplied > 0) {
        damagedTargets.push(target);
      }
      if (result.damageApplied > 0 && target.alive && target.hp > 0) {
        yieldRequests.push(target);
      }
      if (attackEnded()) return yieldRequests;
    }
  }

  if (attackEnded()) return yieldRequests;

  // Kraken: Tentacle Grab — steal 1 energy from each damaged target
  if (player.monster.id === 'kraken' && damagedTargets.length > 0) {
    let stolen = 0;
    for (const target of damagedTargets) {
      if (target.energy > 0) {
        target.energy -= 1;
        stolen += 1;
      }
    }
    if (stolen > 0) {
      addEnergy(player, stolen);
      bus.emit('ability:triggered', { player, ability: player.monster.ability, detail: `Stole ${stolen} energy` });
    }
  }

  // Handle yield decisions
  for (const target of yieldRequests) {
    if (attackEnded()) return yieldRequests;
    const shouldYield = await requestYield(target, player, totalDamage);
    if (attackEnded()) return yieldRequests;
    if (shouldYield) {
      bus.emit('tokyo:yield', { player: target, attacker: player });
    }
  }

  // Keep card: Alpha Monster — +1 VP when you attack
  if (!attackEnded() && hasCard(player, 'Alpha Monster')) {
    addVP(player, 1);
  }

  return yieldRequests;
}

function requestYield(tokyoPlayer, attacker, damage) {
  return new Promise((resolve) => {
    if (tokyoPlayer.isAI) {
      bus.emit('ai:yieldDecision', { player: tokyoPlayer, attacker, damage, resolve });
    } else if (tokyoPlayer.isRemote) {
      bus.emit('net:yieldPrompt', { player: tokyoPlayer, attacker, damage, resolve });
    } else {
      bus.emit('ui:yieldPrompt', { player: tokyoPlayer, attacker, damage, resolve });
    }
  });
}
