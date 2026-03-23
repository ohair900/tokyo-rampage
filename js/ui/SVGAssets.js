/**
 * SVG Assets — neon-line-art style inline SVGs for Tokyo Rampage.
 * All functions return SVG markup strings.
 */

// ── Monster Portraits ──────────────────────────────────────────

const monsters = {
  // Gorilla — fierce eyes, gold crown
  king(size) {
    return `<svg class="monster-portrait" viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Crown -->
      <g class="monster-anim-crown">
        <polygon points="20,18 24,8 28,15 32,5 36,15 40,8 44,18" stroke="#f1c40f" stroke-width="1.5" fill="rgba(241,196,15,0.15)"/>
      </g>
      <!-- Head -->
      <ellipse cx="32" cy="36" rx="16" ry="18" stroke="#e74c3c" stroke-width="2" fill="rgba(231,76,60,0.08)"/>
      <!-- Brow -->
      <path d="M22 30 Q27 26 32 30 Q37 26 42 30" stroke="#e74c3c" stroke-width="1.5" fill="none"/>
      <!-- Eyes -->
      <ellipse cx="26" cy="34" rx="3" ry="2.5" fill="#e74c3c" opacity="0.9"/>
      <ellipse cx="38" cy="34" rx="3" ry="2.5" fill="#e74c3c" opacity="0.9"/>
      <circle cx="26" cy="34" r="1" fill="#fff"/>
      <circle cx="38" cy="34" r="1" fill="#fff"/>
      <!-- Nose -->
      <ellipse cx="32" cy="40" rx="4" ry="2.5" stroke="#e74c3c" stroke-width="1" fill="none"/>
      <!-- Mouth -->
      <path d="M26 46 Q32 50 38 46" stroke="#e74c3c" stroke-width="1.5" fill="none"/>
      <!-- Jaw lines -->
      <path d="M18 38 Q16 44 20 50" stroke="#e74c3c" stroke-width="1" opacity="0.5"/>
      <path d="M46 38 Q48 44 44 50" stroke="#e74c3c" stroke-width="1" opacity="0.5"/>
    </svg>`;
  },

  // T-Rex — spiky plates, open jaw
  gigazaur(size) {
    return `<svg class="monster-portrait" viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Dorsal spikes -->
      <path d="M14 20 L18 10 L22 20 L26 8 L30 18 L34 12 L36 20" stroke="#2ecc71" stroke-width="1.5" fill="rgba(46,204,113,0.12)"/>
      <!-- Head -->
      <path d="M12 28 Q12 20 22 20 L44 18 Q52 18 52 26 L52 34 Q52 42 44 42 L30 44 Q22 46 18 42 L12 38 Z" stroke="#2ecc71" stroke-width="2" fill="rgba(46,204,113,0.08)"/>
      <!-- Eye -->
      <circle cx="38" cy="26" r="4" stroke="#2ecc71" stroke-width="1.5" fill="rgba(46,204,113,0.2)"/>
      <circle cx="39" cy="25" r="1.5" fill="#2ecc71"/>
      <!-- Nostril -->
      <circle cx="50" cy="24" r="1.5" stroke="#2ecc71" stroke-width="1"/>
      <!-- Jaw separation -->
      <path d="M14 36 L50 34" stroke="#2ecc71" stroke-width="1.2" opacity="0.6"/>
      <!-- Teeth + Lower jaw -->
      <g class="monster-anim-jaw">
        <path d="M18 36 L20 40 L22 36 L24 40 L26 36 L28 40 L30 36 L32 40 L34 36 L36 40 L38 36 L40 40 L42 36" stroke="#2ecc71" stroke-width="1" fill="none"/>
        <path d="M14 38 Q16 50 30 48 L44 44 Q50 42 52 36" stroke="#2ecc71" stroke-width="1.5" fill="rgba(46,204,113,0.05)"/>
      </g>
      <!-- Texture lines -->
      <path d="M20 24 L24 26" stroke="#2ecc71" stroke-width="0.8" opacity="0.4"/>
      <path d="M24 22 L28 24" stroke="#2ecc71" stroke-width="0.8" opacity="0.4"/>
    </svg>`;
  },

  // Mechanical dragon — gear eye, armored plates
  mekadragon(size) {
    return `<svg class="monster-portrait" viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Head armor -->
      <path d="M10 32 L16 16 L32 10 L48 16 L54 32 L48 46 L32 52 L16 46 Z" stroke="#9b59b6" stroke-width="2" fill="rgba(155,89,182,0.08)"/>
      <!-- Plate lines -->
      <path d="M16 16 L32 32" stroke="#9b59b6" stroke-width="1" opacity="0.4"/>
      <path d="M48 16 L32 32" stroke="#9b59b6" stroke-width="1" opacity="0.4"/>
      <path d="M16 46 L32 32" stroke="#9b59b6" stroke-width="1" opacity="0.4"/>
      <path d="M48 46 L32 32" stroke="#9b59b6" stroke-width="1" opacity="0.4"/>
      <!-- Gear-eye -->
      <g class="monster-anim-gear">
        <circle cx="32" cy="28" r="8" stroke="#9b59b6" stroke-width="1.5"/>
        <circle cx="32" cy="28" r="5" stroke="#9b59b6" stroke-width="1"/>
        <circle cx="32" cy="28" r="2.5" fill="#9b59b6" opacity="0.8"/>
        <line x1="32" y1="18" x2="32" y2="21" stroke="#9b59b6" stroke-width="1.5"/>
        <line x1="32" y1="35" x2="32" y2="38" stroke="#9b59b6" stroke-width="1.5"/>
        <line x1="22" y1="28" x2="25" y2="28" stroke="#9b59b6" stroke-width="1.5"/>
        <line x1="39" y1="28" x2="42" y2="28" stroke="#9b59b6" stroke-width="1.5"/>
        <line x1="25" y1="21" x2="27" y2="23" stroke="#9b59b6" stroke-width="1.2"/>
        <line x1="37" y1="33" x2="39" y2="35" stroke="#9b59b6" stroke-width="1.2"/>
        <line x1="25" y1="35" x2="27" y2="33" stroke="#9b59b6" stroke-width="1.2"/>
        <line x1="37" y1="23" x2="39" y2="21" stroke="#9b59b6" stroke-width="1.2"/>
      </g>
      <!-- Mouth vent -->
      <rect x="24" y="40" width="16" height="4" rx="1" stroke="#9b59b6" stroke-width="1" fill="rgba(155,89,182,0.1)"/>
      <line x1="28" y1="40" x2="28" y2="44" stroke="#9b59b6" stroke-width="0.8"/>
      <line x1="32" y1="40" x2="32" y2="44" stroke="#9b59b6" stroke-width="0.8"/>
      <line x1="36" y1="40" x2="36" y2="44" stroke="#9b59b6" stroke-width="0.8"/>
      <!-- Horns -->
      <path d="M16 16 L8 8" stroke="#9b59b6" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M48 16 L56 8" stroke="#9b59b6" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
  },

  // Rabbit face — tech antenna, LED eyes
  cyberbunny(size) {
    return `<svg class="monster-portrait" viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Ears -->
      <path d="M22 26 L18 4 Q16 2 20 4 L26 22" stroke="#e91e63" stroke-width="2" fill="rgba(233,30,99,0.06)"/>
      <path d="M42 26 L46 4 Q48 2 44 4 L38 22" stroke="#e91e63" stroke-width="2" fill="rgba(233,30,99,0.06)"/>
      <!-- Antenna on right ear -->
      <g class="monster-anim-antenna">
        <circle cx="46" cy="4" r="2.5" stroke="#e91e63" stroke-width="1" fill="#e91e63" opacity="0.7"/>
      </g>
      <line x1="46" y1="6" x2="46" y2="4" stroke="#e91e63" stroke-width="1.5"/>
      <!-- Head -->
      <ellipse cx="32" cy="38" rx="16" ry="16" stroke="#e91e63" stroke-width="2" fill="rgba(233,30,99,0.06)"/>
      <!-- LED Eyes -->
      <rect x="22" y="32" width="7" height="5" rx="1" stroke="#e91e63" stroke-width="1.2" fill="#e91e63" opacity="0.3"/>
      <rect x="35" y="32" width="7" height="5" rx="1" stroke="#e91e63" stroke-width="1.2" fill="#e91e63" opacity="0.3"/>
      <circle cx="25.5" cy="34.5" r="1" fill="#fff"/>
      <circle cx="38.5" cy="34.5" r="1" fill="#fff"/>
      <!-- Nose -->
      <path d="M30 41 L32 43 L34 41 Z" stroke="#e91e63" stroke-width="1" fill="rgba(233,30,99,0.3)"/>
      <!-- Mouth -->
      <path d="M28 45 Q32 48 36 45" stroke="#e91e63" stroke-width="1" fill="none"/>
      <!-- Whiskers -->
      <line x1="10" y1="38" x2="20" y2="40" stroke="#e91e63" stroke-width="0.8" opacity="0.5"/>
      <line x1="10" y1="42" x2="20" y2="42" stroke="#e91e63" stroke-width="0.8" opacity="0.5"/>
      <line x1="44" y1="40" x2="54" y2="38" stroke="#e91e63" stroke-width="0.8" opacity="0.5"/>
      <line x1="44" y1="42" x2="54" y2="42" stroke="#e91e63" stroke-width="0.8" opacity="0.5"/>
      <!-- Circuit lines -->
      <path d="M24 26 L24 30" stroke="#e91e63" stroke-width="0.8" opacity="0.4"/>
      <path d="M40 26 L40 30" stroke="#e91e63" stroke-width="0.8" opacity="0.4"/>
    </svg>`;
  },

  // Alien — large almond eyes, brain pattern
  alienoid(size) {
    return `<svg class="monster-portrait" viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Head (large cranium) -->
      <path d="M16 40 Q10 28 14 18 Q18 8 32 6 Q46 8 50 18 Q54 28 48 40 Q44 50 32 52 Q20 50 16 40 Z" stroke="#3498db" stroke-width="2" fill="rgba(52,152,219,0.08)"/>
      <!-- Brain pattern -->
      <g class="monster-anim-brain">
        <path d="M22 16 Q28 12 34 16 Q38 20 34 22" stroke="#3498db" stroke-width="0.8" opacity="0.35" fill="none"/>
        <path d="M26 14 Q32 10 38 14" stroke="#3498db" stroke-width="0.8" opacity="0.3" fill="none"/>
        <path d="M24 20 Q30 18 36 20" stroke="#3498db" stroke-width="0.8" opacity="0.25" fill="none"/>
      </g>
      <!-- Large almond eyes -->
      <ellipse cx="24" cy="32" rx="6" ry="4" stroke="#3498db" stroke-width="1.5" fill="rgba(52,152,219,0.2)" transform="rotate(-10 24 32)"/>
      <ellipse cx="40" cy="32" rx="6" ry="4" stroke="#3498db" stroke-width="1.5" fill="rgba(52,152,219,0.2)" transform="rotate(10 40 32)"/>
      <!-- Pupils -->
      <ellipse cx="25" cy="32" rx="2" ry="2.5" fill="#3498db" opacity="0.8"/>
      <ellipse cx="39" cy="32" rx="2" ry="2.5" fill="#3498db" opacity="0.8"/>
      <circle cx="24" cy="31" r="0.8" fill="#fff"/>
      <circle cx="38" cy="31" r="0.8" fill="#fff"/>
      <!-- Nostril dots -->
      <circle cx="30" cy="40" r="1" stroke="#3498db" stroke-width="0.8"/>
      <circle cx="34" cy="40" r="1" stroke="#3498db" stroke-width="0.8"/>
      <!-- Mouth -->
      <path d="M28 44 Q32 46 36 44" stroke="#3498db" stroke-width="1" fill="none" opacity="0.6"/>
      <!-- Glow ring -->
      <circle cx="32" cy="32" r="26" stroke="#3498db" stroke-width="0.5" opacity="0.15"/>
    </svg>`;
  },

  // Octopus — curling tentacles, suction cups
  kraken(size) {
    return `<svg class="monster-portrait" viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Head dome -->
      <path d="M16 34 Q14 18 32 12 Q50 18 48 34" stroke="#e67e22" stroke-width="2" fill="rgba(230,126,34,0.08)"/>
      <!-- Eyes -->
      <circle cx="24" cy="28" r="4" stroke="#e67e22" stroke-width="1.5" fill="rgba(230,126,34,0.15)"/>
      <circle cx="40" cy="28" r="4" stroke="#e67e22" stroke-width="1.5" fill="rgba(230,126,34,0.15)"/>
      <circle cx="25" cy="27" r="1.5" fill="#e67e22" opacity="0.8"/>
      <circle cx="41" cy="27" r="1.5" fill="#e67e22" opacity="0.8"/>
      <circle cx="24" cy="27" r="0.6" fill="#fff"/>
      <circle cx="40" cy="27" r="0.6" fill="#fff"/>
      <!-- Tentacles -->
      <g class="monster-anim-tentacles">
        <path d="M16 34 Q10 40 8 50 Q7 54 12 52" stroke="#e67e22" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M20 36 Q16 44 14 54 Q13 58 18 55" stroke="#e67e22" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M28 38 Q26 46 22 54 Q20 58 26 56" stroke="#e67e22" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M36 38 Q38 46 42 54 Q44 58 38 56" stroke="#e67e22" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M44 36 Q48 44 50 54 Q51 58 46 55" stroke="#e67e22" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M48 34 Q54 40 56 50 Q57 54 52 52" stroke="#e67e22" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      </g>
      <!-- Suction cups -->
      <circle cx="10" cy="46" r="1.2" stroke="#e67e22" stroke-width="0.8" opacity="0.5"/>
      <circle cx="15" cy="50" r="1.2" stroke="#e67e22" stroke-width="0.8" opacity="0.5"/>
      <circle cx="24" cy="50" r="1.2" stroke="#e67e22" stroke-width="0.8" opacity="0.5"/>
      <circle cx="40" cy="50" r="1.2" stroke="#e67e22" stroke-width="0.8" opacity="0.5"/>
      <circle cx="49" cy="50" r="1.2" stroke="#e67e22" stroke-width="0.8" opacity="0.5"/>
      <circle cx="54" cy="46" r="1.2" stroke="#e67e22" stroke-width="0.8" opacity="0.5"/>
      <!-- Mouth -->
      <ellipse cx="32" cy="34" rx="3" ry="2" stroke="#e67e22" stroke-width="1" fill="rgba(230,126,34,0.2)"/>
    </svg>`;
  },
};

export function monsterSVG(monsterId, size = 36) {
  const fn = monsters[monsterId];
  return fn ? fn(size) : '';
}

// ── Dice Face Icons ────────────────────────────────────────────

export function diceFaceSVG(face, size = 28) {
  switch (face) {
    case '1':
      return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <text x="16" y="23" text-anchor="middle" font-size="20" font-weight="800" font-family="system-ui" fill="currentColor">1</text>
      </svg>`;
    case '2':
      return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <text x="16" y="23" text-anchor="middle" font-size="20" font-weight="800" font-family="system-ui" fill="currentColor">2</text>
      </svg>`;
    case '3':
      return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <text x="16" y="23" text-anchor="middle" font-size="20" font-weight="800" font-family="system-ui" fill="currentColor">3</text>
      </svg>`;
    case 'claw':
      // Three claw slashes
      return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 6 L14 26" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <path d="M16 4 L16 28" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <path d="M24 6 L18 26" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`;
    case 'heart':
      return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 28 Q6 20 6 12 Q6 6 11 6 Q16 6 16 12 Q16 6 21 6 Q26 6 26 12 Q26 20 16 28 Z" fill="currentColor" opacity="0.9"/>
      </svg>`;
    case 'lightning':
      return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <polygon points="18,2 8,18 15,18 12,30 24,13 17,13 20,2" fill="currentColor" opacity="0.9"/>
      </svg>`;
    default:
      return '';
  }
}

