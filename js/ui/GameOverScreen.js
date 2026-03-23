import { $, createElement, clearElement } from '../utils/dom.js';
import { bus } from '../utils/eventBus.js';
import { monsterSVG } from './SVGAssets.js';
import { gameState } from '../state/GameState.js';
import { tournamentManager } from '../engine/TournamentManager.js';

class GameOverScreen {
  constructor() {
    this.overlay = null;
  }

  init() {
    this.overlay = $('#dialog-overlay');
    bus.on('game:over', ({ winner, stats }) => {
      this.show(winner, stats);
    });
  }

  show(winner, stats) {
    this.overlay.classList.add('visible');
    clearElement(this.overlay);

    const container = createElement('div', { className: 'gameover-screen' });

    // Winner Banner
    container.appendChild(this.createWinnerBanner(winner));

    // Stats Table
    if (stats && stats.length > 0) {
      container.appendChild(this.createStatsTable(stats, winner));
    }

    // MVP Awards
    if (stats && stats.length > 0) {
      container.appendChild(this.createMVPAwards(stats));
    }

    // Tournament Standings
    if (tournamentManager.active) {
      container.appendChild(this.createTournamentSection(winner));
    }

    // Actions
    container.appendChild(this.createActions());

    this.overlay.appendChild(container);
  }

  createWinnerBanner(winner) {
    return createElement('div', { className: 'gameover-winner' }, [
      createElement('div', { className: 'gameover-winner-svg', innerHTML: monsterSVG(winner.monster.id, 80) }),
      createElement('h2', { className: 'gameover-winner-name', textContent: `${winner.name} Wins!` }),
      createElement('p', { className: 'gameover-winner-stats', textContent: `${winner.vp} VP | ${winner.hp} HP remaining` }),
    ]);
  }

  createStatsTable(stats, winner) {
    const section = createElement('div', { className: 'gameover-stats-section' }, [
      createElement('h3', { textContent: 'Game Statistics' }),
    ]);

    const table = createElement('table', { className: 'stats-table' });
    const thead = createElement('thead');
    const headerRow = createElement('tr', {}, [
      createElement('th', { textContent: 'Player' }),
      createElement('th', { textContent: 'Dmg' }),
      createElement('th', { textContent: 'Taken' }),
      createElement('th', { textContent: 'Kills' }),
      createElement('th', { textContent: 'Cards' }),
      createElement('th', { textContent: 'Healed' }),
      createElement('th', { textContent: 'Tokyo' }),
    ]);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = createElement('tbody');
    for (const s of stats) {
      const isWinner = s.playerId === winner.id;
      const row = createElement('tr', { className: isWinner ? 'winner-row' : '' }, [
        createElement('td', { textContent: s.playerName }),
        createElement('td', { textContent: String(s.damageDealt) }),
        createElement('td', { textContent: String(s.damageTaken) }),
        createElement('td', { textContent: String(s.kills) }),
        createElement('td', { textContent: String(s.cardsBought) }),
        createElement('td', { textContent: String(s.hpHealed) }),
        createElement('td', { textContent: String(s.turnsInTokyo) }),
      ]);
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    section.appendChild(table);
    return section;
  }

  createMVPAwards(stats) {
    const awards = [];

    // Most Destructive
    const mostDmg = stats.reduce((a, b) => a.damageDealt > b.damageDealt ? a : b);
    if (mostDmg.damageDealt > 0) {
      awards.push({ title: 'Most Destructive', player: mostDmg.playerName, value: `${mostDmg.damageDealt} damage` });
    }

    // Card Collector
    const mostCards = stats.reduce((a, b) => a.cardsBought > b.cardsBought ? a : b);
    if (mostCards.cardsBought > 0) {
      awards.push({ title: 'Card Collector', player: mostCards.playerName, value: `${mostCards.cardsBought} cards` });
    }

    // Iron Monster
    const mostTokyo = stats.reduce((a, b) => a.turnsInTokyo > b.turnsInTokyo ? a : b);
    if (mostTokyo.turnsInTokyo > 0) {
      awards.push({ title: 'Iron Monster', player: mostTokyo.playerName, value: `${mostTokyo.turnsInTokyo} turns in Tokyo` });
    }

    // Assassin
    const mostKills = stats.reduce((a, b) => a.kills > b.kills ? a : b);
    if (mostKills.kills > 0) {
      awards.push({ title: 'Assassin', player: mostKills.playerName, value: `${mostKills.kills} kills` });
    }

    if (awards.length === 0) return createElement('div');

    const grid = createElement('div', { className: 'mvp-grid' });
    for (const award of awards) {
      grid.appendChild(createElement('div', { className: 'mvp-card' }, [
        createElement('div', { className: 'mvp-title', textContent: award.title }),
        createElement('div', { className: 'mvp-player', textContent: award.player }),
        createElement('div', { className: 'mvp-value', textContent: award.value }),
      ]));
    }

    return createElement('div', { className: 'gameover-mvp-section' }, [
      createElement('h3', { textContent: 'MVP Awards' }),
      grid,
    ]);
  }

  createTournamentSection(winner) {
    const tm = tournamentManager;
    const section = createElement('div', { className: 'gameover-tournament-section' });

    if (tm.isSeriesOver()) {
      section.appendChild(createElement('h3', { textContent: `Tournament Champion: ${tm.champion}!` }));
    } else {
      section.appendChild(createElement('h3', { textContent: `Tournament — Game ${tm.currentGame - 1} of ${tm.seriesLength}` }));
    }

    const standings = tm.getStandings();
    const standingsTable = createElement('table', { className: 'standings-table' });
    const thead = createElement('thead');
    thead.appendChild(createElement('tr', {}, [
      createElement('th', { textContent: 'Player' }),
      createElement('th', { textContent: 'Wins' }),
    ]));
    standingsTable.appendChild(thead);

    const tbody = createElement('tbody');
    for (const s of standings) {
      tbody.appendChild(createElement('tr', {
        className: s.wins >= tm.winsToWin ? 'champion-row' : ''
      }, [
        createElement('td', { textContent: s.name }),
        createElement('td', { textContent: String(s.wins) }),
      ]));
    }
    standingsTable.appendChild(tbody);
    section.appendChild(standingsTable);
    return section;
  }

  createActions() {
    const tm = tournamentManager;
    const actions = createElement('div', { className: 'gameover-actions' });

    if (tm.active && !tm.isSeriesOver()) {
      actions.appendChild(createElement('button', {
        className: 'btn btn-newgame',
        textContent: 'Next Game',
        onClick: () => {
          this.hide();
          bus.emit('ui:nextGame');
        }
      }));
    }

    if (tm.active && tm.isSeriesOver()) {
      actions.appendChild(createElement('button', {
        className: 'btn btn-newgame',
        textContent: 'New Tournament',
        onClick: () => {
          this.hide();
          bus.emit('ui:newTournament');
        }
      }));
    }

    actions.appendChild(createElement('button', {
      className: 'btn btn-secondary btn-setup',
      textContent: 'Back to Setup',
      onClick: () => {
        this.hide();
        bus.emit('ui:newGame');
      }
    }));

    return actions;
  }

  hide() {
    this.overlay.classList.remove('visible');
    clearElement(this.overlay);
  }
}

export const gameOverScreen = new GameOverScreen();
