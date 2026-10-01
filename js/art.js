'use strict';
// Dibujo de los monstruos (con la cara de la foto), humanos y procesado de caras.

const MONSTERS = [
  { id: 'kongo', name: 'KONGO', species: 'Gorila', type: 'ape',
    body: '#8a5228', belly: '#c8956a', dark: '#4a2810' },
  { id: 'liza', name: 'LIZA', species: 'Lagarta', type: 'lizard',
    body: '#3fae3a', belly: '#e8c840', dark: '#1d6a1f' },
  { id: 'lobo', name: 'LOBO', species: 'Hombre lobo', type: 'wolf',
    body: '#6a78a8', belly: '#dfe0ea', dark: '#3a4470' },
];
const PLAYER_COLORS = ['#ffcc00', '#29d4ff'];
const FACE_SIZE = 160;

// Recorta un cuadrado de una imagen/vídeo, lo hace circular y le da un toque "arcade".
function processFace(src, sx, sy, s, mirror) {
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = FACE_SIZE;
  const t = tmp.getContext('2d');
  t.save();
  if (mirror) { t.translate(FACE_SIZE, 0); t.scale(-1, 1); }
  t.drawImage(src, sx, sy, s, s, 0, 0, FACE_SIZE, FACE_SIZE);
  t.restore();

  const out = document.createElement('canvas');
  out.width = out.height = FACE_SIZE;
  const o = out.getContext('2d');
  o.filter = 'contrast(1.18) saturate(1.3) brightness(1.04)';
  o.drawImage(tmp, 0, 0);
  o.filter = 'none';
  // máscara circular
  o.globalCompositeOperation = 'destination-in';
  o.beginPath(); o.arc(FACE_SIZE / 2, FACE_SIZE / 2, FACE_SIZE / 2, 0, Math.PI * 2); o.fill();
  o.globalCompositeOperation = 'source-over';
  return out;
}

// Cara desde vídeo de la webcam (zona central = óvalo guía). Se guarda en espejo, como un selfie.
function faceFromVideo(video) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return null;
  const side = Math.min(vw, vh);
  const s = side * 0.75;
  return processFace(video, (vw - s) / 2, (vh - s) / 2, s, true);
}

function faceFromImage(img) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const s = Math.min(w, h) * 0.85;
  // en fotos verticales la cara suele estar arriba
  const sy = h > w ? Math.max(0, h * 0.38 - s / 2) : (h - s) / 2;
  return processFace(img, (w - s) / 2, sy, s, false);
}

// Cara de monstruo por defecto (si el jugador no se hace foto): la cabeza del
// monstruo, al estilo del arcade original. Se marca con _monster para que en el
// juego se dibuje animada (mirando a su lado, abriendo la boca…).
function defaultFace(m) {
  const c = document.createElement('canvas');
  c.width = c.height = FACE_SIZE;
  const g = c.getContext('2d');
  g.fillStyle = '#1d3a5c'; // fondo azul como los retratos del original
  g.beginPath(); g.arc(FACE_SIZE / 2, FACE_SIZE / 2, FACE_SIZE / 2, 0, Math.PI * 2); g.fill();
  drawMonsterHead(g, FACE_SIZE / 2, FACE_SIZE * 0.6, 44, m, { f: 1, open: 0.7, front: true });
  c._monster = true;
  return c;
}

function eyeGlow(c, x, y, rr) {
  circle(c, x, y, rr * 1.35, 'rgba(255,40,0,.35)');
  circle(c, x, y, rr, '#e8200f');
  circle(c, x, y, rr * 0.45, '#ffd84a');
}
function fangs(c, x0, x1, y, h, dir, n, color = '#fbf6e8') {
  // fila de dientes entre x0 y x1; dir 1 = hacia abajo, -1 = hacia arriba
  c.fillStyle = color;
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const big = i === 0 || i === n - 1;
    const hh = big ? h * 1.7 : h;
    c.beginPath(); c.moveTo(x0 + i * w, y); c.lineTo(x0 + (i + 0.5) * w, y + dir * hh); c.lineTo(x0 + (i + 1) * w, y); c.fill();
  }
}

