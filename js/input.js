'use strict';
// Entrada: un solo teclado compartido para 2 jugadores + mandos (Gamepad API).
// Se usa event.code, que es la posición física de la tecla: funciona igual
// en teclados españoles (QWERTY ES), ingleses, etc.
const Input = (() => {
  const KEYMAPS = [
    { // Jugador 1: flechas + K/L (o teclado numérico 1/2, o Ctrl/Shift derechos)
      left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
      punch: ['KeyK', 'Numpad1', 'ControlRight'], jump: ['KeyL', 'Numpad2', 'ShiftRight'],
    },
    { // Jugador 2: mano izquierda, W A S D + F/G
      left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
      punch: ['KeyF'], jump: ['KeyG'],
    },
  ];
  const LABELS = [
    { move: '← ↑ → ↓', punch: 'K', jump: 'L' },
    { move: 'W A S D', punch: 'F', jump: 'G' },
  ];
  const ACTIONS = ['left', 'right', 'up', 'down', 'punch', 'jump', 'start'];
  const GAME_KEYS = new Set(['Space', 'Enter', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
  KEYMAPS.forEach(m => Object.values(m).forEach(list => list.forEach(k => GAME_KEYS.add(k))));

  const down = new Set();
  const justDown = new Set();
  const players = [0, 1].map(() => ({ cur: {}, prev: {} }));
  let swapPads = false;
  let numPlayers = 1;
  let padCount = 0;
  let anyPadPressed = false;

  const typing = e => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
  window.addEventListener('keydown', e => {
    if (typing(e)) return; // escribiendo el nombre: las teclas no controlan el juego
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!e.repeat) justDown.add(e.code);
    down.add(e.code);
  });
  window.addEventListener('keyup', e => { down.delete(e.code); });
  window.addEventListener('blur', () => down.clear());

  function readPad(pad) {
    const c = {};
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    const b = i => !!(pad.buttons[i] && pad.buttons[i].pressed);
    c.left = ax < -0.45 || b(14);
    c.right = ax > 0.45 || b(15);
    c.up = ay < -0.5 || b(12);
    c.down = ay > 0.5 || b(13);
    c.jump = b(0) || b(3);             // A / Cruz  (o Y / Triángulo)
    c.punch = b(2) || b(1) || b(5) || b(7); // X / Cuadrado, B / Círculo, RB, RT
    c.start = b(9) || b(8);            // Start / Select
    return c;
  }

  function poll() {
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(p => p && p.connected) : [];
    padCount = pads.length;
    anyPadPressed = false;
    // Con 2 jugadores y un solo mando, el mando va al jugador 2 (el 1 tiene las flechas).
    let assign = pads.length >= 2 ? [pads[0], pads[1]]
      : numPlayers === 2 ? [null, pads[0] || null] : [pads[0] || null, null];
    if (swapPads) assign = [assign[1], assign[0]];
    for (let i = 0; i < 2; i++) {
      const p = players[i];
      p.prev = p.cur;
      const c = {};
      for (const a of ACTIONS) c[a] = !!(KEYMAPS[i][a] && KEYMAPS[i][a].some(k => down.has(k) || justDown.has(k)));
      if (typeof TouchPad !== 'undefined' && TouchPad.enabled) {
        const t = TouchPad.state(i);
        for (const a in t) c[a] = c[a] || t[a];
      }
      const pad = assign[i];
      if (pad) {
        const pc = readPad(pad);
        for (const a of ACTIONS) c[a] = c[a] || pc[a];
        if (pc.jump || pc.punch || pc.start) anyPadPressed = true;
      }
      p.cur = c;
    }
  }

  function endFrame() { justDown.clear(); }

  return {
    LABELS,
    poll, endFrame,
    held: (i, a) => !!players[i].cur[a],
    pressed: (i, a) => !!players[i].cur[a] && !players[i].prev[a],
    key: code => justDown.has(code),
    keyHeld: code => down.has(code),
    anyKey: () => justDown.size > 0,
    get padCount() { return padCount; },
    get swapPads() { return swapPads; },
    set swapPads(v) { swapPads = v; },
    set numPlayers(n) { numPlayers = n; },
    get anyPadPressed() { return anyPadPressed; },
  };
})();
