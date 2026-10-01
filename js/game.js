'use strict';
// FACE RAMPAGE — lógica principal del juego.

const W = 960, H = 540, GROUND = 470, CELL = 32;
const GRAV = 1500, WALK = 150, JUMP = 600, CLIMB = 115, CLIMBX = 90;
const MAX_HP = 100;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let viewScale = 1;

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const choice = arr => arr[Math.floor(Math.random() * arr.length)];
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const CITIES = ['BARCELONA', 'MADRID', 'VALENCIA', 'SEVILLA', 'BILBAO', 'ZARAGOZA', 'NUEVA YORK',
  'TOKIO', 'PARÍS', 'LONDRES', 'CHICAGO', 'CIUDAD DE MÉXICO', 'BUENOS AIRES', 'ROMA', 'BERLÍN'];
const BUILDING_COLORS = [
  ['#b5653a', '#7d3f1f'], ['#8d939e', '#555b66'], ['#c9b28f', '#8c7656'], ['#6f8fa8', '#3f5b72'],
  ['#a65a4a', '#6b3328'], ['#9a86a8', '#5f4d6c'], ['#b9a050', '#7a6526'], ['#6d9a83', '#3e6551'],
];
const SKIES = [
  ['#5ec6ff', '#bfe9ff', false], ['#ff9a5a', '#ffd9a0', false], ['#2b2a6b', '#d0607a', false],
  ['#05061a', '#1d2a5a', true], ['#7fd0ff', '#e8f7ff', false], ['#1b0f3a', '#5a2a6a', true],
];

// ---------------------------------------------------------------------------
// Estado global
// ---------------------------------------------------------------------------
const G = {
  scene: 'title',            // title | setup | play | levelEnd | gameover
  paused: false,
  numPlayers: 1, titleSel: 0,
  setup: [{ monster: 0, face: null, faceSource: null }, { monster: 1, face: null, faceSource: null }],
  players: [], buildings: [], enemies: [], bullets: [], particles: [], floaters: [], rubble: [],
  skyline: [], stars: [],
  level: 1, time: 0, shake: 0, sceneT: 0, banner: null,
  spawn: { soldier: 2, heli: 6, tank: 12, window: 1 },
};

// ---------------------------------------------------------------------------
// Ciudad y edificios
// ---------------------------------------------------------------------------
function makeCity(level) {
  G.buildings = []; G.rubble = [];
  const n = level < 3 ? 3 : 4;
  let specs, tries = 0;
  do {
    specs = [];
    for (let i = 0; i < n; i++) {
      specs.push({ cols: randi(3, n === 3 ? 5 : 4), rows: randi(5, Math.min(10, 6 + level)) });
    }
    tries++;
  } while (specs.reduce((s, b) => s + b.cols * CELL, 0) > W - 120 - (n - 1) * 70 && tries < 50);
  const totalW = specs.reduce((s, b) => s + b.cols * CELL, 0);
  const gap = (W - 120 - totalW) / (n - 1);
  let x = 60;
  specs.forEach((s, i) => {
    const [color, trim] = BUILDING_COLORS[(level * 3 + i) % BUILDING_COLORS.length];
    const b = {
      x: Math.round(x), w: s.cols * CELL, h: s.rows * CELL, cols: s.cols, rows: s.rows,
      y: GROUND - s.rows * CELL, color, trim, sink: 0, collapsing: false, gone: false,
      broken: 0, total: s.cols * s.rows, lastHit: null, shakeT: 0,
      roofDeco: choice(['tank', 'antenna', 'sign', 'none']),
      cells: [],
    };
    for (let r = 0; r < s.rows; r++) {
      const row = [];
      for (let c = 0; c < s.cols; c++) {
        row.push({ hp: 2, content: null, contentT: 0, fireT: 0, light: Math.random() < 0.55 });
      }
      b.cells.push(row);
    }
    G.buildings.push(b);
    x += s.cols * CELL + gap;
  });
  // skyline lejano decorativo
  G.skyline = [];
  for (let bx = -20; bx < W + 40; bx += randi(30, 70)) {
    G.skyline.push({ x: bx, w: randi(30, 70), h: randi(60, 210) });
  }
  G.stars = [];
  for (let i = 0; i < 70; i++) G.stars.push({ x: rand(0, W), y: rand(0, 300), s: rand(0.5, 2) });
}

const roofY = b => b.y + b.sink;

function buildingAtX(x) {
  return G.buildings.find(b => !b.collapsing && !b.gone && x > b.x + 4 && x < b.x + b.w - 4);
}

function cellAt(px, py) {
  for (const b of G.buildings) {
    if (b.collapsing || b.gone) continue;
    if (px < b.x || px >= b.x + b.w || py < roofY(b) || py >= GROUND) continue;
    const c = Math.floor((px - b.x) / CELL), r = Math.floor((py - roofY(b)) / CELL);
    if (r >= 0 && r < b.rows && c >= 0 && c < b.cols) return { b, r, c, cell: b.cells[r][c] };
  }
  return null;
}

function cellCenter(b, r, c) {
  return { x: b.x + c * CELL + CELL / 2, y: roofY(b) + r * CELL + CELL / 2 };
}

function damageCell(hit, p) {
  const { b, r, c, cell } = hit;
  const pos = cellCenter(b, r, c);
  b.lastHit = p; b.shakeT = 0.15;
  if (cell.content) {
    handleContent(cell, p, pos);
    if (cell.hp > 0) { cell.hp = 0; registerBreak(b); }
    return true;
  }
  if (cell.hp <= 0) return false;
  cell.hp--;
  if (cell.hp === 0) {
    Sound.play('glass');
    debris(pos.x, pos.y, 10, ['#9fd8ff', '#ffffff', b.color, b.trim]);
    addScore(p, 50, pos.x, pos.y);
    registerBreak(b);
  } else {
    Sound.play('punch');
    debris(pos.x, pos.y, 4, [b.color, b.trim]);
    addScore(p, 10);
  }
  return true;
}

function registerBreak(b) {
  b.broken++;
  if (!b.collapsing && b.broken >= Math.ceil(b.total * 0.5)) collapse(b);
}

function collapse(b) {
  b.collapsing = true;
  Sound.play('collapse');
  G.shake = Math.max(G.shake, 10);
  if (b.lastHit) addScore(b.lastHit, 1000, b.x + b.w / 2, roofY(b) - 20, '¡DERRIBADO! +1000');
  for (const p of G.players) {
    if (p.building === b && (p.state === 'climb' || p.state === 'ground')) {
      p.state = 'air'; p.building = null; p.vy = -150;
    }
  }
}

