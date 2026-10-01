'use strict';
// Edificios emblemáticos de cada ciudad. Cada edificio conserva la cuadrícula de
// ventanas destruible (jugabilidad de Rampage), pero cambia su aspecto:
// color, tipo de ventana, fachada y "corona" (la silueta de arriba que lo hace reconocible).

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + ((1 << 24) + (f(n >> 16) << 16) + (f((n >> 8) & 255) << 8) + f(n & 255)).toString(16).slice(1);
}
function poly(c, pts, color) {
  c.fillStyle = color; c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.closePath(); c.fill();
}
function cone(c, x, base, w, h, color) { poly(c, [[x - w / 2, base], [x, base - h], [x + w / 2, base]], color); }
function halfDome(c, cx, base, rx, ry, color) {
  c.fillStyle = color; c.beginPath(); c.ellipse(cx, base, rx, ry, 0, Math.PI, 0); c.closePath(); c.fill();
}
function cross(c, x, y, s, color = '#e8c030') {
  c.fillStyle = color; c.fillRect(x - 1, y - s, 2, s); c.fillRect(x - s * 0.35, y - s * 0.7, s * 0.7, 2);
}
function statue(c, x, y, color = '#e8c030') {
  // figura dorada con alas
  c.fillStyle = color;
  c.fillRect(x - 1.5, y - 10, 3, 10);
  circle(c, x, y - 12, 2.2, color);
  poly(c, [[x - 1, y - 9], [x - 8, y - 15], [x - 3, y - 5]], color);
  poly(c, [[x + 1, y - 9], [x + 8, y - 15], [x + 3, y - 5]], color);
}

