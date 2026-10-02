'use strict';
// Controles táctiles (móvil y tablet): joystick flotante + botones GOLPE y SALTO.
// - 1 jugador: joystick en la mitad izquierda, botones a la derecha.
// - 2 jugadores (tablet): cada jugador tiene joystick y botones en su lado.
// Se activan solos con el primer toque en la pantalla.
const TouchPad = (() => {
  let enabled = false;
  let numPlayers = 1;
  const STICK_R = 54, DEAD = 16;
  const pads = [0, 1].map(() => ({ stick: null, punch: null, jump: null, tapped: { punch: false, jump: false }, home: { x: 0, y: 0 } }));
  const owners = new Map(); // pointerId -> { i, kind }
  const taps = [];
  let canvasEl = null, Wd = 960, Hd = 540;

  function layout(i) {
    if (numPlayers === 2 && Hd > Wd) { // 2 jugadores en vertical: cada uno en su mitad de abajo
      const s = i === 0 ? 1 : -1, ox = i === 0 ? 0 : Wd;
      return { punch: { x: ox + s * 205, y: Hd - 70, r: 38 }, jump: { x: ox + s * 205, y: Hd - 158, r: 30 },
        zone: x => (i === 0 ? x < 150 : x > Wd - 150), home: { x: ox + s * 80, y: Hd - 100 } };
    }
    if (numPlayers === 1) {
      return { punch: { x: Wd - 92, y: Hd - 92, r: 54 }, jump: { x: Wd - 205, y: Hd - 52, r: 42 },
        zone: x => x < Wd * 0.5, home: { x: 120, y: Hd - 100 } };
    }
    return i === 0
      ? { punch: { x: 330, y: Hd - 78, r: 42 }, jump: { x: 240, y: Hd - 44, r: 32 }, zone: x => x < 190, home: { x: 100, y: Hd - 100 } }
      : { punch: { x: Wd - 330, y: Hd - 78, r: 42 }, jump: { x: Wd - 240, y: Hd - 44, r: 32 }, zone: x => x > Wd - 190, home: { x: Wd - 100, y: Hd - 100 } };
  }
  const PAUSE = () => ({ x: Wd / 2, y: Hd > Wd ? (numPlayers === 2 ? 118 : 74) : 66, r: 20 });

  function toGame(e) {
    const r = canvasEl.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * Wd, y: (e.clientY - r.top) / r.height * Hd };
  }
  const inCircle = (p, c, extra = 10) => Math.hypot(p.x - c.x, p.y - c.y) <= c.r + extra;

  function goFullscreen() {
    const d = document.documentElement;
    if (!document.fullscreenElement && d.requestFullscreen) {
      d.requestFullscreen({ navigationUI: 'hide' }).then(() => {
      }).catch(() => {});
    }
  }

  function down(e) {
    if (e.pointerType !== 'touch') return;
    if (e.target !== canvasEl) return; // los botones del menú de foto funcionan normal
    e.preventDefault();
    enabled = true;
    goFullscreen();
    const p = toGame(e);
    if (!playing()) { taps.push(p); return; }
    if (inCircle(p, PAUSE(), 12)) { taps.push({ ...p, pause: true }); return; }
    for (let i = 0; i < numPlayers; i++) {
      const L = layout(i), pad = pads[i];
      if (inCircle(p, L.punch)) { pad.punch = e.pointerId; pad.tapped.punch = true; owners.set(e.pointerId, { i, kind: 'punch' }); return; }
      if (inCircle(p, L.jump)) { pad.jump = e.pointerId; pad.tapped.jump = true; owners.set(e.pointerId, { i, kind: 'jump' }); return; }
    }
    for (let i = 0; i < numPlayers; i++) {
      const L = layout(i), pad = pads[i];
      if (L.zone(p.x) && !pad.stick) {
        pad.stick = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y };
        owners.set(e.pointerId, { i, kind: 'stick' });
        return;
      }
    }
    taps.push(p);
  }
  function move(e) {
    const o = owners.get(e.pointerId);
    if (!o) return;
    e.preventDefault();
    const pad = pads[o.i], p = toGame(e);
    if (o.kind === 'stick' && pad.stick) { pad.stick.x = p.x; pad.stick.y = p.y; }
    else { // deslizar el dedo de un botón al otro también cuenta
      const L = layout(o.i);
      const other = o.kind === 'punch' ? 'jump' : 'punch';
      if (!inCircle(p, L[o.kind], 24) && inCircle(p, L[other], 6)) {
        pad[o.kind] = null; pad[other] = e.pointerId; o.kind = other;
      }
    }
  }
  function up(e) {
    const o = owners.get(e.pointerId);
    if (!o) return;
    owners.delete(e.pointerId);
    const pad = pads[o.i];
    if (o.kind === 'stick') pad.stick = null; else pad[o.kind] = null;
  }

  let playing = () => false;
  function attach(canvas, w, h, isPlaying) {
    canvasEl = canvas; Wd = w; Hd = h; playing = isPlaying;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', down, { passive: false });
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  function state(i) {
    // un toque rapidísimo (que empieza y acaba en el mismo frame) también cuenta
    const pad = pads[i], s = { left: false, right: false, up: false, down: false,
      punch: pad.punch !== null || pad.tapped.punch, jump: pad.jump !== null || pad.tapped.jump };
    pad.tapped.punch = pad.tapped.jump = false;
    if (pad.stick) {
      const dx = pad.stick.x - pad.stick.ox, dy = pad.stick.y - pad.stick.oy;
      // 8 direcciones: las diagonales activan dos teclas a la vez
      s.left = dx < -DEAD && Math.abs(dx) > Math.abs(dy) * 0.45;
      s.right = dx > DEAD && Math.abs(dx) > Math.abs(dy) * 0.45;
      s.up = dy < -DEAD && Math.abs(dy) > Math.abs(dx) * 0.45;
      s.down = dy > DEAD && Math.abs(dy) > Math.abs(dx) * 0.45;
    }
    return s;
  }

  function releaseAll() {
    owners.clear();
    pads.forEach(p => { p.stick = null; p.punch = null; p.jump = null; });
  }

  // Joystick: solo la bola roja (sin base). En reposo, semitransparente.
  function drawArcadeStick(c, sx, sy, kx, ky, active) {
    c.globalAlpha = active ? 0.85 : 0.45;
    const g = c.createRadialGradient(kx - 8, ky - 9, 3, kx, ky, 26);
    g.addColorStop(0, '#ff9a8a'); g.addColorStop(0.35, '#ee2a1a'); g.addColorStop(1, '#7a0a04');
    circle(c, kx, ky, 26, g);
    c.globalAlpha *= 0.8; circle(c, kx - 8, ky - 10, 6, 'rgba(255,255,255,.75)');
  }
  // Botón semitransparente, sin aro ni sombra oscura; se hunde al pulsarlo
  function drawArcadeButton(c, b, on, color, label) {
    const r = b.r * (on ? 0.92 : 1);
    c.globalAlpha = on ? 0.7 : 0.38;
    const g = c.createRadialGradient(b.x - r * 0.35, b.y - r * 0.4, r * 0.1, b.x, b.y, r);
    g.addColorStop(0, shade(color, 1.5)); g.addColorStop(0.55, color); g.addColorStop(1, shade(color, 0.8));
    circle(c, b.x, b.y, r, g);
    c.globalAlpha *= 0.8; c.fillStyle = 'rgba(255,255,255,.55)';
    c.beginPath(); c.ellipse(b.x - r * 0.25, b.y - r * 0.45, r * 0.42, r * 0.2, -0.4, 0, Math.PI * 2); c.fill();
    c.globalAlpha = on ? 0.95 : 0.75; c.textAlign = 'center';
    c.font = `bold ${Math.round(b.r * 0.36)}px "Trebuchet MS", sans-serif`;
    c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.45)'; c.strokeText(label, b.x, b.y + b.r * 0.14);
    c.fillStyle = '#fff'; c.fillText(label, b.x, b.y + b.r * 0.14);
  }

  function draw(c, colors) {
    if (!enabled || !playing()) return;
    c.save();
    // botón de pausa
    const P = PAUSE();
    c.globalAlpha = 0.6; circle(c, P.x, P.y, P.r, 'rgba(0,0,0,.6)');
    c.fillStyle = '#fff'; c.fillRect(P.x - 7, P.y - 8, 5, 16); c.fillRect(P.x + 2, P.y - 8, 5, 16);
    for (let i = 0; i < numPlayers; i++) {
      const L = layout(i), pad = pads[i], col = colors[i];
      const sx = pad.stick ? pad.stick.ox : L.home.x, sy = pad.stick ? pad.stick.oy : L.home.y;
      let kx = sx, ky = sy;
      if (pad.stick) {
        const dx = pad.stick.x - sx, dy = pad.stick.y - sy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, (STICK_R - 10) / d);
        kx = sx + dx * k; ky = sy + dy * k;
      }
      drawArcadeStick(c, sx, sy, kx, ky, !!pad.stick);
      drawArcadeButton(c, L.punch, pad.punch !== null, '#e8301e', 'GOLPE');
      drawArcadeButton(c, L.jump, pad.jump !== null, '#f0b400', 'SALTO');
    }
    c.restore();
    c.textAlign = 'left'; c.lineCap = 'butt';
  }

  return {
    attach, state, draw, releaseAll,
    resize(w, h) { Wd = w; Hd = h; },
    consumeTap: () => taps.shift() || null,
    clearTaps: () => { taps.length = 0; },
    get enabled() { return enabled; },
    set numPlayers(n) { numPlayers = n; },
  };
})();
