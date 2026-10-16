// entities/Exit.js — Level completion gate.

export class Exit extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "exit-gate");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setAllowGravity(false);
    this.body.setImmovable(true);

    const tex = scene.textures.get("exit-gate").getSourceImage();
    const targetH = 130;
    const scale = targetH / tex.height;
    this.setScale(scale);
    this.setOrigin(0.5, 1);
    this.setDepth(5);

    // Gentle glow pulse
    this._pulse = scene.tweens.add({
      targets: this,
      alpha: 0.7,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  trigger() {
    this._pulse?.remove();
    this.setAlpha(1);
    this.setTint(0xffd9a0);
    this.scene.tweens.add({
      targets: this,
      scaleY: this.scaleY * 1.2,
      duration: 250,
      yoyo: true,
    });
  }
}
