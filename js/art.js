'use strict';
// Dibujo de los monstruos (con la cara de la foto), humanos y procesado de caras.

const MONSTERS = [
  { id: 'kongo', name: 'KONGO', species: 'Gorila', type: 'ape', portrait: 'img/george.webp', mouth: 0.77,
    body: '#6e4a30', belly: '#8a6a58', dark: '#3e2818' },
  { id: 'liza', name: 'LIZA', species: 'Lagarta', type: 'lizard', portrait: 'img/lizzie.webp', mouth: 0.62,
    body: '#3f7c36', belly: '#a8b850', dark: '#1f4a1c' },
  { id: 'lobo', name: 'LOBO', species: 'Hombre lobo', type: 'wolf', portrait: 'img/ralph.webp', mouth: 0.63,
    body: '#7a7c82', belly: '#c4c4c8', dark: '#45474d' },
];
const PLAYER_COLORS = ['#ffcc00', '#29d4ff'];

// Retratos de los monstruos (cabeza sin fondo): se usan cuando el jugador no pone foto.
MONSTERS.forEach(m => {
  const img = new Image();
  img.onload = () => { m._defaultFace = null; }; // se regenera la cara por defecto con el retrato
  img.src = m.portrait;
  m._portraitImg = img;
});
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
  const pi = m._portraitImg;
  if (pi && pi.complete && pi.naturalWidth) {
    const c = document.createElement('canvas');
    c.width = c.height = pi.naturalWidth;
    c.getContext('2d').drawImage(pi, 0, 0);
    c._portrait = true;
    return c;
  }
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
// Masticar: se parte la imagen a la altura de la boca y la mandíbula de abajo
// sube y baja, dejando ver el interior de la boca.
function drawChewing(c, img, x, y, w, h, frac, open) {
  const split = y + h * frac;
  c.fillStyle = '#3a0505';
  c.beginPath(); c.ellipse(x + w / 2, split + open / 2, w * 0.2, open / 2 + 1, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#9a1a1a';
  c.beginPath(); c.ellipse(x + w / 2, split + open * 0.75, w * 0.11, open / 4 + 0.5, 0, 0, Math.PI * 2); c.fill();
  c.save(); c.beginPath(); c.rect(x - 2, y - 2, w + 4, h * frac + 2); c.clip();
  c.drawImage(img, x, y, w, h); c.restore();
  c.save(); c.beginPath(); c.rect(x - 2, split + open, w + 4, h); c.clip();
  c.drawImage(img, x, y + open, w, h); c.restore();
}
const chewOpen = (eat, time, size) => (eat > 0 ? (Math.sin(time * 24) * 0.5 + 0.5) * size * 0.09 : 0);

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
  if (face._portrait) { // retrato del monstruo (sin foto): ya trae orejas, cresta…
    const ps = r * 3.35; // retrato de solo cabeza
    const op = chewOpen(eat, time, ps);
    if (op > 0.5) drawChewing(c, face, -ps / 2, -ps * 0.6, ps, ps, m.mouth || 0.7, op);
    else c.drawImage(face, -ps / 2, -ps * 0.6, ps, ps);
    if (hurt) {
      c.globalAlpha = 0.4;
      c.fillStyle = '#ff2020'; c.beginPath(); c.ellipse(0, -ps * 0.04, ps * 0.4, ps * 0.44, 0, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
    c.restore();
    return;
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
  const op = chewOpen(eat, time, fs);
  if (face._cut && op > 0.5) drawChewing(c, face, -fs / 2, -fs / 2, fs, fs, 0.72, op);
  else if (face._cut) c.drawImage(face, -fs / 2, -fs / 2, fs, fs);
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
// ---------------------------------------------------------------------------
// Cuerpos en pixel art, al estilo del Rampage de NES: se dibujan en un sprite
// pequeño (unidades de sprite), se les pone contorno oscuro y se amplían sin
// suavizado. Pies en (40, 76) del sprite.
// ---------------------------------------------------------------------------
const PX = 2.2;              // tamaño en pantalla de cada píxel del sprite
const BODY_SCALE = PX / 2;   // (compatibilidad con el alcance de los golpes)
const HEAD_R = 24;
const SPR_W = 96, SPR_H = 80, FOOT_X = 40, FOOT_Y = 76;
// Pixel art de verdad: el sprite se dibuja a menor resolución (PQ) y cada píxel
// ocupa PX / PQ píxeles de pantalla (~3,4 px), con bordes nítidos y paleta cerrada.
const PQ = 0.65;
const QW = Math.ceil(SPR_W * PQ), QH = Math.ceil(SPR_H * PQ);
const sprBody = document.createElement('canvas'); sprBody.width = QW; sprBody.height = QH;
const sprOut = document.createElement('canvas'); sprOut.width = QW; sprOut.height = QH;
const sprTmp = document.createElement('canvas'); sprTmp.width = QW; sprTmp.height = QH;
const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// Quita el suavizado: alfa todo o nada y cada píxel al color más cercano de la paleta
function pixelize(g, palette) {
  const img = g.getImageData(0, 0, QW, QH), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 120) { d[i + 3] = 0; continue; }
    let best = palette[0], bd = 1e9;
    for (const p of palette) {
      const dr = d[i] - p[0], dg = d[i + 1] - p[1], db = d[i + 2] - p[2], dd = dr * dr + dg * dg + db * db;
      if (dd < bd) { bd = dd; best = p; }
    }
    d[i] = best[0]; d[i + 1] = best[1]; d[i + 2] = best[2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

function ell(g, x, y, rx, ry, col, rot = 0) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); }
function seg(g, pts, w, col) { // extremidad gruesa por varios puntos
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
}
// extremidad delantera con su propio contorno, para que se separe del torso
function segO(g, pts, w, col) { seg(g, pts, w + 2, '#120a06'); seg(g, pts, w, col); }
function spikes(g, pts, col, len) {
  g.fillStyle = col;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo((x0 + x1) / 2 + dy / d * len, (y0 + y1) / 2 - dx / d * len); g.lineTo(x1, y1); g.fill();
  }
}

// Brazo delantero según la acción (devuelve los puntos hombro-codo-puño)
function frontArm(sx, sy, s, k, walk, rest) {
  if (s.punchT > 0) {
    if (s.punchDir === 'up') return [[sx, sy], [sx + 7, sy - 8], [sx + 11, sy - 20 - k * 3]];
    if (s.punchDir === 'down') return [[sx, sy], [sx + 7, sy + 9], [sx + 12, sy + 20 + k * 3]];
    return [[sx, sy], [sx + 9, sy + 1], [sx + 17 + k * 5, sy]];
  }
  if (s.state === 'air') return [[sx, sy], [sx + 6, sy - 6], [sx + 9, sy - 14]]; // brazos arriba al saltar
  return rest(walk);
}

function drawBodySprite(g, s, m, col) {
  const { body, belly, dark } = col;
  const k = s.punchT > 0 ? 1 - Math.abs(s.punchT / 0.2 - 0.5) * 2 : 0;
  const walk = Math.sin(s.anim);
  const air = s.state === 'air';
  const lg = air ? 0 : walk * 4.5;
  const L = (normal, tucked) => (air ? tucked : normal); // piernas encogidas en el salto

  if (s.state === 'climb') {
    // De perfil pegado a la pared (pared a la derecha): piernas de rana, brazos arriba
    const a = Math.sin(s.anim) * 3;
    if (m.type === 'lizard') seg(g, [[34, 58], [28, 66], [26, 76]], 7, body);
    if (m.type === 'wolf') seg(g, [[33, 58], [28, 66]], 5, dark);
    seg(g, [[38, 56], [46, 58 - a], [46, 66 - a]], 7, dark);                 // pierna de atrás
    seg(g, [[38, 58], [47, 63 + a], [46, 72 + a]], 8, body);                 // pierna delantera
    ell(g, 48, 72 + a, 3, 2, dark);
    seg(g, [[40, 40], [48, 36 + a], [52, 30 + a]], 6, dark);                 // brazo de atrás agarrado a la pared
    ell(g, 53, 30 + a, 3, 3, dark);
    ell(g, 39, 48, 9, 14, body);                                             // torso
    ell(g, 43, 50, 4, 9, belly);
    if (m.type === 'lizard') spikes(g, [[31, 58], [30, 50], [31, 42], [34, 36]], dark, 3);
    else spikes(g, [[31, 58], [30, 50], [31, 42], [35, 36]], body, 2.5);
    const fa = frontArm(42, 41, s, k, a, w => [[42, 41], [49, 44 - w], [53, 40 - w]]);
    segO(g, fa, 7, body); ell(g, fa[2][0] + 1, fa[2][1], 3.5, 3.5, dark);
    return { nx: 41, ny: 37 };
  }

  if (m.type === 'ape') {
    // George: encorvado, joroba de hombros enorme, nudillos casi en el suelo
    const bl = L([[35, 62], [33 - lg, 69], [34 - lg, 75]], [[35, 62], [40, 66], [37, 71]]);
    seg(g, bl, 7, dark); ell(g, bl[2][0] + 1, bl[2][1], 4.5, 2, dark);
    const ba = air ? [[30, 44], [26, 36], [27, 28]] : [[30, 44], [26, 56], [28 + walk * 3, 70]]; // brazo de atrás
    seg(g, ba, 6.5, dark); ell(g, ba[2][0], ba[2][1], 3.5, 3, dark);
    ell(g, 39, 54, 12, 11, body);                                           // barriga/caderas
    ell(g, 41, 43, 14, 9, body);                                            // joroba de hombros
    const fl = L([[44, 62], [46 + lg, 69], [46 + lg, 75]], [[44, 62], [51, 64], [49, 71]]); // pierna delantera
    segO(g, fl, 8, body); ell(g, fl[2][0] + 2, fl[2][1], 5, 2, dark);
    ell(g, 47, 50, 6, 8, belly);                                            // pecho claro
    spikes(g, [[28, 52], [27, 44], [31, 37], [38, 34], [46, 34]], body, 2.5);
    g.strokeStyle = dark; g.lineWidth = 1;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(32 + i * 3, 40 + i); g.lineTo(31 + i * 3, 45 + i); g.stroke(); }
    const fa = frontArm(50, 42, s, k, walk, w => [[50, 42], [55, 54 - w], [53 - w * 3, 69]]);
    segO(g, fa, 7.5, body); ell(g, fa[2][0], fa[2][1], 4, 3.5, dark);
    return { nx: 46, ny: 38 };
  }
  if (m.type === 'wolf') {
    // Ralph: erguido, musculoso, piernas de lobo dobladas, cola peluda
    ell(g, 27, 56 + walk, 4, 9, dark, 0.7);                                  // cola
    const bl = L([[36, 58], [38 - lg, 65], [34 - lg, 70], [37 - lg, 75]], [[36, 58], [42, 62], [40, 68], [43, 71]]);
    seg(g, bl, 6, dark); ell(g, bl[3][0] + 1, bl[3][1], 4, 1.8, dark);
    seg(g, air ? [[32, 38], [28, 30], [30, 22]] : [[32, 38], [27, 48], [30 + walk * 3, 57]], 6, dark); // brazo de atrás
    spikes(g, [[29, 60], [31, 62], [33, 60]], dark, 3);
    g.fillStyle = body;                                                      // torso en V
    g.beginPath(); g.moveTo(29, 36); g.quadraticCurveTo(40, 30, 52, 36); g.lineTo(47, 50); g.quadraticCurveTo(44, 60, 40, 60);
    g.quadraticCurveTo(34, 60, 33, 50); g.closePath(); g.fill();
    const fl = L([[43, 58], [46 + lg, 65], [42 + lg, 70], [45 + lg, 75]], [[43, 58], [50, 61], [48, 67], [51, 70]]);
    segO(g, fl, 7, body); ell(g, fl[3][0] + 2, fl[3][1], 4.5, 1.8, dark);
    g.fillStyle = belly;                                                     // pecho blanco
    g.beginPath(); g.moveTo(37, 38); g.quadraticCurveTo(44, 36, 48, 40); g.lineTo(44, 54); g.quadraticCurveTo(40, 57, 38, 52); g.closePath(); g.fill();
    spikes(g, [[29, 46], [28, 40], [31, 35], [36, 33]], body, 2.5);
    spikes(g, [[45, 33], [50, 34], [53, 38]], body, 2);
    const fa = frontArm(49, 39, s, k, walk, w => [[49, 39], [54, 47 - w], [50 - w, 55]]);
    segO(g, fa, 6.5, body); ell(g, fa[2][0], fa[2][1], 3.2, 3, dark);
    spikes(g, [[fa[2][0] - 2, fa[2][1] + 2], [fa[2][0] + 2, fa[2][1] + 3]], '#f0ece0', 2.5); // garras
    return { nx: 41, ny: 34 };
  }
  // Lizzie: erguida, barriga clara enorme, cola gruesa apoyada en el suelo
  g.fillStyle = body;
  g.beginPath(); g.moveTo(34, 56); g.quadraticCurveTo(22, 64, 8 + walk, 74); g.lineTo(10 + walk, 77);
  g.quadraticCurveTo(26, 72, 38, 66); g.closePath(); g.fill();              // cola
  const bl = L([[36, 64], [34 - lg, 70], [35 - lg, 75]], [[36, 64], [41, 68], [38, 73]]);
  seg(g, bl, 7, dark); ell(g, bl[2][0] + 1, bl[2][1], 4.5, 2, dark);
  seg(g, air ? [[34, 42], [30, 35], [31, 28]] : [[34, 42], [30, 50], [33 + walk * 2, 56]], 5.5, dark); // bracito de atrás
  ell(g, 40, 52, 11, 15, body);                                             // torso en pera
  const fl = L([[44, 64], [46 + lg, 70], [46 + lg, 75]], [[44, 64], [51, 67], [49, 73]]);
  segO(g, fl, 8, body); ell(g, fl[2][0] + 2, fl[2][1], 5, 2, dark);
  ell(g, 44, 54, 7, 11, belly);                                             // barriga
  g.strokeStyle = shade(m.belly, 0.75); g.lineWidth = 0.8;
  for (let y = 46; y < 64; y += 3) { g.beginPath(); g.moveTo(39, y); g.lineTo(50, y + 1); g.stroke(); }
  spikes(g, [[30, 62], [29, 54], [30, 46], [33, 40], [37, 37]], dark, 3);
  g.fillStyle = dark; for (let i = 0; i < 8; i++) g.fillRect(33 + (i % 3) * 3, 42 + Math.floor(i / 3) * 5, 1, 1);
  const fa = frontArm(47, 42, s, k, walk, w => [[47, 42], [52, 48 - w], [50, 55]]);
  segO(g, fa, 6, body); ell(g, fa[2][0], fa[2][1], 3, 3, dark);
  return { nx: 42, ny: 37 };
}

// s: { x, y, f, state, anim, punchT, punchDir, hurtT, eatT, m, face }
function drawMonster(c, s, time) {
  const m = s.m;
  const hurt = s.hurtT > 0;
  const col = { body: m.body, belly: m.belly, dark: m.dark };
  const punching = s.punchT > 0;
  // 1) cuerpo en el sprite
  const g = sprBody.getContext('2d', { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, QW, QH);
  g.setTransform(PQ, 0, 0, PQ, 0, 0);
  const neck = drawBodySprite(g, s, m, col);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!m._pal) m._pal = [m.body, m.belly, m.dark, '#e07a20', '#f0ece0', '#120a06', shade(m.belly, 0.75)].map(hexRGB);
  pixelize(g, m._pal);
  // 2) contorno oscuro de 1 píxel alrededor
  const o = sprOut.getContext('2d');
  o.clearRect(0, 0, QW, QH);
  const t = sprTmp.getContext('2d');
  t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, QW, QH);
  t.drawImage(sprBody, 0, 0);
  t.globalCompositeOperation = 'source-in'; t.fillStyle = '#120a06'; t.fillRect(0, 0, QW, QH);
  t.globalCompositeOperation = 'source-over';
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) o.drawImage(sprTmp, dx, dy);
  o.drawImage(sprBody, 0, 0);
  if (hurt) { o.globalCompositeOperation = 'source-atop'; o.fillStyle = 'rgba(255,255,255,.85)'; o.fillRect(0, 0, QW, QH); o.globalCompositeOperation = 'source-over'; }
  // 3) a pantalla, ampliado sin suavizado
  c.save();
  if (s.state !== 'climb') { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(s.x, s.y, 26, 5, 0, 0, Math.PI * 2); c.fill(); }
  c.translate(s.x, s.y);
  c.scale(s.f, 1);
  const smooth = c.imageSmoothingEnabled;
  c.imageSmoothingEnabled = false;
  c.drawImage(sprOut, -FOOT_X * PX, -FOOT_Y * PX, QW * PX / PQ, QH * PX / PQ);
  c.imageSmoothingEnabled = smooth;
  c.restore();
  // 4) la cabeza (foto o retrato) sobre los hombros
  const hx = s.x + s.f * (neck.nx - FOOT_X) * PX - (s.state === 'climb' ? s.f * 12 : 0);
  const hy = s.y + (neck.ny - FOOT_Y) * PX - HEAD_R * 0.75;
  drawHead(c, hx, hy, HEAD_R, m, s.face, { hurt, eat: s.eatT, time, tilt: punching ? s.f * 0.1 : 0, f: s.f, roar: punching });
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
  if (face._monster || face._portrait) { // sin foto: cara humana sencilla
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
