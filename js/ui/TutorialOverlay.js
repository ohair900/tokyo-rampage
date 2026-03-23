import { createElement, clearElement } from '../utils/dom.js';
import { monsterSVG, diceFaceSVG } from './SVGAssets.js';
import { MONSTERS } from '../data/monsters.js';

const STORAGE_KEY = 'kot-tutorial-dismissed';

const STEPS = [
  {
    title: 'Welcome to Tokyo Rampage!',
    render(body) {
      body.innerHTML = `<p>You are a giant monster battling for control of Tokyo! Crush your opponents, power up with cards, and become the King!</p>`;
      const illustration = createElement('div', { className: 'tutorial-illustration' });
      for (const id of ['king', 'gigazaur', 'kraken']) {
        const preview = createElement('div', { className: 'monster-preview', innerHTML: monsterSVG(id, 48) });
        illustration.appendChild(preview);
      }
      body.appendChild(illustration);
    }
  },
  {
    title: 'How to Win',
    render(body) {
      body.innerHTML = `
        <p>There are <strong>two ways to win</strong>:</p>
        <ul>
          <li>Reach <strong>20 Victory Points (VP)</strong></li>
          <li>Be the <strong>last monster standing</strong></li>
        </ul>
        <p>Balance offense and defense — going all-in on either can backfire!</p>
      `;
    }
  },
  {
    title: 'Rolling Dice',
    render(body) {
      body.innerHTML = `<p>Each turn you roll <strong>6 dice</strong> and can reroll up to <strong>2 times</strong>. Click dice to keep them between rolls.</p>`;
      const illustration = createElement('div', { className: 'tutorial-illustration' });
      const faces = [
        { face: '1', label: '1 VP (triple)' },
        { face: '2', label: '2 VP (triple)' },
        { face: '3', label: '3 VP (triple)' },
        { face: 'claw', label: 'Attack' },
        { face: 'heart', label: 'Heal' },
        { face: 'lightning', label: 'Energy' },
      ];
      for (const { face, label } of faces) {
        const icon = createElement('div', { className: 'dice-icon' });
        icon.innerHTML = diceFaceSVG(face, 32);
        icon.appendChild(createElement('span', { textContent: label }));
        illustration.appendChild(icon);
      }
      body.appendChild(illustration);
      body.appendChild(createElement('p', { innerHTML: 'Rolling <strong>3 of the same number</strong> scores VP equal to that number. Each extra scores +1 VP.' }));
    }
  },
  {
    title: 'Tokyo',
    render(body) {
      body.innerHTML = `<p>Tokyo is the central battleground. Entering gives <strong>+1 VP</strong>, and starting your turn there gives <strong>+2 VP</strong>.</p>`;
      const diagram = createElement('div', { className: 'tutorial-zone-diagram' });
      diagram.innerHTML = `
        <div class="tutorial-zone inside">Inside Tokyo<br><small>Attack all outside</small></div>
        <div class="tutorial-zone-arrow">&harr;</div>
        <div class="tutorial-zone outside">Outside Tokyo<br><small>Attack those inside</small></div>
      `;
      body.appendChild(diagram);
      body.appendChild(createElement('p', { innerHTML: '<strong>You can\'t heal</strong> while in Tokyo. When hit, you may <strong>yield</strong> and leave.' }));
    }
  },
  {
    title: 'Power Cards',
    render(body) {
      body.innerHTML = `<p>Spend energy to buy power cards from the store. There are two types:</p>`;
      const types = createElement('div', { className: 'tutorial-card-types' });
      types.innerHTML = `
        <div class="tutorial-card-type keep"><strong>Keep</strong>Permanent effect that stays with you</div>
        <div class="tutorial-card-type discard"><strong>Discard</strong>Immediate one-time effect</div>
      `;
      body.appendChild(types);
      body.appendChild(createElement('p', { innerHTML: 'Spend 2 energy to <strong>sweep</strong> the store and get 3 new cards.' }));
    }
  },
  {
    title: 'Monster Abilities',
    render(body) {
      body.innerHTML = `<p>Each monster has a <strong>unique ability</strong>:</p>`;
      const grid = createElement('div', { className: 'tutorial-monster-grid' });
      for (const m of MONSTERS) {
        const item = createElement('div', { className: 'tutorial-monster-item' });
        item.innerHTML = monsterSVG(m.id, 32);
        item.appendChild(createElement('div', { className: 'name', textContent: m.name }));
        item.appendChild(createElement('div', { className: 'ability', textContent: m.ability ? m.ability.name : '' }));
        grid.appendChild(item);
      }
      body.appendChild(grid);
    }
  },
  {
    title: 'Strategy Tips',
    render(body) {
      body.innerHTML = `
        <ul>
          <li><strong>Number triples</strong> are a reliable VP source — keep matching numbers when you can</li>
          <li><strong>Tokyo is risky</strong> — you earn VP fast but can't heal. Yield when low on HP!</li>
          <li><strong>Energy matters</strong> — save up for powerful cards that can swing the game</li>
          <li><strong>Card synergies</strong> — some cards combo together for massive effects</li>
          <li><strong>Watch your HP</strong> — being eliminated means you lose, no matter how many VP you had</li>
        </ul>
      `;
    }
  },
];