function handleContent(cell, p, pos) {
  const t = cell.content;
  cell.content = null;
  switch (t) {
    case 'person':
      heal(p, 8); addScore(p, 100, pos.x, pos.y, '¡ÑAM! +100'); Sound.play('eat'); p.eatT = 0.45; break;
    case 'food':
      heal(p, 15); addScore(p, 50, pos.x, pos.y, '¡RICO! +15♥'); Sound.play('eat'); p.eatT = 0.45; break;
    case 'money':
      addScore(p, 500, pos.x, pos.y, '$ 500'); Sound.play('money'); break;
    case 'sniper':
      heal(p, 4); addScore(p, 250, pos.x, pos.y, '¡CRUNCH! +250'); Sound.play('eat'); p.eatT = 0.45; break;
    case 'bomb':
      explosion(pos.x, pos.y, 1); hurt(p, 15); floater(pos.x, pos.y, '¡BOOM!', '#ff5030'); break;
    case 'tv':
      hurt(p, 6); floater(pos.x, pos.y, '¡BZZZT!', '#9ff'); spark(pos.x, pos.y); Sound.play('hurt'); break;
  }
}

function updateBuildings(dt) {
  let alive = 0;
  for (const b of G.buildings) {
    if (b.gone) continue;
    b.shakeT -= dt;
    if (b.collapsing) {
      b.sink += 70 * dt;
      if (Math.random() < 0.7) {
        G.particles.push({ x: rand(b.x - 10, b.x + b.w + 10), y: GROUND - rand(0, 20), vx: rand(-40, 40), vy: rand(-60, -20),
          life: rand(0.8, 1.6), max: 1.6, size: rand(10, 24), color: '#b7a891', kind: 'smoke' });
      }
      G.shake = Math.max(G.shake, 4);
      if (b.sink >= b.h) {
        b.gone = true;
        G.rubble.push({ x: b.x - 6, w: b.w + 12, color: b.trim, seed: Math.random() * 1000 });
      }
      alive++;
      continue;
    }
    alive++;
    for (let r = 0; r < b.rows; r++) {
      for (let c = 0; c < b.cols; c++) {
        const cell = b.cells[r][c];
        if (!cell.content) continue;
        cell.contentT -= dt;
        if (cell.contentT <= 0) { cell.content = null; continue; }
        if (cell.content === 'sniper') {
          cell.fireT -= dt;
          if (cell.fireT <= 0) {
            const pos = cellCenter(b, r, c);
            const tgt = nearestMonster(pos.x, pos.y, 320);
            if (tgt) fireAt(pos.x, pos.y, tgt, 280, 2, 'bullet');
            cell.fireT = rand(1.6, 2.6);
          }
        }
      }
    }
  }
  return alive;
}

function spawnWindowContent() {
  const bs = G.buildings.filter(b => !b.collapsing && !b.gone);
  if (!bs.length) return;
  const b = choice(bs);
  const r = randi(0, b.rows - 1), c = randi(0, b.cols - 1);
  const cell = b.cells[r][c];
  if (cell.hp <= 0 && Math.random() < 0.6) return;
  if (cell.content) return;
  const roll = Math.random();
  cell.content = roll < 0.42 ? 'person' : roll < 0.55 ? 'food' : roll < 0.66 ? 'money'
    : roll < 0.84 ? 'sniper' : roll < 0.93 ? 'bomb' : 'tv';
  cell.contentT = rand(5, 9);
  cell.fireT = rand(1, 2);
}

// ---------------------------------------------------------------------------
// Jugadores (monstruos)
// ---------------------------------------------------------------------------
function makePlayer(i) {
  const s = G.setup[i];
  const m = MONSTERS[s.monster];
  return {
    i, m, face: s.face || m._defaultFace || (m._defaultFace = defaultFace(m)),
    color: PLAYER_COLORS[i],
    x: i === 0 ? 150 : W - 150, y: -60, vx: 0, vy: 0, f: i === 0 ? 1 : -1,
    state: 'air', building: null, health: MAX_HP, lives: 3, score: 0,
    punchT: 0, punchCD: 0, punchDir: 'side', hurtT: 0, invT: 1.5, eatT: 0, anim: 0,
    deadT: 0, out: false, shownScore: 0,
  };
}

const isAlive = p => p.state !== 'dead' && !p.out;

function monsterBox(p) {
  return { x: p.x - 22, y: p.y - 100, w: 44, h: 100 };
}

