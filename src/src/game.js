const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const VIEW = {
  width: 960,
  height: 600,
  dpr: 1,
};

const lootEl = document.getElementById("lootCount");
const hpEl = document.getElementById("hpCount");
const timeEl = document.getElementById("timeCount");
const ammoEl = document.getElementById("ammoCount");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");

const WORLD = {
  width: 1600,
  height: 1000,
};

const COLORS = {
  grassA: "#f9e9c8",
  grassB: "#ffe7d8",
  path: "#f7d7a9",
  ink: "#3d3545",
  rose: "#ff7fad",
  peach: "#ffb17a",
  mint: "#68c7a3",
  lilac: "#8e80ff",
  sky: "#76c9f5",
  cloud: "#8b8298",
  white: "#fffdf8",
};

const state = {
  status: "map",
  keys: new Set(),
  mouse: { x: VIEW.width / 2, y: VIEW.height / 2, down: false },
  camera: { x: 0, y: 0 },
  player: null,
  bullets: [],
  enemies: [],
  loot: [],
  flowers: [],
  walls: [],
  particles: [],
  exit: null,
  collected: 0,
  needed: 8,
  levelIndex: 0,
  unlockedLevel: 0,
  timeLeft: 90,
  graceLeft: 4,
  lastShot: 0,
  lastFrame: performance.now(),
  endTitle: "",
  endMessage: "",
};

const LEVELS = [
  {
    name: "棉花糖小径",
    story: "第一站很温柔，适合熟悉移动、收集和撤离节奏。",
    needed: 6,
    time: 95,
    enemies: 4,
    enemyBoost: 0.82,
    lootCount: 7,
    exitY: 500,
    wallShift: 0,
  },
  {
    name: "莓果喷泉",
    story: "小乌云开始绕路，星糖也更分散了。",
    needed: 7,
    time: 90,
    enemies: 5,
    enemyBoost: 0.95,
    lootCount: 8,
    exitY: 270,
    wallShift: 42,
  },
  {
    name: "薄荷迷宫",
    story: "花墙更多，路线要更果断，攒够星糖就撤。",
    needed: 8,
    time: 85,
    enemies: 6,
    enemyBoost: 1.05,
    lootCount: 9,
    exitY: 720,
    wallShift: -34,
  },
  {
    name: "月光茶会",
    story: "小乌云速度变快，泡泡法杖要更勤快。",
    needed: 9,
    time: 82,
    enemies: 7,
    enemyBoost: 1.14,
    lootCount: 10,
    exitY: 360,
    wallShift: 78,
  },
  {
    name: "星糖王冠",
    story: "终点关卡：收集足够星糖，穿过王冠花门完成通关。",
    needed: 10,
    time: 80,
    enemies: 8,
    enemyBoost: 1.24,
    lootCount: 10,
    exitY: 620,
    wallShift: -76,
  },
];

const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function currentLevel() {
  return LEVELS[state.levelIndex];
}

function startLevel(index = state.levelIndex) {
  state.levelIndex = clamp(index, 0, LEVELS.length - 1);
  const level = currentLevel();
  state.status = "playing";
  state.collected = 0;
  state.needed = level.needed;
  state.timeLeft = level.time;
  state.graceLeft = 4;
  state.bullets = [];
  state.enemies = [];
  state.loot = [];
  state.flowers = [];
  state.walls = [];
  state.particles = [];
  state.lastShot = 0;
  state.player = {
    x: 155,
    y: WORLD.height / 2,
    r: 24,
    hp: 100,
    speed: 235,
    ammo: 18,
    maxAmmo: 18,
    reloadTimer: 0,
    invuln: 0,
    facing: 0,
  };

  buildGarden();
  overlay.classList.add("is-hidden");
  updateHud();
}

