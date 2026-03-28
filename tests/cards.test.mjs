import test from 'node:test';
import assert from 'node:assert/strict';

import { gameState, createPlayerState } from '../js/state/GameState.js';
import { bus } from '../js/utils/eventBus.js';
import { dealDamage } from '../js/state/actions.js';
import { game } from '../js/engine/Game.js';
import { MONSTERS } from '../js/data/monsters.js';
import { POWER_CARDS } from '../js/data/powerCards.js';
import { buyCard, initCardStore, refillStore, sweepStore } from '../js/engine/Cards.js';
import { resolveAttack } from '../js/engine/Combat.js';
import { PHASES } from '../js/data/constants.js';

function monster(id = 'king') {
  return MONSTERS.find(m => m.id === id);
}

function makePlayer(id, name, monsterId = 'king', overrides = {}) {
  return Object.assign(createPlayerState(id, name, monster(monsterId), false, false), overrides);
}

function cloneCard(name) {
  const card = POWER_CARDS.find(c => c.name === name);
  return { ...card };
}

function setupScenario(players, { current = 0, phase = PHASES.SETUP, cardStore = [], cardDeck = [], round = 1, running = false } = {}) {
  gameState.reset();
  game.running = running;
  gameState.players = players;
  gameState.currentPlayerIndex = current;
  gameState.phase = phase;
  gameState.cardStore = cardStore;
  gameState.cardDeck = cardDeck;
  gameState.round = round;
}

function onDefense(handler) {
  return bus.on('ui:defenseReaction', handler);
}

function onHealEvents(events) {
  return bus.on('player:healed', (event) => events.push(event));
}

function trackResolutionOrder(order) {
  const listeners = [
    bus.on('player:healed', ({ amount }) => order.push(`heal:${amount}`)),
    bus.on('player:energyGained', ({ amount }) => order.push(`energy:${amount}`)),
    bus.on('scoring:diceVP', ({ amount }) => order.push(`diceVP:${amount}`)),
    bus.on('combat:damage', ({ amount }) => order.push(`damage:${amount}`)),
    bus.on('tokyo:entered', ({ slot }) => order.push(`tokyo:${slot}`)),
  ];
  return () => listeners.forEach((off) => off());
}

test('Wings can fully cancel an incoming attack', async () => {
  const attacker = makePlayer(0, 'Attacker');
  const defender = makePlayer(1, 'Defender');
  defender.cards.push(cloneCard('Wings'));
  defender.energy = 2;

  setupScenario([attacker, defender]);

  const off = onDefense(({ type, resolve }) => {
    assert.equal(type, 'wings');
    resolve({ use: true });
  });

  const result = await dealDamage(attacker, defender, 3);
  off();

  assert.equal(result.prevented, true);
  assert.equal(defender.hp, defender.maxHP);
  assert.equal(defender.energy, 0);
});

test('Wings, Energy Shield, and Camouflage resolve in order', async () => {
  const attacker = makePlayer(0, 'Attacker');
  const defender = makePlayer(1, 'Defender');
  defender.cards.push(cloneCard('Wings'));
  defender.cards.push(cloneCard('Energy Shield'));
  defender.cards.push(cloneCard('Camouflage'));
  defender.energy = 5;

  setupScenario([attacker, defender]);

  const seen = [];
  const off = onDefense(({ type, maxSpend, resolve }) => {
    seen.push(type);
    if (type === 'wings') {
      resolve({ use: false });
    } else if (type === 'energyShield') {
      assert.equal(maxSpend, 3);
      resolve({ spend: 1 });
    } else if (type === 'camouflage') {
      resolve({ rolledFace: 'heart' });
    }
  });

  const result = await dealDamage(attacker, defender, 3);
  off();

  assert.deepEqual(seen, ['wings', 'energyShield', 'camouflage']);
  assert.equal(result.prevented, true);
  assert.equal(defender.energy, 4);
  assert.equal(defender.hp, defender.maxHP);
});

