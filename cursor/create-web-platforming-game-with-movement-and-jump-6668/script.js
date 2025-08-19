/* Mini 2D platformer: movement + jump */
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // World and physics
  const world = {
    width: canvas.width,
    height: canvas.height,
    gravity: 0.6,
    backgroundSkyColorTop: '#74c0fc',
    backgroundSkyColorBottom: '#4dabf7',
  };

  const input = {
    left: false,
    right: false,
    jump: false,
  };

  const player = {
    x: 80,
    y: 0,
    width: 32,
    height: 48,
    vx: 0,
    vy: 0,
    speed: 0.65,
    maxSpeedX: 4.2,
    jumpStrength: 12,
    onGround: false,
    coyoteTimeFrames: 6,
    coyoteCounter: 0,
    jumpBufferFrames: 6,
    jumpBufferCounter: 0,
    color: '#ffdd55',
  };

  /** Level geometry: simple rectangles */
  const platforms = [
    // Ground
    { x: 0, y: world.height - 48, width: world.width, height: 48 },

    // Ledges
    { x: 140, y: world.height - 140, width: 120, height: 20 },
    { x: 320, y: world.height - 220, width: 120, height: 20 },
    { x: 520, y: world.height - 180, width: 100, height: 20 },
    { x: 700, y: world.height - 260, width: 140, height: 20 },
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function resolveHorizontalCollisions() {
    for (const p of platforms) {
      if (rectsOverlap(player.x, player.y, player.width, player.height, p.x, p.y, p.width, p.height)) {
        if (player.vx > 0) {
          player.x = p.x - player.width;
        } else if (player.vx < 0) {
          player.x = p.x + p.width;
        }
        player.vx = 0;
      }
    }
  }

  function resolveVerticalCollisions() {
    let grounded = false;
    for (const p of platforms) {
      if (rectsOverlap(player.x, player.y, player.width, player.height, p.x, p.y, p.width, p.height)) {
        if (player.vy > 0) {
          // Landed on top
          player.y = p.y - player.height;
          player.vy = 0;
          grounded = true;
        } else if (player.vy < 0) {
          // Hit head
          player.y = p.y + p.height;
          player.vy = 0;
        }
      }
    }
    if (grounded) {
      player.onGround = true;
      player.coyoteCounter = player.coyoteTimeFrames;
    } else {
      player.onGround = false;
      if (player.coyoteCounter > 0) player.coyoteCounter--;
    }
  }

  // Input handling with small quality-of-life (coyote time + jump buffer)
  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) input.left = true;
    if (['ArrowRight', 'd', 'D'].includes(e.key)) input.right = true;
    if ([' ', 'w', 'W', 'ArrowUp'].includes(e.key)) {
      input.jump = true;
      player.jumpBufferCounter = player.jumpBufferFrames;
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) input.left = false;
    if (['ArrowRight', 'd', 'D'].includes(e.key)) input.right = false;
    if ([' ', 'w', 'W', 'ArrowUp'].includes(e.key)) input.jump = false;
  });

  function tryJump() {
    const canJump = player.onGround || player.coyoteCounter > 0;
    if (player.jumpBufferCounter > 0 && canJump) {
      player.vy = -player.jumpStrength;
      player.onGround = false;
      player.coyoteCounter = 0;
      player.jumpBufferCounter = 0;
    }
    if (player.jumpBufferCounter > 0) player.jumpBufferCounter--;
  }

  function update() {
    // Horizontal movement
    const acceleratingLeft = input.left && !input.right;
    const acceleratingRight = input.right && !input.left;

    if (acceleratingLeft) player.vx -= player.speed;
    if (acceleratingRight) player.vx += player.speed;

    // Friction when no input on ground; mild air control
    const friction = player.onGround ? 0.75 : 0.92;
    if (!acceleratingLeft && !acceleratingRight) player.vx *= friction;

    player.vx = clamp(player.vx, -player.maxSpeedX, player.maxSpeedX);

    // Integrate X and resolve horizontal collisions
    player.x += player.vx;
    resolveHorizontalCollisions();

    // Gravity + integrate Y and resolve vertical collisions
    player.vy += world.gravity;
    player.y += player.vy;
    resolveVerticalCollisions();

    // Jump processing after collision resolution
    tryJump();

    // Respawn if you fall out of the world
    if (player.y > world.height + 200) {
      player.x = 80;
      player.y = 0;
      player.vx = 0;
      player.vy = 0;
    }
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, world.height);
    g.addColorStop(0, world.backgroundSkyColorTop);
    g.addColorStop(1, world.backgroundSkyColorBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, world.width, world.height);

    // Distant hills
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 6; i++) {
      const w = 220 + i * 20;
      const h = 80 + i * 8;
      const x = (i * 170) % (world.width + 200) - 100;
      const y = world.height - 48 - h + 30;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    drawBackground();

    // Platforms
    for (const p of platforms) {
      ctx.fillStyle = '#2b2e4a';
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.fillStyle = '#40446b';
      ctx.fillRect(p.x, p.y, p.width, 6);
    }

    // Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Simple face to give character
    ctx.fillStyle = '#3a2a00';
    const eyeY = player.y + 14;
    ctx.fillRect(player.x + 8, eyeY, 4, 4);
    ctx.fillRect(player.x + 20, eyeY, 4, 4);
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // Start
  loop();
})();