function nearestMonster(x, y, maxDist = 9999) {
  let best = null, bd = maxDist;
  for (const p of G.players) {
    if (!isAlive(p)) continue;
    const d = Math.hypot(p.x - x, p.y - 50 - y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

function heal(p, n) { p.health = Math.min(MAX_HP, p.health + n); }

function hurt(p, n) {
  if (!isAlive(p) || p.invT > 0) return;
  p.health -= n;
  p.hurtT = 0.12;
  Sound.play('hurt');
  if (p.health <= 0) die(p);
}

function die(p) {
  p.health = 0;
  p.state = 'dead';
  p.deadT = 0;
  p.vy = -250; p.vx = 0;
  p.building = null;
  p.lives--;
  Sound.play('die');
  G.shake = Math.max(G.shake, 6);
  for (let i = 0; i < 30; i++) {
    G.particles.push({ x: p.x + rand(-25, 25), y: p.y - rand(0, 90), vx: rand(-80, 80), vy: rand(-120, 0),
      life: rand(0.6, 1.4), max: 1.4, size: rand(10, 22), color: '#dddddd', kind: 'smoke' });
  }
  floater(p.x, p.y - 110, p.lives > 0 ? '¡AY!' : '¡FUERA!', p.color);
}

function addScore(p, n, x, y, text) {
  if (!p) return;
  p.score += n;
  if (x !== undefined) floater(x, y, text || ('+' + n), p.color);
}

function updatePlayer(p, dt) {
  if (p.out) return;
  p.punchT -= dt; p.punchCD -= dt; p.hurtT -= dt; p.invT -= dt; p.eatT -= dt;
  if (p.shownScore < p.score) p.shownScore = Math.min(p.score, p.shownScore + Math.max(5, (p.score - p.shownScore) * 8 * dt));

  if (p.state === 'dead') return updateDead(p, dt);

  const i = p.i;
  const L = Input.held(i, 'left'), R = Input.held(i, 'right');
  const U = Input.held(i, 'up'), D = Input.held(i, 'down');
  const punchP = Input.pressed(i, 'punch'), jumpP = Input.pressed(i, 'jump');
  const mv = (R ? 1 : 0) - (L ? 1 : 0);

  if (p.state === 'ground') {
    p.vx = mv * WALK * (p.punchT > 0 ? 0.25 : 1);
    if (mv) { p.f = mv; p.anim += dt * 11; } else p.anim = 0;
    p.x = clamp(p.x + p.vx * dt, 24, W - 24);
    if (p.building) { // sobre una azotea
      const b = p.building;
      if (b.collapsing || b.gone || p.x < b.x - 6 || p.x > b.x + b.w + 6) {
        p.state = 'air'; p.vy = 0; p.building = null;
      } else {
        p.y = roofY(b);
        if (Input.pressed(i, 'down') && !Input.held(i, 'punch')) {
          p.state = 'climb'; p.y = roofY(b) + 40; p.x = clamp(p.x, b.x + 12, b.x + b.w - 12);
        }
      }
    } else {
      p.y = GROUND;
      if (U && !Input.held(i, 'punch')) {
        const b = buildingAtX(p.x);
        if (b) { p.state = 'climb'; p.building = b; p.y = GROUND - 2; }
      }
    }
    if (jumpP && p.state !== 'climb') {
      p.state = 'air'; p.vy = -JUMP; p.building = null; Sound.play('swing');
    }
  } else if (p.state === 'air') {
    const target = mv * WALK;
    p.vx += (target - p.vx) * Math.min(1, dt * 6);
    if (mv) p.f = mv;
    p.vy += GRAV * dt;
    const prevY = p.y;
    p.x = clamp(p.x + p.vx * dt, 24, W - 24);
    p.y += p.vy * dt;
    p.anim += dt * 4;
    if (p.vy > 0) {
      for (const b of G.buildings) {
        if (b.collapsing || b.gone) continue;
        const ry = roofY(b);
        if (prevY <= ry && p.y >= ry && p.x > b.x - 4 && p.x < b.x + b.w + 4) {
          p.y = ry; p.state = 'ground'; p.building = b; p.vy = 0; land(p);
          break;
        }
      }
    }
    if (p.state === 'air' && p.y >= GROUND) {
      p.y = GROUND; p.state = 'ground'; p.building = null; p.vy = 0; land(p);
    }
    // agarrarse a un edificio en el aire
    if (p.state === 'air' && U && p.vy > -300) {
      const b = buildingAtX(p.x);
      if (b && p.y > roofY(b) + 44 && p.y < GROUND) { p.state = 'climb'; p.building = b; p.vy = 0; p.vx = 0; }
    }
  } else if (p.state === 'climb') {
    const b = p.building;
    if (!b || b.collapsing || b.gone) { p.state = 'air'; p.building = null; p.vy = 0; }
    else {
      const my = (D ? 1 : 0) - (U ? 1 : 0);
      if (mv) p.f = mv;
      if (p.punchT <= 0) {
        p.x += mv * CLIMBX * dt;
        p.y += my * CLIMB * dt;
        if (mv || my) p.anim += dt * 9;
      }
      p.x = clamp(p.x, b.x + 12, b.x + b.w - 12);
      const ry = roofY(b);
      if (p.y >= GROUND) {
        p.y = GROUND;
        if (D) { p.state = 'ground'; p.building = null; }
      }
      if (p.y < ry + 40) {
        if (U) { p.state = 'ground'; p.y = ry; p.anim = 0; }
        else p.y = ry + 40;
      }
      if (jumpP) {
        p.state = 'air'; p.vy = -JUMP * 0.75; p.vx = p.f * WALK; p.building = null; Sound.play('swing');
      }
    }
  }

  if (punchP && p.punchCD <= 0) doPunch(p, U, D);
}

function land(p) {
  if (p.vy === 0) {
    for (let k = 0; k < 4; k++) {
      G.particles.push({ x: p.x + rand(-20, 20), y: p.y - 2, vx: rand(-40, 40), vy: rand(-30, -5),
        life: 0.4, max: 0.4, size: rand(5, 10), color: '#c8c0b0', kind: 'smoke' });
    }
  }
}

function doPunch(p, U, D) {
  p.punchT = 0.2; p.punchCD = 0.28;
  let dir = 'side';
  if (U) dir = 'up';
  else if (D && p.state === 'ground') dir = 'down';
  p.punchDir = dir;
  Sound.play('swing');

  let fx, fy, box;
  if (dir === 'up') {
    fx = p.x + (p.state === 'climb' ? 10 : p.f * 8); fy = p.y - 118;
    box = { x: fx - 22, y: fy - 26, w: 44, h: 44 };
  } else if (dir === 'down') {
    fx = p.x + p.f * 16; fy = p.y + 12;
    box = { x: fx - 24, y: p.y - 30, w: 48, h: 44 };
  } else {
    fx = p.x + p.f * (p.state === 'climb' ? 38 : 42); fy = p.y - 54;
    box = { x: fx - 20, y: fy - 22, w: 40, h: p.state === 'climb' ? 44 : 76 };
  }

  let hit = false;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (overlap(box, enemyBox(e))) { hitEnemy(e, p); hit = true; }
  }
  for (const o of G.players) {
    if (o === p || !isAlive(o) || o.invT > 0) continue;
    if (overlap(box, monsterBox(o))) {
      hurt(o, 5);
      o.x = clamp(o.x + p.f * 24, 24, W - 24);
      floater(o.x, o.y - 110, '¡TOMA!', p.color);
      Sound.play('punch');
      hit = true;
    }
  }
  if (!hit || dir !== 'up') {
    const c = cellAt(fx, dir === 'down' ? p.y + 6 : fy);
    if (c && damageCell(c, p)) hit = true;
  }
  if (hit) G.shake = Math.max(G.shake, 3);
}

function updateDead(p, dt) {
  p.deadT += dt;
  p.vy += GRAV * dt;
  p.y = Math.min(GROUND, p.y + p.vy * dt);
  if (p.y >= GROUND) {
    p.vy = 0;
    const dir = p.x < W / 2 ? -1 : 1;
    p.f = dir;
    if (p.deadT > 0.8) { p.x += dir * 70 * dt; p.anim += dt * 12; }
  }
  if (p.deadT > 3.5) {
    if (p.lives > 0) respawn(p);
    else p.out = true;
  }
}

function respawn(p) {
  p.state = 'air'; p.health = MAX_HP; p.invT = 2.5; p.building = null;
  p.x = rand(140, W - 140); p.y = -80; p.vx = 0; p.vy = 0;
  Sound.play('roar');
}

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------
function spawnSoldier() {
  const fromLeft = Math.random() < 0.5;
  G.enemies.push({ type: 'soldier', x: fromLeft ? -10 : W + 10, y: GROUND, dir: fromLeft ? 1 : -1,
    targetX: rand(60, W - 60), state: 'walk', fireT: rand(1, 2), hp: 1, anim: 0, f: fromLeft ? 1 : -1 });
}
function spawnHeli() {
  const fromLeft = Math.random() < 0.5;
  G.enemies.push({ type: 'heli', x: fromLeft ? -60 : W + 60, y: 90, baseY: rand(80, 150), dir: fromLeft ? 1 : -1,
    t: rand(0, 6), hp: 2, fireT: rand(1.5, 2.5), vy: 0, falling: false, rot: 0 });
}
function spawnTank() {
  const fromLeft = Math.random() < 0.5;
  G.enemies.push({ type: 'tank', x: fromLeft ? -50 : W + 50, y: GROUND, dir: fromLeft ? 1 : -1,
    targetX: fromLeft ? rand(70, 300) : rand(W - 300, W - 70), hp: 3, fireT: rand(2, 3), state: 'move', hitT: 0 });
}

function enemyBox(e) {
  if (e.type === 'soldier') return { x: e.x - 7, y: e.y - 26, w: 14, h: 26 };
  if (e.type === 'heli') return { x: e.x - 30, y: e.y - 14, w: 60, h: 28 };
  return { x: e.x - 28, y: e.y - 30, w: 56, h: 30 };
}

function hitEnemy(e, p) {
  if (e.type === 'soldier') {
    e.dead = true;
    heal(p, 5); p.eatT = 0.45;
    addScore(p, 150, e.x, e.y - 30, '¡ÑAM! +150');
    Sound.play('eat');
  } else if (e.type === 'heli') {
    if (e.falling) return;
    e.hp--; e.hitT = 0.15;
    Sound.play('punch'); spark(e.x, e.y);
    if (e.hp <= 0) { e.falling = true; e.vy = -60; addScore(p, 500, e.x, e.y - 20, '+500'); }
  } else if (e.type === 'tank') {
    e.hp--; e.hitT = 0.15;
    Sound.play('punch'); spark(e.x, e.y - 15);
    if (e.hp <= 0) { e.dead = true; explosion(e.x, e.y - 15, 1.2); addScore(p, 400, e.x, e.y - 40, '+400'); }
  }
}

function fireAt(x, y, tgt, speed, dmg, kind) {
  const tx = tgt.x + rand(-12, 12), ty = tgt.y - 55 + rand(-15, 15);
  const d = Math.hypot(tx - x, ty - y) || 1;
  G.bullets.push({ x, y, vx: (tx - x) / d * speed, vy: (ty - y) / d * speed, dmg, kind, life: 4 });
  Sound.play(kind === 'shell' ? 'cannon' : 'shoot');
}

function updateEnemies(dt) {
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.hitT = (e.hitT || 0) - dt;
    if (e.type === 'soldier') {
      const tgt = nearestMonster(e.x, e.y);
      if (e.state === 'walk') {
        e.x += e.dir * 55 * dt; e.anim += dt * 10; e.f = e.dir;
        if ((e.dir > 0 && e.x >= e.targetX) || (e.dir < 0 && e.x <= e.targetX)) e.state = 'aim';
        if (e.x < -30 || e.x > W + 30) e.dead = true;
      } else {
        if (tgt) e.f = tgt.x > e.x ? 1 : -1;
        // huye si un monstruo se acerca por el suelo
        if (tgt && Math.abs(tgt.x - e.x) < 60 && tgt.y > GROUND - 10) {
          e.state = 'walk'; e.dir = tgt.x > e.x ? -1 : 1; e.targetX = e.dir > 0 ? W + 40 : -40;
        }
        e.fireT -= dt;
        if (e.fireT <= 0 && tgt) {
          fireAt(e.x + e.f * 10, e.y - 18, tgt, 300, 2, 'bullet');
          e.fireT = rand(1.8, 3.0) - Math.min(0.8, G.level * 0.08);
        }
      }
    } else if (e.type === 'heli') {
      e.t += dt;
      if (e.falling) {
        e.vy += 500 * dt; e.y += e.vy * dt; e.x += e.dir * 40 * dt; e.rot += dt * 4;
        if (Math.random() < 0.6) G.particles.push({ x: e.x, y: e.y, vx: rand(-20, 20), vy: -30, life: 0.8, max: 0.8, size: 12, color: '#444', kind: 'smoke' });
        if (e.y >= GROUND - 10) { e.dead = true; explosion(e.x, GROUND - 10, 1.4); }
        continue;
      }
      e.x += e.dir * 85 * dt;
      if (e.x > W - 50 && e.dir > 0 && e.t > 2) e.dir = -1;
      if (e.x < 50 && e.dir < 0 && e.t > 2) e.dir = 1;
      e.y = e.baseY + Math.sin(e.t * 2) * 12;
      if (Math.random() < dt * 6) Sound.play('heli');
      e.fireT -= dt;
      const tgt = nearestMonster(e.x, e.y);
      if (e.fireT <= 0 && tgt && e.x > 0 && e.x < W) {
        fireAt(e.x + e.dir * 20, e.y + 10, tgt, 260, 3, 'bullet');
        e.fireT = rand(1.8, 2.8);
      }
    } else if (e.type === 'tank') {
      const tgt = nearestMonster(e.x, e.y);
      if (e.state === 'move') {
        e.x += e.dir * 45 * dt;
        if ((e.dir > 0 && e.x >= e.targetX) || (e.dir < 0 && e.x <= e.targetX)) e.state = 'fire';
      } else {
        if (tgt) e.dir = tgt.x > e.x ? 1 : -1;
        e.fireT -= dt;
        if (e.fireT <= 0 && tgt) {
          fireAt(e.x + e.dir * 34, e.y - 22, tgt, 330, 6, 'shell');
          e.fireT = rand(3, 4.5);
          G.particles.push({ x: e.x + e.dir * 36, y: e.y - 22, vx: e.dir * 30, vy: -10, life: 0.4, max: 0.4, size: 14, color: '#999', kind: 'smoke' });
        }
      }
    }
  }
  G.enemies = G.enemies.filter(e => !e.dead);
}

function spawnEnemies(dt) {
  const lv = G.level, s = G.spawn;
  const count = t => G.enemies.filter(e => e.type === t && !e.dead).length;
  s.soldier -= dt; s.heli -= dt; s.tank -= dt; s.window -= dt;
  if (s.soldier <= 0) {
    if (count('soldier') < 2 + lv) spawnSoldier();
    s.soldier = Math.max(1.4, 4.2 - lv * 0.3) * rand(0.7, 1.3);
  }
  if (s.heli <= 0) {
    if (count('heli') < Math.min(3, Math.floor((lv + 1) / 2))) spawnHeli();
    s.heli = Math.max(6, 13 - lv) * rand(0.8, 1.2);
  }
  if (s.tank <= 0) {
    if (lv >= 2 && count('tank') < (lv >= 5 ? 2 : 1)) spawnTank();
    s.tank = Math.max(9, 18 - lv) * rand(0.8, 1.2);
  }
  if (s.window <= 0) {
    spawnWindowContent();
    s.window = rand(0.6, 1.3);
  }
}

function updateBullets(dt) {
  for (const b of G.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > GROUND + 5) b.life = 0;
    if (b.life <= 0) continue;
    for (const p of G.players) {
      if (!isAlive(p)) continue;
      const box = monsterBox(p);
      if (b.x > box.x && b.x < box.x + box.w && b.y > box.y && b.y < box.y + box.h) {
        b.life = 0;
        if (p.invT <= 0) {
          hurt(p, b.dmg);
          spark(b.x, b.y);
          if (b.kind === 'shell') explosion(b.x, b.y, 0.6);
        }
        break;
      }
    }
  }
  G.bullets = G.bullets.filter(b => b.life > 0);
}

