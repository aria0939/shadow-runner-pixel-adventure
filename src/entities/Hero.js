// entities/Hero.js — Player character with platformer physics.

import { AudioSystem } from "../systems/Audio.js";

const HERO_TEXTURE = "hero";          // atlas key
const HERO_FIRST_FRAME = "hero-idle-01"; // first frame key inside the atlas

export class Hero extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, HERO_TEXTURE, HERO_FIRST_FRAME);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.audio = scene.audio || new AudioSystem();

    // Physics defaults (from spec)
    this.WALK_SPEED = 220;
    this.SPRINT_SPEED = 340;
    this.JUMP_VELOCITY = -470;
    this.ACCEL_GROUND = 2400;
    this.ACCEL_AIR = 1400;
    this.FRICTION_GROUND = 2200;
    this.MAX_FALL_SPEED = 900;

    // Visual sizing — original frames are large (200+ px).
    // We scale down to ~64px tall to look right at our 1280x720 viewport.
    this.displayHeightTarget = 92;
    this._setScale();

    // Body tuning — collision box independent from animation frame
    this.body.setSize(this.bodyWidth, this.bodyHeight);
    this.body.setOffset(this.bodyOffsetX, this.bodyOffsetY);
    this.body.setMaxVelocity(this.SPRINT_SPEED, this.MAX_FALL_SPEED);
    this.body.setBounce(0, 0);
    this.setCollideWorldBounds(false); // we use world bounds separately

    // Animation already created in BootScene
    this._state = "idle";
    this._facing = 1; // 1 right, -1 left
    this._wasGrounded = true;
    this._variableJumpActive = false;
    this._invulnTimer = 0;
    this._dead = false;
    this._crouching = false;
    this._dashCooldown = 0;
    this._dashing = false;
    this._dashTimer = 0;
    this._dashSpeed = 700;
    this._dashDuration = 180;
    this._dashCooldownMs = 800;
    this._shadowMeter = 0;
    this._maxShadow = 100;

    this.anims.play("hero-idle");
    this._facingRight();
  }

  _setScale() {
    // Use the atlas source image (single texture for all hero frames)
    const tex = this.scene.textures.get(HERO_TEXTURE).getSourceImage();
    const natW = tex.width;       // 2048 (atlas width)
    const natH = tex.height;      // 1600 (atlas height)
    // Each cell in the atlas is 256x320 — that's the "natural" frame size
    const cellW = 256;
    const cellH = 320;
    const scale = this.displayHeightTarget / cellH;  // 92/320 = 0.2875
    this._naturalScale = scale;
    this._natW = natW;
    this._natH = natH;

    // Body dimensions in TEXTURE coords (relative to the cell)
    // Body offset is relative to the current FRAME, not the full atlas.
    // IMPORTANT: body display width should be ~22 (less than tile size 32)
    // so the hero doesn't accidentally collide with adjacent tiles on its sides.
    // For falling onto a tile, the X overlap will be ~22 < Y overlap (≤32),
    // so Phaser pushes the hero UP — wait that's wrong.
    // Actually for falling: Y overlap < X overlap means push up.
    // So we need X overlap > Y overlap (max ~32) → body width ≥ 32.
    // BUT for sideways collision (hero walking), Y overlap > X overlap means push up too.
    // To handle BOTH cases, we use a wider body but only at the FEET (a "feet-only" body).
    // We do this by setting body height low (just covering feet area).
    const targetDisplayWidth = 24;
    this.bodyWidth = Math.floor(targetDisplayWidth / scale);
    this.bodyHeight = Math.floor(cellH * 0.7);  // body covers 70% of cell height (feet area)
    this.bodyOffsetX = Math.floor((cellW - this.bodyWidth) / 2);
    this.bodyOffsetY = Math.floor(cellH - this.bodyHeight) - 2;

    this.setScale(scale);
    this.setOrigin(0.5, 1); // anchor at feet center
  }

  _facingRight() {
    this.setFlipX(false);
    this._facing = 1;
  }

  _facingLeft() {
    this.setFlipX(true);
    this._facing = -1;
  }

  // Called every frame from GameScene.update(time, delta)
  update_(controls, dt, isGrounded) {
    if (this._dead) return;

    // Decrement timers
    if (this._invulnTimer > 0) this._invulnTimer -= dt;
    if (this._dashCooldown > 0) this._dashCooldown -= dt;
    if (this._dashTimer > 0) this._dashTimer -= dt;

    // ===== Dash (overrides normal movement while active) =====
    if (controls.dash && this._dashCooldown <= 0 && this._shadowMeter >= 25) {
      this._startDash();
    }

    if (this._dashing && this._dashTimer > 0) {
      // During dash, lock velocity and ignore gravity-ish stuff
      this.body.setAllowGravity(false);
      this.body.setVelocityX(this._dashSpeed * this._facing);
      this.body.setVelocityY(0);
      // emit trail particles via scene
      this.scene.emitDashTrail?.(this.x, this.y - this.displayHeight * 0.5);
      if (this._dashTimer <= 0) {
        this._endDash();
      }
      return;
    }

    this.body.setAllowGravity(true);

    // ===== Horizontal movement =====
    const target = controls.sprintHeld ? this.SPRINT_SPEED : this.WALK_SPEED;
    let dir = 0;
    if (controls.moveLeft) dir -= 1;
    if (controls.moveRight) dir += 1;

    if (dir !== 0) {
      dir > 0 ? this._facingRight() : this._facingLeft();
      const accel = isGrounded ? this.ACCEL_GROUND : this.ACCEL_AIR;
      this.body.setAccelerationX(dir * accel);
      // Cap velocity
      const cur = this.body.velocity.x;
      const max = target;
      if (Math.abs(cur) > max) {
        // friction toward max
        const decel = this.FRICTION_GROUND;
        const newV = Phaser.Math.Linear(cur, dir * max, decel / 1000 * (dt / 1000));
        this.body.setVelocityX(newV);
      }
    } else {
      // friction to zero
      if (isGrounded) {
        this.body.setAccelerationX(0);
        const cur = this.body.velocity.x;
        if (Math.abs(cur) > 5) {
          const newV = cur - Math.sign(cur) * this.FRICTION_GROUND * (dt / 1000);
          if ((cur > 0 && newV < 0) || (cur < 0 && newV > 0)) {
            this.body.setVelocityX(0);
          } else {
            this.body.setVelocityX(newV);
          }
        } else {
          this.body.setVelocityX(0);
        }
      } else {
        this.body.setAccelerationX(0); // air: keep momentum, no friction
      }
    }

    // ===== Jump (with coyote + buffer) =====
    if (controls.consumeJumpRequest()) {
      this.body.setVelocityY(this.JUMP_VELOCITY);
      this._variableJumpActive = true;
      this.audio.jump();
      this.scene.emitDust?.(this.x, this.y);
    }
    // Variable jump cut
    if (this._variableJumpActive && !controls.jumpHeld && this.body.velocity.y < 0) {
      this.body.setVelocityY(this.body.velocity.y * 0.5);
      this._variableJumpActive = false;
    }
    if (this.body.velocity.y >= 0) this._variableJumpActive = false;

    // ===== Landing detection =====
    if (isGrounded && !this._wasGrounded) {
      this.audio.land();
      this.scene.emitDust?.(this.x, this.y);
    }
    this._wasGrounded = isGrounded;

    // ===== Animation state =====
    this._updateAnimation(isGrounded, controls);
  }

  _updateAnimation(isGrounded, controls) {
    if (this._dead) return;
    const vx = this.body.velocity.x;
    const vy = this.body.velocity.y;

    let state = "idle";
    if (!isGrounded) {
      state = vy < 0 ? "jump" : "fall";
    } else if (controls.crouch && Math.abs(vx) < 50) {
      state = "crouch";
    } else if (Math.abs(vx) > 30) {
      state = controls.sprintHeld && Math.abs(vx) > this.WALK_SPEED + 10 ? "run" : "walk";
    }

    if (state !== this._state) {
      this._state = state;
      switch (state) {
        case "idle": this.anims.play("hero-idle", true); break;
        case "walk": this.anims.play("hero-walk", true); break;
        case "run": this.anims.play("hero-run", true); break;
        case "jump": this.anims.play("hero-jump", true); break;
        case "fall": this.anims.play("hero-fall", true); break;
        case "crouch": this.anims.play("hero-crouch", true); break;
      }
    }
    // Run anim speed proportional to velocity
    if (state === "run" || state === "walk") {
      const speed = Math.min(1.6, 0.6 + Math.abs(vx) / this.SPRINT_SPEED);
      this.anims.timeScale = speed;
    } else {
      this.anims.timeScale = 1;
    }
  }

  _startDash() {
    this._dashing = true;
    this._dashTimer = this._dashDuration;
    this._dashCooldown = this._dashCooldownMs;
    this._shadowMeter = Math.max(0, this._shadowMeter - 25);
    this.audio.dash();
    this.setAlpha(0.55);
    this.body.setSize(this.bodyWidth, this.bodyHeight * 0.7);
  }

  _endDash() {
    this._dashing = false;
    this._dashTimer = 0;
    this.setAlpha(1);
    this.body.setSize(this.bodyWidth, this.bodyHeight);
    this.body.setVelocityX(this.body.velocity.x * 0.4);
  }

  takeDamage(scene, amount = 1) {
    if (this._dead || this._invulnTimer > 0 || this._dashing) return false;
    this._invulnTimer = 1200;
    this.audio.damage();
    this.setAlpha(0.5);
    // Knockback
    this.body.setVelocityY(-220);
    this.body.setVelocityX(-this._facing * 180);
    scene.cameras.main.shake(120, 0.01);
    scene.time.delayedCall(1200, () => this.setAlpha(1));

    // Check death (lives handled in scene)
    return true;
  }

  die(scene) {
    if (this._dead) return;
    this._dead = true;
    this.audio.death();
    this.body.setVelocity(0, -200);
    this.body.setAllowGravity(true);
    this.anims.play("hero-death");
    this.scene.time.delayedCall(1400, () => {
      this.scene.events.emit("hero-died");
    });
  }

  bounceOnEnemy() {
    this.body.setVelocityY(this.JUMP_VELOCITY * 0.8);
    this._variableJumpActive = true;
    this.audio.enemyStomp();
  }

  addShadow(n) {
    this._shadowMeter = Phaser.Math.Clamp(this._shadowMeter + n, 0, this._maxShadow);
  }

  get shadowMeter() { return this._shadowMeter; }
  get maxShadow() { return this._maxShadow; }
  get isDead() { return this._dead; }
  get isDashing() { return this._dashing; }
  get dashCooldownRatio() {
    return 1 - Phaser.Math.Clamp(this._dashCooldown / this._dashCooldownMs, 0, 1);
  }
  get isInvulnerable() { return this._invulnTimer > 0; }
}