class TutorialOverlay {
  constructor() {
    this.overlay = null;
    this.currentStep = 0;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.overlay = createElement('div', { id: 'tutorial-overlay' });
    document.body.appendChild(this.overlay);

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Auto-show on first visit
    if (!localStorage.getItem(STORAGE_KEY)) {
      setTimeout(() => this.show(), 300);
    }
  }

  show() {
    if (!this.overlay) return;
    this.currentStep = 0;
    this.renderStep();
    this.overlay.classList.add('visible');
  }

  close() {
    if (!this.overlay) return;
    this.overlay.classList.remove('visible');
  }

  renderStep() {
    clearElement(this.overlay);
    const step = STEPS[this.currentStep];
    const panel = createElement('div', { className: 'tutorial-panel' });

    // Title
    panel.appendChild(createElement('div', { className: 'tutorial-step-title', textContent: step.title }));

    // Body
    const body = createElement('div', { className: 'tutorial-body' });
    step.render(body);
    panel.appendChild(body);

    // Dots
    const dots = createElement('div', { className: 'tutorial-dots' });
    for (let i = 0; i < STEPS.length; i++) {
      const cls = i === this.currentStep ? 'tutorial-dot active' : i < this.currentStep ? 'tutorial-dot visited' : 'tutorial-dot';
      dots.appendChild(createElement('div', { className: cls }));
    }
    panel.appendChild(dots);

    // Nav buttons
    const nav = createElement('div', { className: 'tutorial-nav' });
    if (this.currentStep > 0) {
      nav.appendChild(createElement('button', {
        className: 'btn btn-secondary',
        textContent: 'Previous',
        onClick: () => { this.currentStep--; this.renderStep(); }
      }));
    }
    if (this.currentStep < STEPS.length - 1) {
      nav.appendChild(createElement('button', {
        className: 'btn',
        textContent: 'Next',
        onClick: () => { this.currentStep++; this.renderStep(); }
      }));
      nav.appendChild(createElement('button', {
        className: 'btn btn-secondary',
        textContent: 'Skip',
        onClick: () => this.close()
      }));
    } else {
      nav.appendChild(createElement('button', {
        className: 'btn',
        textContent: 'Got it!',
        onClick: () => this.close()
      }));
    }
    panel.appendChild(nav);

    // Remember checkbox
    const remember = createElement('label', { className: 'tutorial-remember' });
    const checkbox = createElement('input', { type: 'checkbox' });
    if (localStorage.getItem(STORAGE_KEY)) checkbox.checked = true;
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        localStorage.setItem(STORAGE_KEY, '1');
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    });
    remember.appendChild(checkbox);
    remember.appendChild(document.createTextNode("Don't show again on startup"));
    panel.appendChild(remember);

    this.overlay.appendChild(panel);
  }
}

export const tutorialOverlay = new TutorialOverlay();