// ---------------------------------------------------------------------------
// Coronas (siluetas sobre la azotea). (c, X, R, Wd, H, s): X,Wd = edificio, R = azotea, H = alto disponible
// ---------------------------------------------------------------------------
const CROWNS = {
  spires(c, X, R, Wd, H, s) { // Sagrada Família
    s.at.forEach((dx, i) => {
      const h = H * s.hs[i], x = X + Wd * dx, w = Math.max(13, Wd * 0.17);
      c.fillStyle = s.color; c.beginPath();
      c.moveTo(x - w / 2, R); c.lineTo(x - w * 0.28, R - h * 0.82);
      c.quadraticCurveTo(x, R - h * 1.02, x + w * 0.28, R - h * 0.82); c.lineTo(x + w / 2, R); c.fill();
      c.fillStyle = shade(s.color, 0.55);
      for (let yy = R - 10; yy > R - h * 0.72; yy -= 9) {
        const t = (R - yy) / h, ww = w * 0.4 * (1 - t * 0.5);
        c.fillRect(x - ww / 2, yy, ww, 3);
      }
      circle(c, x, R - h * 0.95, w * 0.3, s.tips[i % s.tips.length]);
    });
  },
  bullet(c, X, R, Wd, H, s) { // Torre Glòries, Gherkin, Torre Iberdrola…
    const h = Math.min(H, Wd * (s.k || 0.7));
    const path = () => {
      c.beginPath(); c.moveTo(X, R);
      c.bezierCurveTo(X, R - h * 0.95, X + Wd * 0.22, R - h, X + Wd / 2, R - h);
      c.bezierCurveTo(X + Wd * 0.78, R - h, X + Wd, R - h * 0.95, X + Wd, R); c.closePath();
    };
    const g = c.createLinearGradient(X, 0, X + Wd, 0);
    g.addColorStop(0, shade(s.color, 1.3)); g.addColorStop(1, shade(s.color, 0.7));
    c.fillStyle = g; path(); c.fill();
    c.save(); path(); c.clip();
    c.strokeStyle = s.line || 'rgba(255,255,255,.35)'; c.lineWidth = 1.5;
    if (s.ribs === 'diag') {
      for (let k = -Wd; k < Wd * 2; k += 12) {
        c.beginPath(); c.moveTo(X + k, R); c.lineTo(X + k + h, R - h); c.stroke();
        c.beginPath(); c.moveTo(X + k, R); c.lineTo(X + k - h, R - h); c.stroke();
      }
    } else if (s.ribs === 'dots') {
      for (let yy = R - 5; yy > R - h; yy -= 6) for (let xx = X + 3; xx < X + Wd; xx += 6) {
        c.fillStyle = s.dots[(Math.floor(xx * 7 + yy * 3)) % s.dots.length]; c.fillRect(xx, yy, 3, 3);
      }
    } else {
      for (let yy = R - 6; yy > R - h; yy -= 7) { c.beginPath(); c.moveTo(X, yy); c.lineTo(X + Wd, yy); c.stroke(); }
    }
    c.restore();
    if (s.spire) { c.fillStyle = '#ddd'; c.fillRect(X + Wd / 2 - 1.5, R - h - 18, 3, 18); }
  },
  wave(c, X, R, Wd, H, s) { // Casa Batlló
    const h = Math.min(H * 0.5, 34);
    const g = c.createLinearGradient(X, R - h, X + Wd, R);
    g.addColorStop(0, '#d8643a'); g.addColorStop(0.5, '#4e9f9a'); g.addColorStop(1, '#3a6fb0');
    c.fillStyle = g; c.beginPath(); c.moveTo(X - 3, R); c.lineTo(X - 3, R - 8);
    c.quadraticCurveTo(X + Wd * 0.55, R - h * 1.8, X + Wd + 3, R - 10); c.lineTo(X + Wd + 3, R); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1;
    for (let xx = X + 4; xx < X + Wd; xx += 7) for (let yy = R - 4; yy > R - h; yy -= 6) {
      c.beginPath(); c.arc(xx + ((yy / 6) % 2) * 3, yy, 3, Math.PI, 0); c.stroke();
    }
    // torre con la cruz de 4 brazos
    const tx = X + Wd * 0.15;
    c.fillStyle = '#e9dcc0'; c.fillRect(tx - 4, R - h - 8, 8, h);
    circle(c, tx, R - h - 10, 5, '#d8b040');
    cross(c, tx, R - h - 14, 10, '#d8b040');
  },
  dome(c, X, R, Wd, H, s) {
    const cx = X + Wd * (s.at ?? 0.5), w = Wd * (s.wf ?? 0.6);
    let base = R;
    if (s.drum !== false) {
      const dh = Math.min(H * 0.22, 16);
      c.fillStyle = s.drumColor || '#e8e0d0'; c.fillRect(cx - w * 0.42, R - dh, w * 0.84, dh);
      c.fillStyle = 'rgba(0,0,0,.3)';
      for (let k = cx - w * 0.36; k < cx + w * 0.36; k += 6) c.fillRect(k, R - dh + 3, 2, dh - 5);
      base = R - dh;
    }
    const rx = w / 2 * (s.drum !== false ? 0.86 : 1);
    const ry = Math.max(8, Math.min(H - (R - base) - 14, w * (s.tall || 0.55)));
    halfDome(c, cx, base, rx, ry, s.color);
    c.strokeStyle = s.rib || shade(s.color, 0.65); c.lineWidth = 1.5;
    for (let k = -2; k <= 2; k++) {
      c.beginPath(); c.moveTo(cx + k * rx * 0.38, base); c.quadraticCurveTo(cx + k * rx * 0.3, base - ry * 0.8, cx, base - ry); c.stroke();
    }
    if (s.glass) { c.fillStyle = 'rgba(200,235,255,.35)'; c.beginPath(); c.ellipse(cx, base, rx, ry, 0, Math.PI, 0); c.fill(); }
    const top = base - ry;
    if (s.lantern !== false) {
      c.fillStyle = s.drumColor || '#e8e0d0'; c.fillRect(cx - 3, top - 7, 6, 7);
      halfDome(c, cx, top - 7, 4, 4, s.color);
    }
    const tt = top - (s.lantern !== false ? 11 : 0);
    if (s.top === 'cross') cross(c, cx, tt, 9);
    else if (s.top === 'statue') statue(c, cx, tt);
    else if (s.top === 'ball') circle(c, cx, tt - 2, 2.5, '#e8c030');
  },
  tower(c, X, R, Wd, H, s) { // Giralda, Big Ben, Miguelete…
    const cx = X + Wd * (s.at ?? 0.5), w = Math.max(16, Wd * (s.wf ?? 0.5));
    const th = H * (s.th ?? 0.5);
    c.fillStyle = s.color; c.fillRect(cx - w / 2, R - th, w, th);
    c.fillStyle = shade(s.color, 0.8); c.fillRect(cx - w / 2 - 2, R - th, w + 4, 4);
    const top = R - th;
    if (s.clock) {
      const r = Math.min(w * 0.34, 12);
      circle(c, cx, top + th * 0.35, r + 2, '#d8b040'); circle(c, cx, top + th * 0.35, r, '#f8f4e0');
      limb(c, cx, top + th * 0.35, cx, top + th * 0.35 - r * 0.7, 1.5, '#222');
      limb(c, cx, top + th * 0.35, cx + r * 0.5, top + th * 0.35, 1.5, '#222');
    } else {
      c.fillStyle = 'rgba(0,0,0,.45)';
      const n = Math.max(1, Math.floor(w / 12)), sw = w / n;
      for (let i = 0; i < n; i++) {
        const ax = cx - w / 2 + sw * i + sw * 0.25, aw = sw * 0.5, ay = top + 8, ah = Math.min(th * 0.35, 18);
        c.fillRect(ax, ay + aw / 2, aw, ah - aw / 2);
        c.beginPath(); c.arc(ax + aw / 2, ay + aw / 2, aw / 2, Math.PI, 0); c.fill();
      }
    }
    const capH = H - th, cap = s.cap || 'spire', cc = s.capColor || shade(s.color, 0.75);
    if (cap === 'spire') { cone(c, cx, top, w * 0.95, capH * 0.92, cc); circle(c, cx, top - capH * 0.92, 2.5, '#e8c030'); }
    else if (cap === 'pyramid') { cone(c, cx, top, w * 1.1, Math.min(capH * 0.6, w * 0.8), cc); cross(c, cx, top - Math.min(capH * 0.6, w * 0.8), 7); }
    else if (cap === 'giralda') {
      const t1 = Math.min(capH * 0.35, 18), w1 = w * 0.62;
      c.fillStyle = shade(s.color, 1.15); c.fillRect(cx - w1 / 2, top - t1, w1, t1);
      c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(cx - 3, top - t1 + 4, 6, t1 - 6);
      const t2 = Math.min(capH * 0.22, 12), w2 = w1 * 0.65;
      c.fillStyle = shade(s.color, 1.25); c.fillRect(cx - w2 / 2, top - t1 - t2, w2, t2);
      halfDome(c, cx, top - t1 - t2, w2 / 2, w2 / 2, '#d8b040');
      statue(c, cx, top - t1 - t2 - w2 / 2);
    } else if (cap === 'dome') {
      halfDome(c, cx, top, w * 0.48, Math.min(capH * 0.5, w * 0.55), cc);
      cross(c, cx, top - Math.min(capH * 0.5, w * 0.55), 8);
    } else if (cap === 'bell') { // campanario: tejadillo de campana
      c.fillStyle = cc; c.beginPath(); c.moveTo(cx - w / 2, top);
      c.quadraticCurveTo(cx - w * 0.5, top - capH * 0.35, cx, top - capH * 0.5);
      c.quadraticCurveTo(cx + w * 0.5, top - capH * 0.35, cx + w / 2, top); c.fill();
      cross(c, cx, top - capH * 0.5, 8);
    } else if (cap === 'lighthouse') { // Palacio Barolo
      c.fillStyle = shade(s.color, 1.1); c.fillRect(cx - w * 0.3, top - capH * 0.3, w * 0.6, capH * 0.3);
      halfDome(c, cx, top - capH * 0.3, w * 0.3, w * 0.3, cc);
      circle(c, cx, top - capH * 0.3 - w * 0.3 - 3, 4, Math.floor(performance.now() / 400) % 2 ? '#fff6a0' : '#c8a020');
    } else if (cap === 'cupola') {
      halfDome(c, cx, top, w * 0.35, w * 0.35, cc); circle(c, cx, top - w * 0.35 - 2, 2, '#e8c030');
    }
  },
  crenels(c, X, R, Wd, H, s) {
    c.fillStyle = s.color;
    for (let x = X - 2; x < X + Wd; x += 11) c.fillRect(x, R - 9, 7, 9);
    if (s.turrets) for (const dx of [0, 1]) { // Torres de Serranos
      const tx = X + dx * Wd - 10 + dx * 0;
      c.fillStyle = s.color; c.fillRect(tx - 2, R - 30, 24, 30);
      for (let k = 0; k < 3; k++) c.fillRect(tx - 2 + k * 9, R - 37, 6, 7);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(tx + 7, R - 24, 4, 10);
    }
  },
  tier(c, X, R, Wd, H, s) { // cuerpo superior más estrecho (Torre del Oro, Aljafería)
    const w = Wd * (s.wf || 0.6), h = Math.min(H * 0.4, s.h || 26), cx = X + Wd / 2;
    c.fillStyle = s.color; c.fillRect(cx - w / 2, R - h, w, h);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(cx - 3, R - h + 6, 6, 10);
    for (let x = cx - w / 2; x < cx + w / 2 - 4; x += 9) { c.fillStyle = s.color; c.fillRect(x, R - h - 6, 5, 6); }
    if (s.dome) halfDome(c, cx, R - h - 6, w * 0.25, w * 0.3, s.dome);
  },
  steps(c, X, R, Wd, H, s) { // Empire State, Willis, Torre Latinoamericana
    const cx = X + Wd * (s.at ?? 0.5);
    let w = Wd, base = R;
    const n = s.n || 3, stepH = Math.min(s.stepH || 18, (H * 0.55) / n);
    for (let i = 0; i < n; i++) {
      w *= s.shrink || 0.72; base -= stepH;
      c.fillStyle = shade(s.color, 1 - i * 0.05); c.fillRect(cx - w / 2, base, w, stepH);
      c.fillStyle = s.win || 'rgba(0,0,0,.35)';
      for (let k = cx - w / 2 + 3; k < cx + w / 2 - 3; k += 6) c.fillRect(k, base + 4, 2, stepH - 7);
    }
    const left = H - (R - base);
    if (s.spire) {
      c.fillStyle = s.spireColor || '#d8d8d8';
      poly(c, [[cx - 5, base], [cx - 2, base - left * 0.75], [cx + 2, base - left * 0.75], [cx + 5, base]], s.spireColor || '#d8d8d8');
      c.fillRect(cx - 0.75, base - left * 0.98, 1.5, left * 0.25);
    }
    if (s.antennas) for (const dx of [-0.22, 0.22]) {
      c.fillStyle = '#eee'; c.fillRect(cx + w * dx * 2 - 1.5, base - left * 0.8, 3, left * 0.8);
    }
  },
  chrysler(c, X, R, Wd, H, s) {
    const cx = X + Wd / 2;
    let w = Wd * 0.8, base = R;
    for (let i = 0; i < 5; i++) {
      const h = Math.min(15, H * 0.13);
      c.fillStyle = shade(s.color, 1 + i * 0.06);
      c.beginPath(); c.moveTo(cx - w / 2, base); c.lineTo(cx - w / 2, base - h * 0.3);
      c.quadraticCurveTo(cx, base - h * 2, cx + w / 2, base - h * 0.3); c.lineTo(cx + w / 2, base); c.fill();
      c.fillStyle = '#1a1a2a';
      for (let k = -2; k <= 2; k++) {
        const tx = cx + k * w * 0.18, ty = base - h * 0.4 - (2 - Math.abs(k)) * h * 0.25;
        poly(c, [[tx - 2.5, ty + 4], [tx, ty - 3], [tx + 2.5, ty + 4]], '#1a1a2a');
      }
      base -= h; w *= 0.74;
    }
    const left = H - (R - base);
    poly(c, [[cx - 3, base], [cx, base - left], [cx + 3, base]], '#e0e4e8');
  },
  lattice(c, X, R, Wd, H, s) { // Torre Eiffel, Tokyo Tower, Skytree
    const cx = X + Wd / 2, wb = Wd * (s.wb || 0.8), h = H;
    const xl = t => cx - (wb / 2) * Math.pow(1 - t, s.curve || 1.8) - 3 * t;
    const xr = t => cx + (wb / 2) * Math.pow(1 - t, s.curve || 1.8) + 3 * t;
    c.lineWidth = 4;
    const col = t => (s.bands && Math.floor(t * 7) % 2 ? s.bands : s.color);
    for (let i = 0; i < 14; i++) {
      const t0 = i / 14, t1 = (i + 1) / 14, y0 = R - h * t0 * 0.92, y1 = R - h * t1 * 0.92;
      c.strokeStyle = col(t0);
      c.beginPath(); c.moveTo(xl(t0), y0); c.lineTo(xl(t1), y1); c.moveTo(xr(t0), y0); c.lineTo(xr(t1), y1); c.stroke();
      c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(xl(t0), y0); c.lineTo(xr(t1), y1); c.moveTo(xr(t0), y0); c.lineTo(xl(t1), y1); c.stroke();
      c.lineWidth = 4;
    }
    for (const t of s.decks || [0.3, 0.6]) {
      c.fillStyle = s.deck || s.color; c.fillRect(xl(t) - 4, R - h * t * 0.92 - 3, xr(t) - xl(t) + 8, 5);
    }
    c.fillStyle = s.color; c.fillRect(cx - 1.5, R - h, 3, h * 0.1);
  },
  point(c, X, R, Wd, H, s) { // The Shard, One WTC
    const cx = X + Wd / 2;
    const g = c.createLinearGradient(X, 0, X + Wd, 0);
    g.addColorStop(0, shade(s.color, 1.3)); g.addColorStop(1, shade(s.color, 0.75));
    if (s.jagged) {
      poly(c, [[X, R], [cx - 5, R - H * 0.9], [cx - 1, R - H * 0.82], [cx + 2, R - H], [cx + 4, R - H * 0.86], [X + Wd, R]], g);
    } else {
      poly(c, [[X, R], [X + Wd * 0.3, R - H * 0.6], [X + Wd * 0.7, R - H * 0.6], [X + Wd, R]], g);
      c.fillStyle = '#e8e8e8'; c.fillRect(cx - 1.5, R - H, 3, H * 0.4);
    }
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1;
    for (let yy = R - 7; yy > R - H * 0.8; yy -= 7) { c.beginPath(); c.moveTo(X, yy); c.lineTo(X + Wd, yy); c.stroke(); }
  },
  pagoda(c, X, R, Wd, H, s) {
    const cx = X + Wd / 2, n = s.n || 3;
    let w = Wd + 16, base = R;
    const step = Math.min(18, (H * 0.65) / n);
    for (let i = 0; i < n; i++) {
      c.fillStyle = s.wall || '#b8322a'; c.fillRect(cx - w * 0.32, base - step, w * 0.64, step);
      c.fillStyle = s.roof || '#3a3a44';
      c.beginPath(); c.moveTo(cx - w / 2, base - step * 0.25);
      c.quadraticCurveTo(cx - w * 0.25, base - step * 0.4, cx - w * 0.15, base - step * 0.9);
      c.lineTo(cx + w * 0.15, base - step * 0.9);
      c.quadraticCurveTo(cx + w * 0.25, base - step * 0.4, cx + w / 2, base - step * 0.25); c.closePath(); c.fill();
      base -= step; w *= 0.8;
    }
    const left = H - (R - base);
    c.fillStyle = '#c8a040'; c.fillRect(cx - 1.5, base - left * 0.9, 3, left * 0.9);
    for (let k = 1; k < 6; k++) c.fillRect(cx - 4, base - left * 0.12 * k, 8, 2);
  },
  mansard(c, X, R, Wd, H, s) { // tejado parisino / Casa Rosada
    const h = Math.min(H * 0.45, 24);
    poly(c, [[X - 3, R], [X + 8, R - h], [X + Wd - 8, R - h], [X + Wd + 3, R]], s.color || '#59636e');
    for (let x = X + 12; x < X + Wd - 14; x += 18) {
      c.fillStyle = '#efe6d2'; c.fillRect(x, R - h * 0.75, 8, h * 0.6);
      cone(c, x + 4, R - h * 0.75, 12, 6, s.color || '#59636e');
      c.fillStyle = '#2a3a50'; c.fillRect(x + 2, R - h * 0.6, 4, h * 0.4);
    }
    c.fillStyle = '#8a5a4a'; c.fillRect(X + Wd * 0.75, R - h - 8, 6, 9);
  },
  needle(c, X, R, Wd, H, s) { // Fernsehturm
    const cx = X + Wd / 2, r = Math.min(Wd * 0.28, 17);
    c.fillStyle = '#d8d8dc'; c.fillRect(cx - 4, R - H * 0.6, 8, H * 0.6);
    const sy = R - H * 0.6 - r * 0.6;
    const g = c.createRadialGradient(cx - r * 0.4, sy - r * 0.4, 2, cx, sy, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#8a929c');
    circle(c, cx, sy, r, g);
    c.fillStyle = '#556'; c.fillRect(cx - r, sy - 1, r * 2, 3);
    for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? '#e33' : '#fff'; c.fillRect(cx - 1.5, sy - r - (k + 1) * 6, 3, 6); }
  },
  obelisk(c, X, R, Wd, H, s) {
    const cx = X + Wd / 2, w = Math.min(Wd * 0.4, 26);
    poly(c, [[cx - w / 2, R], [cx - w * 0.33, R - H * 0.86], [cx, R - H], [cx + w * 0.33, R - H * 0.86], [cx + w / 2, R]], s.color || '#f0ece2');
    c.fillStyle = 'rgba(0,0,0,.15)'; poly(c, [[cx, R], [cx, R - H], [cx + w * 0.33, R - H * 0.86], [cx + w / 2, R]], 'rgba(0,0,0,.12)');
    c.fillStyle = '#334'; c.fillRect(cx - 2, R - H * 0.8, 4, 4);
  },
  column(c, X, R, Wd, H, s) { // Ángel de la Independencia
    const cx = X + Wd / 2;
    c.fillStyle = '#e8e2d2'; c.fillRect(cx - 5, R - H * 0.75, 10, H * 0.75);
    c.fillStyle = '#d0c8b0'; c.fillRect(cx - 8, R - H * 0.78, 16, 5);
    statue(c, cx, R - H * 0.79);
  },
  petals(c, X, R, Wd, H, s) { // Guggenheim Bilbao
    const k = [0.55, 0.85, 0.65, 1, 0.7];
    for (let i = 0; i < 5; i++) {
      const x0 = X + Wd * i / 5 - 10, x1 = X + Wd * (i + 1) / 5 + 12;
      const g = c.createLinearGradient(x0, R - H * k[i], x1, R);
      g.addColorStop(0, '#eef2f6'); g.addColorStop(1, '#8a949e');
      c.fillStyle = g; c.beginPath(); c.moveTo(x0, R);
      c.quadraticCurveTo(x0 + (i % 2 ? 4 : -6), R - H * k[i] * 0.9, (x0 + x1) / 2, R - H * k[i] * 0.7);
      c.quadraticCurveTo(x1 + 6, R - H * k[i] * 0.3, x1, R); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1; c.stroke();
    }
  },
  pediment(c, X, R, Wd, H, s) { // Panteón, Puerta de Brandeburgo
    const h = Math.min(H * 0.35, Wd * 0.22);
    c.fillStyle = shade(s.color, 0.85); c.fillRect(X - 4, R - 6, Wd + 8, 6);
    if (s.flat) {
      c.fillStyle = s.color; c.fillRect(X + 4, R - 6 - h * 0.6, Wd - 8, h * 0.6);
    } else poly(c, [[X - 4, R - 6], [X + Wd / 2, R - 6 - h], [X + Wd + 4, R - 6]], s.color);
    if (s.quadriga) { // cuadriga de bronce verde
      const cx = X + Wd / 2, by = R - 6 - h * 0.6;
      c.fillStyle = '#4a7a5a';
      for (let k = -2; k <= 1; k++) { c.fillRect(cx + k * 7, by - 9, 6, 5); c.fillRect(cx + k * 7 + 1, by - 5, 1.5, 5); c.fillRect(cx + k * 7 + 4, by - 5, 1.5, 5); c.fillRect(cx + k * 7 + 4, by - 12, 2.5, 4); }
      statue(c, cx + 14, by - 4, '#4a7a5a');
    }
  },
  ribs(c, X, R, Wd, H, s) { // Calatrava (Ciudad de las Artes)
    c.strokeStyle = s.color || '#f4f6f8'; c.lineWidth = 3; c.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
      c.beginPath(); c.moveTo(X + k * Wd / 6, R);
      c.quadraticCurveTo(X + k * Wd / 6 + Wd * 0.25, R - H * (0.4 + k * 0.08), X + Wd + 6, R - H * (0.3 + k * 0.1)); c.stroke();
    }
    c.lineCap = 'butt';
  },
  twin(c, X, R, Wd, H, s) { // Notre-Dame, Catedral de México
    const w = Math.max(16, Wd * 0.3), h = H * (s.th || 0.42);
    // muro central con rosetón
    c.fillStyle = shade(s.color, 0.95); c.fillRect(X, R - h * 0.45, Wd, h * 0.45);
    if (s.rose) { circle(c, X + Wd / 2, R - h * 0.25, Math.min(10, Wd * 0.12), '#2a3a70'); circle(c, X + Wd / 2, R - h * 0.25, Math.min(6, Wd * 0.07), '#c84a4a'); }
    if (s.spire) poly(c, [[X + Wd / 2 - 4, R - h * 0.45], [X + Wd / 2, R - H], [X + Wd / 2 + 4, R - h * 0.45]], '#4a4f58');
    for (const tx of [X, X + Wd - w]) {
      c.fillStyle = s.color; c.fillRect(tx, R - h, w, h);
      c.fillStyle = 'rgba(0,0,0,.45)';
      c.fillRect(tx + w * 0.3, R - h + 8, w * 0.15, h * 0.45); c.fillRect(tx + w * 0.55, R - h + 8, w * 0.15, h * 0.45);
      if (s.cap === 'bell') {
        c.fillStyle = s.capColor || shade(s.color, 0.8); c.beginPath(); c.moveTo(tx, R - h);
        c.quadraticCurveTo(tx + w * 0.1, R - h - w * 0.6, tx + w / 2, R - h - w * 0.7);
        c.quadraticCurveTo(tx + w * 0.9, R - h - w * 0.6, tx + w, R - h); c.fill();
        cross(c, tx + w / 2, R - h - w * 0.7, 7);
      } else {
        for (let k = 0; k < 3; k++) { c.fillStyle = s.color; c.fillRect(tx + k * (w / 3), R - h - 5, w / 3 - 3, 5); }
      }
    }
  },
  turrets(c, X, R, Wd, H, s) { // Torre de Londres / Tower Bridge
    for (const dx of s.at || [0.05, 0.95]) {
      const tx = X + Wd * dx, w = 12, h = H * 0.35;
      c.fillStyle = s.color; c.fillRect(tx - w / 2, R - h, w, h);
      cone(c, tx, R - h, w + 4, h * 0.7, s.capColor || '#4a4f58');
      circle(c, tx, R - h * 1.7, 2, '#e8c030');
    }
  },
  cornice(c, X, R, Wd, H, s) { // Flatiron
    c.fillStyle = shade(s.color, 0.85); c.fillRect(X - 6, R - 8, Wd + 12, 8);
    c.fillStyle = s.color; c.fillRect(X - 3, R - 16, Wd + 6, 8);
    c.fillStyle = 'rgba(0,0,0,.25)';
    for (let x = X; x < X + Wd; x += 6) c.fillRect(x, R - 7, 3, 4);
  },
  ruin(c, X, R, Wd, H, s) { // Coliseo: piso superior medio derruido
    const h = Math.min(H * 0.5, 30);
    poly(c, [[X, R], [X, R - h], [X + Wd * 0.25, R - h], [X + Wd * 0.35, R - h * 0.7], [X + Wd * 0.45, R - h * 0.75],
      [X + Wd * 0.55, R - h * 0.35], [X + Wd * 0.7, R - h * 0.4], [X + Wd * 0.8, R - 4], [X + Wd, R]], s.color);
    c.fillStyle = 'rgba(40,20,0,.5)';
    for (let x = X + 6; x < X + Wd * 0.45; x += 12) c.fillRect(x, R - h + 8, 5, 8);
  },
  antennas(c, X, R, Wd, H, s) {
    for (const dx of s.at || [0.3, 0.7]) {
      c.fillStyle = s.color || '#f0f0f0'; c.fillRect(X + Wd * dx - 1.5, R - H * (s.h || 0.7), 3, H * (s.h || 0.7));
      if (Math.floor(performance.now() / 500) % 2) circle(c, X + Wd * dx, R - H * (s.h || 0.7), 2.5, '#f33');
    }
  },
  sign(c, X, R, Wd, H, s) {
    c.fillStyle = '#222'; c.fillRect(X + Wd / 2 - 32, R - 24, 64, 18);
    c.fillStyle = s.color || '#ff4fa3'; c.font = 'bold 11px sans-serif'; c.textAlign = 'center';
    c.fillText(s.text, X + Wd / 2, R - 11); c.textAlign = 'left';
  },
};

