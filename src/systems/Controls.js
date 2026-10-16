// systems/Controls.js — Unified keyboard + touch input.

export class Controls {
  constructor(scene, input) {
    this.scene = scene;
    this.input = input;
    this.cursors = input.keyboard.createCursorKeys();
    this.keys = input.keyboard.addKeys("W,A,S,D,E,SHIFT,SPACE,P,R,ESC");

    // Digital input state — read these in update()
    this.left = false;
    this.right = false;
    this.up = false;       // jump request (edge)
    this.down = false;     // crouch
    this.sprint = false;
    this.dash = false;
    this.pause = false;
    this.restart = false;

    // Edge-trigger latches
    this._jumpPressed = false;
    this._dashPressed = false;
    this._pausePressed = false;
    this._restartPressed = false;

    // Jump buffer
    this.jumpBufferTimer = 0;
    this.JUMP_BUFFER_MS = 120;

    // Coyote time
    this.coyoteTimer = 0;
    this.COYOTE_MS = 100;

    this._wireKeyboard();
  }

  _wireKeyboard() {
    this.input.keyboard.on("keydown-SPACE", () => this._jumpPressed = true);
    this.input.keyboard.on("keydown-W", () => this._jumpPressed = true);
    this.input.keyboard.on("keydown-UP", () => this._jumpPressed = true);
    this.input.keyboard.on("keydown-E", () => this._dashPressed = true);
    this.input.keyboard.on("keydown-ESC", () => this._pausePressed = true);
    this.input.keyboard.on("keydown-P", () => this._pausePressed = true);
    this.input.keyboard.on("keydown-R", () => this._restartPressed = true);
  }

  // Wire touch button ids to actions
  wireTouch({
    leftId = "btn-left",
    rightId = "btn-right",
    jumpId = "btn-jump",
    dashId = "btn-dash",
    pauseId = "btn-pause",
  } = {}) {
    const bind = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;
      const down = (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.add("pressed");
        onDown();
      };
      const up = (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove("pressed");
        onUp && onUp();
      };
      el.addEventListener("touchstart", down, { passive: false });
      el.addEventListener("touchend", up, { passive: false });
      el.addEventListener("touchcancel", up, { passive: false });
      el.addEventListener("mousedown", down);
      el.addEventListener("mouseup", up);
      el.addEventListener("mouseleave", up);
    };

    bind(
      leftId,
      () => (this.left = true),
      () => (this.left = false)
    );
    bind(
      rightId,
      () => (this.right = true),
      () => (this.right = false)
    );
    bind(jumpId, () => (this._jumpPressed = true));
    bind(dashId, () => (this._dashPressed = true));
    bind(pauseId, () => (this._pausePressed = true));
  }

  // Should be called from GameScene.update(_, dt) BEFORE reading inputs.
  // dt is in ms.
  tick(dt, isGrounded) {
    // Keyboard continuous reads
    const left =
      this.left || this.cursors.left.isDown || this.keys.A.isDown;
    const right =
      this.right || this.cursors.right.isDown || this.keys.D.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    const sprint =
      this.sprint ||
      this.cursors.shift.isDown ||
      this.keys.SHIFT.isDown;

    this._leftState = left;
    this._rightState = right;
    this._downState = down;
    this._sprintState = sprint;

    // Update timers
    if (this._jumpPressed) {
      this.jumpBufferTimer = this.JUMP_BUFFER_MS;
      this._jumpPressed = false;
    } else if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= dt;
    }

    if (isGrounded) {
      this.coyoteTimer = this.COYOTE_MS;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer -= dt;
    }

    // Edge-triggered actions
    this.dash = this._dashPressed;
    this._dashPressed = false;
    this.pause = this._pausePressed;
    this._pausePressed = false;
    this.restart = this._restartPressed;
    this._restartPressed = false;
  }

  consumeJumpRequest() {
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      return true;
    }
    return false;
  }

  // Current continuous state
  get moveLeft() { return this._leftState || false; }
  get moveRight() { return this._rightState || false; }
  get crouch() { return this._downState || false; }
  get sprintHeld() { return this._sprintState || false; }
  get jumpHeld() {
    return (
      this.cursors.up.isDown ||
      this.keys.W.isDown ||
      this.keys.SPACE.isDown ||
      this._jumpPressed
    );
  }
}
