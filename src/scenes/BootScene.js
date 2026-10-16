// scenes/BootScene.js — Loads all assets, registers animations, then starts MenuScene.

import { AudioSystem } from "../systems/Audio.js";
import { Storage } from "../systems/Storage.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
    this.audio = new AudioSystem();
    this._bootStart = 0;
  }

  preload() {
    this._bootStart = performance.now();
    this.load.baseURL = "./";

    // ===== Background =====
    this.load.image("bg-green-valley", "assets/backgrounds/green-valley-parallax.png");

    // ===== Hero spritesheet (single texture + atlas JSON) =====
    this.load.atlas("hero", "assets/characters/hero-spritesheet.png", "assets/characters/hero-spritesheet.json");

    // ===== Enemy spritesheet =====
    this.load.atlas("enemy", "assets/enemies/enemy-spritesheet.png", "assets/enemies/enemy-spritesheet.json");

    // ===== Tiles (16 individual PNGs) =====
    for (let i = 1; i <= 16; i++) {
      const n = `${i}`.padStart(2, "0");
      const path = `assets/tiles/individual/tile-${n}.png`;
      this.load.image(`tile-${n}`, path);
    }

    // ===== Collectibles (extracted individual sprites) =====
    const collectibles = [
      "coin", "shadow-energy", "small-shadow", "heart",
      "speed-powerup", "double-jump-powerup", "shield-powerup", "magnet-powerup",
      "shadow-mode-powerup", "checkpoint-flag", "exit-gate",
      "dust-burst", "shadow-dash-trail", "damage-stars", "sparkle", "boss-burst",
    ];
    collectibles.forEach((name) => {
      this.load.image(name, `assets/collectibles/individual/${name}.png`);
    });

    // ===== Android icons (placeholder; created via generate_icons.py) =====
    // None loaded in canvas.

    // Progress
    const splashBar = document.getElementById("splash-bar");
    const splashText = document.getElementById("splash-text");
    this.load.on("progress", (v) => {
      if (splashBar) splashBar.style.width = `${Math.round(v * 100)}%`;
    });
    this.load.on("file", (file) => {
      if (splashText) splashText.textContent = `بارگذاری: ${file.key}`;
    });
    this.load.on("loaderror", (file) => {
      console.warn("Asset load error:", file.key, file.src);
    });
  }

  create() {
    // Register animations
    this._registerHeroAnims();
    this._registerEnemyAnims();

    // Load save
    const save = Storage.load();
    this.audio.setMuted(save.muted);
    this.audio.setVolume(save.volume);

    // Wait a tiny moment for any final textures
    this.time.delayedCall(100, () => {
      // Hide splash
      const splash = document.getElementById("splash");
      if (splash) {
        splash.classList.add("hidden");
        setTimeout(() => splash.remove(), 700);
      }
      this.scene.start("MenuScene");
    });
  }

  _registerHeroAnims() {
    // Hero animations use the single 'hero' atlas; each frame is a frame-key
    // in the atlas like "hero-idle-01", "hero-walk-02", etc.
    const anim = this.anims;
    const safe = (key) => this.textures.exists("hero") && this.textures.get("hero").has(key);

    const buildAnim = (animKey, prefix, count, frameRate, repeat) => {
      if (anim.exists(animKey)) return;
      const frames = [];
      for (let i = 1; i <= count; i++) {
        const n = i.toString().padStart(2, "0");
        const fk = `hero-${prefix}-${n}`;
        if (safe(fk)) frames.push({ key: "hero", frame: fk });
      }
      if (frames.length) {
        anim.create({ key: animKey, frames, frameRate, repeat });
      }
    };

    buildAnim("hero-idle", "idle", 8, 10, -1);
    buildAnim("hero-walk", "walk", 8, 12, -1);
    buildAnim("hero-run", "run", 8, 16, -1);
    buildAnim("hero-jump", "jump", 4, 8, 0);
    buildAnim("hero-fall", "fall", 4, 8, 0);
    buildAnim("hero-crouch", "crouch-hit", 4, 8, 0);
    buildAnim("hero-death", "death", 4, 8, 0);
  }

  _registerEnemyAnims() {
    const anim = this.anims;
    const safe = (key) => this.textures.exists("enemy") && this.textures.get("enemy").has(key);

    ["walker", "shell-crawler", "flying-shadow", "shadow-hunter"].forEach((type) => {
      if (anim.exists(`enemy-${type}`)) return;
      const frames = [];
      for (let i = 1; i <= 4; i++) {
        const n = i.toString().padStart(2, "0");
        const fk = `enemy-${type}-${n}`;
        if (safe(fk)) frames.push({ key: "enemy", frame: fk });
      }
      if (frames.length) {
        anim.create({
          key: `enemy-${type}`,
          frames,
          frameRate: 8,
          repeat: -1,
        });
      }
    });
  }
}
