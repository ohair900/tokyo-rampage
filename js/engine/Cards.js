import { gameState } from '../state/GameState.js';
import { spendEnergy } from '../state/actions.js';
import { CARD_STORE_SIZE, SWEEP_COST } from '../data/constants.js';
import { bus } from '../utils/eventBus.js';
import { shuffle } from '../utils/random.js';

export function initCardStore(cardDefinitions, seed) {
  gameState.cardDeck = shuffle(cardDefinitions.map((def, i) => ({ ...def, instanceId: i })), seed);
  refillStore();
}

export function refillStore() {
  while (gameState.cardStore.length < CARD_STORE_SIZE && gameState.cardDeck.length > 0) {
    gameState.cardStore = [...gameState.cardStore, gameState.cardDeck.pop()];
    gameState.cardDeck = [...gameState.cardDeck];
  }
  bus.emit('cards:storeUpdated', { store: gameState.cardStore });
}

export function buyCard(player, cardIndex) {
  const card = gameState.cardStore[cardIndex];
  if (!card) return false;
  if (!spendEnergy(player, card.cost)) return false;

  const newStore = [...gameState.cardStore];
  newStore.splice(cardIndex, 1);
  gameState.cardStore = newStore;

  if (card.type === 'keep') {
    player.cards.push(card);
  }

  bus.emit('cards:bought', { player, card });

  // Apply immediate/discard effects
  if (card.onBuy) {
    card.onBuy(player, gameState);
  }

  refillStore();
  return true;
}

export function sweepStore(player) {
  if (!spendEnergy(player, SWEEP_COST)) return false;

  // Put old cards at bottom of deck
  const oldCards = gameState.cardStore;
  gameState.cardStore = [];
  gameState.cardDeck = [...oldCards, ...gameState.cardDeck];

  refillStore();
  bus.emit('cards:swept', { player });
  return true;
}
