import { gameState, createPlayerState } from '../state/GameState.js';
import { bus } from '../utils/eventBus.js';
import { PHASES, WIN_VP, MAX_HP } from '../data/constants.js';
import { startRolling, confirmDice, countDice } from './Dice.js';
import { resolveAttack } from './Combat.js';
import { resolveVP } from './Scoring.js';
import { awardTokyoStartVP, tryEnterTokyo, handleYield } from './Tokyo.js';
import { addEnergy, healPlayer, addVP, hasCard, dealDamage, spendEnergy } from '../state/actions.js';
import { initCardStore, refillStore } from './Cards.js';
import { statsTracker } from './StatsTracker.js';

class Game {
  constructor() {
    this.running = false;
    this.setupListeners();
  }

  setupListeners() {
    bus.on('tokyo:yield', ({ player, attacker }) => {
      handleYield(player, attacker);
    });

    bus.on('game:vpWin', ({ player }) => {
      this.endGame(player);
    });

    bus.on('game:lastStanding', ({ player }) => {
      this.endGame(player);
    });
  }

  initGame(playerConfigs, cardDefinitions = []) {
    gameState.reset();
    this.running = true;

    const players = playerConfigs.map((config, i) =>
      createPlayerState(i, config.name, config.monster, config.isAI)
    );
    gameState.players = players;
    gameState.currentPlayerIndex = 0;
    gameState.round = 1;

    if (cardDefinitions.length > 0) {
      initCardStore(cardDefinitions);
    }

    statsTracker.init(players);
    bus.emit('game:initialized', { players });
    this.startTurn();
  }

  startTurn() {
    if (!this.running) return;
    const player = gameState.currentPlayer;
    if (!player.alive) {
      this.nextPlayer();
      return;
    }

    gameState.phase = PHASES.START_TURN;
    bus.emit('turn:start', { player, round: gameState.round });

    // Initialize damage tracking for Poison Spit
    player._damagedThisTurn = new Set();

    // Meka Dragon: reset shield at own turn start
    if (player.monster.id === 'mekadragon') player._shieldActive = true;

    // Award VP for starting turn in Tokyo
    awardTokyoStartVP(player);

    // Cyber Bunny: Energized — +1 energy at start of each turn
    if (player.monster.id === 'cyberbunny') {
      addEnergy(player, 1);
      bus.emit('ability:triggered', { player, ability: player.monster.ability, detail: '+1 energy' });
    }

    // Keep card: Friend of Children — +1 VP at start of turn
    if (hasCard(player, 'Friend of Children')) addVP(player, 1);

    // Keep card: Regeneration — heal 1 even in Tokyo
    if (hasCard(player, 'Regeneration')) {
      player.hp = Math.min(player.hp + 1, player.maxHP || MAX_HP);
      bus.emit('player:healed', { player, amount: 1 });
    }

    // Check win after VP award
    if (this.checkWin()) return;

    // Move to rolling phase
    gameState.phase = PHASES.ROLLING;
    startRolling();

    if (player.isAI) {
      bus.emit('ai:turn', { player });
    }
  }