test('hearts heal before entering Tokyo after a successful attack', async () => {
  const attacker = makePlayer(0, 'Attacker', 'king', { hp: 8 });
  const defender = makePlayer(1, 'Defender', 'king', { hp: 1, inTokyo: 'city' });
  const bystander = makePlayer(2, 'Bystander');
  const order = [];

  setupScenario([attacker, defender, bystander], {
    current: 0,
    phase: PHASES.ROLLING,
    cardStore: [cloneCard('Corner Store')],
    running: true,
  });

  gameState.dice = ['claw', 'heart', '1', '2', '2', '3'];

  const off = trackResolutionOrder(order);
  await game.resolveDice();
  off();

  assert.equal(attacker.hp, 9);
  assert.equal(attacker.inTokyo, 'city');
  assert.equal(defender.alive, false);
  assert.deepEqual(order, ['heal:1', 'damage:1', 'tokyo:city']);
});

test('dice resolution applies hearts, energy, number VP, then attack and Tokyo entry', async () => {
  const attacker = makePlayer(0, 'Attacker', 'king', { hp: 8 });
  const defender = makePlayer(1, 'Defender', 'king', { hp: 1, inTokyo: 'city' });
  const bystander = makePlayer(2, 'Bystander');
  const order = [];

  setupScenario([attacker, defender, bystander], {
    current: 0,
    phase: PHASES.ROLLING,
    cardStore: [cloneCard('Corner Store')],
    running: true,
  });

  gameState.dice = ['heart', 'lightning', '1', '1', '1', 'claw'];

  const off = trackResolutionOrder(order);
  await game.resolveDice();
  off();

  assert.equal(attacker.hp, 9);
  assert.equal(attacker.energy, 1);
  assert.equal(attacker.vp, 2);
  assert.equal(attacker.inTokyo, 'city');
  assert.equal(defender.alive, false);
  assert.deepEqual(order, ['heal:1', 'energy:1', 'diceVP:1', 'damage:1', 'tokyo:city']);
});

test('rolling hearts in Tokyo does not heal before attacking', async () => {
  const attacker = makePlayer(0, 'Attacker', 'king', { hp: 8, inTokyo: 'city' });
  const defender = makePlayer(1, 'Defender', 'king', { hp: 10 });
  const bystander = makePlayer(2, 'Bystander', 'king', { hp: 10 });
  const order = [];

  setupScenario([attacker, defender, bystander], {
    current: 0,
    phase: PHASES.ROLLING,
    cardStore: [cloneCard('Corner Store')],
    running: true,
  });

  gameState.dice = ['heart', 'claw', '2', '2', '3', 'lightning'];

  const off = trackResolutionOrder(order);
  await game.resolveDice();
  off();

  assert.equal(attacker.hp, 8);
  assert.equal(attacker.energy, 1);
  assert.equal(defender.hp, 9);
  assert.equal(bystander.hp, 9);
  assert.deepEqual(order, ['energy:1', 'damage:1', 'damage:1']);
});

test('reflected damage can end the game without waiting for a Tokyo yield prompt', async () => {
  const attacker = makePlayer(0, 'Attacker', 'king', { hp: 1 });
  const defender = makePlayer(1, 'Defender', 'king', { inTokyo: 'city' });
  defender.cards.push(cloneCard('Reflective Hide'));

  setupScenario([attacker, defender], {
    current: 0,
    phase: PHASES.RESOLVING_DICE,
    running: true,
  });

  let yieldPrompts = 0;
  const off = bus.on('ui:yieldPrompt', () => {
    yieldPrompts += 1;
  });

  await resolveAttack(attacker, 1);
  off();

  assert.equal(attacker.alive, false);
  assert.equal(defender.alive, true);
  assert.equal(gameState.winner, defender);
  assert.equal(yieldPrompts, 0);
});