function buildGarden() {
  const level = currentLevel();
  const wallSpecs = [
    [320, 120, 64, 260],
    [530, 545, 62, 260],
    [760, 190, 70, 250],
    [970, 650, 64, 230],
    [1110, 100, 58, 250],
    [1250, 430, 68, 250],
  ];

  state.walls = wallSpecs.map(([x, y, w, h], index) => ({
    x,
    y: clamp(y + (index % 2 === 0 ? level.wallShift : -level.wallShift * 0.55), 80, WORLD.height - h - 80),
    w,
    h,
    color: Math.random() > 0.5 ? "#ffcfdb" : "#c8ebd8",
  }));

  const lootSpots = [
    [250, 165],
    [420, 805],
    [585, 280],
    [760, 730],
    [935, 205],
    [1110, 510],
    [1280, 205],
    [1375, 770],
    [690, 465],
    [1165, 840],
  ];
  state.loot = lootSpots.slice(0, level.lootCount).map(([x, y], index) => ({
    x,
    y: clamp(y + Math.sin(index + state.levelIndex) * 46, 80, WORLD.height - 80),
    r: 16,
    taken: false,
    bob: rand(0, Math.PI * 2),
    type: index % 3,
  }));

  const enemySpots = [
    [500, 190],
    [645, 845],
    [890, 420],
    [1120, 220],
    [1290, 630],
    [1430, 350],
    [1015, 830],
    [720, 120],
  ];
  state.enemies = enemySpots.slice(0, level.enemies).map(([x, y], index) => ({
    x,
    y: clamp(y + Math.cos(index * 1.8 + state.levelIndex) * 54, 70, WORLD.height - 70),
    r: index % 2 ? 24 : 28,
    hp: index % 2 ? 38 : 52,
    speed: (index % 2 ? 58 : 48) * level.enemyBoost,
    bump: rand(0, Math.PI * 2),
    hitFlash: 0,
    drift: rand(-0.65, 0.65),
  }));

  for (let i = 0; i < 70; i += 1) {
    state.flowers.push({
      x: rand(60, WORLD.width - 60),
      y: rand(60, WORLD.height - 60),
      s: rand(0.65, 1.25),
      color: ["#ff93bb", "#80d7b2", "#87cdf7", "#ffbd75", "#a89dff"][i % 5],
      spin: rand(0, Math.PI),
    });
  }

  state.exit = {
    x: WORLD.width - 130,
    y: level.exitY,
    r: 48,
    open: false,
    pulse: 0,
  };
}

function update(dt, now) {
  if (state.status !== "playing") return;

  state.timeLeft -= dt;
  state.graceLeft = Math.max(0, state.graceLeft - dt);
  state.player.invuln = Math.max(0, state.player.invuln - dt);
  state.player.reloadTimer = Math.max(0, state.player.reloadTimer - dt);
  if (state.player.reloadTimer <= 0 && state.player.ammo < state.player.maxAmmo) {
    state.player.ammo += 1;
    state.player.reloadTimer = 0.56;
  }

  movePlayer(dt);
  updateCamera();
  aimPlayer();

  if (state.mouse.down) shoot(now);
  updateBullets(dt);
  updateEnemies(dt);
  updateLoot();
  updateParticles(dt);

  state.exit.open = state.collected >= state.needed;
  state.exit.pulse += dt * 3;
  if (state.exit.open && dist(state.player, state.exit) < state.player.r + state.exit.r * 0.72) {
    clearLevel();
  }

  if (state.player.hp <= 0) {
    endGame("心情耗尽", "小乌云太热情了。换一条路线，先收集近处星糖再慢慢推进。");
  }

  if (state.timeLeft <= 0) {
    endGame("时间到了", "花门关闭了。下次可以少恋战，攒够星糖就去撤离点。");
  }

  updateHud();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  VIEW.width = Math.max(320, Math.round(rect.width));
  VIEW.height = Math.max(200, Math.round(rect.height));
  VIEW.dpr = dpr;

  const targetWidth = Math.round(VIEW.width * dpr);
  const targetHeight = Math.round(VIEW.height * dpr);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (state.player) updateCamera();
}

function canvasViewWidth() {
  return VIEW.width;
}

function canvasViewHeight() {
  return VIEW.height;
}

