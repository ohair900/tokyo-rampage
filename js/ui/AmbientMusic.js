class AmbientMusic {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.masterGain = null;
    this.droneOsc = null;
    this.droneLFO = null;
    this.droneFilter = null;
    this.chordInterval = null;
    // Pre-allocated chord oscillators (reused across chords)
    this.chordNodes = []; // { osc, gain } x3
  }

  start(audioCtx) {
    if (this.playing || !audioCtx) return;
    this.ctx = audioCtx;
    this.playing = true;

    // Master gain — very quiet
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.06;
    this.masterGain.connect(this.ctx.destination);

    // Drone layer: sawtooth A1 (55Hz) through lowpass
    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.value = 55;

    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 200;
    this.droneFilter.Q.value = 2;

    // LFO modulating cutoff
    this.droneLFO = this.ctx.createOscillator();
    this.droneLFO.type = 'sine';
    this.droneLFO.frequency.value = 0.1;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 100;
    this.droneLFO.connect(lfoGain);
    lfoGain.connect(this.droneFilter.frequency);

    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.4;

    this.droneOsc.connect(this.droneFilter);
    this.droneFilter.connect(droneGain);
    droneGain.connect(this.masterGain);

    this.droneOsc.start();
    this.droneLFO.start();

    // Pre-allocate 3 chord oscillators (reused each chord change)
    this.chordNodes = [];
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 220;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      this.chordNodes.push({ osc, gain });
    }

    // Chord progression: Am -> F -> C -> G, 4 seconds each
    const chords = [
      [220, 261.63, 329.63],  // Am
      [174.61, 220, 261.63],  // F
      [130.81, 164.81, 196],  // C
      [196, 246.94, 293.66],  // G
    ];
    let chordIdx = 0;

    const playChord = () => {
      if (!this.playing) return;
      const freqs = chords[chordIdx % chords.length];
      chordIdx++;
      const now = this.ctx.currentTime;

      for (let i = 0; i < 3; i++) {
        const { osc, gain } = this.chordNodes[i];
        osc.frequency.setValueAtTime(freqs[i], now);
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.5);
        gain.gain.setValueAtTime(0.3, now + 3.0);
        gain.gain.linearRampToValueAtTime(0, now + 4.0);
      }
    };

    playChord();
    this.chordInterval = setInterval(playChord, 4000);
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;

    if (this.chordInterval) {
      clearInterval(this.chordInterval);
      this.chordInterval = null;
    }

    try {
      if (this.droneOsc) { this.droneOsc.stop(); this.droneOsc = null; }
      if (this.droneLFO) { this.droneLFO.stop(); this.droneLFO = null; }
    } catch (e) { /* already stopped */ }

    for (const { osc } of this.chordNodes) {
      try { osc.stop(); } catch (e) { /* already stopped */ }
    }
    this.chordNodes = [];

    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
  }
}

export const ambientMusic = new AmbientMusic();
