import { gameState } from './GameState.js';
import { bus } from '../utils/eventBus.js';
import { MAX_HP, WIN_VP } from '../data/constants.js';
import { rollDie } from '../utils/random.js';

export function hasCard(player, name) {
  return player.cards.some(c => c.name === name);
}

function createDamageResult(overrides = {}) {
  return {
    damageApplied: 0,
    prevented: false,
    blockedBy: null,
    targetEliminated: false,
    ...overrides,
  };
}

function nextReactionId(target, attacker, type) {
  gameState.reactionCounter += 1;
  return `${gameState.round}:${gameState.currentPlayerIndex}:${attacker?.id ?? 'none'}:${target.id}:${type}:${gameState.reactionCounter}`;
}

function requestDefenseReaction(target, attacker, type, payload = {}) {
  return new Promise((resolve) => {
    const detail = {
      reactionId: nextReactionId(target, attacker, type),
      type,
      player: target,
      attacker,
      amount: payload.amount ?? 0,
      damage: payload.amount ?? 0,
      ...payload,
      resolve,
    };

    if (target.isAI) {
      bus.emit('ai:defenseReaction', detail);
    } else if (target.isRemote) {
      bus.emit('net:defenseReaction', detail);
    } else {
      bus.emit('ui:defenseReaction', detail);
    }
  });
}

function recordOpponentDamage(attacker, target) {
  if (!attacker || !target || attacker === target) return;
  if (!attacker._damagedOpponentsThisTurn) attacker._damagedOpponentsThisTurn = new Set();
  attacker._damagedOpponentsThisTurn.add(target);
  attacker._dealtOpponentDamageThisTurn = true;

  if (hasCard(attacker, 'Parasitic Tentacles') && target.vp > 0) {
    target.vp = Math.max(0, target.vp - 1);
    addVP(attacker, 1);
  }
}

export async function dealDamage(attacker, target, amount) {
  if (!target.alive || amount <= 0) return createDamageResult();

  // Meka Dragon: Shielded — first damage taken each turn reduced by 1
  if (target.monster.id === 'mekadragon' && target._shieldActive) {
    target._shieldActive = false;
    amount = Math.max(0, amount - 1);
    bus.emit('ability:triggered', { player: target, ability: target.monster.ability, detail: 'Shield blocked 1 damage' });
    if (amount <= 0) {
      return createDamageResult({ prevented: true, blockedBy: 'shielded' });
    }
  }

  // Wings (id 48): spend 2 energy to negate all damage
  if (hasCard(target, 'Wings') && target.energy >= 2) {
    const result = await requestDefenseReaction(target, attacker, 'wings', { amount, cost: 2 });
    if (result?.use) {
      target.energy -= 2;
      bus.emit('ability:triggered', { player: target, ability: { name: 'Wings' }, detail: 'Negated all damage' });
      return createDamageResult({ prevented: true, blockedBy: 'wings' });
    }
  }

  // Energy Shield (id 44): optional spend per point of damage reduction
  if (hasCard(target, 'Energy Shield') && target.energy > 0 && amount > 0) {
    const maxSpend = Math.min(target.energy, amount);
    const result = await requestDefenseReaction(target, attacker, 'energyShield', { amount, maxSpend });
    const spend = Math.max(0, Math.min(maxSpend, Number(result?.spend) || 0));
    if (spend > 0) {
      target.energy -= spend;
      amount -= spend;
      bus.emit('ability:triggered', {
        player: target,
        ability: { name: 'Energy Shield' },
        detail: `Spent ${spend} energy to block ${spend} damage`,
      });
    }
    if (amount <= 0) {
      return createDamageResult({ prevented: true, blockedBy: 'energyShield' });
    }
  }

  // Armor Plating: ignore damage of exactly 1
  if (amount === 1 && hasCard(target, 'Armor Plating')) {
    return createDamageResult({ prevented: true, blockedBy: 'armorPlating' });
  }

  // Camouflage: roll a die, ignore all damage on heart
  if (hasCard(target, 'Camouflage') && amount > 0) {
    const result = await requestDefenseReaction(target, attacker, 'camouflage', { amount });
    const rolledFace = result?.rolledFace || rollDie();
    if (rolledFace === 'heart') {
      bus.emit('ability:triggered', { player: target, ability: { name: 'Camouflage' }, detail: `Rolled ${rolledFace} — damage blocked!` });
      return createDamageResult({ prevented: true, blockedBy: 'camouflage' });
    }
    bus.emit('ability:triggered', { player: target, ability: { name: 'Camouflage' }, detail: `Rolled ${rolledFace} — no block` });
  }

  const hpBefore = target.hp;
  target.hp = Math.max(0, target.hp - amount);
  const damageApplied = hpBefore - target.hp;

  if (damageApplied > 0) {
    bus.emit('combat:damage', { attacker, target, amount: damageApplied });
    recordOpponentDamage(attacker, target);
  }

  // Reflective Hide (id 42) + Spiked Tail (id 47): deal damage back to attacker
  if (target.hp > 0 && target.alive && attacker !== target && !target._reflecting) {
    target._reflecting = true;
    if (hasCard(target, 'Reflective Hide')) {
      await dealDamage(target, attacker, 1);
    }
    if (hasCard(target, 'Spiked Tail')) {
      await dealDamage(target, attacker, 1);
    }
    target._reflecting = false;
  }

  if (target.hp <= 0) {
    target.alive = false;
    if (target.inTokyo) {
      target.inTokyo = false;
      bus.emit('tokyo:vacated', { player: target });
    }

    // Complete Destruction (id 41): attacker gets +9 VP on elimination
    if (attacker !== target && hasCard(attacker, 'Complete Destruction')) {
      addVP(attacker, 9);
    }

    // Eater of the Dead (id 43): all other alive players with card get +3 VP
    for (const p of gameState.alivePlayers) {
      if (p !== target && hasCard(p, 'Eater of the Dead')) {
        addVP(p, 3);
      }
    }

    bus.emit('player:eliminated', { player: target });
    checkLastStanding();
    return createDamageResult({ damageApplied, targetEliminated: true });
  }

  return createDamageResult({ damageApplied });
}

export function healPlayer(player, amount, { allowInTokyo = false } = {}) {
  if (!player.alive) return 0;
  if (player.inTokyo && !allowInTokyo) return 0;
  const healed = Math.min(amount, (player.maxHP || MAX_HP) - player.hp);
  if (healed > 0) {
    player.hp += healed;
    bus.emit('player:healed', { player, amount: healed });
  }
  return healed;
}

export function addVP(player, amount) {
  if (!player.alive) return;
  player.vp += amount;
  bus.emit('player:vpGained', { player, amount });
  if (player.vp >= WIN_VP) {
    bus.emit('game:vpWin', { player });
  }
}

export function addEnergy(player, amount) {
  if (!player.alive) return;
  player.energy += amount;
  bus.emit('player:energyGained', { player, amount });
}

export function spendEnergy(player, amount) {
  if (player.energy < amount) return false;
  player.energy -= amount;
  return true;
}

export function enterTokyo(player, slot = 'city') {
  player.inTokyo = slot;
  addVP(player, 1);
  bus.emit('tokyo:entered', { player, slot });
}

export function leaveTokyo(player) {
  const slot = player.inTokyo;
  player.inTokyo = false;
  bus.emit('tokyo:left', { player, slot });
}

export function checkLastStanding() {
  const alive = gameState.alivePlayers;
  if (alive.length === 1) {
    bus.emit('game:lastStanding', { player: alive[0] });
  }
}
