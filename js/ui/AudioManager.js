import { bus } from '../utils/eventBus.js';
import { ambientMusic } from './AmbientMusic.js';

class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('kot-muted') === 'true';
    this.unlocked = false;
  }

  init() {
    // Unlock AudioContext on first user gesture (browser autoplay policy)
    const unlock = () => {
      if (this.unlocked) return;
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.unlocked = true;
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      // Start ambient music after unlock
      if (!this.muted) ambientMusic.start(this.ctx);
    };
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('touchstart', unlock, { once: true });

    // Wire bus events to sounds
    bus.on('dice:rolled', () => this.play('diceRoll'));
    bus.on('combat:damage', () => this.play('damage'));
    bus.on('player:healed', () => this.play('heal'));
    bus.on('player:vpGained', () => this.play('vp'));
    bus.on('player:energyGained', () => this.play('energy'));
    bus.on('cards:bought', () => this.play('cardBuy'));
    bus.on('tokyo:entered', () => this.play('tokyoEnter'));
    bus.on('player:eliminated', () => this.play('eliminated'));
    bus.on('game:over', () => {
      this.play('win');
      ambientMusic.stop();
    });
    bus.on('ability:triggered', () => this.play('ability'));
    bus.on('game:initialized', () => {
      if (!this.muted && this.ctx) ambientMusic.start(this.ctx);
    });
  }

  play(soundName) {
    if (this.muted || !this.ctx) return;
    try {
      switch (soundName) {
        case 'diceRoll': this._diceRoll(); break;
        case 'damage': this._damage(); break;
        case 'heal': this._heal(); break;
        case 'vp': this._vp(); break;
        case 'energy': this._energy(); break;
        case 'cardBuy': this._cardBuy(); break;
        case 'tokyoEnter': this._tokyoEnter(); break;
        case 'eliminated': this._eliminated(); break;
        case 'win': this._win(); break;
        case 'ability': this._ability(); break;
      }
    } catch (e) {
      // Silently fail if audio context is in bad state
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('kot-muted', this.muted);
    if (this.muted) {
      ambientMusic.stop();
    } else if (this.ctx) {
      ambientMusic.start(this.ctx);
    }
    return this.muted;
  }

  // --- Synth sound methods ---

  // Dice rattle: 6 rapid highpass noise bursts
  _diceRoll() {
    const now = this.ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const t = now + i * 0.04;
      const noise = this._noiseSource(0.05);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3000 + i * 500;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + 0.05);
    }
  }

  // Damage: low sine sweep 80->30Hz + lowpass noise thud
  _damage() {
    const now = this.ctx.currentTime;
    // Sine sweep
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);

    // Noise thud
    const noise = this._noiseSource(0.2);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.12, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.ctx.destination);
    noise.start(now);
    noise.stop(now + 0.25);
  }

  // Heal: ascending C5-E5-G5 sine chime
  _heal() {
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
    freqs.forEach((freq, i) => {
      const t = now + i * 0.1;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  // VP gained: triangle wave A5 ding
  _vp() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 880; // A5
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  // Energy: sawtooth sweep 100->2000Hz zap
  _energy() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(2000, now + 0.15);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Card buy: bandpass noise sweep (swoosh)
  _cardBuy() {
    const now = this.ctx.currentTime;
    const noise = this._noiseSource(0.3);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(4000, now + 0.15);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);
    filter.Q.value = 2;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
    noise.stop(now + 0.35);
  }

  // Tokyo enter: C3-E3-G3 sawtooth chord with LP filter decay
  _tokyoEnter() {
    const now = this.ctx.currentTime;
    const freqs = [130.81, 164.81, 196.0]; // C3, E3, G3
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.8);
    filter.connect(this.ctx.destination);

    freqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.connect(gain);
      gain.connect(filter);
      osc.start(now);
      osc.stop(now + 0.85);
    });
  }

  // Eliminated: descending sawtooth 200->20Hz boom
  _eliminated() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.6);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
  }

  // Win: ascending arpeggio C4->C6 + sustain chord
  _win() {
    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5]; // C4-C6 arpeggio
    notes.forEach((freq, i) => {
      const t = now + i * 0.1;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });

    // Sustain chord after arpeggio
    const chordTime = now + notes.length * 0.1;
    const chordFreqs = [523.25, 659.25, 783.99]; // C5, E5, G5
    chordFreqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.1, chordTime);
      gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 1.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(chordTime);
      osc.stop(chordTime + 1.55);
    });
  }

  // Ability shimmer: quick high-frequency sparkle
  _ability() {
    const now = this.ctx.currentTime;
    const freqs = [1200, 1600, 2000];
    freqs.forEach((freq, i) => {
      const t = now + i * 0.05;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  // --- Helper ---

  _noiseSource(duration) {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }
}

export const audioManager = new AudioManager();