// ---------------------------------------------------------------------------
// Partículas y textos
// ---------------------------------------------------------------------------
function debris(x, y, n, colors) {
  for (let i = 0; i < n; i++) {
    G.particles.push({ x, y, vx: rand(-160, 160), vy: rand(-260, -40), life: rand(0.5, 1.1), max: 1.1,
      size: rand(3, 7), color: choice(colors), kind: 'chunk', grav: true, rot: rand(0, 6) });
  }
}
function spark(x, y) {
  for (let i = 0; i < 8; i++) {
    G.particles.push({ x, y, vx: rand(-200, 200), vy: rand(-200, 200), life: 0.25, max: 0.25, size: 3, color: '#ffee66', kind: 'spark' });
  }
}
function explosion(x, y, k = 1) {
  Sound.play('boom');
  G.shake = Math.max(G.shake, 8 * k);
  for (let i = 0; i < 26 * k; i++) {
    G.particles.push({ x: x + rand(-10, 10), y: y + rand(-10, 10), vx: rand(-150, 150) * k, vy: rand(-200, 40) * k,
      life: rand(0.4, 0.9), max: 0.9, size: rand(8, 20) * k, color: choice(['#ffdd33', '#ff8a1f', '#ff3d1f']), kind: 'fire' });
  }
  for (let i = 0; i < 12 * k; i++) {
    G.particles.push({ x: x + rand(-15, 15), y: y + rand(-15, 15), vx: rand(-50, 50), vy: rand(-80, -20),
      life: rand(0.8, 1.5), max: 1.5, size: rand(12, 26) * k, color: '#555', kind: 'smoke' });
  }
}
function floater(x, y, text, color = '#fff') {
  G.floaters.push({ x, y, text, color, life: 1.1 });
}
function updateParticles(dt) {
  for (const p of G.particles) {
    p.life -= dt;
    if (p.grav) p.vy += 900 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'chunk' && p.y > GROUND + 10) { p.y = GROUND + 10; p.vy *= -0.3; p.vx *= 0.6; }
  }
  G.particles = G.particles.filter(p => p.life > 0);
  if (G.particles.length > 600) G.particles.splice(0, G.particles.length - 600);
  for (const f of G.floaters) { f.life -= dt; f.y -= 40 * dt; }
  G.floaters = G.floaters.filter(f => f.life > 0);
}

