/**
 * Particle type configurations for the visual effects system.
 * Each config defines appearance, motion, and lifetime for a particle burst.
 */

export const PARTICLE_TYPES = {
  // Damage burst — red/orange circles scatter outward with gravity
  explosion: {
    count: 20,
    colors: ['#e74c3c', '#e94560', '#f39c12', '#ff6b6b', '#d35400'],
    shape: 'circle',
    sizeRange: [3, 7],
    speedRange: [2, 6],
    gravity: 0.12,
    lifetime: 40,
    fadeRate: 0.025,
    shrinkRate: 0.02,
    spread: Math.PI * 2,
  },

  // VP gain — green/gold stars float upward
  sparkle: {
    count: 15,
    colors: ['#2ecc71', '#27ae60', '#f1c40f', '#82e0aa', '#58d68d'],
    shape: 'star',
    sizeRange: [3, 6],
    speedRange: [1, 3],
    gravity: -0.04,
    lifetime: 50,
    fadeRate: 0.02,
    shrinkRate: 0.01,
    spread: Math.PI * 0.8,
    baseAngle: -Math.PI / 2,
  },

  // Energy gain — yellow bolt shapes scatter
  lightning: {
    count: 8,
    colors: ['#f1c40f', '#f9e900', '#ffd32a', '#fff200'],
    shape: 'bolt',
    sizeRange: [4, 8],
    speedRange: [2, 5],
    gravity: 0,
    lifetime: 35,
    fadeRate: 0.03,
    shrinkRate: 0.015,
    spread: Math.PI * 2,
  },

  // Healing — green/pink hearts float up
  hearts: {
    count: 10,
    colors: ['#2ecc71', '#27ae60', '#e91e63', '#ff69b4', '#82e0aa'],
    shape: 'heart',
    sizeRange: [4, 7],
    speedRange: [0.8, 2.5],
    gravity: -0.03,
    lifetime: 55,
    fadeRate: 0.018,
    shrinkRate: 0.008,
    spread: Math.PI * 0.6,
    baseAngle: -Math.PI / 2,
  },

  // Tokyo fire — continuous orange particles upward
  fire: {
    count: 3,
    colors: ['#e67e22', '#f39c12', '#e74c3c', '#d35400', '#f1c40f'],
    shape: 'circle',
    sizeRange: [2, 5],
    speedRange: [1, 3],
    gravity: -0.06,
    lifetime: 30,
    fadeRate: 0.033,
    shrinkRate: 0.025,
    spread: Math.PI * 0.4,
    baseAngle: -Math.PI / 2,
  },

  // Elimination — gray/red skulls burst outward
  skull: {
    count: 12,
    colors: ['#7f8c8d', '#95a5a6', '#e74c3c', '#c0392b', '#bdc3c7'],
    shape: 'skull',
    sizeRange: [4, 8],
    speedRange: [1.5, 4],
    gravity: 0.08,
    lifetime: 50,
    fadeRate: 0.02,
    shrinkRate: 0.012,
    spread: Math.PI * 2,
  },

  // Ambient embers — small particles float upward slowly
  ambient: {
    count: 2,
    colors: ['#e67e22', '#e74c3c', '#f1c40f', '#d35400', '#f39c12'],
    shape: 'circle',
    sizeRange: [1, 3],
    speedRange: [0.3, 0.8],
    gravity: -0.02,
    lifetime: 120,
    fadeRate: 0.008,
    shrinkRate: 0.005,
    spread: Math.PI * 0.4,
    baseAngle: -Math.PI / 2,
  },

  // Win celebration — multicolor confetti cascade
  confetti: {
    count: 60,
    colors: ['#e94560', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#1abc9c', '#e91e63'],
    shape: 'confetti',
    sizeRange: [3, 6],
    speedRange: [3, 8],
    gravity: 0.1,
    lifetime: 80,
    fadeRate: 0.012,
    shrinkRate: 0,
    spread: Math.PI * 0.8,
    baseAngle: -Math.PI / 2,
  },
};
