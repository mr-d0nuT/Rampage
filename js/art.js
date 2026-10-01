'use strict';
// Dibujo de los monstruos (con la cara de la foto), humanos y procesado de caras.

const MONSTERS = [
  { id: 'kongo', name: 'KONGO', species: 'Gorila', type: 'ape',
    body: '#7b4a2b', belly: '#c48d5c', dark: '#43260f' },
  { id: 'liza', name: 'LIZA', species: 'Lagarta', type: 'lizard',
    body: '#3d9b3a', belly: '#c4df73', dark: '#1f5a1d' },
  { id: 'lobo', name: 'LOBO', species: 'Hombre lobo', type: 'wolf',
    body: '#7d8094', belly: '#cfd0dc', dark: '#43455a' },
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

// Cara de monstruo por defecto (si el jugador no se hace foto).
function defaultFace(m) {
  const c = document.createElement('canvas');
  c.width = c.height = FACE_SIZE;
  const g = c.getContext('2d');
  const S = FACE_SIZE;
  g.fillStyle = m.belly;
  g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fill();
  // ojos
  for (const ex of [0.33, 0.67]) {
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(S * ex, S * 0.42, S * 0.12, S * 0.14, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111';
    g.beginPath(); g.arc(S * ex + S * 0.02, S * 0.45, S * 0.06, 0, Math.PI * 2); g.fill();
  }
  // cejas enfadadas
  g.strokeStyle = m.dark; g.lineWidth = S * 0.06; g.lineCap = 'round';
  g.beginPath(); g.moveTo(S * 0.2, S * 0.24); g.lineTo(S * 0.43, S * 0.32); g.stroke();
  g.beginPath(); g.moveTo(S * 0.8, S * 0.24); g.lineTo(S * 0.57, S * 0.32); g.stroke();
  // boca con dientes
  g.fillStyle = '#5a0b0b';
  g.beginPath(); g.ellipse(S / 2, S * 0.74, S * 0.24, S * 0.12, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff';
  for (let i = 0; i < 5; i++) {
    const x = S * 0.3 + i * S * 0.1;
    g.beginPath(); g.moveTo(x, S * 0.64); g.lineTo(x + S * 0.08, S * 0.64); g.lineTo(x + S * 0.04, S * 0.73); g.fill();
  }
  return c;
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
  c.save();
  c.translate(cx, cy);
  c.rotate(tilt);
  if (eat > 0) {
    const k = Math.sin(time * 40) * 0.12;
    c.scale(1 + k, 1 - k);
  }
  // adornos detrás de la cabeza
  c.fillStyle = m.dark;
  if (m.type === 'wolf') {
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(s * r * 0.35, -r * 0.7); c.lineTo(s * r * 0.95, -r * 1.45); c.lineTo(s * r * 1.0, -r * 0.35); c.fill();
      c.fillStyle = '#e8a3a3';
      c.beginPath(); c.moveTo(s * r * 0.55, -r * 0.7); c.lineTo(s * r * 0.9, -r * 1.2); c.lineTo(s * r * 0.92, -r * 0.55); c.fill();
      c.fillStyle = m.dark;
    }
  } else if (m.type === 'lizard') {
    for (let i = -3; i <= 3; i++) {
      const a = -Math.PI / 2 + i * 0.36;
      const bx = Math.cos(a) * r, by = Math.sin(a) * r;
      c.fillStyle = i % 2 ? '#e0c030' : '#f06a2a';
      c.beginPath();
      c.moveTo(bx + Math.cos(a + 1.57) * 6, by + Math.sin(a + 1.57) * 6);
      c.lineTo(Math.cos(a) * (r + 14), Math.sin(a) * (r + 14));
      c.lineTo(bx - Math.cos(a + 1.57) * 6, by - Math.sin(a + 1.57) * 6);
      c.fill();
    }
  } else { // ape: orejas y pelo revuelto
    circle(c, -r * 1.02, 0, r * 0.32, m.dark);
    circle(c, r * 1.02, 0, r * 0.32, m.dark);
    circle(c, -r * 1.02, 0, r * 0.17, m.belly);
    circle(c, r * 1.02, 0, r * 0.17, m.belly);
    for (let i = -2; i <= 2; i++) circle(c, i * r * 0.33, -r * 0.98, r * 0.28, m.dark);
  }
  // marco
  circle(c, 0, 0, r + 4, m.dark);
  circle(c, 0, 0, r + 1.5, m.body);
  // la cara
  // La cara recortada (sin fondo) se dibuja grande, tapando casi toda la cabeza;
  // la cara por defecto (círculo) cabe justa en el marco.
  if (face._cut) {
    const fs = r * 2.5;
    c.drawImage(face, -fs / 2, -fs / 2 + r * 0.04, fs, fs);
  } else c.drawImage(face, -r, -r, r * 2, r * 2);
  if (hurt) {
    c.globalAlpha = 0.55;
    circle(c, 0, 0, r, '#ff2020');
    c.globalAlpha = 1;
  }
  // brillo
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2;
  c.beginPath(); c.arc(0, 0, r - 2, -2.6, -1.9); c.stroke();
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
    drawHead(c, s.x - s.f * 2, s.y - 84, 29, m, s.face, { hurt, eat: s.eatT, time, tilt: s.f * 0.08 });
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
  drawHead(c, s.x + f * 3, s.y - 84, 29, m, s.face, { hurt, eat: s.eatT, time, tilt: punching ? f * 0.12 : 0 });
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
  if (face._cut) c.drawImage(face, -14, -14, 28, 28); else c.drawImage(face, -10, -10, 20, 20);
  c.restore();
  // gotitas de sudor
  if (Math.floor(time * 4) % 2 === 0) {
    c.fillStyle = '#7fd3ff';
    c.beginPath(); c.arc(x + 12 * f, y - 44, 2.5, 0, Math.PI * 2); c.fill();
  }
}