// ---------------------------------------------------------------------------
// Flujo de partida
// ---------------------------------------------------------------------------
function startGame() {
  G.players = [];
  for (let i = 0; i < G.numPlayers; i++) G.players.push(makePlayer(i));
  G.level = 1;
  startLevel();
  Sound.startMusic();
}

function startLevel() {
  makeCity(G.level);
  G.enemies = []; G.bullets = []; G.particles = []; G.floaters = [];
  G.spawn = { soldier: 2.5, heli: 7, tank: 10, window: 1 };
  G.scene = 'play'; G.sceneT = 0; G.paused = false;
  G.city = CITIES[(G.level - 1) % CITIES.length];
  G.sky = SKIES[(G.level - 1) % SKIES.length];
  G.banner = { text: G.city, sub: 'DÍA ' + G.level + ' · ¡Destruye todos los edificios!', t: 3 };
  G.players.forEach((p, i) => {
    if (p.out) return;
    if (p.state === 'dead') { p.lives = Math.max(p.lives, 1); }
    p.state = 'air'; p.building = null; p.health = Math.max(p.health, 60);
    p.x = G.players.length === 1 ? W / 2 : (i === 0 ? 120 : W - 120);
    p.y = -60 - i * 40; p.vx = 0; p.vy = 0; p.invT = 2;
  });
  Sound.play('roar');
}

