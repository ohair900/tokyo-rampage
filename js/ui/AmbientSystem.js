import { bus } from '../utils/eventBus.js';

class AmbientSystem {
  constructor() {
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    bus.on('state:changed', this._onStateChanged);
  }

  stop() {
    this.running = false;
    bus.off('state:changed', this._onStateChanged);
  }

  _onStateChanged = ({ prop, value, old }) => {
    if (prop === 'phase' && value !== old) {
      const flash = document.createElement('div');
      flash.className = 'phase-flash';
      document.body.appendChild(flash);
      flash.addEventListener('animationend', () => flash.remove());
    }
  };
}

export const ambientSystem = new AmbientSystem();
