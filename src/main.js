// main.js — Shadow Runner: Pixel Adventure
// Entry point: creates the Phaser game instance and wires up scenes.

import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { UIScene } from "./scenes/UIScene.js";
import { Storage } from "./systems/Storage.js";

// Logical resolution the game is designed for.
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// Detect mobile/touch
const isTouch =
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0 ||
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

// Show touch controls UI on touch devices
if (isTouch) {
  document.getElementById("touch-controls")?.classList.remove("hidden");
}

// Configure Phaser
const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: "#0a0a14",
  scale: {
    mode: Phaser.Scale.ScaleModes.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: false,
    roundPixels: true,
    pixelArt: true,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 1100 },
      debug: false,
    },
  },
  input: {
    activePointers: 5, // support multi-touch
  },
};

// Boot the game
const game = new Phaser.Game(config);

game.scene.add("BootScene", BootScene, false);
game.scene.add("MenuScene", MenuScene, false);
game.scene.add("GameScene", GameScene, false);
game.scene.add("UIScene", UIScene, false);

// Register service worker for PWA / offline play
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // silently ignore — game still works without SW
    });
  });
}

// Prevent page scroll / context menu on touch
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("contextmenu", (e) => {
  if (e.target.tagName === "CANVAS") e.preventDefault();
});

// Pause game when tab is hidden
document.addEventListener("visibilitychange", () => {
  const scene = game.scene.getScene("GameScene");
  if (scene && scene.sys.isActive() && document.hidden) {
    scene.pauseGame?.();
  }
});

// Expose for debugging in browser console
window.ShadowRunner = { game, Storage };

// Start the boot scene
game.scene.start("BootScene");
