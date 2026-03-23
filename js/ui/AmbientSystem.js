import { bus } from '../utils/eventBus.js';
import { particleCanvas } from './ParticleCanvas.js';

class AmbientSystem {
  constructor() {
    this.emberInterval = null;
    this.fireInterval = null;
    this.running = false;
    this.tokyoSlotCache = []; // cached occupied slot centers
  }

  start() {
    if (this.running) return;
    this.running = true;

    // Background embers: spawn from random bottom position every 500ms
    this.emberInterval = setInterval(() => {
      const x = Math.random() * window.innerWidth;
      const y = window.innerHeight + 10;
      particleCanvas.spawn('ambient', x, y);
    }, 500);

    // Phase flash on phase changes
    bus.on('state:changed', this._onStateChanged);

    // Cache Tokyo slot positions when occupancy changes
    bus.on('tokyo:entered', this._updateSlotCache);
    bus.on('tokyo:left', this._updateSlotCache);
    bus.on('tokyo:vacated', this._updateSlotCache);
    bus.on('game:initialized', this._clearSlotCache);

    // Persistent Tokyo fire using cached positions — less frequent (500ms)
    this.fireInterval = setInterval(() => {
      for (const pos of this.tokyoSlotCache) {
        particleCanvas.spawn('fire', pos.x, pos.y);
      }
    }, 500);
  }

  stop() {
    this.running = false;
    if (this.emberInterval) { clearInterval(this.emberInterval); this.emberInterval = null; }
    if (this.fireInterval) { clearInterval(this.fireInterval); this.fireInterval = null; }
    bus.off('state:changed', this._onStateChanged);
    bus.off('tokyo:entered', this._updateSlotCache);
    bus.off('tokyo:left', this._updateSlotCache);
    bus.off('tokyo:vacated', this._updateSlotCache);
    bus.off('game:initialized', this._clearSlotCache);
    this.tokyoSlotCache = [];
  }

  _onStateChanged = ({ prop, value, old }) => {
    if (prop === 'phase' && value !== old) {
      const flash = document.createElement('div');
      flash.className = 'phase-flash';
      document.body.appendChild(flash);
      flash.addEventListener('animationend', () => flash.remove());
    }
  };

  _updateSlotCache = () => {
    // Defer slightly so DOM has updated
    requestAnimationFrame(() => {
      const slots = document.querySelectorAll('.tokyo-slot.occupied');
      this.tokyoSlotCache = [];
      for (const slot of slots) {
        this.tokyoSlotCache.push(particleCanvas.getElementCenter(slot));
      }
    });
  };

  _clearSlotCache = () => {
    this.tokyoSlotCache = [];
  };
}

export const ambientSystem = new AmbientSystem();
