'use strict';
// Sonido sintetizado con WebAudio (sin archivos externos).
const Sound = (() => {
  let ac = null, master = null, sfxGain = null, musicGain = null, noiseBuf = null;
  let muted = false, musicTimer = null, nextNote = 0, step = 0;

  // Safari (Mac/iPhone) solo deja sonar el audio si el AudioContext se crea o se
  // reanuda dentro de un gesto del usuario, y a veces lo pasa a "suspended" o
  // "interrupted" (al cambiar de pestaña, de salida de audio…). Por eso, en CADA
  // gesto se intenta reanudar y se reproduce un búfer silencioso de desbloqueo.
  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ac) {
      try { ac = new AC({ latencyHint: 'interactive' }); } catch (e) { ac = new AC(); }
      master = ac.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ac.destination);
      sfxGain = ac.createGain(); sfxGain.gain.value = 1; sfxGain.connect(master);
      musicGain = ac.createGain(); musicGain.gain.value = 0.32; musicGain.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state !== 'running') {
      try {
        const b = ac.createBuffer(1, 1, 22050);
        const src = ac.createBufferSource();
        src.buffer = b; src.connect(ac.destination); src.start(0);
      } catch (e) { /* nada */ }
      const r = ac.resume && ac.resume();
      if (r && r.catch) r.catch(() => {});
    }
  }
  const ready = () => !!ac && ac.state === 'running';

  function tone(freq, dur, type = 'square', vol = 0.2, slideTo = null, delay = 0, out = null) {
    if (!ready()) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(out || sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.3, freq = 1000, delay = 0, out = null, q = 0.8) {
    if (!ready()) return;
    const t = ac.currentTime + delay;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(out || sfxGain);
    s.start(t, Math.random() * 0.2); s.stop(t + dur + 0.02);
  }

  const sfx = {
    swing()   { noise(0.06, 0.12, 2500); },
    punch()   { noise(0.09, 0.35, 1400); tone(140, 0.09, 'square', 0.15, 60); },
    glass()   { noise(0.18, 0.25, 6000); tone(2200, 0.08, 'triangle', 0.06, 3200); tone(1700, 0.1, 'triangle', 0.05, 2600, 0.04); },
    crack()   { noise(0.12, 0.3, 900); },
    eat()     { tone(320, 0.07, 'square', 0.15, 520); tone(240, 0.07, 'square', 0.15, 470, 0.09); tone(380, 0.1, 'square', 0.12, 700, 0.18); },
    shoot()   { noise(0.05, 0.12, 3500); },
    cannon()  { noise(0.25, 0.3, 500); tone(110, 0.2, 'sine', 0.25, 50); },
    hurt()    { tone(260, 0.12, 'sawtooth', 0.12, 120); },
    boom()    { noise(0.7, 0.55, 380); tone(90, 0.6, 'sine', 0.45, 28); },
    collapse(){ noise(1.8, 0.5, 260); noise(1.2, 0.25, 900, 0.1); },
    money()   { tone(988, 0.07, 'square', 0.12); tone(1318, 0.14, 'square', 0.12, null, 0.07); },
    select()  { tone(660, 0.06, 'square', 0.12); },
    confirm() { tone(523, 0.07, 'square', 0.13); tone(784, 0.12, 'square', 0.13, null, 0.07); },
    beep()    { tone(880, 0.12, 'square', 0.12); },
    shutter() { noise(0.05, 0.4, 7000); tone(1400, 0.04, 'square', 0.1, null, 0.05); noise(0.05, 0.3, 5000, 0.08); },
    die()     { tone(420, 0.9, 'sawtooth', 0.16, 50); },
    roar()    { noise(0.5, 0.3, 700, 0, null, 6); tone(110, 0.45, 'sawtooth', 0.18, 70); },
    level()   { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.16, 'square', 0.14, null, i * 0.12)); },
    gameover(){ [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, 'triangle', 0.2, null, i * 0.3)); },
    heli()    { noise(0.04, 0.05, 300); },
  };

  // --- Música: bucle de bajo + batería sencillo, programado con antelación ---
  const BASS = [45, 0, 45, 57, 0, 45, 55, 0, 43, 0, 43, 55, 0, 43, 53, 0,
                41, 0, 41, 53, 0, 41, 52, 0, 40, 0, 40, 52, 0, 47, 48, 50];
  const LEAD = [0, 0, 69, 0, 72, 0, 69, 0, 0, 0, 67, 0, 71, 0, 67, 0,
                0, 0, 65, 0, 69, 0, 65, 0, 64, 0, 68, 0, 71, 0, 76, 0];
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const STEP = 60 / 150 / 2; // corcheas a 150 bpm

  function schedule() {
    if (!ready()) return;
    if (nextNote < ac.currentTime) nextNote = ac.currentTime + 0.05; // tras una pausa del audio
    while (nextNote < ac.currentTime + 0.25) {
      const i = step % BASS.length;
      const t = nextNote - ac.currentTime;
      if (BASS[i]) tone(midi(BASS[i]), STEP * 0.9, 'square', 0.16, null, t, musicGain);
      if (LEAD[i] && Math.floor(step / 32) % 2 === 1) tone(midi(LEAD[i]), STEP * 0.8, 'triangle', 0.13, null, t, musicGain);
      if (i % 4 === 0) { tone(150, 0.12, 'sine', 0.35, 45, t, musicGain); }
      if (i % 8 === 4) noise(0.12, 0.22, 2500, t, musicGain);
      if (i % 2 === 1) noise(0.03, 0.08, 9000, t, musicGain);
      nextNote += STEP; step++;
    }
  }
  function startMusic() {
    if (musicTimer) return;
    nextNote = 0; step = 0;
    musicTimer = setInterval(schedule, 60);
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.55;
    return muted;
  }

  function play(name) { if (ready() && sfx[name]) sfx[name](); }

  return { init, play, startMusic, stopMusic, toggleMute, get muted() { return muted; }, get blocked() { return !ready(); } };
})();