function movePlayer(dt) {
  const p = state.player;
  const input = { x: 0, y: 0 };
  if (state.keys.has("KeyW") || state.keys.has("ArrowUp")) input.y -= 1;
  if (state.keys.has("KeyS") || state.keys.has("ArrowDown")) input.y += 1;
  if (state.keys.has("KeyA") || state.keys.has("ArrowLeft")) input.x -= 1;
  if (state.keys.has("KeyD") || state.keys.has("ArrowRight")) input.x += 1;

  const len = Math.hypot(input.x, input.y) || 1;
  const vx = (input.x / len) * p.speed * dt;
  const vy = (input.y / len) * p.speed * dt;

  moveCircle(p, vx, 0);
  moveCircle(p, 0, vy);
}

function moveCircle(entity, dx, dy) {
  entity.x = clamp(entity.x + dx, entity.r + 18, WORLD.width - entity.r - 18);
  entity.y = clamp(entity.y + dy, entity.r + 18, WORLD.height - entity.r - 18);

  for (const wall of state.walls) {
    const nearestX = clamp(entity.x, wall.x, wall.x + wall.w);
    const nearestY = clamp(entity.y, wall.y, wall.y + wall.h);
    const overlap = entity.r - Math.hypot(entity.x - nearestX, entity.y - nearestY);
    if (overlap > 0) {
      if (dx !== 0) entity.x += dx > 0 ? -overlap : overlap;
      if (dy !== 0) entity.y += dy > 0 ? -overlap : overlap;
    }
  }
}

function updateCamera() {
  state.camera.x = clamp(state.player.x - canvasViewWidth() / 2, 0, WORLD.width - canvasViewWidth());
  state.camera.y = clamp(state.player.y - canvasViewHeight() / 2, 0, WORLD.height - canvasViewHeight());
}

function aimPlayer() {
  const worldMouse = screenToWorld(state.mouse);
  state.player.facing = Math.atan2(worldMouse.y - state.player.y, worldMouse.x - state.player.x);
}

function shoot(now) {
  const p = state.player;
  if (now - state.lastShot < 180 || p.ammo <= 0) return;
  state.lastShot = now;
  p.ammo -= 1;
  p.reloadTimer = Math.max(p.reloadTimer, 0.72);

  const angle = p.facing;
  const start = {
    x: p.x + Math.cos(angle) * (p.r + 8),
    y: p.y + Math.sin(angle) * (p.r + 8),
  };
  state.bullets.push({
    x: start.x,
    y: start.y,
    vx: Math.cos(angle) * 590,
    vy: Math.sin(angle) * 590,
    r: 8,
    life: 1.05,
  });
  burst(start.x, start.y, COLORS.sky, 5, 120);
}

function updateBullets(dt) {
  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (touchesWall(bullet)) bullet.life = -1;

    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < bullet.r + enemy.r) {
        enemy.hp -= 24;
        enemy.hitFlash = 0.12;
        enemy.x += Math.cos(state.player.facing) * 18;
        enemy.y += Math.sin(state.player.facing) * 18;
        bullet.life = -1;
        burst(enemy.x, enemy.y, "#dff5ff", 10, 180);
        if (enemy.hp <= 0) burst(enemy.x, enemy.y, "#ffd6e5", 22, 240);
        break;
      }
    }
  }
  state.bullets = state.bullets.filter(
    (b) => b.life > 0 && b.x > 0 && b.y > 0 && b.x < WORLD.width && b.y < WORLD.height,
  );
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
}

