import { gameState } from '../state/GameState.js';
import { spendEnergy, hasCard } from '../state/actions.js';
import { CARD_STORE_SIZE, SWEEP_COST, PHASES } from '../data/constants.js';
import { bus } from '../utils/eventBus.js';
import { shuffle } from '../utils/random.js';

export function initCardStore(cardDefinitions, seed) {
  gameState.cardDeck = shuffle(cardDefinitions.map((def, i) => ({ ...def, instanceId: i })), seed);
  refillStore();
}

function getStoreTargetSize(player = gameState.currentPlayer) {
  const hasExtraSlot = gameState.phase === PHASES.BUYING && player && hasCard(player, 'Made in a Lab');
  return CARD_STORE_SIZE + (hasExtraSlot ? 1 : 0);
}

export function refillStore(targetSize = getStoreTargetSize()) {
  while (gameState.cardStore.length < targetSize && gameState.cardDeck.length > 0) {
    gameState.cardStore = [...gameState.cardStore, gameState.cardDeck.pop()];
    gameState.cardDeck = [...gameState.cardDeck];
  }
  bus.emit('cards:storeUpdated', { store: gameState.cardStore });
}

export async function buyCard(player, cardIndex) {
  const card = gameState.cardStore[cardIndex];
  if (!card) return false;
  if (!spendEnergy(player, card.cost)) return false;

  const newStore = [...gameState.cardStore];
  newStore.splice(cardIndex, 1);
  gameState.cardStore = newStore;

  if (card.type === 'keep') {
    player.cards.push(card);
  }

  // Apply immediate/discard effects before emitting cards:bought
  // so the UI sees the updated state (e.g. Even Bigger HP increase)
  if (card.onBuy) {
    await card.onBuy(player, gameState);
  }

  bus.emit('cards:bought', { player, card });

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