// Cabeza de monstruo dibujada por código, de frente y con cara de pocos amigos
// (al estilo de los retratos del arcade). u = r/24. opts.open = boca abierta 0..1
function drawMonsterHead(c, cx, cy, r, m, opts = {}) {
  const u = r / 24, o = Math.max(0, Math.min(1, opts.open ?? 0.3));
  const hurt = opts.hurt;
  const body = hurt ? '#ffffff' : m.body, dark = hurt ? '#ffb0b0' : m.dark;
  const P = (pts, col) => poly(c, pts, col);
  c.save();
  c.translate(cx, cy);
  c.scale(u, u);
  c.lineJoin = 'round'; c.lineCap = 'round';
  if (m.type === 'ape') {
    const skin = hurt ? '#ffd8d0' : '#c9956a', skinD = '#9a6a44';
    // capucha de pelo (cabeza en punta, como un gorila)
    c.fillStyle = dark;
    c.beginPath(); c.moveTo(-29, 22); c.quadraticCurveTo(-33, -14, -14, -30);
    c.quadraticCurveTo(0, -40, 14, -30); c.quadraticCurveTo(33, -14, 29, 22); c.quadraticCurveTo(0, 36, -29, 22); c.closePath(); c.fill();
    c.fillStyle = body;
    c.beginPath(); c.moveTo(-25, 20); c.quadraticCurveTo(-28, -12, -12, -26);
    c.quadraticCurveTo(0, -34, 12, -26); c.quadraticCurveTo(28, -12, 25, 20); c.quadraticCurveTo(0, 32, -25, 20); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,220,180,.25)'; c.lineWidth = 1;
    for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 6, -30 + Math.abs(i) * 2); c.lineTo(i * 7.5, -20 + Math.abs(i) * 3); c.stroke(); }
    // cara
    c.fillStyle = skin;
    c.beginPath(); c.moveTo(-17, -10); c.quadraticCurveTo(-21, 14, -12, 24); c.quadraticCurveTo(0, 30, 12, 24);
    c.quadraticCurveTo(21, 14, 17, -10); c.quadraticCurveTo(0, -16, -17, -10); c.fill();
    // ceño (frente prominente en V)
    c.fillStyle = skinD;
    c.beginPath(); c.moveTo(-19, -11); c.quadraticCurveTo(-10, -15, 0, -6); c.quadraticCurveTo(10, -15, 19, -11);
    c.lineTo(17, -6); c.quadraticCurveTo(10, -9, 0, -2); c.quadraticCurveTo(-10, -9, -17, -6); c.closePath(); c.fill();
    // ojos hundidos
    c.fillStyle = '#2a1408';
    c.beginPath(); c.ellipse(-8, -3, 5.5, 3.2, 0.15, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(8, -3, 5.5, 3.2, -0.15, 0, Math.PI * 2); c.fill();
    eyeGlow(c, -8, -3, 2.6); eyeGlow(c, 8, -3, 2.6);
    // nariz ancha y chata
    c.fillStyle = skinD;
    c.beginPath(); c.ellipse(0, 6, 8.5, 5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2a1408';
    c.beginPath(); c.ellipse(-3.4, 7, 2.6, 1.8, 0.4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(3.4, 7, 2.6, 1.8, -0.4, 0, Math.PI * 2); c.fill();
    // arrugas
    c.strokeStyle = skinD; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-14, 4); c.quadraticCurveTo(-15, 12, -11, 16); c.moveTo(14, 4); c.quadraticCurveTo(15, 12, 11, 16); c.stroke();
    // mueca con colmillos
    const mh = 5 + o * 7;
    c.fillStyle = '#5a0a0a';
    c.beginPath(); c.moveTo(-12, 14); c.quadraticCurveTo(0, 11, 12, 14); c.lineTo(10, 14 + mh); c.quadraticCurveTo(0, 16 + mh, -10, 14 + mh); c.closePath(); c.fill();
    c.fillStyle = '#d42a2a'; c.beginPath(); c.ellipse(0, 15 + mh * 0.8, 5, 2, 0, 0, Math.PI * 2); c.fill();
    fangs(c, -11, 11, 13.5, 3, 1, 6);
    fangs(c, -10, 10, 14 + mh, 2.6, -1, 6);
  } else if (m.type === 'lizard') {
    const belly = hurt ? '#fff0b0' : '#7ac04a';
    // cuello/hombros
    c.fillStyle = dark;
    c.beginPath(); c.ellipse(0, 24, 30, 12, 0, Math.PI, 0); c.fill();
    // cuerno amarillo
    P([[-4, -22], [1, -38], [5, -21]], '#f0c020');
    P([[-1, -24], [1, -36], [2, -24]], '#ffe070');
    // cráneo ancho
    c.fillStyle = body;
    c.beginPath(); c.moveTo(-23, 6); c.quadraticCurveTo(-26, -20, 0, -24); c.quadraticCurveTo(26, -20, 23, 6); c.closePath(); c.fill();
    // mandíbula inferior (baja al abrir)
    const jy = 8 + o * 8;
    c.fillStyle = body;
    c.beginPath(); c.moveTo(-21, 4); c.quadraticCurveTo(-20, jy + 14, 0, jy + 16); c.quadraticCurveTo(20, jy + 14, 21, 4); c.closePath(); c.fill();
    c.fillStyle = belly;
    c.beginPath(); c.ellipse(0, jy + 10, 11, 5, 0, 0, Math.PI * 2); c.fill();
    // boca abierta
    c.fillStyle = '#4a0606';
    c.beginPath(); c.moveTo(-18, 4); c.quadraticCurveTo(0, 2, 18, 4); c.quadraticCurveTo(14, jy + 8, 0, jy + 10); c.quadraticCurveTo(-14, jy + 8, -18, 4); c.fill();
    c.fillStyle = '#e03a3a'; c.beginPath(); c.ellipse(0, jy + 5, 7, 3, 0, 0, Math.PI * 2); c.fill();
    // colmillos grandes + dientes
    fangs(c, -16, 16, 4, 2.5, 1, 8);
    P([[-11, 3], [-8.5, 15 + o * 4], [-6, 3]], '#fbf6e8');
    P([[6, 3], [8.5, 15 + o * 4], [11, 3]], '#fbf6e8');
    fangs(c, -12, 12, jy + 8, 2.4, -1, 6);
    // hocico y fosas
    c.fillStyle = dark;
    circle(c, -4, -1, 1.6, dark); circle(c, 4, -1, 1.6, dark);
    // cejas en V muy marcadas
    c.fillStyle = dark;
    P([[-20, -14], [-2, -9], [-3, -6], [-19, -10]], dark);
    P([[20, -14], [2, -9], [3, -6], [19, -10]], dark);
    eyeGlow(c, -10, -7, 3); eyeGlow(c, 10, -7, 3);
    // escamas
    for (let i = 0; i < 9; i++) circle(c, -16 + i * 4, -18 + (i % 2) * 2 + Math.abs(i - 4) * 1.2, 1.1, dark);
  } else { // wolf
    const tan = hurt ? '#ffe8d0' : '#c9a070';
    // orejas altas
    for (const s of [-1, 1]) {
      P([[s * 5, -16], [s * 21, -44], [s * 23, -10]], dark);
      P([[s * 9, -17], [s * 20, -38], [s * 20, -14]], tan);
    }
    // mechón de pelo entre las orejas
    P([[-7, -18], [-3, -32], [0, -20], [3, -34], [7, -18]], dark);
    // cabeza con pelo erizado en las mejillas
    c.fillStyle = body;
    c.beginPath(); c.ellipse(0, -2, 22, 20, 0, 0, Math.PI * 2); c.fill();
    for (const s of [-1, 1]) {
      P([[s * 18, -6], [s * 30, 2], [s * 19, 6]], body);
      P([[s * 18, 4], [s * 28, 14], [s * 14, 14]], body);
    }
    // máscara clara alrededor de los ojos y el hocico
    c.fillStyle = tan;
    c.beginPath(); c.moveTo(-16, -6); c.quadraticCurveTo(0, -14, 16, -6); c.quadraticCurveTo(14, 8, 11, 18);
    c.quadraticCurveTo(0, 26, -11, 18); c.quadraticCurveTo(-14, 8, -16, -6); c.fill();
    // ojos y cejas fruncidas
    eyeGlow(c, -8, -4, 2.8); eyeGlow(c, 8, -4, 2.8);
    P([[-16, -11], [-2, -7], [-3, -4], [-15, -7]], dark);
    P([[16, -11], [2, -7], [3, -4], [15, -7]], dark);
    // hocico y nariz
    c.fillStyle = shade(tan, 0.92); c.beginPath(); c.ellipse(0, 7, 10, 8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#111'; c.beginPath(); c.ellipse(0, 3, 5, 3.4, 0, 0, Math.PI * 2); c.fill();
    circle(c, -1.5, 2, 1, 'rgba(255,255,255,.5)');
    // boca rugiendo
    const mh = 4 + o * 7;
    c.fillStyle = '#4a0606';
    c.beginPath(); c.moveTo(-10, 11); c.quadraticCurveTo(0, 9, 10, 11); c.quadraticCurveTo(8, 12 + mh, 0, 13 + mh); c.quadraticCurveTo(-8, 12 + mh, -10, 11); c.fill();
    c.fillStyle = '#e03a3a'; c.beginPath(); c.ellipse(0, 11 + mh * 0.8, 4, 2, 0, 0, Math.PI * 2); c.fill();
    P([[-8, 10.5], [-6.5, 17 + o * 3], [-5, 10.5]], '#fbf6e8');
    P([[5, 10.5], [6.5, 17 + o * 3], [8, 10.5]], '#fbf6e8');
    fangs(c, -6, 6, 12 + mh, 2.2, -1, 4);
  }
  c.restore();
}

function limb(c, x1, y1, x2, y2, w, color) {
  c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
}
function circle(c, x, y, r, color) {
  c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}

// Cabeza: la foto del jugador enmarcada con pelo/escamas/orejas según el monstruo.
function drawHead(c, cx, cy, r, m, face, opts = {}) {
  const { hurt = false, eat = 0, time = 0, tilt = 0 } = opts;
  if (face._monster) { // sin foto: cabeza de monstruo animada
    const open = eat > 0 ? 0.5 + Math.sin(time * 40) * 0.5 : opts.roar ? 1 : 0.25 + Math.sin(time * 2.5) * 0.08;
    c.save(); c.translate(cx, cy); c.rotate(tilt);
    drawMonsterHead(c, 0, 0, r * 1.25, m, { f: opts.f || 1, open, hurt });
    c.restore();
    return;
  }
  c.save();
  c.translate(cx, cy);
  c.rotate(tilt);
  if (eat > 0) {
    const k = Math.sin(time * 40) * 0.12;
    c.scale(1 + k, 1 - k);
  }
  // La foto ES la cabeza: grande, sin marco, y alrededor los rasgos del personaje.
  const fs = r * (face._cut === 'oval' ? 2.7 : 3.0);
  const hx = fs * 0.36, hy = fs * 0.5; // semiejes aproximados de la cara recortada
  const body = hurt ? '#ffffff' : m.body, dark = hurt ? '#ffb0b0' : m.dark;
  if (m.type === 'ape') {
    // melena de gorila y orejas
    c.fillStyle = dark;
    c.beginPath(); c.ellipse(0, -hy * 0.06, hx * 1.22, hy * 1.08, 0, 0, Math.PI * 2); c.fill();
    for (let i = -3; i <= 3; i++) circle(c, i * hx * 0.32, -hy * 1.02 + Math.abs(i) * hy * 0.08, hx * 0.3, dark);
    for (const sx of [-1, 1]) {
      circle(c, sx * hx * 1.18, hy * 0.02, hx * 0.32, dark);
      circle(c, sx * hx * 1.18, hy * 0.02, hx * 0.17, hurt ? '#ffd0d0' : m.belly);
    }
  } else if (m.type === 'lizard') {
    // cresta de pinchos y capucha de escamas
    for (let i = -4; i <= 4; i++) {
      const a = -Math.PI / 2 + i * 0.3;
      const bx = Math.cos(a) * hx * 1.05, by = Math.sin(a) * hy * 1.0;
      const len = (i === 0 ? 1.0 : 0.62 - Math.abs(i) * 0.06) * hy;
      c.fillStyle = i % 2 ? '#e07020' : '#f0c020';
      c.beginPath();
      c.moveTo(bx - Math.sin(a) * 7, by + Math.cos(a) * 7);
      c.lineTo(bx + Math.cos(a) * len * 0.8, by + Math.sin(a) * len * 0.8);
      c.lineTo(bx + Math.sin(a) * 7, by - Math.cos(a) * 7);
      c.fill();
    }
    c.fillStyle = body;
    c.beginPath(); c.ellipse(0, 0, hx * 1.2, hy * 1.07, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = dark;
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      circle(c, Math.cos(a) * hx * 1.1, Math.sin(a) * hy * 1.0, 2, dark);
    }
    for (const sx of [-1, 1]) { // pinchos en las mejillas
      c.fillStyle = '#f0c020';
      c.beginPath(); c.moveTo(sx * hx * 1.12, hy * 0.1); c.lineTo(sx * hx * 1.55, hy * 0.25); c.lineTo(sx * hx * 1.1, hy * 0.38); c.fill();
    }
  } else { // wolf
    // orejas puntiagudas y pelo erizado alrededor
    for (const sx of [-1, 1]) {
      c.fillStyle = dark;
      c.beginPath(); c.moveTo(sx * hx * 0.25, -hy * 0.82); c.lineTo(sx * hx * 1.05, -hy * 1.55); c.lineTo(sx * hx * 1.12, -hy * 0.45); c.fill();
      c.fillStyle = '#c9a070';
      c.beginPath(); c.moveTo(sx * hx * 0.48, -hy * 0.8); c.lineTo(sx * hx * 0.98, -hy * 1.32); c.lineTo(sx * hx * 1.0, -hy * 0.6); c.fill();
    }
    c.fillStyle = body;
    c.beginPath();
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * Math.PI * 2, rr = k % 2 ? 1.08 : 1.3;
      const x = Math.cos(a) * hx * rr, y = Math.sin(a) * hy * (k % 2 ? 1.04 : 1.16);
      k ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.closePath(); c.fill();
  }
  // la cara del jugador
  if (face._cut) c.drawImage(face, -fs / 2, -fs / 2, fs, fs);
  else { // cara redonda (navegadores sin recorte): sin fondo de cuadrado
    c.save(); c.beginPath(); c.ellipse(0, 0, hx, hy * 0.95, 0, 0, Math.PI * 2); c.clip();
    c.drawImage(face, -hy, -hy, hy * 2, hy * 2); c.restore();
  }
  if (hurt) {
    c.globalAlpha = 0.45;
    c.fillStyle = '#ff2020'; c.beginPath(); c.ellipse(0, 0, hx, hy * 0.95, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }
  c.restore();
}

// s: { x, y, f, state, anim, punchT, punchDir, hurtT, eatT, m, face, vy }
function drawMonster(c, s, time) {
  const m = s.m;
  const hurt = s.hurtT > 0;
  const body = hurt ? '#ffffff' : m.body;
  const belly = hurt ? '#ffd0d0' : m.belly;
  const dark = hurt ? '#ffb0b0' : m.dark;
  const punching = s.punchT > 0;
  const walk = Math.sin(s.anim) * 7;

  c.save();
  c.translate(s.x, s.y);

  // sombra
  if (s.state !== 'climb') {
    c.fillStyle = 'rgba(0,0,0,.25)';
    c.beginPath(); c.ellipse(0, 0, 24, 5, 0, 0, Math.PI * 2); c.fill();
  }

  if (s.state === 'climb') {
    // De perfil, agarrado al lateral del edificio (el edificio queda delante: +x tras escalar por f)
    const a = Math.sin(s.anim);
    c.save();
    c.scale(s.f, 1);
    if (m.type !== 'ape') limb(c, -14, -30, -22 + a * 3, -4, 9, dark); // cola colgando
    // piernas apoyadas en la pared
    limb(c, 0, -28, 16, -18 - a * 5, 12, dark);
    limb(c, 16, -18 - a * 5, 13, -2 - a * 5, 11, dark);
    limb(c, 2, -26, 17, -14 + a * 5, 13, body);
    limb(c, 17, -14 + a * 5, 15, 0 + a * 5, 12, body);
    circle(c, 18, 0 + a * 5, 6, dark);
    // brazo de atrás agarrado arriba
    limb(c, 4, -60, 17, -92 - a * 8, 11, dark);
    circle(c, 18, -94 - a * 8, 7, dark);
    // torso
    c.fillStyle = body;
    c.beginPath(); c.ellipse(0, -46, 20, 26, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = belly;
    c.beginPath(); c.ellipse(7, -42, 10, 17, 0, 0, Math.PI * 2); c.fill();
    if (m.type === 'lizard') {
      c.fillStyle = '#f06a2a';
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-18, -62 + i * 12); c.lineTo(-27, -56 + i * 12); c.lineTo(-19, -52 + i * 12); c.fill(); }
    }
    // brazo delantero: golpe recto, diagonal abajo o diagonal arriba
    if (punching) {
      const k = 1 - Math.abs(s.punchT / 0.2 - 0.5) * 2;
      let hx = 34 + k * 8, hy = -56;
      if (s.punchDir === 'down') { hx = 30 + k * 6; hy = -24 + k * 4; }
      else if (s.punchDir === 'up') { hx = 30 + k * 6; hy = -96 - k * 6; }
      limb(c, 6, -58, hx, hy, 12, body);
      circle(c, hx + 2, hy, 10, dark);
    } else {
      limb(c, 6, -58, 18, -84 + a * 8, 12, body);
      circle(c, 19, -86 + a * 8, 8, dark);
    }
    c.restore();
    c.restore();
    drawHead(c, s.x - s.f * 2, s.y - 92, 29, m, s.face, { hurt, eat: s.eatT, time, tilt: s.f * 0.08, f: s.f, roar: punching });
    return;
  }

  const f = s.f;
  c.save();
  c.scale(f, 1);
  const inAir = s.state === 'air';
  // cola
  if (m.type === 'lizard') {
    c.fillStyle = body;
    c.beginPath(); c.moveTo(-14, -34); c.quadraticCurveTo(-46, -24, -50, -2); c.lineTo(-36, -6); c.quadraticCurveTo(-30, -18, -10, -20); c.fill();
  } else if (m.type === 'wolf') {
    limb(c, -16, -30, -34, -40 + walk * 0.4, 9, dark);
  }
  // piernas
  if (inAir) {
    limb(c, -8, -26, -14, -10, 13, dark);
    limb(c, 8, -26, 12, -8, 13, body);
  } else {
    limb(c, -8, -26, -8 + walk, -5, 13, dark);
    limb(c, 8, -26, 8 - walk, -5, 13, body);
    c.fillStyle = dark;
    c.beginPath(); c.ellipse(-6 + walk, -3, 10, 5, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(10 - walk, -3, 10, 5, 0, 0, Math.PI * 2); c.fill();
  }
  // brazo de atrás
  limb(c, -12, -58, -16 - walk * 0.4, -30, 11, dark);
  circle(c, -16 - walk * 0.4, -28, 7, dark);
  // torso
  c.fillStyle = body;
  c.beginPath(); c.ellipse(0, -44, 22, 25, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = belly;
  c.beginPath(); c.ellipse(6, -40, 12, 17, 0, 0, Math.PI * 2); c.fill();
  if (m.type === 'lizard') { // escamas en la espalda
    c.fillStyle = '#f06a2a';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-20, -60 + i * 12); c.lineTo(-29, -54 + i * 12); c.lineTo(-21, -50 + i * 12); c.fill(); }
  }
  // brazo delantero
  if (punching) {
    const k = 1 - Math.abs(s.punchT / 0.2 - 0.5) * 2; // 0..1..0
    if (s.punchDir === 'up') {
      limb(c, 10, -60, 8, -100 - k * 14, 12, body); circle(c, 8, -104 - k * 14, 10, dark);
    } else if (s.punchDir === 'down') {
      limb(c, 10, -56, 16, -10 + k * 12, 12, body); circle(c, 16, -6 + k * 12, 10, dark);
    } else {
      limb(c, 10, -58, 28 + k * 14, -54, 12, body); circle(c, 32 + k * 14, -54, 10, dark);
    }
  } else {
    limb(c, 12, -58, 16 + walk * 0.4, -30, 12, body);
    circle(c, 16 + walk * 0.4, -28, 8, dark);
  }
  c.restore();
  c.restore();
  drawHead(c, s.x + f * 3, s.y - 92, 29, m, s.face, { hurt, eat: s.eatT, time, tilt: punching ? f * 0.12 : 0, f, roar: punching });
}

// Forma humana (al perder toda la vida): en calzoncillos, con la cara del jugador.
function drawHuman(c, x, y, f, anim, face, time) {
  const w = Math.sin(anim) * 4;
  c.save();
  c.translate(x, y);
  limb(c, -3, -14, -3 + w, 0, 4, '#f1c9a5');
  limb(c, 3, -14, 3 - w, 0, 4, '#f1c9a5');
  c.fillStyle = '#f1c9a5';
  c.fillRect(-6, -28, 12, 15);
  c.fillStyle = '#ffffff';
  c.fillRect(-6, -16, 12, 5);
  c.fillStyle = '#e33';
  for (let i = 0; i < 3; i++) c.fillRect(-5 + i * 4, -15, 2, 2);
  // brazos tapándose (vergüenza)
  limb(c, -6, -25, -2, -15, 3, '#f1c9a5');
  limb(c, 6, -25, 2, -15, 3, '#f1c9a5');
  c.restore();
  c.save();
  c.translate(x, y - 36);
  circle(c, 0, 0, 11, '#f1c9a5');
  if (face._monster) { // sin foto: cara humana sencilla
    c.fillStyle = '#5a3a20'; c.beginPath(); c.arc(0, -3, 11, Math.PI, 0); c.fill();
    circle(c, -4, 0, 1.5, '#222'); circle(c, 4, 0, 1.5, '#222');
    c.fillStyle = '#a03030'; c.beginPath(); c.ellipse(0, 6, 3, 2, 0, 0, Math.PI * 2); c.fill();
  } else if (face._cut) c.drawImage(face, -14, -14, 28, 28); else c.drawImage(face, -10, -10, 20, 20);
  c.restore();
  // gotitas de sudor
  if (Math.floor(time * 4) % 2 === 0) {
    c.fillStyle = '#7fd3ff';
    c.beginPath(); c.arc(x + 12 * f, y - 44, 2.5, 0, Math.PI * 2); c.fill();
  }
}