function updatePlay(dt) {
  G.sceneT += dt;
  for (const p of G.players) updatePlayer(p, dt);
  const alive = updateBuildings(dt);
  if (G.scene === 'play') spawnEnemies(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updateParticles(dt);
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }

  if (G.scene === 'play' && alive === 0) {
    G.scene = 'levelEnd'; G.sceneT = 0;
    Sound.play('level');
    G.players.forEach(p => { if (!p.out) addScore(p, 2000 + Math.round(p.health) * 10); });
    G.enemies.forEach(e => { if (e.type === 'soldier') { e.state = 'walk'; e.dir = e.x < W / 2 ? -1 : 1; e.targetX = e.dir * 9999; } });
    G.banner = { text: '¡CIUDAD DESTRUIDA!', sub: 'Bonus: 2000 + vida × 10', t: 4 };
  }
  if (G.scene === 'levelEnd' && G.sceneT > 4.2) { G.level++; startLevel(); }

  if (G.players.every(p => p.out)) {
    G.scene = 'gameover'; G.sceneT = 0;
    Sound.stopMusic(); Sound.play('gameover');
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function drawBackground() {
  const [top, bottom, night] = G.sky || SKIES[0];
  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND);
  if (night) {
    ctx.fillStyle = '#fff';
    for (const s of G.stars) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(G.time * 2 + s.x); ctx.fillRect(s.x, s.y, s.s, s.s); }
    ctx.globalAlpha = 1;
    circle(ctx, 820, 80, 30, '#f4f1d0'); circle(ctx, 832, 72, 28, top);
  } else {
    ctx.globalAlpha = 0.85; circle(ctx, 830, 85, 34, '#fff7b0'); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    for (let i = 0; i < 4; i++) {
      const cx = ((G.time * 8 + i * 280) % (W + 200)) - 100, cy = 50 + i * 30 % 90;
      ctx.beginPath(); ctx.ellipse(cx, cy, 50, 14, 0, 0, Math.PI * 2); ctx.ellipse(cx + 25, cy - 10, 30, 14, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // skyline lejano
  ctx.fillStyle = night ? 'rgba(20,20,50,.9)' : 'rgba(80,100,140,.45)';
  for (const s of G.skyline) ctx.fillRect(s.x, GROUND - s.h, s.w, s.h);
  if (night) {
    ctx.fillStyle = 'rgba(255,230,120,.5)';
    for (const s of G.skyline) for (let yy = GROUND - s.h + 8; yy < GROUND - 10; yy += 14) for (let xx = s.x + 5; xx < s.x + s.w - 5; xx += 10) if ((xx * 7 + yy * 13) % 5 === 0) ctx.fillRect(xx, yy, 3, 4);
  }
}

function drawStreet() {
  ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, GROUND, W, 10);
  ctx.fillStyle = '#7a7a7a'; ctx.fillRect(0, GROUND + 10, W, 3);
  ctx.fillStyle = '#2d2d33'; ctx.fillRect(0, GROUND + 13, W, H - GROUND - 13);
  ctx.fillStyle = '#e8d24a';
  for (let x = 10; x < W; x += 70) ctx.fillRect(x, GROUND + 38, 36, 4);
}

function drawRubble() {
  for (const r of G.rubble) {
    ctx.fillStyle = r.color;
    ctx.beginPath(); ctx.moveTo(r.x, GROUND);
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const xx = r.x + r.w * i / n;
      const hh = 8 + Math.abs(Math.sin(r.seed + i * 1.7)) * 22 * Math.sin(Math.PI * i / n);
      ctx.lineTo(xx, GROUND - hh);
    }
    ctx.lineTo(r.x + r.w, GROUND); ctx.fill();
  }
}

function drawWindowContent(type, x, y, t) {
  // x,y = esquina sup. izq. del hueco de la ventana (20x20)
  switch (type) {
    case 'person': {
      const wave = Math.sin(t * 8) * 4;
      circle(ctx, x + 10, y + 8, 4.5, '#f1c9a5');
      ctx.fillStyle = '#d33'; ctx.fillRect(x + 6, y + 12, 8, 8);
      limb(ctx, x + 14, y + 13, x + 18, y + 4 + wave, 2.5, '#f1c9a5');
      ctx.fillStyle = '#000'; ctx.font = 'bold 9px sans-serif'; ctx.fillText('!', x + 1, y + 8);
      break;
    }
    case 'food':
      ctx.fillStyle = '#c96a2a'; ctx.beginPath(); ctx.ellipse(x + 10, y + 10, 7, 5, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 13, y + 13, 5, 3);
      break;
    case 'money':
      circle(ctx, x + 10, y + 11, 7, '#3a3');
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$', x + 10, y + 15); ctx.textAlign = 'left';
      break;
    case 'sniper':
      circle(ctx, x + 10, y + 8, 4.5, '#f1c9a5');
      ctx.fillStyle = '#3d5a2a'; ctx.fillRect(x + 5, y + 3, 10, 3); ctx.fillRect(x + 6, y + 12, 8, 8);
      ctx.fillStyle = '#222'; ctx.fillRect(x + 2, y + 13, 16, 2);
      break;
    case 'bomb':
      circle(ctx, x + 10, y + 12, 6, '#111');
      limb(ctx, x + 13, y + 7, x + 16, y + 3, 1.5, '#a87');
      if (Math.floor(t * 10) % 2) circle(ctx, x + 16, y + 3, 2, '#ff0');
      break;
    case 'tv':
      ctx.fillStyle = '#444'; ctx.fillRect(x + 3, y + 5, 14, 11);
      ctx.fillStyle = Math.floor(t * 12) % 2 ? '#9ff' : '#fff'; ctx.fillRect(x + 5, y + 7, 10, 7);
      break;
  }
}

function drawBuilding(b) {
  if (b.gone) return;
  ctx.save();
  let ox = 0;
  if (b.collapsing) ox = rand(-3, 3);
  else if (b.shakeT > 0) ox = rand(-1.5, 1.5);
  ctx.translate(ox, 0);
  ctx.beginPath(); ctx.rect(b.x - 20, -50, b.w + 40, GROUND + 50); ctx.clip();
  const ry = roofY(b);
  // cuerpo
  ctx.fillStyle = b.color; ctx.fillRect(b.x, ry, b.w, b.h);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(b.x + b.w - 6, ry, 6, b.h);
  // cornisa y decoración
  ctx.fillStyle = b.trim; ctx.fillRect(b.x - 4, ry - 6, b.w + 8, 8);
  if (b.roofDeco === 'tank') {
    ctx.fillStyle = '#6b4a2a'; ctx.fillRect(b.x + 10, ry - 30, 22, 20);
    ctx.fillStyle = '#4a3220'; ctx.beginPath(); ctx.moveTo(b.x + 8, ry - 30); ctx.lineTo(b.x + 21, ry - 40); ctx.lineTo(b.x + 34, ry - 30); ctx.fill();
    ctx.fillRect(b.x + 12, ry - 10, 3, 6); ctx.fillRect(b.x + 27, ry - 10, 3, 6);
  } else if (b.roofDeco === 'antenna') {
    limb(ctx, b.x + b.w - 18, ry - 6, b.x + b.w - 18, ry - 44, 2, '#333');
    limb(ctx, b.x + b.w - 26, ry - 34, b.x + b.w - 10, ry - 34, 2, '#333');
    if (Math.floor(G.time * 2) % 2) circle(ctx, b.x + b.w - 18, ry - 45, 3, '#f33');
  } else if (b.roofDeco === 'sign') {
    ctx.fillStyle = '#222'; ctx.fillRect(b.x + b.w / 2 - 30, ry - 26, 60, 18);
    ctx.fillStyle = '#ff4fa3'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(G.level % 2 ? 'HOTEL' : 'BANCO', b.x + b.w / 2, ry - 13); ctx.textAlign = 'left';
  }
  const night = G.sky && G.sky[2];
  for (let r = 0; r < b.rows; r++) {
    for (let c = 0; c < b.cols; c++) {
      const cell = b.cells[r][c];
      const x = b.x + c * CELL + 6, y = ry + r * CELL + 6;
      if (r === b.rows - 1 && c === Math.floor(b.cols / 2) && cell.hp > 0 && !cell.content) {
        ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x, y, 20, 26); // puerta
        circle(ctx, x + 16, y + 14, 1.5, '#fc0');
        continue;
      }
      if (cell.hp <= 0) {
        // agujero
        ctx.fillStyle = '#140d0a';
        ctx.beginPath();
        ctx.moveTo(x - 4, y + 2); ctx.lineTo(x + 6, y - 4); ctx.lineTo(x + 15, y); ctx.lineTo(x + 24, y - 3);
        ctx.lineTo(x + 25, y + 10); ctx.lineTo(x + 22, y + 24); ctx.lineTo(x + 10, y + 25); ctx.lineTo(x - 3, y + 22); ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = night ? (cell.light ? '#ffe28a' : '#1c2240') : '#5b87b5';
        ctx.fillRect(x, y, 20, 20);
        if (!night) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 2, y + 2, 6, 16); }
        ctx.fillStyle = b.trim; ctx.fillRect(x - 2, y + 20, 24, 3);
        if (cell.hp === 1) {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x + 3, y + 2); ctx.lineTo(x + 10, y + 9); ctx.lineTo(x + 7, y + 15); ctx.moveTo(x + 10, y + 9); ctx.lineTo(x + 18, y + 12); ctx.stroke();
        }
      }
      if (cell.content) drawWindowContent(cell.content, x, y, G.time);
    }
  }
  ctx.restore();
}

function drawEnemy(e) {
  if (e.type === 'soldier') {
    const w = e.state === 'walk' ? Math.sin(e.anim) * 4 : 0;
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.f, 1);
    limb(ctx, -2, -11, -2 + w, 0, 4, '#2f4220');
    limb(ctx, 2, -11, 2 - w, 0, 4, '#2f4220');
    ctx.fillStyle = '#4a6a2f'; ctx.fillRect(-5, -21, 10, 11);
    circle(ctx, 0, -24, 4, '#f1c9a5');
    ctx.fillStyle = '#3d5a2a'; ctx.beginPath(); ctx.arc(0, -25, 5, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#222'; ctx.fillRect(0, -18, 13, 2.5);
    ctx.restore();
  } else if (e.type === 'heli') {
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.falling ? e.rot : e.dir * 0.08); ctx.scale(e.dir, 1);
    ctx.fillStyle = e.hitT > 0 ? '#fff' : '#3b5d3a';
    ctx.beginPath(); ctx.ellipse(4, 0, 22, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-36, -4, 26, 6);
    ctx.fillRect(-40, -10, 6, 12);
    ctx.fillStyle = '#9fdcff'; ctx.beginPath(); ctx.ellipse(14, -3, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    limb(ctx, -8, 14, 18, 14, 2, '#222'); limb(ctx, -2, 12, -2, 14, 2, '#222'); limb(ctx, 12, 12, 12, 14, 2, '#222');
    ctx.fillStyle = '#222'; ctx.fillRect(2, -16, 4, 5);
    const rw = Math.abs(Math.cos(G.time * 40)) * 34 + 4;
    ctx.fillRect(4 - rw, -17, rw * 2, 2.5);
    ctx.restore();
  } else if (e.type === 'tank') {
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.dir, 1);
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-28, -12, 56, 12, 6) : ctx.rect(-28, -12, 56, 12); ctx.fill();
    ctx.fillStyle = '#666';
    for (let i = 0; i < 5; i++) circle(ctx, -20 + i * 10, -6, 3.5, '#777');
    ctx.fillStyle = e.hitT > 0 ? '#fff' : '#5a6b2f'; ctx.fillRect(-24, -22, 48, 11);
    ctx.fillStyle = e.hitT > 0 ? '#fff' : '#4a5a25'; ctx.fillRect(-12, -30, 22, 9);
    ctx.fillStyle = '#2d3517'; ctx.fillRect(8, -28, 26, 4);
    ctx.restore();
  }
}

