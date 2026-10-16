// scenes/UIScene.js — HUD overlay: lives, coins, score, level, shadow meter.

import { AudioSystem } from "../systems/Audio.js";
import { Storage } from "../systems/Storage.js";
import { GAME_WIDTH, GAME_HEIGHT } from "../main.js";

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIScene" });
  }

  init(data) {
    this._level = data.level ?? 0;
    this._lives = data.lives ?? 3;
    this._coins = data.coins ?? 0;
    this._score = data.score ?? 0;
    this._shadow = data.shadow ?? 0;
    this._audio = data.audio || new AudioSystem();
  }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");

    // Top-left: lives + coins
    this._livesText = this.add.text(20, 20, this._livesLabel(), {
      fontFamily: "Tahoma, Arial", fontSize: "22px", color: "#ff8aa0", fontStyle: "bold",
      stroke: "#000000", strokeThickness: 3,
    }).setDepth(100);

    this._coinsText = this.add.text(20, 50, this._coinsLabel(), {
      fontFamily: "Tahoma, Arial", fontSize: "22px", color: "#f8e1a0", fontStyle: "bold",
      stroke: "#000000", strokeThickness: 3,
    }).setDepth(100);

    this._scoreText = this.add.text(20, 80, this._scoreLabel(), {
      fontFamily: "Tahoma, Arial", fontSize: "18px", color: "#d8c8ff",
      stroke: "#000000", strokeThickness: 3,
    }).setDepth(100);

    // Top-center: level name
    const levelName = ["درهٔ سبز", "Escape زیرزمین", "Sky Runner", "Dark Factory", "Final Shadow"][this._level] || `مرحله ${this._level + 1}`;
    this._levelText = this.add.text(W / 2, 20, levelName, {
      fontFamily: "Tahoma, Arial", fontSize: "20px", color: "#b9a5ff", fontStyle: "bold",
      stroke: "#000000", strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(100);

    // Top-right: pause button (works on click; the touch-controls pause button is separate)
    this._pauseBtn = this.add.text(W - 20, 20, "[||]", {
      fontFamily: "Tahoma, Arial", fontSize: "24px", color: "#b9a5ff",
      stroke: "#000000", strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(100).setInteractive({ useHandCursor: true });
    this._pauseBtn.on("pointerup", () => {
      this.scene.get("GameScene").togglePause();
    });

    // Shadow meter (bottom center)
    this._shadowBg = this.add.rectangle(W / 2 - 100, H - 30, 200, 12, 0x221a2a, 0.8)
      .setStrokeStyle(1, 0xb9a5ff, 0.5).setOrigin(0, 0.5).setDepth(100);
    this._shadowFill = this.add.rectangle(W / 2 - 100, H - 30, 0, 12, 0x6a4cff, 0.9)
      .setOrigin(0, 0.5).setDepth(101);
    this._shadowLabel = this.add.text(W / 2, H - 18, "انرژی سایه", {
      fontFamily: "Tahoma, Arial", fontSize: "12px", color: "#b9a5ff",
    }).setOrigin(0.5, 0.5).setDepth(102);

    // Listen for HUD updates from GameScene
    const gameScene = this.scene.get("GameScene");
    gameScene.events.on("update-hud", (data) => {
      if (data.lives !== undefined) {
        this._lives = data.lives;
        this._livesText.setText(this._livesLabel());
      }
      if (data.coins !== undefined) {
        this._coins = data.coins;
        this._coinsText.setText(this._coinsLabel());
      }
      if (data.score !== undefined) {
        this._score = data.score;
        this._scoreText.setText(this._scoreLabel());
      }
    });

    // Update shadow meter from GameScene's hero each frame
    this.events.on("update", () => {
      const hero = gameScene?.hero;
      if (hero) {
        const ratio = hero.shadowMeter / hero.maxShadow;
        this._shadowFill.width = 200 * ratio;
      }
    });
  }

  _livesLabel() {
    return `جان: ${"♥".repeat(Math.max(0, this._lives))}`;
  }
  _coinsLabel() {
    return `سکه: ${this._coins}`;
  }
  _scoreLabel() {
    return `امتیاز: ${this._score}`;
  }
}
