// scenes/GameScene.js — Main gameplay scene.

import { Hero } from "../entities/Hero.js";
import { Enemy } from "../entities/Enemy.js";
import { Coin } from "../entities/Coin.js";
import { Checkpoint } from "../entities/Checkpoint.js";
import { Exit } from "../entities/Exit.js";
import { Controls } from "../systems/Controls.js";
import { AudioSystem } from "../systems/Audio.js";
import { Storage } from "../systems/Storage.js";
import { getLevel, TILE_SIZE, LEVELS } from "../levels/levels.js";
import { GAME_WIDTH, GAME_HEIGHT } from "../main.js";

// Mapping of tile chars -> tile sprite keys (from the individual tiles folder).
// Tiles are loaded as tile-01 .. tile-16.
const TILE_KEY = {
  "#": "tile-01",  // grass top
  "D": "tile-02",  // dirt
  "B": "tile-03",  // brick
  "Q": "tile-04",  // question block
  "P": "tile-05",  // pipe
  "S": "tile-06",  // stone platform
};

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.audio = null;
    this.hero = null;
    this.enemies = null;
    this.coins = null;
    this.checkpoints = null;
    this.exit = null;
    this.solids = null;       // tilemap layer (static)
    this._levelData = null;
    this._levelIndex = 0;
    this._state = "play";    // "play" | "paused" | "complete" | "gameover"
    this._respawnPoint = { x: 0, y: 0 };
    this._coinsCollected = 0;
    this._lives = 3;
    this._score = 0;
    this._checkpointFlags = [];
    this._bg1 = null;
    this._bg2 = null;
    this._bg3 = null;
    this._dustGfx = null;
    this._dashTrails = null;
  }

  init(data) {
    this._levelIndex = data.level ?? 0;
    this._freshStart = data.fresh !== false;
    if (this._freshStart) {
      this._coinsCollected = 0;
      this._lives = 3;
      this._score = 0;
    }
  }

  create() {
    // Get the audio system from BootScene (or create a new one)
    const boot = this.scene.get("BootScene");
    this.audio = boot?.audio || new AudioSystem();

    // Build the level
    this._buildLevel();

    // Camera bounds — at least GAME_HEIGHT tall so background fills viewport
    const worldW = this._levelData.cols * TILE_SIZE;
    const worldH = Math.max(this._levelData.rowsCount * TILE_SIZE, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.world.setBounds(0, 0, worldW, this._levelData.rowsCount * TILE_SIZE);

    // Hero
    const spawn = this._findChar("@") || { col: 4, row: this._levelData.rowsCount - 3 };
    const sx = spawn.col * TILE_SIZE + TILE_SIZE / 2;
    const sy = spawn.row * TILE_SIZE + TILE_SIZE;
    this.hero = new Hero(this, sx, sy);
    this._respawnPoint = { x: sx, y: sy };
    this.hero.body.setCollideWorldBounds(true);

    // Camera follow
    this.cameras.main.startFollow(this.hero, true, 0.12, 0.08, -80, 0);
    this.cameras.main.setDeadzone(GAME_WIDTH * 0.35, GAME_HEIGHT * 0.45);

    // ===== Collision wiring =====
    this.physics.add.collider(this.hero, this.solids);
    this.physics.add.collider(this.enemies, this.solids);

    // Hero <-> enemies (overlap; we resolve stomp vs side-hit in callback)
    this.physics.add.overlap(this.hero, this.enemies, this._handleHeroEnemy, null, this);

    // Hero <-> coins
    this.physics.add.overlap(this.hero, this.coins, this._collectCoin, null, this);

    // Hero <-> checkpoints
    this.physics.add.overlap(this.hero, this.checkpoints, this._touchCheckpoint, null, this);

    // Hero <-> exit
    if (this.exit) {
      this.physics.add.overlap(this.hero, this.exit, this._reachExit, null, this);
    }

    // Hero fell off the world
    this.events.on("hero-died", () => this._onHeroDied());

    // Controls
    this.controls = new Controls(this, this.input);
    // Wire touch buttons if available
    if (typeof document !== "undefined") {
      this.controls.wireTouch();
    }

    // Background layers (parallax)
    this._buildParallax();

    // Effects layers
    this._dustGfx = this.add.graphics();
    this._dustGfx.setDepth(8);

    // Wire UI scene
    this.scene.launch("UIScene", {
      level: this._levelIndex,
      lives: this._lives,
      coins: this._coinsCollected,
      score: this._score,
      shadow: 0,
      audio: this.audio,
    });

    // Pause key
    this.input.keyboard.on("keydown-ESC", () => this.togglePause());
    this.input.keyboard.on("keydown-P", () => this.togglePause());
    this.input.keyboard.on("keydown-R", () => this.restartLevel());

    // Resize responsive
    this.scale.on("resize", this._handleResize, this);
  }

  _buildLevel() {
    const level = getLevel(this._levelIndex);
    // Compose raw rows; rows may differ in length — pad to longest
    const rows = level.rows;
    const cols = Math.max(...rows.map((r) => r.length));
    const padded = rows.map((r) => r.padEnd(cols, "."));

    this._levelData = {
      ...level,
      rows: padded,
      cols,
      rowsCount: padded.length,
    };

    // Build a tilemap from scratch using a static group of sprites
    this.solids = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.coins = this.physics.add.group();
    this.checkpoints = this.physics.add.group();

    for (let r = 0; r < padded.length; r++) {
      const row = padded[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        const x = c * TILE_SIZE + TILE_SIZE / 2;
        const y = r * TILE_SIZE + TILE_SIZE / 2;
        switch (ch) {
          case "#":
          case "D":
          case "B":
          case "Q":
          case "P":
          case "S": {
            const key = TILE_KEY[ch];
            if (key) {
              const sprite = this.solids.create(x, y, key);
              sprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
              sprite.refreshBody();
            }
            break;
          }
          case "C": {
            const coin = new Coin(this, x, y - 4);
            this.coins.add(coin);
            break;
          }
          case "A": {
            const shadow = this.physics.add.staticImage(x, y - 4, "shadow-energy");
            shadow.setDisplaySize(28, 36);
            shadow.refreshBody();
            this._shadowPickups = this._shadowPickups || this.physics.add.group();
            this._shadowPickups.add(shadow);
            break;
          }
          case "E": {
            const enemy = new Enemy(this, x, y, "walker");
            this.enemies.add(enemy);
            break;
          }
          case "F": {
            const enemy = new Enemy(this, x, y, "flying-shadow");
            enemy.body.setAllowGravity(false);
            this.enemies.add(enemy);
            break;
          }
          case "H": {
            const cp = new Checkpoint(this, x, y);
            this.checkpoints.add(cp);
            this._checkpointFlags.push(cp);
            break;
          }
          case "X": {
            this.exit = new Exit(this, x, y);
            break;
          }
        }
      }
    }

    // If exit is null (shouldn't be), create one at end of last solid row
    if (!this.exit) {
      const x = (cols - 2) * TILE_SIZE;
      const y = (padded.length - 2) * TILE_SIZE;
      this.exit = new Exit(this, x, y);
    }
  }

  _buildParallax() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const bgKey = this._levelData.bg || "bg-green-valley";
    // Three layers — same image, different depths/scales/scroll factors
    this._bg1 = this.add.image(0, 0, bgKey).setOrigin(0, 0).setScrollFactor(0.05).setDepth(-3);
    this._bg2 = this.add.image(0, 0, bgKey).setOrigin(0, 0).setScrollFactor(0.2).setDepth(-2);
    this._bg3 = this.add.image(0, 0, bgKey).setOrigin(0, 0).setScrollFactor(0.4).setDepth(-1);
    this._resizeParallax();
  }

  _resizeParallax() {
    const cam = this.cameras.main;
    const W = cam.width, H = cam.height;
    const baseTex = this.textures.get(this._levelData.bg || "bg-green-valley").getSourceImage();
    const aspect = baseTex.width / baseTex.height;
    // Cover screen, preserve aspect
    const scaleW = W / baseTex.width;
    const scaleH = (H * 1.15) / baseTex.height;
    const scale = Math.max(scaleW, scaleH);
    [this._bg1, this._bg2, this._bg3].forEach((img) => {
      img.setDisplaySize(baseTex.width * scale, baseTex.height * scale);
      img.setPosition(0, H - img.displayHeight);
    });
  }

  _handleResize(gameSize, baseSize, displaySize, resolution) {
    this._resizeParallax();
  }

  _findChar(ch) {
    for (let r = 0; r < this._levelData.rows.length; r++) {
      const c = this._levelData.rows[r].indexOf(ch);
      if (c >= 0) return { col: c, row: r };
    }
    return null;
  }

  update(time, delta) {
    const dt = delta; // ms

    // Update controls
    const isGrounded = this.hero.body.blocked.down || this.hero.body.onFloor();
    this.controls.tick(dt, isGrounded);

    // Pause / restart edge triggers
    if (this.controls.pause) this.togglePause();
    if (this.controls.restart) this.restartLevel();

    if (this._state !== "play") return;

    // Update hero
    this.hero.update_(this.controls, dt, isGrounded);

    // Update enemies
    this.enemies.getChildren().forEach((e) => {
      if (e.update_) e.update_(dt, this.hero);
    });

    // Update coins (rotation)
    this.coins.getChildren().forEach((c) => {
      if (c.update_) c.update_();
    });

    // Touch shadow pickups
    if (this._shadowPickups) {
      this.physics.add.overlap(this.hero, this._shadowPickups, (hero, sp) => {
        sp.destroy();
        this.hero.addShadow(25);
        this.audio.powerUp();
        this._emitBurst(sp.x, sp.y, 0xb9a5ff);
      });
    }

    // Fell into a pit
    if (this.hero.y > this._levelData.rowsCount * TILE_SIZE + 100) {
      this._loseLifeOrDie();
    }
  }

  // ====== Collision handlers ======
  _handleHeroEnemy(hero, enemy) {
    if (enemy.isDead || hero.isDead) return;

    // Check if hero landed on top of the enemy (stomp)
    const heroBottom = hero.body.y + hero.body.height;
    const enemyTop = enemy.body.y;
    const vDown = hero.body.velocity.y > 0;
    const stomp = vDown && heroBottom < enemyTop + enemy.body.height * 0.5;

    if (stomp || hero.isDashing) {
      enemy.kill();
      this.audio.enemyStomp();
      hero.bounceOnEnemy();
      this._addScore(100);
      this._emitBurst(enemy.x, enemy.y - 16, 0xb9a5ff);
    } else if (!hero.isInvulnerable) {
      const damaged = hero.takeDamage(this);
      if (damaged) {
        this._loseLifeOrDie();
      }
    }
  }

  _collectCoin(hero, coin) {
    if (coin.collect()) {
      this._coinsCollected++;
      this._addScore(100);
      this.audio.coin();
      this._emitBurst(coin.x, coin.y, 0xfff0a0);
      this.events.emit("update-hud", { coins: this._coinsCollected, score: this._score, lives: this._lives });
      // Bonus life every 100 coins
      if (this._coinsCollected % 100 === 0) {
        this._lives++;
        this.events.emit("update-hud", { lives: this._lives });
      }
    }
  }

  _touchCheckpoint(hero, cp) {
    if (cp.activate()) {
      this._respawnPoint = { x: cp.x, y: cp.y + 16 };
      this.audio.checkpoint();
      this._emitBurst(cp.x, cp.y - 40, 0xfff8c0);
    }
  }

  _reachExit(hero, exit) {
    if (this._state !== "play") return;
    this._state = "complete";
    exit.trigger();
    this.audio.complete();
    Storage.unlockLevel(this._levelIndex + 2); // unlock next
    Storage.addCoins(this._coinsCollected);
    Storage.addScore(this._score);

    // Show level complete overlay
    this.time.delayedCall(800, () => {
      this._showCompleteOverlay();
    });
  }

  _loseLifeOrDie() {
    if (this.hero.isDead) return;
    this._lives--;
    this.events.emit("update-hud", { lives: this._lives });
    if (this._lives <= 0) {
      this.hero.die(this);
    } else {
      // respawn
      this.hero.body.reset(this._respawnPoint.x, this._respawnPoint.y - 16);
      this.hero.body.setVelocity(0, 0);
      this.hero._dead = false;
      this.hero._invulnTimer = 1500;
      this.hero.setAlpha(0.5);
      this.hero.anims.play("hero-idle");
      this.time.delayedCall(1500, () => this.hero.setAlpha(1));
    }
  }

  _onHeroDied() {
    this._state = "gameover";
    this._showGameOverOverlay();
  }

  _addScore(n) {
    this._score += n;
    this.events.emit("update-hud", { score: this._score });
  }

  // ====== Effects ======
  emitDust(x, y) {
    if (!this._dustGfx) return;
    // Simple burst — adds a few particles
    for (let i = 0; i < 6; i++) {
      const ang = Math.random() * Math.PI - Math.PI; // -180..0
      const r = Phaser.Math.Between(4, 10);
      const px = x + Math.cos(ang) * r;
      const py = y + Math.sin(ang) * r * 0.3;
      this._dustGfx.fillStyle(0xc8b8a0, 0.7);
      this._dustGfx.fillCircle(px, py, Phaser.Math.Between(2, 4));
    }
    // Fade out the entire graphics buffer
    this.tweens.add({
      targets: this._dustGfx,
      alpha: 0,
      duration: 350,
      onComplete: () => this._dustGfx.clear(),
    });
  }

  emitDashTrail(x, y) {
    if (!this._dustGfx) return;
    this._dustGfx.fillStyle(0x6a4cff, 0.45);
    this._dustGfx.fillCircle(x, y, 8);
    this.tweens.add({
      targets: this._dustGfx,
      alpha: 0,
      duration: 250,
      onComplete: () => this._dustGfx.clear(),
    });
  }

  _emitBurst(x, y, color) {
    const gfx = this.add.graphics({ depth: 8 });
    for (let i = 0; i < 10; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Phaser.Math.Between(8, 24);
      const px = x + Math.cos(ang) * r;
      const py = y + Math.sin(ang) * r;
      gfx.fillStyle(color, 0.8);
      gfx.fillCircle(px, py, Phaser.Math.Between(2, 4));
    }
    this.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 380,
      onComplete: () => gfx.destroy(),
    });
  }

  // ====== Pause / Restart ======
  togglePause() {
    if (this._state === "play") {
      this._state = "paused";
      this.physics.world.pause();
      this.anims.pauseAll();
      this._showPauseOverlay();
    } else if (this._state === "paused") {
      this._state = "play";
      this.physics.world.resume();
      this.anims.resumeAll();
      this._closeOverlay();
    }
  }

  pauseGame() {
    if (this._state === "play") this.togglePause();
  }

  restartLevel() {
    this.scene.stop("UIScene");
    this.scene.restart({ level: this._levelIndex, fresh: true });
  }

  _showPauseOverlay() {
    this._overlay = this._buildOverlay("توقف", [
      { label: "ادامهٔ بازی", onClick: () => this.togglePause() },
      { label: "شروع مجدد مرحله", onClick: () => this.restartLevel() },
      { label: "بازگشت به منو", onClick: () => {
        this.scene.stop("UIScene");
        this.scene.start("MenuScene");
      }},
    ]);
  }

  _showCompleteOverlay() {
    const lines = [
      "مرحله کامل شد!",
      `سکه: ${this._coinsCollected}`,
      `امتیاز: ${this._score}`,
      `جان‌های باقی‌مانده: ${this._lives}`,
    ];
    const nextLevel = this._levelIndex + 1;
    const hasNext = nextLevel < LEVELS.length;
    const buttons = hasNext
      ? [
          { label: "مرحلهٔ بعدی", onClick: () => {
            this.scene.stop("UIScene");
            this.scene.restart({ level: nextLevel, fresh: false });
          }},
          { label: "بازگشت به منو", onClick: () => {
            this.scene.stop("UIScene");
            this.scene.start("MenuScene");
          }},
        ]
      : [
          { label: "بازگشت به منو", onClick: () => {
            this.scene.stop("UIScene");
            this.scene.start("MenuScene");
          }},
        ];
    this._overlay = this._buildOverlay(lines.join("\n"), buttons, true);
  }

  _showGameOverOverlay() {
    this._overlay = this._buildOverlay("بازی تمام شد!", [
      { label: "تلاش دوباره", onClick: () => this.restartLevel() },
      { label: "بازگشت به منو", onClick: () => {
        this.scene.stop("UIScene");
        this.scene.start("MenuScene");
      }},
    ]);
  }

  _buildOverlay(text, buttons, isText = false) {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.7)
      .setOrigin(0).setDepth(50).setInteractive();
    const panel = this.add.rectangle(W / 2, H / 2, 600, 360, 0x141228, 0.95)
      .setStrokeStyle(2, 0xb9a5ff, 0.6).setOrigin(0.5).setDepth(51);
    const txt = this.add.text(W / 2, H / 2 - 100, text, {
      fontFamily: "Tahoma, Arial", fontSize: "28px", fontStyle: "bold",
      color: "#f8e1a0", align: "center",
    }).setOrigin(0.5).setDepth(52).setLineSpacing(8);

    const objs = [dim, panel, txt];
    const btnH = 44, gap = 10;
    const startY = H / 2 + 10;
    buttons.forEach((b, i) => {
      const y = startY + i * (btnH + gap);
      const btn = this.add.rectangle(W / 2, y, 280, btnH, 0x6a4cff, 0.85)
        .setStrokeStyle(2, 0xffffff, 0.6).setOrigin(0.5).setDepth(52)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(W / 2, y, b.label, {
        fontFamily: "Tahoma, Arial", fontSize: "18px", color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0.5).setDepth(53);
      btn.on("pointerup", b.onClick);
      objs.push(btn, label);
    });

    this._overlayObjs = objs;
    return { dim, panel };
  }

  _closeOverlay() {
    if (this._overlayObjs) {
      this._overlayObjs.forEach((o) => o.destroy());
      this._overlayObjs = null;
    }
  }

  // Used by Enemy to check if there's ground ahead (ledge detection)
  checkLedgeAhead(x, y, height) {
    // Sample the tilemap at (x, y) below the enemy
    const tile = this.solids.getClosest?.(x, y);
    // Simplified — return true to prevent infinite reversal (since the level is solid ground)
    // A more robust implementation would query tilemap cells directly.
    return true;
  }
}
