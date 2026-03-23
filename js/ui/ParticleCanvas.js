/**
 * Canvas-based particle system with pre-allocated object pool.
 * Uses an active set for O(n) iteration instead of scanning entire pool.
 */

import { PARTICLE_TYPES } from './particles.js';

const POOL_SIZE = 500;

class Particle {
  constructor(index) {
    this.index = index;
    this.reset();
  }

  reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.size = 4;
    this.color = '#fff';
    this.alpha = 1;
    this.life = 0;
    this.maxLife = 40;
    this.gravity = 0;
    this.fadeRate = 0.025;
    this.shrinkRate = 0.02;
    this.shape = 'circle';
    this.rotation = 0;
    this.rotationSpeed = 0;
  }
}

class ParticleCanvas {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.pool = [];
    this.active = new Set();  // indices of active particles
    this.freeList = [];       // stack of free particle indices
    this.running = false;
    this.animId = null;
    this.continuousEffects = [];

    // Pre-allocate particle pool
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push(new Particle(i));
      this.freeList.push(i);
    }
  }

  init(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /** Get an inactive particle from the pool */
  acquire() {
    if (this.freeList.length === 0) return null;
    const idx = this.freeList.pop();
    const p = this.pool[idx];
    this.active.add(idx);
    return p;
  }

  /** Return a particle to the pool */
  release(p) {
    this.active.delete(p.index);
    this.freeList.push(p.index);
    p.reset();
  }

  /** Burst of particles at screen coordinates */
  spawn(type, x, y) {
    const config = PARTICLE_TYPES[type];
    if (!config) return;

    for (let i = 0; i < config.count; i++) {
      const p = this.acquire();
      if (!p) break;

      const angle = (config.baseAngle || 0) + (Math.random() - 0.5) * config.spread;
      const speed = config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0]);
      const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);

      p.active = true;
      p.x = x + (Math.random() - 0.5) * 10;
      p.y = y + (Math.random() - 0.5) * 10;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = size;
      p.color = config.colors[Math.floor(Math.random() * config.colors.length)];
      p.alpha = 1;
      p.life = 0;
      p.maxLife = config.lifetime + Math.random() * 10;
      p.gravity = config.gravity;
      p.fadeRate = config.fadeRate;
      p.shrinkRate = config.shrinkRate;
      p.shape = config.shape;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 0.15;
    }

    this.ensureRunning();
  }

  /** Spawn particles continuously for a duration */
  spawnContinuous(type, x, y, durationMs) {
    const endTime = performance.now() + durationMs;
    this.continuousEffects.push({ type, x, y, endTime });
    this.ensureRunning();
  }

  /** Get center coordinates of a DOM element on the canvas */
  getElementCenter(el) {
    if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  ensureRunning() {
    if (this.running) return;
    this.running = true;
    this.tick();
  }

  tick() {
    if (!this.ctx) return;

    // Process continuous effects
    const now = performance.now();
    this.continuousEffects = this.continuousEffects.filter(eff => {
      if (now < eff.endTime) {
        this.spawn(eff.type, eff.x, eff.y);
        return true;
      }
      return false;
    });

    // Update & draw — only iterate active particles
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const toRelease = [];

    for (const idx of this.active) {
      const p = this.pool[idx];

      // Update physics
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.fadeRate;
      p.size -= p.shrinkRate;
      p.life++;
      p.rotation += p.rotationSpeed;

      if (p.alpha <= 0 || p.size <= 0 || p.life >= p.maxLife) {
        toRelease.push(p);
        continue;
      }

      // Draw
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.drawShape(p);
      this.ctx.restore();
    }

    // Release dead particles
    for (const p of toRelease) {
      this.release(p);
    }

    if (this.active.size > 0 || this.continuousEffects.length > 0) {
      this.animId = requestAnimationFrame(() => this.tick());
    } else {
      this.running = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // ── Unified shape dispatch ──

  drawShape(p) {
    this.ctx.fillStyle = p.color;
    switch (p.shape) {
      case 'circle': this.drawCircle(p); break;
      case 'star': this.drawStar(p); break;
      case 'heart': this.drawHeart(p); break;
      case 'bolt': this.drawBolt(p); break;
      case 'skull': this.drawSkull(p); break;
      case 'confetti': this.drawConfetti(p); break;
    }
  }

  drawCircle(p) {
    this.ctx.beginPath();
    this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawStar(p) {
    const s = p.size;
    this.ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const method = i === 0 ? 'moveTo' : 'lineTo';
      this.ctx[method](Math.cos(angle) * s, Math.sin(angle) * s);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawHeart(p) {
    const s = p.size;
    this.ctx.beginPath();
    this.ctx.moveTo(0, s * 0.4);
    this.ctx.bezierCurveTo(-s, -s * 0.3, -s * 0.3, -s, 0, -s * 0.4);
    this.ctx.bezierCurveTo(s * 0.3, -s, s, -s * 0.3, 0, s * 0.4);
    this.ctx.fill();
  }

  drawBolt(p) {
    const s = p.size;
    this.ctx.beginPath();
    this.ctx.moveTo(s * 0.2, -s);
    this.ctx.lineTo(-s * 0.4, 0);
    this.ctx.lineTo(0, 0);
    this.ctx.lineTo(-s * 0.2, s);
    this.ctx.lineTo(s * 0.4, 0);
    this.ctx.lineTo(0, 0);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawSkull(p) {
    const s = p.size;
    this.ctx.beginPath();
    this.ctx.arc(0, -s * 0.15, s * 0.6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.beginPath();
    this.ctx.arc(-s * 0.2, -s * 0.2, s * 0.15, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(s * 0.2, -s * 0.2, s * 0.15, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = p.color;
    this.ctx.fillRect(-s * 0.35, s * 0.2, s * 0.7, s * 0.3);
  }

  drawConfetti(p) {
    const s = p.size;
    this.ctx.fillRect(-s / 2, -s / 4, s, s / 2);
  }
}

export const particleCanvas = new ParticleCanvas();
