import { bus } from '../utils/eventBus.js';

class TournamentManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = false;
    this.seriesLength = 3;
    this.winsToWin = 2;
    this.currentGame = 0;
    this.wins = new Map();
    this.playerConfigs = [];
    this.aiDifficulty = 'normal';
    this.gameHistory = [];
    this.champion = null;
  }

  start(seriesLength, configs, aiDifficulty) {
    this.reset();
    this.active = true;
    this.seriesLength = seriesLength;
    this.winsToWin = Math.ceil(seriesLength / 2);
    this.currentGame = 1;
    this.playerConfigs = configs;
    this.aiDifficulty = aiDifficulty;

    for (const c of configs) {
      this.wins.set(c.name, 0);
    }
  }

  recordWin(winnerName, stats) {
    const current = this.wins.get(winnerName) || 0;
    this.wins.set(winnerName, current + 1);
    this.gameHistory.push({
      game: this.currentGame,
      winner: winnerName,
      stats,
    });

    if (this.wins.get(winnerName) >= this.winsToWin) {
      this.champion = winnerName;
    }

    this.currentGame++;
  }

  isSeriesOver() {
    return this.champion !== null;
  }

  getStandings() {
    const standings = [];
    for (const [name, wins] of this.wins) {
      standings.push({ name, wins });
    }
    standings.sort((a, b) => b.wins - a.wins);
    return standings;
  }
}

export const tournamentManager = new TournamentManager();