test('Heal respects the player max HP and emits heal events', async () => {
  const player = makePlayer(0, 'Player', 'king', { hp: 11, maxHP: 12 });
  const events = [];

  setupScenario([player]);

  const off = onHealEvents(events);
  await cloneCard('Heal').onBuy(player, gameState);
  off();

  assert.equal(player.hp, 12);
  assert.equal(events.length, 1);
  assert.equal(events[0].amount, 1);
});

test('Monster Snack and Stretching heal even in Tokyo', async () => {
  const player = makePlayer(0, 'Player', 'king', { hp: 7, inTokyo: 'city' });

  setupScenario([player]);

  await cloneCard('Monster Snack').onBuy(player, gameState);
  assert.equal(player.hp, 8);

  await cloneCard('Stretching').onBuy(player, gameState);
  assert.equal(player.hp, 10);
});

test('Amusement Park only scores after three triples have been collected', async () => {
  const player = makePlayer(0, 'Player');
  const amusementPark = cloneCard('Amusement Park');

  setupScenario([player]);

  player._triplesScoredThisGame = 2;
  await amusementPark.onBuy(player, gameState);
  assert.equal(player.vp, 0);

  player._triplesScoredThisGame = 3;
  await amusementPark.onBuy(player, gameState);
  assert.equal(player.vp, 4);
});

test('Herbivore is blocked by buy-phase damage cards', async () => {
  const attacker = makePlayer(0, 'Attacker');
  const defender = makePlayer(1, 'Defender');
  attacker.cards.push(cloneCard('Herbivore'));
  attacker.energy = 6;

  setupScenario([attacker, defender], {
    current: 0,
    phase: PHASES.ROLLING,
    cardStore: [cloneCard('Lightning Strike')],
    running: true,
  });

  gameState.dice = ['1', '1', '2', '2', '3', 'heart'];
  await game.resolveDice();

  assert.equal(gameState.phase, PHASES.BUYING);
  assert.equal(attacker.vp, 0);

  await buyCard(attacker, 0);
  game.running = false;
  await game.endBuyPhase();

  assert.equal(attacker.vp, 0);
  assert.equal(defender.hp, 8);
});

test('Poison Spit and Parasitic Tentacles trigger from non-claw damage', async () => {
  const attacker = makePlayer(0, 'Attacker');
  const defender = makePlayer(1, 'Defender', 'king', { hp: 10, vp: 3 });
  attacker.cards.push(cloneCard('Poison Spit'));
  attacker.cards.push(cloneCard('Parasitic Tentacles'));

  setupScenario([attacker, defender], {
    current: 0,
    phase: PHASES.BUYING,
    running: false,
  });

  await cloneCard('Lightning Strike').onBuy(attacker, gameState);
  assert.equal(defender.hp, 8);
  assert.equal(defender.vp, 2);
  assert.equal(attacker.vp, 1);

  await game.endTurn();

  assert.equal(defender.hp, 7);
  assert.equal(defender.vp, 1);
  assert.equal(attacker.vp, 2);
});

test('Made in a Lab keeps an extra store slot through buying and sweep', async () => {
  const player = makePlayer(0, 'Scientist');
  player.cards.push(cloneCard('Made in a Lab'));
  player.energy = 20;

  setupScenario([player], {
    current: 0,
    phase: PHASES.SETUP,
    running: false,
  });

  initCardStore([
    cloneCard('Apartment Building'),
    cloneCard('Commuter Train'),
    cloneCard('Corner Store'),
    cloneCard('Skyscraper'),
    cloneCard('Battery Pack'),
    cloneCard('Power Surge'),
    cloneCard('Monster Snack'),
  ], 12345);

  gameState.phase = PHASES.BUYING;
  refillStore();
  assert.equal(gameState.cardStore.length, 4);

  await buyCard(player, 0);
  assert.equal(gameState.cardStore.length, 4);

  assert.equal(sweepStore(player), true);
  assert.equal(gameState.cardStore.length, 4);
});
