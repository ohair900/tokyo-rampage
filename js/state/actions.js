import { gameState } from './GameState.js';
import { bus } from '../utils/eventBus.js';
import { MAX_HP, WIN_VP } from '../data/constants.js';
import { rollDie } from '../utils/random.js';

export function hasCard(player, name) {
  return player.cards.some(c => c.name === name);
}

export function dealDamage(attacker, target, amount) {
  if (!target.alive || amount <= 0) return;

  // Meka Dragon: Shielded — first damage taken each turn reduced by 1
  if (target.monster.id === 'mekadragon' && target._shieldActive) {
    target._shieldActive = false;
    amount = Math.max(0, amount - 1);
    bus.emit('ability:triggered', { player: target, ability: target.monster.ability, detail: 'Shield blocked 1 damage' });
    if (amount <= 0) return;
  }

  // Wings (id 48): spend 2 energy to negate all damage
  if (hasCard(target, 'Wings') && target.energy >= 2) {
    target.energy -= 2;
    bus.emit('ability:triggered', { player: target, ability: { name: 'Wings' }, detail: 'Negated all damage' });
    return;
  }

  // Energy Shield (id 44): spend 1 energy per point of damage reduction
  if (hasCard(target, 'Energy Shield')) {
    while (amount > 0 && target.energy > 0) {
      target.energy -= 1;
      amount -= 1;
    }
    if (amount <= 0) {
      bus.emit('ability:triggered', { player: target, ability: { name: 'Energy Shield' }, detail: 'Absorbed all damage' });
      return;
    }
  }

  // Armor Plating: ignore damage of exactly 1
  if (amount === 1 && hasCard(target, 'Armor Plating')) return;

  // Camouflage: roll a die, ignore all damage on heart
  if (hasCard(target, 'Camouflage')) {
    const roll = rollDie();
    bus.emit('card:camouflage', { player: target, roll });
    if (roll === 'heart') return;
  }

  target.hp = Math.max(0, target.hp - amount);
  bus.emit('combat:damage', { attacker, target, amount });

  // Reflective Hide (id 42) + Spiked Tail (id 47): deal damage back to attacker
  if (target.hp > 0 && target.alive && attacker !== target && !target._reflecting) {
    target._reflecting = true;
    if (hasCard(target, 'Reflective Hide')) {
      dealDamage(target, attacker, 1);
    }
    if (hasCard(target, 'Spiked Tail')) {
      dealDamage(target, attacker, 1);
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
  }
}

export function healPlayer(player, amount) {
  if (!player.alive || player.inTokyo) return;
  const healed = Math.min(amount, (player.maxHP || MAX_HP) - player.hp);
  if (healed > 0) {
    player.hp += healed;
    bus.emit('player:healed', { player, amount: healed });
  }
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