// ---------------------------------------------------------------------------
// Texturas de fachada (se dibujan sobre el muro, antes que las ventanas)
// ---------------------------------------------------------------------------
const FACADES = {
  stone(c, b, R) { c.fillStyle = 'rgba(0,0,0,.07)'; for (let y = R + 4; y < R + b.h; y += 8) c.fillRect(b.x, y, b.w, 1); },
  brick(c, b, R) {
    c.fillStyle = 'rgba(0,0,0,.1)';
    for (let y = R; y < R + b.h; y += 5) { c.fillRect(b.x, y, b.w, 1); for (let x = b.x + ((y / 5) % 2) * 5; x < b.x + b.w; x += 10) c.fillRect(x, y, 1, 5); }
  },
  scales(c, b, R) { // trencadís de Gaudí
    const cols = ['#e8a040', '#4ab0c0', '#d85a7a', '#7ac060', '#f0e070'];
    for (let y = R + 3; y < R + b.h; y += 7) for (let x = b.x + 2; x < b.x + b.w; x += 7) {
      c.fillStyle = cols[(x * 3 + y * 7) % cols.length]; c.globalAlpha = 0.35; c.fillRect(x, y, 3, 3);
    }
    c.globalAlpha = 1;
  },
  xbrace(c, b, R) { // John Hancock
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 3;
    const seg = CELL * 3;
    for (let y = R; y < R + b.h - 4; y += seg) {
      const y2 = Math.min(R + b.h, y + seg);
      c.beginPath(); c.moveTo(b.x, y); c.lineTo(b.x + b.w, y2); c.moveTo(b.x + b.w, y); c.lineTo(b.x, y2); c.stroke();
    }
  },
  diag(c, b, R) {
    c.save(); c.beginPath(); c.rect(b.x, R, b.w, b.h); c.clip();
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1;
    for (let k = -b.h; k < b.w + b.h; k += 14) {
      c.beginPath(); c.moveTo(b.x + k, R); c.lineTo(b.x + k + b.h, R + b.h); c.moveTo(b.x + k, R); c.lineTo(b.x + k - b.h, R + b.h); c.stroke();
    }
    c.restore();
  },
  columns(c, b, R) {
    c.fillStyle = 'rgba(255,255,255,.18)';
    for (let x = b.x; x <= b.x + b.w; x += CELL) c.fillRect(x - 2, R, 4, b.h);
  },
  bands(c, b, R) { c.fillStyle = 'rgba(255,255,255,.55)'; for (let y = R + CELL * 2 - 4; y < R + b.h; y += CELL * 2) c.fillRect(b.x, y, b.w, 4); },
  balconies(c, b, R) { c.fillStyle = 'rgba(30,30,30,.55)'; for (let y = R + CELL - 7; y < R + b.h - CELL; y += CELL) c.fillRect(b.x + 2, y, b.w - 4, 2); },
};

