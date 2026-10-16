// systems/Audio.js — Procedural Web Audio SFX (no external audio files).

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.7;
    this.master = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
    }
  }

  // Must be called from a user gesture (mobile autoplay policy)
  resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) {
      this.master.gain.value = m ? 0 : this.volume;
    }
  }

  setVolume(v) {
    this.volume = v;
    if (this.master && !this.muted) {
      this.master.gain.value = v;
    }
  }

  // Generic tone
  tone(freq, duration = 0.1, type = "square", gain = 0.4, attack = 0.005, decay = null) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (decay || duration));
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // Frequency sweep
  sweep(from, to, duration = 0.15, type = "square", gain = 0.4) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + duration);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // Noise burst (for impacts)
  noise(duration = 0.1, gain = 0.3, lowpass = 2000) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  // Named SFX
  jump() {
    this.sweep(280, 540, 0.18, "square", 0.35);
  }
  land() {
    this.noise(0.08, 0.25, 1200);
  }
  coin() {
    this.tone(880, 0.07, "square", 0.3);
    setTimeout(() => this.tone(1320, 0.1, "square", 0.3), 60);
  }
  damage() {
    this.sweep(440, 80, 0.35, "sawtooth", 0.45);
    this.noise(0.15, 0.25, 800);
  }
  enemyStomp() {
    this.sweep(660, 220, 0.18, "square", 0.4);
  }
  death() {
    this.sweep(440, 110, 0.6, "sawtooth", 0.5);
  }
  powerUp() {
    this.sweep(330, 990, 0.25, "triangle", 0.4);
    setTimeout(() => this.sweep(990, 1480, 0.18, "triangle", 0.3), 180);
  }
  checkpoint() {
    this.tone(660, 0.08, "triangle", 0.35);
    setTimeout(() => this.tone(880, 0.08, "triangle", 0.35), 80);
    setTimeout(() => this.tone(1320, 0.18, "triangle", 0.35), 160);
  }
  menu() {
    this.tone(440, 0.05, "square", 0.25);
  }
  complete() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.18, "triangle", 0.35), i * 100);
    });
  }
  dash() {
    this.sweep(880, 220, 0.18, "sawtooth", 0.35);
    this.noise(0.18, 0.2, 4000);
  }
  bossHit() {
    this.sweep(220, 60, 0.4, "sawtooth", 0.5);
    this.noise(0.2, 0.3, 1500);
  }
}
