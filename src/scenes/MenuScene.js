// scenes/MenuScene.js — Main menu: Start / Continue / Level Select / Settings / How to Play.

import { Storage } from "../systems/Storage.js";
import { GAME_WIDTH, GAME_HEIGHT } from "../main.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    // Background gradient
    this.cameras.main.setBackgroundColor("#0a0a14");

    // Parallax stars (procedural)
    this._stars = this.add.graphics();
    for (let i = 0; i < 90; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H * 0.7);
      const s = Phaser.Math.Between(1, 3);
      this._stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.3, 0.9));
      this._stars.fillCircle(x, y, s);
    }

    // Title
    const cx = W / 2;
    const titleY = H * 0.22;
    this.add.text(cx, titleY, "SHADOW RUNNER", {
      fontFamily: "Arial, sans-serif",
      fontSize: "82px",
      fontStyle: "bold",
      color: "#f8e1a0",
      stroke: "#2a1a4a",
      strokeThickness: 12,
    }).setOrigin(0.5);
    this.add.text(cx, titleY + 60, "PIXEL ADVENTURE", {
      fontFamily: "Arial, sans-serif",
      fontSize: "28px",
      color: "#b9a5ff",
    }).setOrigin(0.5);

    // Subtitle for the chosen level
    const save = Storage.load();
    const unlockedLevel = save.unlockedLevels || 1;

    // Buttons
    const btnY = H * 0.45;
    const btnW = 320, btnH = 60, gap = 12;

    this._makeButton(cx, btnY, btnW, btnH, "شروع بازی جدید", "#6a4cff", () => {
      this.audio?.resume?.();
      this.scene.start("GameScene", { level: 0, fresh: true });
    });

    this._makeButton(cx, btnY + (btnH + gap), btnW, btnH, "ادامهٔ بازی", "#3a8a4a", () => {
      this.audio?.resume?.();
      this.scene.start("GameScene", { level: unlockedLevel - 1, fresh: false });
    }, unlockedLevel > 1);

    this._makeButton(cx, btnY + (btnH + gap) * 2, btnW, btnH, "انتخاب مرحله", "#3a5a8a", () => {
      this._showLevelSelect();
    });

    this._makeButton(cx, btnY + (btnH + gap) * 3, btnW, btnH, "راهنمای بازی", "#5a3a8a", () => {
      this._showHowToPlay();
    });

    this._makeButton(cx, btnY + (btnH + gap) * 4, btnW, btnH, "تنظیمات", "#5a3a3a", () => {
      this._showSettings();
    });

    // Footer hint
    this.add.text(cx, H - 24, "v1.0 — ساخته‌شده با HTML5 + Phaser 3", {
      fontFamily: "Arial",
      fontSize: "13px",
      color: "#6a5a7a",
    }).setOrigin(0.5);
  }

  _makeButton(cx, y, w, h, label, color, onClick, enabled = true) {
    const x = cx - w / 2;
    const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, color, enabled ? 0.85 : 0.25)
      .setStrokeStyle(2, 0xffffff, enabled ? 0.6 : 0.2)
      .setOrigin(0.5, 0.5);

    const text = this.add.text(x + w / 2, y + h / 2, label, {
      fontFamily: "Tahoma, Arial, sans-serif",
      fontSize: "22px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5);

    if (enabled) {
      rect.setInteractive({ useHandCursor: true });
      this.input.setHitArea([rect]);
      rect.on("pointerover", () => rect.fillAlpha = 1);
      rect.on("pointerout", () => rect.fillAlpha = 0.85);
      rect.on("pointerdown", () => {
        rect.setScale(0.96);
        // Resume audio on user gesture
        const boot = this.scene.get("BootScene");
        if (boot?.audio) {
          boot.audio.resume();
          boot.audio.menu();
        }
      });
      rect.on("pointerup", () => {
        rect.setScale(1);
        onClick();
      });
    } else {
      text.setColor("#888888");
    }

    return rect;
  }

  _showLevelSelect() {
    // Simple level select — only level 1 for now
    this._showOverlay("انتخاب مرحله", [
      { label: "۱. درهٔ سبز (آموزشی)", enabled: true, onClick: () => {
        this.scene.start("GameScene", { level: 0, fresh: true });
      }},
    ]);
  }

  _showHowToPlay() {
    const lines = [
      "راهنمای بازی:",
      "",
      "کلیدها (دسکتاپ):",
      "  A/D یا ←/→ : حرکت",
      "  W/Space/↑ : پرش",
      "  Shift : دویدن",
      "  S/↓ : نشستن",
      "  E : Shadow Dash (نیازمند انرژی سایه)",
      "  Esc یا P : توقف موقت",
      "  R : شروع مجدد مرحله",
      "",
      "موبایل: دکمه‌های لمسی روی صفحه",
      "",
      "هدف: سکه‌ها را جمع کن، از دشمن‌ها عبور کن،",
      "به دروازهٔ خروج (X) برس تا مرحله تمام شود.",
      "",
      "نکته: روی دشمن بپر تا شکستش بخوری؛",
      "تماس از پهلو باعث آسیب می‌شود.",
    ];
    this._showOverlay("راهنما", lines, true);
  }

  _showSettings() {
    const save = Storage.load();
    const lines = [
      "تنظیمات",
      "",
      `صدا: ${save.muted ? "خاموش" : "روشن"}`,
      `میزان صدا: ${Math.round(save.volume * 100)}%`,
      "",
      "(تنظیمات پیشرفته بعداً اضافه می‌شود)",
    ];
    const overlay = this._showOverlay("تنظیمات", lines, true);

    // Toggle mute button
    const btn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT * 0.7, 220, 44, 0x6a4cff, 0.8)
      .setStrokeStyle(2, 0xffffff, 0.6).setInteractive({ useHandCursor: true });
    const label = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.7, save.muted ? "فعال‌سازی صدا" : "بی‌صدا کردن", {
      fontFamily: "Tahoma, Arial", fontSize: "20px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    btn.on("pointerup", () => {
      save.muted = !save.muted;
      Storage.save(save);
      label.setText(save.muted ? "فعال‌سازی صدا" : "بی‌صدا کردن");
      const boot = this.scene.get("BootScene");
      if (boot?.audio) boot.audio.setMuted(save.muted);
    });
    overlay.events.once("shutdown", () => { btn.destroy(); label.destroy(); });
  }

  _showOverlay(title, linesOrButtons, isText = false) {
    // Dim
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setOrigin(0).setDepth(100).setInteractive();
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 720, 460, 0x141228, 0.95)
      .setStrokeStyle(2, 0xb9a5ff, 0.6).setOrigin(0.5).setDepth(101);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 200, title, {
      fontFamily: "Tahoma, Arial", fontSize: "32px", fontStyle: "bold",
      color: "#f8e1a0",
    }).setOrigin(0.5).setDepth(102);

    if (isText) {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, linesOrButtons.join("\n"), {
        fontFamily: "Tahoma, Arial", fontSize: "18px",
        color: "#d8c8ff", align: "right",
      }).setOrigin(0.5).setDepth(102).setLineSpacing(4);
    }

    // Close button
    const close = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 200, "[ بستن ]", {
      fontFamily: "Tahoma, Arial", fontSize: "20px", color: "#b9a5ff",
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });

    close.on("pointerup", () => {
      dim.destroy(); panel.destroy();
      close.destroy();
      this.children.list.filter(o => o._overlayChild).forEach(o => o.destroy());
    });

    return this;
  }
}
