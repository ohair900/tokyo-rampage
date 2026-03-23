import { MAX_HP } from '../data/constants.js';
import { hasCard } from '../state/actions.js';
import { vpProximity, hpDanger, gamePhase } from './gameAnalysis.js';

/**
 * Evaluate a card's worth for this player in current game state.
 * Returns a numeric score; higher = more worth buying.
 */
export function evaluateCard(card, player, gameState, difficulty) {
  const opponents = gameState.players.filter(p => p.alive && p.id !== player.id);
  const numOpponents = opponents.length;
  const maxHP = player.maxHP || MAX_HP;
  const missingHP = maxHP - player.hp;
  const proximity = vpProximity(player);
  const danger = hpDanger(player);
  const phase = gamePhase(gameState);
  const maxPlayerVP = Math.max(...gameState.players.filter(p => p.alive).map(p => p.vp), 0);
  const remainingRounds = Math.max(3, (20 - maxPlayerVP) / 2);

  let score = 0;

  // --- Base scores ---
  if (card.type === 'discard') {
    score = getDiscardBaseScore(card, player, numOpponents, missingHP, maxHP);
  } else {
    score = getKeepBaseScore(card, player, remainingRounds, maxHP, danger, numOpponents);
  }

  // --- Situational multipliers ---
  score = applySituationalMultipliers(score, card, player, proximity, danger, numOpponents, phase, maxHP);

  // --- Synergy multiplier (Hard only) ---
  if (difficulty === 'hard') {
    score *= getSynergyMultiplier(card, player);
    score *= getAbilitySynergyMultiplier(card, player);
  }

  return score;
}

function getDiscardBaseScore(card, player, numOpponents, missingHP, maxHP) {
  const hpPenalty = (val) => val / maxHP;

  switch (card.name) {
    case 'Apartment Building': return 3 / 5;     // 0.60
    case 'Commuter Train':     return 2 / 4;     // 0.50
    case 'Corner Store':       return 1 / 3;     // 0.33
    case 'Nuclear Power Plant': return (2 + 3 * 0.3) / 6; // 0.48
    case 'Skyscraper':         return 4 / 6;     // 0.67
    case 'Gas Refinery':       return (2 + numOpponents * 1.0) / 6;
    case 'Tank':               return (4 - hpPenalty(3)) / 4;
    case 'Evacuation Orders':  return (numOpponents * 2.5) / 7;
    case 'Heal':               return (missingHP * 0.4) / 3;
    case 'Energy Drink':       return 0.30;
    case 'National Guard':     return (2 - hpPenalty(2)) / 3;
    case 'Amusement Park':     return 4 / 4;     // 1.00
    case 'Lightning Strike':   return (numOpponents * 0.8) / 5;
    case 'Monster Snack':      return 1.3 / 2;   // 0.65
    case 'Power Surge':        return (1 + 0.6) / 3; // 0.53
    case 'Stretching':         return (Math.min(missingHP, 2) * 0.4) / 3;
    case 'Acid Attack':        return (numOpponents * 1.2) / 6;
    case 'Frenzy':             return 1.0;
    case 'High Altitude Bombing': return (numOpponents * 1.2) / 5;
    case 'Vast Storm':         return (2 + 3 * 0.3) / 6;
    case 'Drop from High':     return 4 * 0.8 / 5;
    case 'Flame Thrower':      return (numOpponents * 0.6) / 4;
    case 'Underground Assault': return 0.4;
    case 'Battery Pack':       return 0.50;
    case 'Demolition':         return (2 + numOpponents * 1.0) / 4;
    default:                   return 0.3;
  }
}

