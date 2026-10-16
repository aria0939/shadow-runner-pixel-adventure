// entities/Checkpoint.js — Saves respawn position when touched.

export class Checkpoint extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "checkpoint-flag");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setAllowGravity(false);
    this.body.setImmovable(true);

    const tex = scene.textures.get("checkpoint-flag").getSourceImage();
    const targetH = 80;
    const scale = targetH / tex.height;
    this.setScale(scale);
    this.setOrigin(0.5, 1);

    this._activated = false;

    // Subtle idle sway
    this._idle = scene.tweens.add({
      targets: this,
      angle: 4,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  activate() {
    if (this._activated) return false;
    this._activated = true;
    this._idle?.remove();
    // Flash effect
    this.scene.tweens.add({
      targets: this,
      angle: 0,
      duration: 220,
    });
    this.setTint(0xfff8c0);
    this.scene.tweens.add({
      targets: this,
      scaleY: this.scaleY * 1.18,
      duration: 180,
      yoyo: true,
    });
    return true;
  }

  get isActivated() { return this._activated; }
}
