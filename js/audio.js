'use strict';
// Sonido sintetizado con WebAudio (sin archivos externos).
const Sound = (() => {
  let ac = null, master = null, sfxGain = null, musicGain = null, noiseBuf = null;
  let muted = false;

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
  function initAll() { init(); unlockMusic(); }

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

  // --- Banda sonora (MP3 en /music) ---
  // Se usa un único <audio> que se "desbloquea" en el primer gesto del usuario
  // (necesario en Safari/Mac e iPhone); después ya puede cambiar de canción solo.
  const TRACKS = {
    title: 'music/rampage-ost1.mp3',
    levels: ['music/rampage-ost2.mp3', 'music/boss-battle.mp3', 'music/boss-rush.mp3'],
  };
  const MUSIC_VOL = 0.55;
  const music = new Audio();
  music.loop = true; music.preload = 'auto'; music.volume = MUSIC_VOL;
  let wanted = null, musicPaused = false, unlocked = false, pending = false, refused = false;

  function syncMusic() {
    if (!wanted || musicPaused) { if (!music.paused) music.pause(); return; }
    const url = new URL(wanted, document.baseURI).href;
    if (music.src !== url) { music.src = url; music.currentTime = 0; }
    music.muted = muted;
    if (music.paused && !pending && !refused) {
      pending = true;
      const pr = music.play();
      if (pr && pr.then) pr.then(() => { pending = false; }, e => {
        pending = false;
        if (e && e.name === 'NotAllowedError') refused = true; // hasta el próximo gesto
        else setTimeout(syncMusic, 50); // p. ej. cambio de canción a medio arrancar
      });
      else pending = false;
    }
  }
  function unlockMusic() {
    refused = false;
    if (unlocked) { syncMusic(); return; }
    unlocked = true;
    if (!wanted) { // "toca" en silencio para que Safari permita reproducir luego
      music.src = new URL(TRACKS.title, document.baseURI).href;
      music.muted = true;
      const pr = music.play();
      if (pr && pr.then) pr.then(() => { if (!wanted) music.pause(); music.muted = muted; syncMusic(); }).catch(() => { unlocked = false; });
      return;
    }
    syncMusic();
  }
  // 'title' o el número de nivel (1, 2, 3…)
  function playMusic(which) {
    const t = which === 'title' ? TRACKS.title : TRACKS.levels[(which - 1) % TRACKS.levels.length];
    if (t === wanted && !musicPaused) return;
    wanted = t; musicPaused = false;
    syncMusic();
  }
  function stopMusic() { wanted = null; music.pause(); }
  function pauseMusic(p) { musicPaused = p; syncMusic(); }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.55;
    music.muted = muted;
    return muted;
  }

  function play(name) { if (ready() && sfx[name]) sfx[name](); }

  return { init: initAll, play, playMusic, stopMusic, pauseMusic, toggleMute, get muted() { return muted; }, get musicState() { return { src: music.src.split('/').pop(), paused: music.paused, t: music.currentTime | 0 }; },
    get blocked() { return !ready() || (!!wanted && music.paused && !musicPaused); } };
})();