function drawBullets() {
  for (const b of G.bullets) {
    if (b.kind === 'shell') { circle(ctx, b.x, b.y, 4, '#ff8a1f'); circle(ctx, b.x, b.y, 2, '#fff2a0'); }
    else { circle(ctx, b.x, b.y, 2.5, '#ffee55'); }
  }
}

function drawParticles() {
  for (const p of G.particles) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = p.kind === 'smoke' ? a * 0.6 : a;
    if (p.kind === 'chunk') { ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }
    else if (p.kind === 'smoke') circle(ctx, p.x, p.y, p.size * (1.6 - a * 0.6), p.color);
    else circle(ctx, p.x, p.y, p.kind === 'fire' ? p.size * a : p.size, p.color);
  }
  ctx.globalAlpha = 1;
}

function drawFloaters() {
  ctx.textAlign = 'center'; ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
  for (const f of G.floaters) {
    ctx.globalAlpha = clamp(f.life * 2, 0, 1);
    ctx.fillStyle = '#000'; ctx.fillText(f.text, f.x + 2, f.y + 2);
    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
}

function drawPlayers() {
  for (const p of G.players) {
    if (p.out) continue;
    if (p.state === 'dead') {
      if (p.deadT < 0.5) {
        // transformación: el monstruo encoge
        ctx.save(); ctx.translate(p.x, p.y); const k = 1 - p.deadT; ctx.scale(k, k); ctx.translate(-p.x, -p.y);
        drawMonster(ctx, p, G.time); ctx.restore();
      } else drawHuman(ctx, p.x, p.y, p.f, p.anim, p.face, G.time);
      continue;
    }
    if (p.invT > 0 && Math.floor(G.time * 16) % 2 === 0) ctx.globalAlpha = 0.45;
    drawMonster(ctx, p, G.time);
    ctx.globalAlpha = 1;
    // indicador de jugador
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.moveTo(p.x - 6, p.y - 128); ctx.lineTo(p.x + 6, p.y - 128); ctx.lineTo(p.x, p.y - 120); ctx.fill();
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('J' + (p.i + 1), p.x, p.y - 131); ctx.textAlign = 'left';
  }
}

function text(str, x, y, size, color = '#fff', align = 'center', outline = 4) {
  ctx.font = `bold ${size}px "Trebuchet MS", "Arial Black", sans-serif`;
  ctx.textAlign = align;
  ctx.lineJoin = 'round';
  ctx.lineWidth = outline; ctx.strokeStyle = '#000'; ctx.strokeText(str, x, y);
  ctx.fillStyle = color; ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
}

function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, 44);
  G.players.forEach((p, i) => {
    const right = i === 1;
    const x0 = right ? W - 300 : 10;
    ctx.save();
    circle(ctx, x0 + 22, 22, 19, p.color);
    ctx.drawImage(p.face, x0 + 5, 5, 34, 34);
    if (p.out) { ctx.globalAlpha = 0.6; circle(ctx, x0 + 22, 22, 17, '#000'); ctx.globalAlpha = 1; }
    text(`J${i + 1} ${p.m.name}`, x0 + 48, 17, 14, p.color, 'left', 3);
    text(String(Math.floor(p.shownScore)).padStart(7, '0'), x0 + 160, 17, 15, '#fff', 'left', 3);
    // vida
    ctx.fillStyle = '#300'; ctx.fillRect(x0 + 48, 24, 170, 12);
    const hp = clamp(p.health / MAX_HP, 0, 1);
    ctx.fillStyle = hp > 0.5 ? '#3ddc4a' : hp > 0.25 ? '#ffc400' : (Math.floor(G.time * 6) % 2 ? '#ff2a2a' : '#a00');
    ctx.fillRect(x0 + 48, 24, 170 * hp, 12);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + 48, 24, 170, 12);
    // vidas
    for (let k = 0; k < Math.max(0, p.lives); k++) text('♥', x0 + 232 + k * 18, 36, 16, '#ff4060', 'left', 3);
    ctx.restore();
  });
  if (G.numPlayers === 1) text('1 JUGADOR', W - 20, 28, 14, '#aaa', 'right', 3);
  text(`${G.city || ''} · DÍA ${G.level}`, W / 2, 28, 16, '#fff', 'center', 3);
}

function drawBanner() {
  if (!G.banner) return;
  const b = G.banner;
  const a = clamp(Math.min(b.t, 3.6 - b.t + 0.5) * 2, 0, 1);
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 170, W, 120);
  text(b.text, W / 2, 232, 52, '#ffcc00', 'center', 8);
  text(b.sub, W / 2, 272, 20, '#fff', 'center', 4);
  ctx.globalAlpha = 1;
}

