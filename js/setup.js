'use strict';
// Pantalla de preparación: cada jugador elige monstruo y se hace una foto con la webcam.
const Setup = (() => {
  const $ = id => document.getElementById(id);
  const root = $('setup'), video = $('video'), shot = $('shot'), countdownEl = $('countdown');
  const flashEl = $('flash'), camMsg = $('camMsg'), pick = $('monsterPick'), hint = $('setupHint');
  const preview = $('monsterPreview'), pctx = preview.getContext('2d');
  const btnPhoto = $('btnPhoto'), btnRetake = $('btnRetake'), btnOk = $('btnOk');
  const btnNoPhoto = $('btnNoPhoto'), fileInput = $('fileInput');

  let stream = null, camOK = false, active = false;
  let idx = 0, total = 1, data = null, onDone = null;
  let counting = false, liveFace = null, liveT = 0, time = 0;

  async function startCamera() {
    if (stream) return;
    camMsg.textContent = 'Activando cámara…';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      camMsg.textContent = 'Este navegador no permite usar la cámara aquí. Prueba a abrir el juego desde https:// o localhost, o sube una imagen.';
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false,
      });
      if (!active) { stopCamera(); return; }
      video.srcObject = stream;
      await video.play().catch(() => {});
      camOK = true;
      camMsg.textContent = '';
    } catch (e) {
      camOK = false;
      camMsg.textContent = 'No se pudo acceder a la cámara (' + (e.name || 'error') + '). Puedes subir una imagen o jugar sin foto.';
    }
    refresh();
  }

  function stopCamera() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null; camOK = false;
    video.srcObject = null;
  }

  function open(numPlayers, setupData, cb) {
    total = numPlayers; data = setupData; idx = 0; onDone = cb; active = true;
    data.forEach(d => { if (d.faceSource === 'none') d.faceSource = null; });
    root.classList.remove('hidden');
    startCamera();
    renderPlayer();
  }

  function close() {
    active = false;
    root.classList.add('hidden');
    stopCamera();
  }

  function renderPlayer() {
    const d = data[idx];
    root.style.setProperty('--pc', PLAYER_COLORS[idx]);
    $('setupTitle').textContent = 'JUGADOR ' + (idx + 1);
    pick.innerHTML = '';
    MONSTERS.forEach((m, mi) => {
      const el = document.createElement('div');
      el.className = 'mcard' + (mi === d.monster ? ' sel' : '');
      el.innerHTML = `<span class="dot" style="background:${m.body}"></span><b>${m.name}</b>${m.species}`;
      el.onclick = () => { d.monster = mi; Sound.play('select'); renderPlayer(); };
      pick.appendChild(el);
    });
    const L = Input.LABELS[idx];
    hint.innerHTML =
      `Cambiar monstruo: <kbd>${idx === 0 ? 'A' : '←'}</kbd> <kbd>${idx === 0 ? 'D' : '→'}</kbd><br>` +
      `Foto: <kbd>${L.punch}</kbd> o <kbd>Espacio</kbd> · Listo: <kbd>${L.jump}</kbd> o <kbd>Enter</kbd><br>` +
      `<small>Con mando: X/□ = foto · A/✕ = listo</small>`;
    btnOk.textContent = idx < total - 1 ? '✔ ¡LISTO! → Jugador 2' : '✔ ¡A DESTROZAR!';
    refresh();
  }

  function refresh() {
    const d = data[idx];
    const hasShot = !!d.face && d.faceSource !== 'none';
    shot.style.display = hasShot ? 'block' : 'none';
    if (hasShot) {
      const s = shot.getContext('2d');
      s.fillStyle = '#111'; s.fillRect(0, 0, shot.width, shot.height);
      s.drawImage(d.face, 40, 40, 240, 240);
    }
    btnPhoto.disabled = !camOK || counting;
    btnRetake.disabled = !hasShot;
  }

  function takePhoto() {
    if (!camOK || counting) return;
    data[idx].face = null; data[idx].faceSource = null;
    refresh();
    counting = true; btnPhoto.disabled = true;
    let n = 3;
    countdownEl.textContent = n; Sound.play('beep');
    const iv = setInterval(() => {
      n--;
      if (n > 0) { countdownEl.textContent = n; Sound.play('beep'); return; }
      clearInterval(iv);
      countdownEl.textContent = '';
      const face = faceFromVideo(video);
      counting = false;
      if (!face || !active) { refresh(); return; }
      data[idx].face = face; data[idx].faceSource = 'camera';
      Sound.play('shutter');
      flashEl.classList.add('on');
      setTimeout(() => flashEl.classList.remove('on'), 60);
      refresh();
    }, 700);
  }

  function retake() {
    data[idx].face = null; data[idx].faceSource = null;
    refresh();
  }

  function noPhoto() {
    data[idx].face = null; data[idx].faceSource = 'none';
    Sound.play('select');
    next();
  }

  function next() {
    if (counting) return;
    Sound.play('confirm');
    idx++;
    if (idx < total) { renderPlayer(); return; }
    close();
    onDone && onDone();
  }

  function changeMonster(dir) {
    const d = data[idx];
    d.monster = (d.monster + dir + MONSTERS.length) % MONSTERS.length;
    Sound.play('select');
    renderPlayer();
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      data[idx].face = faceFromImage(img); data[idx].faceSource = 'file';
      URL.revokeObjectURL(img.src);
      Sound.play('shutter');
      refresh();
    };
    img.src = URL.createObjectURL(file);
    fileInput.value = '';
  });
  const click = (el, fn) => el.addEventListener('click', e => { Sound.init(); el.blur(); fn(); });
  click(btnPhoto, takePhoto);
  click(btnRetake, retake);
  click(btnNoPhoto, noPhoto);
  click(btnOk, next);

  // Llamado en cada frame desde el bucle principal.
  function update(dt) {
    if (!active) return;
    time += dt;
    const i = idx;
    if (Input.pressed(i, 'punch') || Input.key('Space')) takePhoto();
    else if (Input.pressed(i, 'jump') || Input.key('Enter')) next();
    else if (Input.pressed(i, 'left')) changeMonster(-1);
    else if (Input.pressed(i, 'right')) changeMonster(1);
    else if (Input.key('Escape')) { close(); onDone && onDone(true); return; }
    drawPreview(dt);
  }

  // Vista previa del monstruo con la cara (en directo desde la cámara si aún no hay foto).
  function drawPreview(dt) {
    if (!active || !data) return;
    const d = data[idx];
    const m = MONSTERS[d.monster];
    let face = d.face;
    if (!face && camOK && d.faceSource !== 'none') {
      liveT -= dt;
      if (liveT <= 0 || !liveFace) { liveFace = faceFromVideo(video) || liveFace; liveT = 0.08; }
      face = liveFace;
    }
    if (!face) face = m._defaultFace || (m._defaultFace = defaultFace(m));
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, preview.width, preview.height);
    pctx.setTransform(1.75, 0, 0, 1.75, 0, 0);
    const punch = (time % 1.6) > 1.3;
    drawMonster(pctx, {
      x: 68, y: 132, f: 1, state: 'ground', anim: time * 6,
      punchT: punch ? 0.1 : 0, punchDir: 'side', hurtT: 0, eatT: 0, m, face,
    }, time);
  }

  return { open, close, update, get active() { return active; } };
})();