function getKeepBaseScore(card, player, remainingRounds, maxHP, danger, numOpponents) {
  switch (card.name) {
    case 'Friend of Children': return 1.0 * remainingRounds / 3;
    case 'Extra Head':         return 0.8 * remainingRounds / 7;
    case 'Fire Breathing':     return 0.5 * remainingRounds / 4;
    case 'Alpha Monster':      return 0.4 * remainingRounds / 5;
    case 'Burrowing':          return 0.4 * remainingRounds / 5;
    case 'Giant Brain':        return 0.4 * remainingRounds / 5;
    case 'Armor Plating':      return 0.4 * remainingRounds / 4;
    case 'Regeneration':       return 0.3 * remainingRounds / 4;
    case 'Camouflage':         return 0.3 * remainingRounds / 3;
    case 'Even Bigger':        return ((12 - maxHP) * 0.3 + 0.6) / 4;
    case 'Rapid Healing':      return danger * 0.5 * remainingRounds / 3;
    case 'Herbivore':          return 0.3 * remainingRounds / 5;
    case 'Solar Powered':      return 0.2 * remainingRounds / 2;
    case 'Energy Hoarder':     return 0.15 * player.energy / 3;
    case 'Omnivore':           return 0.15 * remainingRounds / 4;
    case 'Complete Destruction': return 0.3 * numOpponents / 3;
    case 'Reflective Hide':    return 0.3 * remainingRounds / 4;
    case 'Eater of the Dead':  return 0.25 * numOpponents / 4;
    case 'Energy Shield':      return danger * 0.5 * remainingRounds / 5;
    case 'Opportunist':        return 0.25 * remainingRounds / 3;
    case 'Poison Spit':        return 0.4 * remainingRounds / 4;
    case 'Spiked Tail':        return 0.3 * remainingRounds / 5;
    case 'Wings':              return danger * 0.6 * remainingRounds / 5;
    case 'Parasitic Tentacles': return 0.4 * remainingRounds / 3;
    case 'Made in a Lab':      return 0.3 * remainingRounds / 2;
    default:                   return 0.2;
  }
}

function applySituationalMultipliers(score, card, player, proximity, danger, numOpponents, phase, maxHP) {
  // HP-critical: Heal cards much more valuable near death
  if (card.name === 'Heal' && danger > 0.5) {
    score *= 1 + danger * 3; // up to 4x at near-death
  }
  if (card.name === 'Monster Snack' && danger > 0.5) {
    score *= 1 + danger * 1.5; // up to 2.5x
  }

  // VP-proximity: Pure VP discard cards more valuable when close to winning
  const pureVPCards = ['Apartment Building', 'Commuter Train', 'Corner Store', 'Skyscraper', 'Amusement Park'];
  if (pureVPCards.includes(card.name) && proximity > 0.5) {
    score *= 1 + proximity * 1.5; // up to 2.5x at proximity 1.0
  }

  // Opponent scaling: Damage-all cards scale with opponent count
  const damageAllCards = ['Gas Refinery', 'Lightning Strike', 'Evacuation Orders', 'High Altitude Bombing', 'Acid Attack', 'Flame Thrower', 'Demolition'];
  if (damageAllCards.includes(card.name)) {
    score *= numOpponents / 2;
  }

  // Stretching scales with danger
  if (card.name === 'Stretching' && danger > 0.3) {
    score *= 1 + danger * 2;
  }

  // Frenzy scales with VP proximity
  if (card.name === 'Frenzy' && proximity > 0.5) {
    score *= 1 + proximity;
  }

  // Complete Destruction / Eater of the Dead scale with opponent count
  if ((card.name === 'Complete Destruction' || card.name === 'Eater of the Dead') && numOpponents >= 3) {
    score *= 1.3;
  }

  // Energy Shield / Wings scale with danger
  if ((card.name === 'Energy Shield' || card.name === 'Wings') && danger > 0.4) {
    score *= 1 + danger;
  }

  // Self-harm penalty
  if (card.name === 'Tank' && player.hp <= 4) {
    score *= 0.2;
  }
  if (card.name === 'National Guard' && player.hp <= 3) {
    score *= 0.3;
  }

  // Game phase: Keep cards better early, worse late
  if (card.type === 'keep') {
    if (phase === 'early') score *= 1.4;
    if (phase === 'late') score *= 0.6;
  }

  return score;
}