function drawWorld() {
  ctx.save();
  if (G.shake > 0) ctx.translate(rand(-G.shake, G.shake), rand(-G.shake, G.shake));
  drawBackground();
  drawRubble();
  for (const b of G.buildings) drawBuilding(b);
  drawStreet();
  for (const e of G.enemies) drawEnemy(e);
  drawPlayers();
  drawBullets();
  drawParticles();
  drawFloaters();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Pantallas: título y game over
// ---------------------------------------------------------------------------
let titleCity = false;
function drawTitle() {
  if (!titleCity) { G.level = 1; makeCity(4); G.sky = SKIES[2]; titleCity = true; }
  drawBackground();
  for (const b of G.buildings) drawBuilding(b);
  drawStreet();
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H);

  const wob = Math.sin(G.time * 3) * 3;
  text('FACE', W / 2, 92 + wob, 56, '#fff', 'center', 10);
  text('RAMPAGE', W / 2, 166 + wob, 92, '#ff3b2f', 'center', 12);
  text('¡Tu cara, tu monstruo!', W / 2, 202, 22, '#ffcc00', 'center', 5);

  // monstruos de muestra
  const faces = G.setup.map(s => s.face || MONSTERS[s.monster]._defaultFace || (MONSTERS[s.monster]._defaultFace = defaultFace(MONSTERS[s.monster])));
  drawMonster(ctx, { x: 150, y: GROUND, f: 1, state: 'ground', anim: G.time * 8, punchT: (G.time % 1.4) > 1.2 ? 0.1 : 0, punchDir: 'side', hurtT: 0, eatT: 0, m: MONSTERS[G.setup[0].monster], face: faces[0] }, G.time);
  drawMonster(ctx, { x: W - 150, y: GROUND, f: -1, state: 'ground', anim: G.time * 8 + 1, punchT: (G.time % 1.4) < 0.2 ? 0.1 : 0, punchDir: 'side', hurtT: 0, eatT: 0, m: MONSTERS[G.setup[1].monster], face: faces[1] }, G.time);

  const opts = ['1 JUGADOR', '2 JUGADORES'];
  opts.forEach((o, i) => {
    const sel = G.titleSel === i;
    const y = 262 + i * 46;
    if (sel) { ctx.fillStyle = 'rgba(255,204,0,.2)'; ctx.fillRect(W / 2 - 150, y - 30, 300, 40); }
    text((sel ? '▶ ' : '') + o + (sel ? ' ◀' : ''), W / 2, y, sel ? 32 : 26, sel ? '#ffcc00' : '#ccc', 'center', 5);
  });
  text('ENTER / ESPACIO / botón A para empezar', W / 2, 368, 15, '#fff', 'center', 3);

  // controles
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 300, 384, 600, 112);
  ctx.strokeStyle = '#555'; ctx.strokeRect(W / 2 - 300, 384, 600, 112);
  text('CONTROLES', W / 2, 404, 15, '#fff', 'center', 3);
  text('JUGADOR 1', W / 2 - 150, 426, 15, PLAYER_COLORS[0], 'center', 3);
  text('Mover/trepar: W A S D', W / 2 - 150, 446, 14, '#fff', 'center', 3);
  text('Golpe: F   ·   Salto: G', W / 2 - 150, 466, 14, '#fff', 'center', 3);
  text('JUGADOR 2', W / 2 + 150, 426, 15, PLAYER_COLORS[1], 'center', 3);
  text('Mover/trepar: ← ↑ → ↓', W / 2 + 150, 446, 14, '#fff', 'center', 3);
  text('Golpe: K   ·   Salto: L', W / 2 + 150, 466, 14, '#fff', 'center', 3);
  const padTxt = Input.padCount === 0 ? 'Mandos: conecta uno y pulsa un botón'
    : Input.padCount === 1 ? `1 mando detectado → ${(G.titleSel === 1) !== Input.swapPads ? 'JUGADOR 2' : 'JUGADOR 1'} · TAB para cambiar`
    : `2 mandos detectados → mando 1 = ${Input.swapPads ? 'J2' : 'J1'} · TAB para cambiar`;
  text(padTxt + '   ·   P = pausa · M = sonido', W / 2, 488, 12, '#9fd', 'center', 3);
}

function drawGameOver() {
  drawWorld();
  ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(0, 0, W, H);
  text('GAME OVER', W / 2, 150, 76, '#ff3b2f', 'center', 10);
  text(`Has llegado al día ${G.level} (${G.city})`, W / 2, 196, 22, '#fff', 'center', 4);
  G.players.forEach((p, i) => {
    const cx = G.players.length === 1 ? W / 2 : W / 2 + (i === 0 ? -170 : 170);
    circle(ctx, cx, 290, 58, p.color);
    ctx.drawImage(p.face, cx - 54, 236, 108, 108);
    text(`JUGADOR ${i + 1}`, cx, 378, 22, p.color, 'center', 4);
    text(String(p.score), cx, 412, 34, '#fff', 'center', 5);
  });
  if (G.players.length === 2) {
    const [a, b] = G.players;
    const msg = a.score === b.score ? '¡EMPATE!' : `¡GANA EL JUGADOR ${a.score > b.score ? 1 : 2}!`;
    text(msg, W / 2, 300, 26, '#ffcc00', 'center', 5);
  }
  if (G.sceneT > 1.5 && Math.floor(G.time * 2) % 2) text('Pulsa ENTER o un botón para volver al menú', W / 2, 480, 20, '#fff', 'center', 4);
}

function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
  text('PAUSA', W / 2, H / 2 - 10, 64, '#fff', 'center', 8);
  text('P / ESC / START para continuar · Q para salir al menú', W / 2, H / 2 + 34, 18, '#ddd', 'center', 4);
}

// ---------------------------------------------------------------------------
// Bucle principal
// ---------------------------------------------------------------------------
function anyConfirm() {
  return Input.key('Enter') || Input.key('Space') || Input.anyPadPressedEdge;
}

let padWasPressed = false;
function update(dt) {
  G.time += dt;
  const padNow = Input.anyPadPressed;
  Input.anyPadPressedEdge = padNow && !padWasPressed;
  padWasPressed = padNow;

  if (Input.key('KeyM')) Sound.toggleMute();
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 30);

  switch (G.scene) {
    case 'title': {
      Input.numPlayers = G.titleSel + 1;
      if (Input.key('Tab')) Input.swapPads = !Input.swapPads;
      const up = Input.pressed(0, 'up') || Input.pressed(1, 'up') || Input.key('Digit1');
      const dn = Input.pressed(0, 'down') || Input.pressed(1, 'down') || Input.key('Digit2');
      if (up && G.titleSel !== 0) { G.titleSel = 0; Sound.play('select'); }
      if (dn && G.titleSel !== 1) { G.titleSel = 1; Sound.play('select'); }
      if (anyConfirm() || Input.pressed(0, 'punch') || Input.pressed(0, 'jump') || Input.pressed(1, 'punch') || Input.pressed(1, 'jump')) {
        G.numPlayers = G.titleSel + 1;
        Sound.play('confirm');
        G.scene = 'setup';
        Setup.open(G.numPlayers, G.setup, cancelled => {
          if (cancelled) { G.scene = 'title'; return; }
          titleCity = false;
          startGame();
        });
      }
      break;
    }
    case 'setup':
      Setup.update(dt);
      break;
    case 'play':
    case 'levelEnd': {
      const pausePressed = Input.key('KeyP') || Input.key('Escape') || Input.pressed(0, 'start') || Input.pressed(1, 'start');
      if (pausePressed) G.paused = !G.paused;
      if (G.paused) {
        if (Input.key('KeyQ')) { G.paused = false; G.scene = 'title'; titleCity = false; Sound.stopMusic(); }
        break;
      }
      updatePlay(dt);
      break;
    }
    case 'gameover':
      G.sceneT += dt;
      updateParticles(dt);
      if (G.sceneT > 1.5 && (anyConfirm() || Input.pressed(0, 'punch') || Input.pressed(1, 'punch'))) {
        G.scene = 'title'; titleCity = false; Sound.play('confirm');
      }
      break;
  }
}

function render() {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(viewScale * dpr, 0, 0, viewScale * dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  switch (G.scene) {
    case 'title': case 'setup': drawTitle(); break;
    case 'play': case 'levelEnd':
      drawWorld(); drawHUD(); drawBanner();
      if (G.paused) drawPause();
      break;
    case 'gameover': drawGameOver(); break;
  }
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  viewScale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = Math.floor(W * viewScale) + 'px';
  canvas.style.height = Math.floor(H * viewScale) + 'px';
  canvas.width = Math.floor(W * viewScale * dpr);
  canvas.height = Math.floor(H * viewScale * dpr);
}
window.addEventListener('resize', resize);
resize();

// El audio solo puede arrancar tras una interacción del usuario.
['keydown', 'pointerdown', 'touchstart'].forEach(ev => window.addEventListener(ev, () => Sound.init(), { passive: true }));

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  Input.poll();
  if (Input.anyPadPressed) Sound.init();
  update(dt);
  render();
  Input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Ganchos para depuración/pruebas automáticas
window.__G = G;