// ---------------------------------------------------------------------------
// Ventanas (x, y = esquina sup. izq. del hueco de 20x20 dentro de la celda de 32x32)
// ---------------------------------------------------------------------------
function drawLandmarkWindow(c, st, b, cell, x, y, night) {
  const lit = night && cell.light;
  const glassCol = lit ? '#ffe28a' : night ? '#1c2240' : (st.glass || '#5b87b5');
  const frame = st.trim;
  switch (st.win) {
    case 'arch': // gótico
      c.fillStyle = glassCol; c.beginPath(); c.moveTo(x + 2, y + 22); c.lineTo(x + 2, y + 8);
      c.quadraticCurveTo(x + 10, y - 4, x + 18, y + 8); c.lineTo(x + 18, y + 22); c.fill();
      c.strokeStyle = frame; c.lineWidth = 1.5; c.stroke();
      break;
    case 'arcade': // arcos de medio punto (Coliseo)
      c.fillStyle = night ? '#120c08' : '#3a2a1a';
      c.fillRect(x + 1, y + 9, 18, 15); c.beginPath(); c.arc(x + 10, y + 9, 9, Math.PI, 0); c.fill();
      break;
    case 'round':
      circle(c, x + 10, y + 10, 10, frame); circle(c, x + 10, y + 10, 8, glassCol);
      break;
    case 'tall':
      c.fillStyle = glassCol; c.fillRect(x + 6, y - 2, 8, 24);
      break;
    case 'glass': { // muro cortina
      const tints = st.tints;
      c.fillStyle = lit ? '#ffe9a8' : night ? '#141a36' : tints ? tints[cell.tint % tints.length] : glassCol;
      c.fillRect(x - 5, y - 5, 30, 30);
      c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(x - 5, y - 5, 30, 2);
      if (!night) { c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(x - 2, y - 2, 5, 22); }
      return;
    }
    case 'lattice': // estructura de hierro: huecos oscuros entre vigas en X
      c.fillStyle = night ? '#0a0c18' : 'rgba(0,0,0,.25)'; c.fillRect(x - 4, y - 4, 28, 28);
      c.strokeStyle = frame; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x - 4, y - 4); c.lineTo(x + 24, y + 24); c.moveTo(x + 24, y - 4); c.lineTo(x - 4, y + 24); c.stroke();
      return;
    default:
      c.fillStyle = glassCol; c.fillRect(x, y, 20, 20);
      if (!night) { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + 2, y + 2, 6, 16); }
      c.fillStyle = frame; c.fillRect(x - 2, y + 20, 24, 3);
  }
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------
const LANDMARKS = {
  // BARCELONA
  sagrada: { name: 'Sagrada Família', color: '#c8a26b', trim: '#8a6a3a', win: 'arch', facade: 'stone', cols: [4, 5], rows: [6, 9],
    crown: [{ t: 'spires', at: [0.12, 0.32, 0.5, 0.68, 0.88], hs: [0.62, 0.86, 1, 0.86, 0.62], color: '#b8915a', tips: ['#e8c030', '#d84a3a', '#5ab04a'] }] },
  glories: { name: 'Torre Glòries', color: '#2e5fa8', trim: '#1c3a6a', win: 'glass', tints: ['#2e6fd0', '#3a8ae0', '#c84a3a', '#2a9ab8', '#e07040'], cols: [3, 4], rows: [7, 10],
    crown: [{ t: 'bullet', color: '#3a6fc8', ribs: 'dots', dots: ['#e04a3a', '#3a8ae0', '#80c8ff', '#2a4a90'], k: 0.9 }] },
  batllo: { name: 'Casa Batlló', color: '#7ab8b0', trim: '#4a7a76', win: 'round', facade: 'scales', glass: '#3a5a80', cols: [3, 4], rows: [5, 7],
    crown: [{ t: 'wave' }] },
  agbar_pedrera: { name: 'La Pedrera', color: '#e2d6bc', trim: '#a8987a', win: 'arch', facade: 'stone', cols: [4, 5], rows: [5, 7],
    crown: [{ t: 'cornice', color: '#e2d6bc' }, { t: 'turrets', at: [0.25, 0.55, 0.8], color: '#d8ccb0', capColor: '#e8e0d0' }] },
  // MADRID
  metropolis: { name: 'Edificio Metrópolis', color: '#ece4d4', trim: '#a89878', win: 'arch', facade: 'columns', cols: [3, 4], rows: [6, 8],
    crown: [{ t: 'dome', color: '#2a2a30', rib: '#d8b040', drumColor: '#ece4d4', wf: 0.75, top: 'statue' }] },
  picasso: { name: 'Torre Picasso', color: '#f2f2ee', trim: '#bbbbb5', win: 'tall', glass: '#3a4a5a', cols: [4, 5], rows: [8, 10],
    crown: [{ t: 'cornice', color: '#f2f2ee' }] },
  espana: { name: 'Edificio España', color: '#c47a5a', trim: '#8a4a32', win: 'rect', facade: 'brick', cols: [4, 5], rows: [7, 10],
    crown: [{ t: 'steps', n: 2, color: '#c47a5a', shrink: 0.6 }, { t: 'turrets', at: [0.3, 0.7], color: '#e0d0b8', capColor: '#4a4f58' }] },
  alcala: { name: 'Puerta de Alcalá', color: '#d8ccb0', trim: '#9a8a6a', win: 'arcade', facade: 'stone', cols: [5, 5], rows: [4, 5],
    crown: [{ t: 'pediment', color: '#d8ccb0' }] },
  // VALENCIA
  miguelete: { name: 'El Miguelete', color: '#d8c39a', trim: '#9a8460', win: 'arch', facade: 'stone', cols: [3, 3], rows: [7, 10],
    crown: [{ t: 'tower', wf: 0.65, th: 0.45, color: '#d8c39a', cap: 'pyramid', capColor: '#a89060' }] },
  serranos: { name: 'Torres de Serranos', color: '#cdb48a', trim: '#8a7450', win: 'arch', facade: 'stone', cols: [4, 5], rows: [5, 7],
    crown: [{ t: 'crenels', color: '#cdb48a', turrets: true }] },
  artes: { name: 'Ciudad de las Artes', color: '#f4f6f8', trim: '#c8d0d8', win: 'glass', glass: '#6ab8e0', cols: [4, 5], rows: [5, 7],
    crown: [{ t: 'ribs', color: '#ffffff' }] },
  mercado: { name: 'Mercado Central', color: '#d89a5a', trim: '#8a5a2a', win: 'round', facade: 'brick', glass: '#4a8ab0', cols: [4, 5], rows: [5, 6],
    crown: [{ t: 'dome', color: '#4a9ac0', rib: '#e8c030', drumColor: '#d89a5a', wf: 0.5, top: 'ball' }] },
  // SEVILLA
  giralda: { name: 'La Giralda', color: '#d39468', trim: '#8a5a3a', win: 'arch', facade: 'brick', cols: [3, 3], rows: [8, 10],
    crown: [{ t: 'tower', wf: 0.9, th: 0.28, color: '#e6c7a0', cap: 'giralda' }] },
  toro: { name: 'Torre del Oro', color: '#e0bc6a', trim: '#9a7a30', win: 'arch', facade: 'stone', cols: [3, 4], rows: [5, 6],
    crown: [{ t: 'crenels', color: '#e0bc6a' }, { t: 'tier', wf: 0.6, color: '#e8c87a', dome: '#d8b040' }] },
  torresev: { name: 'Torre Sevilla', color: '#8ab0c8', trim: '#5a7a90', win: 'glass', glass: '#7aa8c8', cols: [4, 4], rows: [9, 10],
    crown: [{ t: 'bullet', color: '#8ab0c8', k: 0.35 }] },
  plaza: { name: 'Plaza de España', color: '#c4704a', trim: '#e8d8b8', win: 'arch', facade: 'brick', cols: [4, 5], rows: [6, 8],
    crown: [{ t: 'tower', wf: 0.45, th: 0.4, color: '#c4704a', cap: 'cupola', capColor: '#d8c8a0' }] },
  // BILBAO
  guggen: { name: 'Museo Guggenheim', color: '#b9c2ca', trim: '#7a848e', win: 'glass', glass: '#9ab8d0', cols: [5, 5], rows: [4, 6],
    crown: [{ t: 'petals' }] },
  iberdrola: { name: 'Torre Iberdrola', color: '#4a6a80', trim: '#2a4050', win: 'glass', glass: '#5a8aa8', cols: [3, 4], rows: [9, 10],
    crown: [{ t: 'bullet', color: '#5a8aa8', k: 0.6 }] },
  sanmames: { name: 'San Mamés', color: '#f2f2f2', trim: '#c8c8c8', win: 'tall', facade: 'columns', glass: '#c83a3a', cols: [5, 5], rows: [4, 5],
    crown: [{ t: 'ribs', color: '#ffffff' }] },
  arriaga: { name: 'Teatro Arriaga', color: '#e8dcc0', trim: '#a8987a', win: 'arch', facade: 'balconies', cols: [4, 4], rows: [4, 6],
    crown: [{ t: 'dome', color: '#5a6a78', drumColor: '#e8dcc0', wf: 0.5, top: 'ball' }] },
  // ZARAGOZA
  pilar: { name: 'Basílica del Pilar', color: '#d4a070', trim: '#8a5a3a', win: 'arch', facade: 'brick', cols: [5, 5], rows: [5, 7],
    crown: [{ t: 'dome', color: '#3a9a6a', rib: '#f0d040', wf: 0.45, top: 'cross' },
      { t: 'tower', at: 0.08, wf: 0.18, th: 0.6, color: '#d4a070', cap: 'spire', capColor: '#4a8a6a' },
      { t: 'tower', at: 0.92, wf: 0.18, th: 0.6, color: '#d4a070', cap: 'spire', capColor: '#4a8a6a' }] },
  aljaferia: { name: 'La Aljafería', color: '#d8b888', trim: '#9a7a50', win: 'arch', facade: 'stone', cols: [4, 5], rows: [4, 5],
    crown: [{ t: 'crenels', color: '#d8b888' }, { t: 'tier', wf: 0.35, color: '#d8b888' }] },
  aguatorre: { name: 'Torre del Agua', color: '#7ac0d8', trim: '#4a8aa0', win: 'glass', glass: '#8ad0e8', cols: [3, 3], rows: [7, 9],
    crown: [{ t: 'bullet', color: '#8ad0e8', k: 0.8 }] },
  seo: { name: 'La Seo', color: '#d8b080', trim: '#8a6a40', win: 'arch', facade: 'stone', cols: [3, 4], rows: [6, 8],
    crown: [{ t: 'tower', wf: 0.6, th: 0.45, color: '#e0c090', cap: 'bell', capColor: '#5a6070' }] },
  // NUEVA YORK
  empire: { name: 'Empire State', color: '#cfc7b4', trim: '#8a8270', win: 'tall', facade: 'stone', glass: '#4a6a8a', cols: [4, 5], rows: [8, 10],
    crown: [{ t: 'steps', n: 3, color: '#cfc7b4', spire: true }] },
  chrysler: { name: 'Chrysler Building', color: '#bcc2c8', trim: '#6a7078', win: 'rect', facade: 'stone', cols: [3, 4], rows: [8, 10],
    crown: [{ t: 'chrysler', color: '#c8ccd4' }] },
  flatiron: { name: 'Flatiron', color: '#e2d2b4', trim: '#a08a62', win: 'arch', facade: 'stone', cols: [3, 3], rows: [6, 8],
    crown: [{ t: 'cornice', color: '#e2d2b4' }] },
  wtc: { name: 'One World Trade Center', color: '#7aa0c0', trim: '#4a6a88', win: 'glass', glass: '#8ab4d4', cols: [4, 4], rows: [9, 10],
    crown: [{ t: 'point', color: '#8ab4d4' }] },
  // TOKIO
  tokyotower: { name: 'Tokyo Tower', color: '#e8501e', trim: '#f4f4f4', win: 'lattice', cols: [4, 5], rows: [5, 7],
    crown: [{ t: 'lattice', color: '#e8501e', bands: '#f4f4f4', deck: '#f4f4f4', wb: 0.75, decks: [0.35] }] },
  skytree: { name: 'Tokyo Skytree', color: '#e4eaf0', trim: '#8aa0b8', win: 'lattice', cols: [3, 3], rows: [7, 10],
    crown: [{ t: 'lattice', color: '#d8e2ee', deck: '#6a7a90', wb: 0.6, curve: 1.2, decks: [0.3, 0.55] }] },
  pagoda: { name: 'Pagoda de Sensō-ji', color: '#b8322a', trim: '#e8c040', win: 'rect', glass: '#2a2a2a', cols: [3, 4], rows: [4, 6],
    crown: [{ t: 'pagoda', n: 4 }] },
  cocoon: { name: 'Mode Gakuen Cocoon', color: '#4a7aa8', trim: '#2a4a70', win: 'glass', glass: '#5a8ab8', facade: 'diag', cols: [3, 4], rows: [8, 10],
    crown: [{ t: 'bullet', color: '#5a8ab8', ribs: 'diag', k: 0.7 }] },
  // PARÍS
  eiffel: { name: 'Torre Eiffel', color: '#9a7450', trim: '#6a4a2c', win: 'lattice', cols: [5, 5], rows: [5, 6],
    crown: [{ t: 'lattice', color: '#a07a52', deck: '#c8a070', wb: 0.8, decks: [0.25, 0.5] }] },
  notredame: { name: 'Notre-Dame', color: '#d6ccb4', trim: '#8a8068', win: 'arch', facade: 'stone', cols: [4, 5], rows: [5, 7],
    crown: [{ t: 'twin', color: '#d6ccb4', rose: true, spire: true }] },
  haussmann: { name: 'Edificio Haussmann', color: '#ece2cc', trim: '#a8987a', win: 'rect', facade: 'balconies', cols: [4, 5], rows: [5, 6],
    crown: [{ t: 'mansard' }] },
  sacre: { name: 'Sacré-Cœur', color: '#f4f0e6', trim: '#bcb4a0', win: 'arch', facade: 'stone', cols: [4, 5], rows: [5, 7],
    crown: [{ t: 'dome', color: '#f4f0e6', rib: '#c8c0ac', drumColor: '#f4f0e6', wf: 0.5, tall: 0.75, top: 'cross' },
      { t: 'dome', at: 0.15, color: '#f4f0e6', rib: '#c8c0ac', drumColor: '#f4f0e6', wf: 0.25, tall: 0.7, drum: false, top: 'cross' },
      { t: 'dome', at: 0.85, color: '#f4f0e6', rib: '#c8c0ac', drumColor: '#f4f0e6', wf: 0.25, tall: 0.7, drum: false, top: 'cross' }] },
  // LONDRES
  bigben: { name: 'Big Ben', color: '#cbb68a', trim: '#7a6a44', win: 'arch', facade: 'stone', cols: [3, 3], rows: [7, 10],
    crown: [{ t: 'tower', wf: 0.95, th: 0.38, color: '#d4c094', clock: true, cap: 'spire', capColor: '#3a4048' }] },
  gherkin: { name: 'The Gherkin', color: '#2a4a6a', trim: '#1a2a40', win: 'glass', glass: '#3a6a90', facade: 'diag', cols: [3, 4], rows: [7, 9],
    crown: [{ t: 'bullet', color: '#3a6a90', ribs: 'diag', k: 0.9 }] },
  shard: { name: 'The Shard', color: '#9ab8d0', trim: '#6a8aa0', win: 'glass', glass: '#a8c8e0', cols: [4, 4], rows: [8, 10],
    crown: [{ t: 'point', color: '#a8c8e0', jagged: true }] },
  towerbridge: { name: 'Tower Bridge', color: '#c8b896', trim: '#3a5a8a', win: 'arch', facade: 'stone', cols: [4, 4], rows: [6, 8],
    crown: [{ t: 'turrets', at: [0.06, 0.38, 0.62, 0.94], color: '#c8b896', capColor: '#3a4a5a' }] },
  // CHICAGO
  willis: { name: 'Willis Tower', color: '#2a2a2e', trim: '#111', win: 'glass', glass: '#3a3a44', cols: [4, 5], rows: [9, 10],
    crown: [{ t: 'steps', n: 2, color: '#2a2a2e', shrink: 0.65, at: 0.4, antennas: true, win: 'rgba(255,255,255,.1)' }] },
  hancock: { name: 'John Hancock', color: '#2e2e34', trim: '#151518', win: 'rect', glass: '#4a5060', facade: 'xbrace', cols: [4, 4], rows: [8, 10],
    crown: [{ t: 'antennas', at: [0.3, 0.7], h: 0.8 }] },
  marina: { name: 'Marina City', color: '#e0e0dc', trim: '#b0b0aa', win: 'round', glass: '#4a5a6a', facade: 'balconies', cols: [3, 3], rows: [7, 9],
    crown: [{ t: 'dome', color: '#e0e0dc', drum: false, lantern: false, wf: 1, tall: 0.18 }] },
  wrigley: { name: 'Wrigley Building', color: '#f6f4ee', trim: '#c8c4b8', win: 'rect', facade: 'columns', cols: [3, 4], rows: [6, 8],
    crown: [{ t: 'tower', wf: 0.5, th: 0.45, color: '#f6f4ee', clock: true, cap: 'cupola', capColor: '#e8e4d8' }] },
  // CIUDAD DE MÉXICO
  latino: { name: 'Torre Latinoamericana', color: '#5a7a9a', trim: '#2a3a50', win: 'glass', glass: '#6a90b8', cols: [3, 4], rows: [8, 10],
    crown: [{ t: 'steps', n: 3, color: '#5a7a9a', spire: true, spireColor: '#c8c8c8' }] },
  bellas: { name: 'Palacio de Bellas Artes', color: '#f2ece0', trim: '#b8ac94', win: 'arch', facade: 'columns', cols: [5, 5], rows: [4, 6],
    crown: [{ t: 'dome', color: '#e8a030', rib: '#c84a20', drumColor: '#f2ece0', wf: 0.5, tall: 0.7, top: 'statue' },
      { t: 'dome', at: 0.12, color: '#e8a030', drum: false, lantern: false, wf: 0.2, tall: 0.6 },
      { t: 'dome', at: 0.88, color: '#e8a030', drum: false, lantern: false, wf: 0.2, tall: 0.6 }] },
  angel: { name: 'Ángel de la Independencia', color: '#e8e2d2', trim: '#a8a090', win: 'arch', facade: 'stone', cols: [3, 3], rows: [4, 5],
    crown: [{ t: 'column' }] },
  catedral: { name: 'Catedral Metropolitana', color: '#b8a088', trim: '#7a6450', win: 'arch', facade: 'stone', cols: [5, 5], rows: [5, 6],
    crown: [{ t: 'twin', color: '#b8a088', cap: 'bell', th: 0.5 }] },
  // BUENOS AIRES
  obelisco: { name: 'Obelisco', color: '#f0ece2', trim: '#b8b0a0', win: 'tall', glass: '#5a6a7a', cols: [3, 3], rows: [5, 7],
    crown: [{ t: 'obelisk' }] },
  barolo: { name: 'Palacio Barolo', color: '#e0d2b4', trim: '#9a8a68', win: 'arch', facade: 'balconies', cols: [4, 4], rows: [7, 9],
    crown: [{ t: 'tower', wf: 0.5, th: 0.35, color: '#e0d2b4', cap: 'lighthouse', capColor: '#e0d2b4' }] },
  rosada: { name: 'Casa Rosada', color: '#e8a8a0', trim: '#b87068', win: 'arch', facade: 'balconies', cols: [5, 5], rows: [4, 5],
    crown: [{ t: 'mansard', color: '#6a6a72' }] },
  congreso: { name: 'Congreso', color: '#e4dccc', trim: '#a89c84', win: 'arch', facade: 'columns', cols: [4, 5], rows: [5, 6],
    crown: [{ t: 'dome', color: '#5a9a7a', rib: '#3a6a50', wf: 0.55, tall: 0.75, top: 'ball' }] },
  // ROMA
  coliseo: { name: 'Coliseo', color: '#d9c49a', trim: '#9a8460', win: 'arcade', facade: 'stone', cols: [5, 5], rows: [4, 5],
    crown: [{ t: 'ruin', color: '#d9c49a' }] },
  panteon: { name: 'Panteón', color: '#cfc2a4', trim: '#8a7e64', win: 'arcade', facade: 'columns', cols: [4, 5], rows: [4, 5],
    crown: [{ t: 'dome', color: '#8a8478', drum: false, wf: 0.85, tall: 0.35, lantern: false }, { t: 'pediment', color: '#d8ccb0' }] },
  sanpedro: { name: 'Basílica de San Pedro', color: '#e8dcc4', trim: '#a8987a', win: 'arch', facade: 'columns', cols: [5, 5], rows: [5, 6],
    crown: [{ t: 'dome', color: '#8aa0b0', rib: '#e8e4d8', wf: 0.55, tall: 0.8, top: 'cross' }] },
  santangelo: { name: "Castel Sant'Angelo", color: '#c8b08a', trim: '#8a7454', win: 'arch', facade: 'brick', cols: [4, 4], rows: [5, 6],
    crown: [{ t: 'crenels', color: '#c8b08a' }, { t: 'tier', wf: 0.5, color: '#c8b08a' }, { t: 'column' }] },
  // BERLÍN
  fernsehturm: { name: 'Fernsehturm', color: '#d0d0d4', trim: '#9a9aa0', win: 'tall', glass: '#4a5060', cols: [3, 3], rows: [5, 7],
    crown: [{ t: 'needle' }] },
  brandenburgo: { name: 'Puerta de Brandeburgo', color: '#dccca4', trim: '#9a8a64', win: 'tall', glass: '#2a2a2a', facade: 'columns', cols: [5, 5], rows: [4, 5],
    crown: [{ t: 'pediment', color: '#dccca4', flat: true, quadriga: true }] },
  reichstag: { name: 'Reichstag', color: '#cfc6b0', trim: '#8a8068', win: 'rect', facade: 'stone', cols: [5, 5], rows: [4, 6],
    crown: [{ t: 'dome', color: '#9ab8d0', glass: true, drum: false, wf: 0.6, tall: 0.6, lantern: false },
      { t: 'turrets', at: [0.06, 0.94], color: '#cfc6b0', capColor: '#cfc6b0' }] },
  dom: { name: 'Catedral de Berlín', color: '#d0c4a8', trim: '#8a7e64', win: 'arch', facade: 'stone', cols: [4, 5], rows: [5, 6],
    crown: [{ t: 'dome', color: '#4a8a6a', rib: '#2a5a40', wf: 0.55, tall: 0.75, top: 'cross' }] },
};