function updateEnemies(dt) {
  const p = state.player;
  for (const enemy of state.enemies) {
    enemy.bump += dt * 4;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);

    const angleToPlayer = Math.atan2(p.y - enemy.y, p.x - enemy.x);
    const distance = Math.hypot(p.x - enemy.x, p.y - enemy.y);
    const wobble = Math.sin(enemy.bump) * enemy.drift;
    const calmMultiplier = state.graceLeft > 0 ? 0.18 : 1;
    const speed = (distance < 540 ? enemy.speed * 1.28 : enemy.speed * 0.48) * calmMultiplier;
    const vx = Math.cos(angleToPlayer + wobble) * speed * dt;
    const vy = Math.sin(angleToPlayer + wobble) * speed * dt;

    moveCircle(enemy, vx, 0);
    moveCircle(enemy, 0, vy);

    if (distance < p.r + enemy.r && p.invuln <= 0) {
      p.hp -= state.graceLeft > 0 ? 0 : 9;
      p.invuln = 0.95;
      const push = Math.atan2(p.y - enemy.y, p.x - enemy.x);
      moveCircle(p, Math.cos(push) * 28, Math.sin(push) * 28);
      burst(p.x, p.y, "#ff9cbf", 14, 210);
    }
  }
}

function updateLoot() {
  for (const item of state.loot) {
    item.bob += 0.05;
    if (!item.taken && dist(state.player, item) < state.player.r + item.r + 4) {
      item.taken = true;
      state.collected += 1;
      state.player.hp = Math.min(100, state.player.hp + 5);
      burst(item.x, item.y, "#ffe375", 16, 210);
    }
  }
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 35 * dt;
    particle.life -= dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function touchesWall(circle) {
  return state.walls.some((wall) => {
    const nearestX = clamp(circle.x, wall.x, wall.x + wall.w);
    const nearestY = clamp(circle.y, wall.y, wall.y + wall.h);
    return Math.hypot(circle.x - nearestX, circle.y - nearestY) < circle.r;
  });
}

function burst(x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const velocity = rand(speed * 0.35, speed);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      r: rand(2, 5),
      color,
      life: rand(0.28, 0.72),
    });
  }
}

function draw() {
  ctx.setTransform(VIEW.dpr, 0, 0, VIEW.dpr, 0, 0);
  ctx.clearRect(0, 0, canvasViewWidth(), canvasViewHeight());
  ctx.save();
  ctx.translate(-state.camera.x, -state.camera.y);
  drawWorld();
  drawExit();
  drawLoot();
  drawEnemies();
  drawBullets();
  drawPlayer();
  drawParticles();
  ctx.restore();

  if (state.status === "playing") drawMinimap();
  if (state.status === "playing" && state.graceLeft > 0) drawGraceHint();
}

function drawWorld() {
  ctx.fillStyle = COLORS.grassA;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  drawSoftPath();
  drawGridTexture();

  for (const flower of state.flowers) {
    drawFlower(flower.x, flower.y, flower.s, flower.color, flower.spin);
  }

  for (const wall of state.walls) {
    drawHedge(wall);
  }

  ctx.strokeStyle = "rgba(114, 91, 126, 0.18)";
  ctx.lineWidth = 8;
  roundRect(ctx, 24, 24, WORLD.width - 48, WORLD.height - 48, 32);
  ctx.stroke();
}

function drawSoftPath() {
  ctx.save();
  ctx.strokeStyle = COLORS.path;
  ctx.lineWidth = 96;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.78;
  ctx.beginPath();
  ctx.moveTo(120, WORLD.height / 2);
  ctx.bezierCurveTo(420, 280, 620, 790, 900, 520);
  ctx.bezierCurveTo(1060, 360, 1260, 290, WORLD.width - 120, 560);
  ctx.stroke();
  ctx.restore();
}