  async resolveDice() {
    const player = gameState.currentPlayer;
    const counts = countDice(gameState.dice);

    gameState.phase = PHASES.RESOLVING_DICE;
    bus.emit('dice:resolving', { player, counts });

    // 1. VP from numbers
    resolveVP(player, counts);
    if (this.checkWin()) return;

    // 2. Energy from lightning
    const lightning = counts['lightning'] || 0;
    if (lightning > 0) {
      addEnergy(player, lightning);
    }

    // 3. Attack with claws
    const rawClaws = counts['claw'] || 0;
    let claws = rawClaws;
    // Gigazaur: Frenzy — 3+ claws grants +1 damage
    if (player.monster.id === 'gigazaur' && claws >= 3) {
      claws += 1;
      bus.emit('ability:triggered', { player, ability: player.monster.ability, detail: '+1 bonus claw damage' });
    }
    if (claws > 0) {
      await resolveAttack(player, claws);
      if (this.checkWin()) return;
    }

    // Keep card: Herbivore — +1 VP if no claws dealt
    if (rawClaws === 0 && hasCard(player, 'Herbivore')) {
      addVP(player, 1);
      if (this.checkWin()) return;
    }

    // Keep card: Omnivore — +2 VP if all 6 die faces present
    if (hasCard(player, 'Omnivore')) {
      const faces = new Set(gameState.dice);
      if (faces.size === 6) {
        addVP(player, 2);
        if (this.checkWin()) return;
      }
    }

    // 4. If not in Tokyo, try to enter (Tokyo may be empty or yielded)
    if (!player.inTokyo && player.alive) {
      tryEnterTokyo(player);
      if (this.checkWin()) return;
    }

    // 5. Heal with hearts (not in Tokyo)
    const hearts = counts['heart'] || 0;
    if (hearts > 0) {
      healPlayer(player, hearts);
    }

    // Opportunist (id 45): if 0 hearts rolled, gain 1 energy
    if (hearts === 0 && hasCard(player, 'Opportunist')) {
      addEnergy(player, 1);
    }

    // Move to buying phase
    this.startBuyPhase();
  }

  startBuyPhase() {
    if (gameState.cardStore.length > 0) {
      gameState.phase = PHASES.BUYING;
      const player = gameState.currentPlayer;

      // Made in a Lab (id 50): draw 1 extra card into store
      if (hasCard(player, 'Made in a Lab')) {
        refillStore(); // will add card if store < CARD_STORE_SIZE, but also try adding one more
        if (gameState.cardDeck.length > 0) {
          gameState.cardStore = [...gameState.cardStore, gameState.cardDeck.pop()];
          gameState.cardDeck = [...gameState.cardDeck];
          bus.emit('cards:storeUpdated', { store: gameState.cardStore });
        }
      }

      bus.emit('phase:buying', { player });

      if (player.isAI) {
        bus.emit('ai:buy', { player });
      }
    } else {
      this.endTurn();
    }
  }

  endBuyPhase() {
    this.endTurn();
  }

  endTurn() {
    const player = gameState.currentPlayer;
    gameState.phase = PHASES.END_TURN;

    // Poison Spit (id 46): deal 1 damage to each player damaged this turn
    if (hasCard(player, 'Poison Spit') && player._damagedThisTurn && player._damagedThisTurn.size > 0) {
      for (const target of player._damagedThisTurn) {
        if (target.alive && target !== player) {
          dealDamage(player, target, 1);
        }
      }
      if (this.checkWin()) return;
    }

    // Keep card: Solar Powered — +1 energy if at 0
    if (player.energy === 0 && hasCard(player, 'Solar Powered')) {
      addEnergy(player, 1);
    }

    // Keep card: Energy Hoarder — +1 VP per 6 energy
    if (hasCard(player, 'Energy Hoarder') && player.energy >= 6) {
      addVP(player, Math.floor(player.energy / 6));
      if (this.checkWin()) return;
    }

    bus.emit('turn:end', { player });

    // Frenzy (id 33): extra turn
    if (player._extraTurn) {
      player._extraTurn = false;
      this.startTurn();
    } else {
      this.nextPlayer();
    }
  }

  nextPlayer() {
    let next = gameState.currentPlayerIndex;
    const numPlayers = gameState.players.length;
    let attempts = 0;

    do {
      next = (next + 1) % numPlayers;
      attempts++;
      if (next === 0) {
        gameState.round++;
      }
    } while (!gameState.players[next].alive && attempts < numPlayers);

    gameState.currentPlayerIndex = next;
    this.startTurn();
  }

  checkWin() {
    if (gameState.winner) return true;
    const alive = gameState.alivePlayers;
    if (alive.length === 1) {
      this.endGame(alive[0]);
      return true;
    }
    for (const p of alive) {
      if (p.vp >= WIN_VP) {
        this.endGame(p);
        return true;
      }
    }
    return false;
  }

  endGame(winner) {
    if (gameState.winner) return;
    this.running = false;
    gameState.winner = winner;
    gameState.phase = PHASES.GAME_OVER;
    bus.emit('game:over', { winner, stats: statsTracker.getAllStats() });
  }
}

export const game = new Game();