// ── Tokyo Skyline ──────────────────────────────────────────────

export function tokyoSkylineSVG() {
  return `<svg viewBox="0 0 400 120" preserveAspectRatio="none" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <!-- Buildings silhouette -->
    <path d="
      M0 120 L0 90 L15 90 L15 70 L25 70 L25 85 L35 85 L35 60 L45 60 L45 75 L55 75 L55 50
      L65 50 L65 70 L75 70 L75 45 L85 45 L85 65 L95 65 L95 40 L105 40 L105 55
      L115 55 L115 35 L125 35 L125 50 L135 50 L135 30 L140 30 L140 55 L150 55 L150 40
      L160 40 L160 60 L170 60 L170 35 L175 35 L175 25 L178 10 L181 25 L185 25 L185 35
      L190 35 L190 60 L200 60
      L200 45 L210 45 L210 35 L220 35 L220 50 L230 50 L230 30 L240 30 L240 55
      L250 55 L250 40 L260 40 L260 60 L270 60 L270 45 L280 45 L280 55
      L290 55 L290 35 L300 35 L300 50 L310 50 L310 65 L320 65 L320 50 L330 50
      L330 70 L340 70 L340 55 L350 55 L350 75 L360 75 L360 60 L370 60
      L370 80 L380 80 L380 70 L390 70 L390 85 L400 85 L400 120 Z
    " fill="#e94560" opacity="0.3"/>
    <!-- Window dots -->
    <g fill="#e94560" opacity="0.5">
      <rect x="37" y="64" width="2" height="2" rx="0.5"/>
      <rect x="41" y="64" width="2" height="2" rx="0.5"/>
      <rect x="37" y="68" width="2" height="2" rx="0.5"/>
      <rect x="41" y="68" width="2" height="2" rx="0.5"/>
      <rect x="77" y="50" width="2" height="2" rx="0.5"/>
      <rect x="81" y="50" width="2" height="2" rx="0.5"/>
      <rect x="77" y="54" width="2" height="2" rx="0.5"/>
      <rect x="81" y="54" width="2" height="2" rx="0.5"/>
      <rect x="97" y="44" width="2" height="2" rx="0.5"/>
      <rect x="101" y="44" width="2" height="2" rx="0.5"/>
      <rect x="97" y="48" width="2" height="2" rx="0.5"/>
      <rect x="117" y="40" width="2" height="2" rx="0.5"/>
      <rect x="121" y="40" width="2" height="2" rx="0.5"/>
      <rect x="137" y="34" width="2" height="2" rx="0.5"/>
      <rect x="172" y="40" width="2" height="2" rx="0.5"/>
      <rect x="182" y="40" width="2" height="2" rx="0.5"/>
      <rect x="212" y="40" width="2" height="2" rx="0.5"/>
      <rect x="216" y="40" width="2" height="2" rx="0.5"/>
      <rect x="232" y="34" width="2" height="2" rx="0.5"/>
      <rect x="236" y="34" width="2" height="2" rx="0.5"/>
      <rect x="232" y="38" width="2" height="2" rx="0.5"/>
      <rect x="292" y="40" width="2" height="2" rx="0.5"/>
      <rect x="296" y="40" width="2" height="2" rx="0.5"/>
      <rect x="322" y="54" width="2" height="2" rx="0.5"/>
      <rect x="342" y="60" width="2" height="2" rx="0.5"/>
      <rect x="346" y="60" width="2" height="2" rx="0.5"/>
    </g>
    <!-- Tokyo Tower glow -->
    <line x1="178" y1="10" x2="178" y2="25" stroke="#e94560" stroke-width="1" opacity="0.6"/>
  </svg>`;
}