const CITY_DATA = [
  { name: 'BARCELONA', lm: ['sagrada', 'batllo', 'glories', 'agbar_pedrera'] },
  { name: 'MADRID', lm: ['metropolis', 'alcala', 'espana', 'picasso'] },
  { name: 'VALENCIA', lm: ['miguelete', 'artes', 'serranos', 'mercado'] },
  { name: 'SEVILLA', lm: ['giralda', 'toro', 'plaza', 'torresev'] },
  { name: 'BILBAO', lm: ['guggen', 'iberdrola', 'arriaga', 'sanmames'] },
  { name: 'ZARAGOZA', lm: ['pilar', 'seo', 'aguatorre', 'aljaferia'] },
  { name: 'NUEVA YORK', lm: ['empire', 'flatiron', 'chrysler', 'wtc'] },
  { name: 'TOKIO', lm: ['tokyotower', 'pagoda', 'skytree', 'cocoon'] },
  { name: 'PARÍS', lm: ['eiffel', 'notredame', 'haussmann', 'sacre'] },
  { name: 'LONDRES', lm: ['bigben', 'towerbridge', 'gherkin', 'shard'] },
  { name: 'CHICAGO', lm: ['willis', 'wrigley', 'hancock', 'marina'] },
  { name: 'CIUDAD DE MÉXICO', lm: ['latino', 'bellas', 'angel', 'catedral'] },
  { name: 'BUENOS AIRES', lm: ['obelisco', 'rosada', 'barolo', 'congreso'] },
  { name: 'ROMA', lm: ['coliseo', 'sanpedro', 'panteon', 'santangelo'] },
  { name: 'BERLÍN', lm: ['fernsehturm', 'brandenburgo', 'dom', 'reichstag'] },
];

const CROWN_H = { sagrada: 150, eiffel: 210, tokyotower: 170, skytree: 170, giralda: 115, bigben: 125, obelisco: 130,
  fernsehturm: 150, angel: 110, empire: 115, chrysler: 115, wtc: 120, shard: 105, miguelete: 100, latino: 100,
  willis: 100, hancock: 90, pilar: 100, glories: 80, sacre: 90, sanpedro: 90, santangelo: 110, notredame: 110 };
Object.entries(CROWN_H).forEach(([k, v]) => { LANDMARKS[k].crownH = v; });

function drawLandmarkCrown(c, b, R) {
  const H = Math.max(18, Math.min(R - 52, b.style.crownH || 100));
  for (const s of b.style.crown || []) {
    const fn = CROWNS[s.t];
    if (fn) fn(c, b.x, R, b.w, H, s);
  }
}
