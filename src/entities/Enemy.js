// entities/Enemy.js — Walker enemy (simple side-to-side patroller).

const ENEMY_TEXTURE = "enemy"; // atlas key

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = "walker") {
    // Use the atlas frame for the first pose of this enemy type
    const frameKey = `enemy-${type}-01`;
    super(scene, x, y, ENEMY_TEXTURE, frameKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.type = type;
    this._speed = 70;
    this._direction = -1; // start moving left
    this._dead = false;
    this._deadTimer = 0;

    // Each atlas cell is 256x320 (matches hero). Scale to a sensible display height.
    const cellH = 320;
    const targetH = 56;
    const scale = targetH / cellH;
    this.setScale(scale);
    this.setOrigin(0.5, 1);

    // Body in TEXTURE coords (relative to the 256x320 cell)
    this.body.setSize(96, cellH * 0.7);
    this.body.setOffset(80, cellH * 0.3);
    this.body.setAllowGravity(true);
    this.body.setCollideWorldBounds(true);
    this.body.setBounce(0, 0);

    if (scene.anims.exists(`enemy-${type}`)) {
      this.anims.play(`enemy-${type}`, true);
    }
  }

  update_(dt, heroRef) {
    if (this._dead) {
      this._deadTimer -= dt;
      if (this._deadTimer <= 0) {
        this.destroy();
      }
      return;
    }

    // Move in current direction
    this.body.setVelocityX(this._speed * this._direction);
    this.setFlipX(this._direction < 0);

    // Edge detection: if hit a wall or about to walk off a ledge, reverse
    if (this.body.blocked.left || this.body.blocked.right) {
      this._direction *= -1;
    }

    // Ledge check: cast a small probe ahead and slightly below
    if (this.body.onFloor()) {
      const probeX = this.x + this._direction * (this.bodyWidth * 0.5 + 8);
      const probeY = this.y + 4;
      // Use scene's tilemap layer to check
      if (this.scene.checkLedgeAhead) {
        const safe = this.scene.checkLedgeAhead(probeX, probeY, this.body.height);
        if (!safe) {
          this._direction *= -1;
        }
      }
    }
  }

  kill() {
    if (this._dead) return;
    this._dead = true;
    this._deadTimer = 400;
    this.body.setVelocity(0, -200);
    this.body.setAllowGravity(true);
    this.setAngle(180);
    this.setAlpha(0.7);
  }

  get isDead() { return this._dead; }
}