// ── Card Frame Flourishes ──────────────────────────────────────

export function cardFrameSVG() {
  return `<svg viewBox="0 0 200 80" preserveAspectRatio="none" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Top-left corner -->
    <path d="M4 16 L4 4 L16 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
    <path d="M4 10 Q4 4 10 4" stroke="currentColor" stroke-width="0.8" opacity="0.3"/>
    <!-- Top-right corner -->
    <path d="M184 4 L196 4 L196 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
    <path d="M190 4 Q196 4 196 10" stroke="currentColor" stroke-width="0.8" opacity="0.3"/>
    <!-- Bottom-left corner -->
    <path d="M4 64 L4 76 L16 76" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
    <path d="M4 70 Q4 76 10 76" stroke="currentColor" stroke-width="0.8" opacity="0.3"/>
    <!-- Bottom-right corner -->
    <path d="M184 76 L196 76 L196 64" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
    <path d="M190 76 Q196 76 196 70" stroke="currentColor" stroke-width="0.8" opacity="0.3"/>
  </svg>`;
}

// ── Crown for header ───────────────────────────────────────────

export function crownSVG(size = 24) {
  return `<svg viewBox="0 0 32 24" width="${size}" height="${Math.round(size * 0.75)}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="2,20 6,6 11,14 16,2 21,14 26,6 30,20" stroke="#f1c40f" stroke-width="1.5" fill="rgba(241,196,15,0.2)"/>
    <rect x="2" y="18" width="28" height="4" rx="1" stroke="#f1c40f" stroke-width="1" fill="rgba(241,196,15,0.15)"/>
    <circle cx="6" cy="6" r="1.5" fill="#f1c40f" opacity="0.7"/>
    <circle cx="16" cy="2" r="1.5" fill="#f1c40f" opacity="0.7"/>
    <circle cx="26" cy="6" r="1.5" fill="#f1c40f" opacity="0.7"/>
  </svg>`;
}
