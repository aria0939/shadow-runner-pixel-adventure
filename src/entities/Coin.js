// entities/Coin.js — Floating collectible coin.

export class Coin extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "coin");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setAllowGravity(false);
    this.body.setImmovable(true);

    // Scale down coin
    const tex = scene.textures.get("coin").getSourceImage();
    const targetH = 28;
    const scale = targetH / tex.height;
    this.setScale(scale);
    this.setOrigin(0.5, 0.5);

    // Idle bob animation (no sprite anim frames; we tween it)
    this._tween = scene.tweens.add({
      targets: this,
      y: y - 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    this._spawnY = y;

    this._collected = false;
  }

  update_() {
    // Slow rotation via scaleX tween
    this.rotation += 0.04;
  }

  collect() {
    if (this._collected) return false;
    this._collected = true;
    this._tween?.remove();
    // Pop-out effect
    this.scene.tweens.add({
      targets: this,
      scaleY: 0,
      scaleX: 0,
      alpha: 0,
      duration: 180,
      onComplete: () => this.destroy(),
    });
    return true;
  }
}