function drawGridTexture() {
  ctx.save();
  ctx.globalAlpha = 0.16;
  for (let x = 0; x < WORLD.width; x += 72) {
    ctx.strokeStyle = x % 144 === 0 ? "#ffffff" : "#dfb88d";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.height);
    ctx.stroke();
  }
  for (let y = 0; y < WORLD.height; y += 72) {
    ctx.strokeStyle = y % 144 === 0 ? "#ffffff" : "#dfb88d";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHedge(wall) {
  ctx.save();
  ctx.fillStyle = wall.color;
  ctx.shadowColor = "rgba(73, 53, 91, 0.14)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, wall.x, wall.y, wall.w, wall.h, 28);
  ctx.fill();
  ctx.shadowColor = "transparent";
  for (let y = wall.y + 26; y < wall.y + wall.h - 8; y += 38) {
    drawLeaf(wall.x + wall.w / 2, y, wall.w * 0.34);
  }
  ctx.restore();
}

function drawLeaf(x, y, s) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
  ctx.beginPath();
  ctx.ellipse(x - s * 0.3, y, s * 0.52, s * 0.26, -0.35, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.3, y, s * 0.52, s * 0.26, 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawExit() {
  const exit = state.exit;
  const pulse = 1 + Math.sin(exit.pulse) * 0.08;
  ctx.save();
  ctx.translate(exit.x, exit.y);
  ctx.scale(pulse, pulse);

  ctx.strokeStyle = exit.open ? "#8e80ff" : "rgba(120, 111, 135, 0.42)";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, 0, exit.r, Math.PI * 0.88, Math.PI * 2.12);
  ctx.stroke();

  ctx.fillStyle = exit.open ? "rgba(142, 128, 255, 0.2)" : "rgba(255,255,255,0.32)";
  ctx.beginPath();
  ctx.arc(0, 0, exit.r * 0.78, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI * 2 * i) / 6 + state.exit.pulse * 0.4;
    drawTinyStar(Math.cos(a) * exit.r * 0.88, Math.sin(a) * exit.r * 0.88, 7, exit.open ? "#ffe375" : "#ffffff");
  }

  ctx.fillStyle = exit.open ? COLORS.ink : COLORS.muted;
  ctx.font = "700 15px 'Noto Sans SC', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(exit.open ? "撤离" : "收集星糖", 0, 6);
  ctx.restore();
}

function drawLoot() {
  for (const item of state.loot) {
    if (item.taken) continue;
    const y = item.y + Math.sin(item.bob) * 5;
    drawCrystal(item.x, y, item.r, item.type);
  }
}

function drawCrystal(x, y, r, type) {
  const fills = ["#ffe375", "#ff9fc4", "#8fe3c1"];
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = fills[type];
  ctx.strokeStyle = "rgba(82, 66, 99, 0.24)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.82, -r * 0.18);
  ctx.lineTo(r * 0.52, r * 0.88);
  ctx.lineTo(-r * 0.52, r * 0.88);
  ctx.lineTo(-r * 0.82, -r * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.23, -r * 0.26, r * 0.16, r * 0.28, 0.7, 0, Math.PI * 2);
  ctx.fill();
  drawTinyStar(r * 0.82, -r * 0.72, r * 0.3, "#ffffff");
  ctx.restore();
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    drawCloudEnemy(enemy);
  }
}

function drawCloudEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y + Math.sin(enemy.bump) * 3);
  ctx.fillStyle = enemy.hitFlash > 0 ? "#fff3fa" : "#858096";
  ctx.strokeStyle = "rgba(55, 48, 70, 0.32)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(-enemy.r * 0.45, 0, enemy.r * 0.46, 0, Math.PI * 2);
  ctx.arc(0, -enemy.r * 0.25, enemy.r * 0.58, 0, Math.PI * 2);
  ctx.arc(enemy.r * 0.47, 0, enemy.r * 0.45, 0, Math.PI * 2);
  ctx.arc(0, enemy.r * 0.16, enemy.r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#373046";
  ctx.beginPath();
  ctx.arc(-enemy.r * 0.24, -enemy.r * 0.08, 3.5, 0, Math.PI * 2);
  ctx.arc(enemy.r * 0.24, -enemy.r * 0.08, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#373046";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, enemy.r * 0.13, 7, 0.1, Math.PI - 0.1);
  ctx.stroke();

  ctx.strokeStyle = "#76c9f5";
  ctx.lineWidth = 3;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * enemy.r * 0.28, enemy.r * 0.62);
    ctx.quadraticCurveTo(i * enemy.r * 0.35 + 5, enemy.r * 0.88, i * enemy.r * 0.18, enemy.r * 1.02);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBullets() {
  for (const bullet of state.bullets) {
    ctx.save();
    ctx.fillStyle = "#dff8ff";
    ctx.strokeStyle = "#76c9f5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(bullet.x - bullet.r * 0.25, bullet.y - bullet.r * 0.28, bullet.r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPlayer() {
  const p = state.player;
  ctx.save();
  ctx.translate(p.x, p.y);

  if (state.graceLeft > 0) {
    ctx.save();
    ctx.rotate(performance.now() / 700);
    ctx.strokeStyle = "rgba(142, 128, 255, 0.46)";
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, p.r + 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.rotate(p.facing);

  ctx.globalAlpha = p.invuln > 0 && Math.sin(performance.now() / 55) > 0 ? 0.58 : 1;

  ctx.fillStyle = "#ff9fc4";
  ctx.strokeStyle = "rgba(61, 53, 69, 0.22)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(8, 0, 28, 21, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff6fb";
  ctx.beginPath();
  ctx.arc(1, -3, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.ink;
  ctx.beginPath();
  ctx.arc(5, -8, 2.8, 0, Math.PI * 2);
  ctx.arc(14, -8, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(10, -2, 5, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.fillStyle = "#8e80ff";
  roundRect(ctx, 15, 9, 33, 8, 4);
  ctx.fill();
  ctx.fillStyle = "#ffe375";
  ctx.beginPath();
  ctx.arc(49, 13, 6, 0, Math.PI * 2);
  ctx.fill();
  drawTinyStar(49, 13, 4, "#ffffff");

  ctx.restore();
}

function drawGraceHint() {
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  ctx.strokeStyle = "rgba(86, 70, 105, 0.16)";
  ctx.lineWidth = 1;
  roundRect(ctx, canvasViewWidth() / 2 - 145, canvasViewHeight() - 58, 290, 36, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.ink;
  ctx.font = "700 14px 'Noto Sans SC', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`泡泡护盾 ${Math.ceil(state.graceLeft)} 秒`, canvasViewWidth() / 2, canvasViewHeight() - 35);
  ctx.restore();
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.save();
    ctx.globalAlpha = clamp(particle.life * 2, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFlower(x, y, s, color, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i += 1) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(0, -7, 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#ffe375";
  ctx.beginPath();
  ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTinyStar(x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const radius = i % 2 === 0 ? r : r * 0.42;
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 8;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMinimap() {
  const mapW = 148;
  const mapH = 92;
  const x = canvasViewWidth() - mapW - 16;
  const y = canvasViewHeight() - mapH - 16;
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.strokeStyle = "rgba(86, 70, 105, 0.2)";
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, mapW, mapH, 8);
  ctx.fill();
  ctx.stroke();

  const sx = mapW / WORLD.width;
  const sy = mapH / WORLD.height;
  const plot = (entity, color, radius) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + entity.x * sx, y + entity.y * sy, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  state.loot.filter((item) => !item.taken).forEach((item) => plot(item, "#ffe375", 2.2));
  plot(state.exit, state.exit.open ? COLORS.lilac : "#9c94aa", 4);
  state.enemies.forEach((enemy) => plot(enemy, "#858096", 2.4));
  plot(state.player, COLORS.rose, 3.5);
  ctx.restore();
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function screenToWorld(point) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvasViewWidth() / rect.width;
  const scaleY = canvasViewHeight() / rect.height;
  return {
    x: (point.x - rect.left) * scaleX + state.camera.x,
    y: (point.y - rect.top) * scaleY + state.camera.y,
  };
}

function endGame(title, message) {
  state.status = "ended";
  state.endTitle = title;
  state.endMessage = message;
  overlay.querySelector("h1").textContent = title;
  overlayText.textContent = message;
  startBtn.textContent = "再来一局";
  overlay.classList.remove("is-hidden");
}

function clearLevel() {
  const clearedLevel = state.levelIndex;
  state.unlockedLevel = Math.max(state.unlockedLevel, Math.min(clearedLevel + 1, LEVELS.length - 1));
  if (clearedLevel >= LEVELS.length - 1) {
    state.status = "ended";
    overlay.querySelector("h1").textContent = "全部通关";
    overlayText.textContent = "你完成了 5 个花园关卡，星糖王冠亮起来了。现在可以回地图重玩任意已解锁关卡。";
    startBtn.textContent = "回到地图";
    overlay.classList.remove("is-hidden");
    return;
  }

  state.levelIndex = clearedLevel + 1;
  showLevelMap(`第 ${clearedLevel + 1} 关完成。下一站：${currentLevel().name}`);
}

function updateHud() {
  lootEl.textContent = `${state.collected}/${state.needed}`;
  hpEl.textContent = Math.max(0, Math.ceil(state.player?.hp ?? 100));
  timeEl.textContent = Math.max(0, Math.ceil(state.timeLeft));
  ammoEl.textContent = state.player ? `${state.player.ammo}/${state.player.maxAmmo}` : "18";
}

function showLevelMap(note = "") {
  state.status = "map";
  state.needed = currentLevel().needed;
  state.timeLeft = currentLevel().time;
  updateHud();
  const level = currentLevel();
  overlay.querySelector("h1").textContent = "星糖闯关地图";
  overlayText.innerHTML = `
    ${note ? `<span class="level-note">${note}</span><br />` : ""}
    当前关卡：第 ${state.levelIndex + 1} 关「${level.name}」。${level.story}
  `;
  startBtn.textContent = `挑战第 ${state.levelIndex + 1} 关`;

  const existingMap = overlay.querySelector(".level-map");
  existingMap?.remove();
  overlayText.insertAdjacentHTML("afterend", renderLevelMap());
  overlay.classList.remove("is-hidden");
}

function renderLevelMap() {
  const xs = ["9%", "29%", "50%", "71%", "91%"];
  const lifts = ["12px", "-18px", "10px", "-20px", "8px"];
  const nodes = LEVELS.map((level, index) => {
    const status =
      index < state.unlockedLevel ? "is-cleared" : index === state.levelIndex ? "is-current is-unlocked" : index <= state.unlockedLevel ? "is-unlocked" : "is-locked";
    const marker = index < state.unlockedLevel ? "✓" : index + 1;
    return `
      <div class="level-node ${status}" style="--x: ${xs[index]}; --lift: ${lifts[index]}">
        <div class="node-orb">${marker}</div>
        <div class="node-label">${level.name}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="level-map" aria-label="5 个关卡地图">
      <div class="map-path">${nodes}</div>
      <div class="level-summary">第 ${state.levelIndex + 1} 关需要收集 ${currentLevel().needed} 颗星糖，限时 ${currentLevel().time} 秒。</div>
    </div>
  `;
}

function loop(now) {
  const dt = Math.min(0.033, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  update(dt, now);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  state.keys.add(event.code);
  if (event.code === "Space") {
    event.preventDefault();
    if (state.status === "playing") shoot(performance.now());
  }
  if (event.code === "KeyR") startGame();
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.code);
});

canvas.addEventListener("mousemove", (event) => {
  state.mouse.x = event.clientX;
  state.mouse.y = event.clientY;
});

canvas.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  state.mouse.down = true;
  if (state.status === "playing") shoot(performance.now());
});

window.addEventListener("mouseup", () => {
  state.mouse.down = false;
});

window.addEventListener("resize", () => {
  resizeCanvas();
});

startBtn.addEventListener("click", () => {
  if (state.status === "ended" && state.levelIndex >= LEVELS.length - 1 && state.unlockedLevel >= LEVELS.length - 1) {
    state.levelIndex = 0;
    state.unlockedLevel = LEVELS.length - 1;
    showLevelMap();
    return;
  }
  startLevel();
});

function seedMenuPreview() {
  state.player = {
    x: 155,
    y: WORLD.height / 2,
    r: 24,
    hp: 100,
    speed: 235,
    ammo: 18,
    maxAmmo: 18,
    reloadTimer: 0,
    invuln: 0,
    facing: 0,
  };
  buildGarden();
  updateCamera();
  updateHud();
}

resizeCanvas();
seedMenuPreview();
showLevelMap();
requestAnimationFrame(loop);