function getSynergyMultiplier(card, player) {
  let multiplier = 1.0;

  const synergies = [
    { card: 'Fire Breathing', with: 'Alpha Monster', mult: 1.4 },
    { card: 'Fire Breathing', with: 'Burrowing', mult: 1.3 },
    { card: 'Alpha Monster', with: 'Fire Breathing', mult: 1.4 },
    { card: 'Burrowing', with: 'Fire Breathing', mult: 1.3 },
    { card: 'Energy Hoarder', with: 'Solar Powered', mult: 1.3 },
    { card: 'Solar Powered', with: 'Energy Hoarder', mult: 1.3 },
    { card: 'Extra Head', with: 'Omnivore', mult: 1.5 },
    { card: 'Omnivore', with: 'Extra Head', mult: 1.5 },
    { card: 'Extra Head', with: 'Giant Brain', mult: 1.3 },
    { card: 'Giant Brain', with: 'Extra Head', mult: 1.3 },
    { card: 'Even Bigger', with: 'Regeneration', mult: 1.3 },
    { card: 'Regeneration', with: 'Even Bigger', mult: 1.3 },
    { card: 'Camouflage', with: 'Armor Plating', mult: 1.2 },
    { card: 'Armor Plating', with: 'Camouflage', mult: 1.2 },
    { card: 'Reflective Hide', with: 'Spiked Tail', mult: 1.4 },
    { card: 'Spiked Tail', with: 'Reflective Hide', mult: 1.4 },
    { card: 'Energy Shield', with: 'Wings', mult: 1.3 },
    { card: 'Wings', with: 'Energy Shield', mult: 1.3 },
    { card: 'Parasitic Tentacles', with: 'Fire Breathing', mult: 1.3 },
    { card: 'Fire Breathing', with: 'Parasitic Tentacles', mult: 1.3 },
    { card: 'Parasitic Tentacles', with: 'Alpha Monster', mult: 1.2 },
    { card: 'Alpha Monster', with: 'Parasitic Tentacles', mult: 1.2 },
    { card: 'Poison Spit', with: 'Fire Breathing', mult: 1.3 },
    { card: 'Fire Breathing', with: 'Poison Spit', mult: 1.3 },
  ];

  for (const syn of synergies) {
    if (card.name === syn.card && hasCard(player, syn.with)) {
      multiplier = Math.max(multiplier, syn.mult);
    }
  }

  // Anti-synergy: Herbivore + attack cards
  const attackCards = ['Fire Breathing', 'Alpha Monster', 'Burrowing', 'Parasitic Tentacles', 'Poison Spit'];
  if (card.name === 'Herbivore' && attackCards.some(name => hasCard(player, name))) {
    multiplier *= 0.3;
  }
  if (attackCards.includes(card.name) && hasCard(player, 'Herbivore')) {
    multiplier *= 0.3;
  }

  // Anti-synergy: Rapid Healing + Energy Hoarder (energy drain conflict)
  if (card.name === 'Rapid Healing' && hasCard(player, 'Energy Hoarder')) {
    multiplier *= 0.8;
  }
  if (card.name === 'Energy Hoarder' && hasCard(player, 'Rapid Healing')) {
    multiplier *= 0.8;
  }

  return multiplier;
}

function getAbilitySynergyMultiplier(card, player) {
  const mId = player.monster.id;

  // Meka Dragon already takes less damage → defensive cards slightly less valuable
  if (mId === 'mekadragon') {
    if (['Regeneration', 'Armor Plating', 'Camouflage', 'Reflective Hide', 'Spiked Tail', 'Energy Shield', 'Wings'].includes(card.name)) return 0.85;
  }

  // Cyber Bunny gets free energy → Energy Hoarder more valuable, Solar Powered less, energy-using cards better
  if (mId === 'cyberbunny') {
    if (card.name === 'Energy Hoarder') return 1.3;
    if (card.name === 'Solar Powered') return 0.6;
    if (['Energy Shield', 'Wings'].includes(card.name)) return 1.3;
  }

  // Gigazaur benefits more from attack-boosting cards and damage-triggered cards
  if (mId === 'gigazaur') {
    if (['Fire Breathing', 'Alpha Monster', 'Burrowing'].includes(card.name)) return 1.2;
    if (['Parasitic Tentacles', 'Poison Spit'].includes(card.name)) return 1.2;
  }

  // The King benefits more from staying in Tokyo → defensive cards more valuable
  if (mId === 'king') {
    if (['Regeneration', 'Even Bigger', 'Armor Plating'].includes(card.name)) return 1.2;
  }

  // Alienoid benefits from Extra Head (more dice = more triples)
  if (mId === 'alienoid') {
    if (card.name === 'Extra Head') return 1.4;
    if (card.name === 'Giant Brain') return 1.2;
  }

  // Kraken steals energy on damage → attack-boosting and energy-hoarding cards more valuable
  if (mId === 'kraken') {
    if (['Fire Breathing', 'Burrowing', 'Alpha Monster'].includes(card.name)) return 1.2;
    if (card.name === 'Energy Hoarder') return 1.3;
    if (['Parasitic Tentacles', 'Poison Spit'].includes(card.name)) return 1.2;
  }

  return 1.0;
}
