import { addVP, addEnergy, healPlayer, dealDamage } from '../state/actions.js';
import { MAX_HP } from './constants.js';
import { deterministicIndex } from '../utils/random.js';

// Card types: 'keep' = permanent, 'discard' = immediate effect
export const POWER_CARDS = [
  // --- Discard (immediate) cards ---
  { id: 1, name: 'Apartment Building', cost: 5, type: 'discard', description: '+3 VP', onBuy: (p) => addVP(p, 3) },
  { id: 2, name: 'Commuter Train', cost: 4, type: 'discard', description: '+2 VP', onBuy: (p) => addVP(p, 2) },
  { id: 3, name: 'Corner Store', cost: 3, type: 'discard', description: '+1 VP', onBuy: (p) => addVP(p, 1) },
  { id: 4, name: 'Nuclear Power Plant', cost: 6, type: 'discard', description: '+2 VP and +3 energy',
    onBuy: (p) => { addVP(p, 2); addEnergy(p, 3); } },
  { id: 5, name: 'Skyscraper', cost: 6, type: 'discard', description: '+4 VP', onBuy: (p) => addVP(p, 4) },
  { id: 6, name: 'Gas Refinery', cost: 6, type: 'discard', description: '+2 VP, all others lose 3 HP',
    onBuy: (p, gs) => {
      addVP(p, 2);
      for (const other of gs.players) {
        if (other !== p && other.alive) dealDamage(p, other, 3);
      }
    }
  },
  { id: 7, name: 'Tank', cost: 4, type: 'discard', description: '+4 VP, take 3 damage',
    onBuy: (p, gs) => { addVP(p, 4); dealDamage(p, p, 3); }
  },
  { id: 8, name: 'Evacuation Orders', cost: 7, type: 'discard', description: 'All other players lose 5 VP',
    onBuy: (p, gs) => {
      for (const other of gs.players) {
        if (other !== p && other.alive) other.vp = Math.max(0, other.vp - 5);
      }
    }
  },
  { id: 9, name: 'Heal', cost: 3, type: 'discard', description: 'Heal to full HP',
    onBuy: (p) => { p.hp = MAX_HP; }
  },
  { id: 10, name: 'Energy Drink', cost: 1, type: 'discard', description: '+2 energy', onBuy: (p) => addEnergy(p, 2) },
  { id: 11, name: 'National Guard', cost: 3, type: 'discard', description: '+2 VP, take 2 damage',
    onBuy: (p) => { addVP(p, 2); dealDamage(p, p, 2); }
  },
  { id: 12, name: 'Amusement Park', cost: 4, type: 'discard', description: '+4 VP if you have 3+ sets of triples this game',
    onBuy: (p) => addVP(p, 4)
  },
  { id: 13, name: 'Lightning Strike', cost: 5, type: 'discard', description: 'All others take 2 damage',
    onBuy: (p, gs) => {
      for (const other of gs.players) {
        if (other !== p && other.alive) dealDamage(p, other, 2);
      }
    }
  },
  { id: 14, name: 'Monster Snack', cost: 2, type: 'discard', description: '+1 VP, heal 1 HP',
    onBuy: (p) => { addVP(p, 1); healPlayer(p, 1); }
  },
  { id: 15, name: 'Power Surge', cost: 3, type: 'discard', description: '+2 energy, +1 VP',
    onBuy: (p) => { addEnergy(p, 2); addVP(p, 1); }
  },

  // --- Keep (permanent) cards ---
  { id: 16, name: 'Armor Plating', cost: 4, type: 'keep',
    description: 'Ignore damage of 1' },
  { id: 17, name: 'Extra Head', cost: 7, type: 'keep',
    description: 'You get 1 extra die' },
  { id: 18, name: 'Giant Brain', cost: 5, type: 'keep',
    description: 'You get 1 extra reroll' },
  { id: 19, name: 'Solar Powered', cost: 2, type: 'keep',
    description: 'At end of turn, gain 1 energy if you have 0' },
  { id: 20, name: 'Even Bigger', cost: 4, type: 'keep',
    description: 'Your max HP becomes 12. Heal 2 HP.',
    onBuy: (p) => { p.maxHP = 12; p.hp = Math.min(p.hp + 2, 12); } },
  { id: 21, name: 'Fire Breathing', cost: 4, type: 'keep',
    description: 'Deal +1 damage when you attack' },
  { id: 22, name: 'Friend of Children', cost: 3, type: 'keep',
    description: '+1 VP at start of each turn' },
  { id: 23, name: 'Herbivore', cost: 5, type: 'keep',
    description: '+1 VP if you deal no damage this turn' },
  { id: 24, name: 'Regeneration', cost: 4, type: 'keep',
    description: 'Heal 1 HP at start of each turn (even in Tokyo)' },
  { id: 25, name: 'Energy Hoarder', cost: 3, type: 'keep',
    description: '+1 VP for every 6 energy you have at end of turn' },
  { id: 26, name: 'Rapid Healing', cost: 3, type: 'keep',
    description: 'Spend 2 energy to heal 1 HP (usable during buying phase)' },
  { id: 27, name: 'Alpha Monster', cost: 5, type: 'keep',
    description: '+1 VP when you attack' },
  { id: 28, name: 'Burrowing', cost: 5, type: 'keep',
    description: 'Deal +1 damage from outside Tokyo' },
  { id: 29, name: 'Camouflage', cost: 3, type: 'keep',
    description: 'If you take damage, roll a die. On heart, ignore the damage.' },
  { id: 30, name: 'Omnivore', cost: 4, type: 'keep',
    description: '+2 VP if you roll at least one of each die face' },

  // --- New Discard (immediate) cards ---
  { id: 31, name: 'Stretching', cost: 3, type: 'discard', description: 'Heal 2 HP',
    onBuy: (p) => healPlayer(p, 2) },
  { id: 32, name: 'Acid Attack', cost: 6, type: 'discard', description: 'All others take 2 damage and lose 1 energy',
    onBuy: (p, gs) => {
      for (const other of gs.players) {
        if (other !== p && other.alive) {
          dealDamage(p, other, 2);
          other.energy = Math.max(0, other.energy - 1);
        }
      }
    }
  },
  { id: 33, name: 'Frenzy', cost: 7, type: 'discard', description: 'Take another turn after this one',
    onBuy: (p) => { p._extraTurn = true; } },
  { id: 34, name: 'High Altitude Bombing', cost: 5, type: 'discard', description: 'All others take 3 damage',
    onBuy: (p, gs) => {
      for (const other of gs.players) {
        if (other !== p && other.alive) dealDamage(p, other, 3);
      }
    }
  },
  { id: 35, name: 'Vast Storm', cost: 6, type: 'discard', description: '+2 VP and gain 3 energy',
    onBuy: (p) => { addVP(p, 2); addEnergy(p, 3); } },
  { id: 36, name: 'Drop from High', cost: 5, type: 'discard', description: 'Deal 4 damage to a random player outside Tokyo',
    onBuy: (p, gs) => {
      const targets = gs.players.filter(o => o !== p && o.alive && !o.inTokyo);
      if (targets.length > 0) {
        const seed = (gs.round || 1) * 1000 + p.id;
        const target = targets[deterministicIndex(seed, targets.length)];
        dealDamage(p, target, 4);
      }
    }
  },
  { id: 37, name: 'Flame Thrower', cost: 4, type: 'discard', description: 'All others take 1 damage; in Tokyo take +1 extra',
    onBuy: (p, gs) => {
      for (const other of gs.players) {
        if (other !== p && other.alive) {
          dealDamage(p, other, other.inTokyo ? 2 : 1);
        }
      }
    }
  },
  { id: 38, name: 'Underground Assault', cost: 4, type: 'discard', description: '+1 VP per player in Tokyo',
    onBuy: (p, gs) => {
      const inTokyo = gs.players.filter(o => o.alive && o.inTokyo).length;
      if (inTokyo > 0) addVP(p, inTokyo);
    }
  },
  { id: 39, name: 'Battery Pack', cost: 2, type: 'discard', description: '+4 energy',
    onBuy: (p) => addEnergy(p, 4) },
  { id: 40, name: 'Demolition', cost: 4, type: 'discard', description: '+2 VP; all others lose 2 VP',
    onBuy: (p, gs) => {
      addVP(p, 2);
      for (const other of gs.players) {
        if (other !== p && other.alive) other.vp = Math.max(0, other.vp - 2);
      }
    }
  },

  // --- New Keep (permanent) cards ---
  { id: 41, name: 'Complete Destruction', cost: 3, type: 'keep',
    description: '+9 VP when you eliminate a player' },
  { id: 42, name: 'Reflective Hide', cost: 4, type: 'keep',
    description: 'Attacker takes 1 damage back when you are damaged' },
  { id: 43, name: 'Eater of the Dead', cost: 4, type: 'keep',
    description: '+3 VP when any other player is eliminated' },
  { id: 44, name: 'Energy Shield', cost: 5, type: 'keep',
    description: 'Spend 1 energy to reduce incoming damage by 1' },
  { id: 45, name: 'Opportunist', cost: 3, type: 'keep',
    description: 'If 0 hearts rolled, gain 1 energy' },
  { id: 46, name: 'Poison Spit', cost: 4, type: 'keep',
    description: 'End of turn: each player you damaged this turn takes 1 extra damage' },
  { id: 47, name: 'Spiked Tail', cost: 5, type: 'keep',
    description: 'When damaged, deal 1 damage back to attacker' },
  { id: 48, name: 'Wings', cost: 5, type: 'keep',
    description: 'Spend 2 energy to negate all damage from one attack' },
  { id: 49, name: 'Parasitic Tentacles', cost: 3, type: 'keep',
    description: 'When you deal damage, steal 1 VP from target' },
  { id: 50, name: 'Made in a Lab', cost: 2, type: 'keep',
    description: 'When buying, draw 1 extra card into store' },
];
