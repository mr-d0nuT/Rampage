# 🦍 FACE RAMPAGE — ¡tu cara, tu monstruo!

Un clon del clásico arcade **Rampage** (1986) para **1 o 2 jugadores** en el navegador,
con un extra: **al empezar, cada jugador se hace una foto con la webcam y su cara pasa a ser
la cara de su monstruo** (y también la del humanito en calzoncillos que aparece cuando pierdes una vida 😅).

Hecho con HTML5 Canvas + JavaScript puro. No hace falta instalar nada ni descargar recursos externos:
los gráficos, la música y los efectos se generan por código.

## ▶️ Cómo jugar

### Opción A: GitHub Pages (recomendado)
1. En este repositorio, ve a **Settings → Pages**.
2. En *Build and deployment*, elige **Source: Deploy from a branch**, **Branch: `main`**, carpeta **`/ (root)`** y pulsa **Save**.
3. En un minuto el juego estará en `https://<tu-usuario>.github.io/face-rampage/`.

> Como GitHub Pages sirve el juego por **https**, el navegador te deja usar la webcam.

### Opción B: en local
```bash
git clone https://github.com/<tu-usuario>/face-rampage.git
cd face-rampage
python3 -m http.server 8000
# abre http://localhost:8000
```
También puedes abrir `index.html` con doble clic. El juego funciona, pero algunos navegadores
no permiten usar la cámara desde `file://`; en ese caso usa **📁 Subir imagen** o la opción B.

## 📸 La foto (con recorte automático de la cara)
- Elige **1 o 2 jugadores**, después cada jugador (por turnos) elige su monstruo y pulsa **Hacer foto**:
  hay una cuenta atrás de 3 segundos.
- La app **detecta tu cara con IA** ([MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker),
  ejecutándose en tu navegador), **recorta solo el óvalo de la cara y elimina el fondo**, y la pega en la cabeza del monstruo.
- El detector se descarga la primera vez (unos 4 MB). Sin conexión, se usa un óvalo difuminado del centro de la foto.
- Antes de hacer la foto ya ves al monstruo **con tu cara en directo**.
- Si no te gusta, **↺ Repetir**. También puedes **📁 Subir imagen** (en el móvil abre la cámara) o jugar **🙈 Sin foto**
  (el monstruo lleva una cara de monstruo de serie).
- Las fotos **no salen de tu ordenador**: se procesan en el navegador y no se guardan ni se envían a ningún sitio.

## 🎮 Controles

Los dos jugadores pueden compartir **un solo teclado**: WASD a la izquierda y flechas a la derecha,
que es el reparto habitual en los juegos de PC para 2 jugadores.

| Acción | Jugador 1 | Jugador 2 | Mando |
|---|---|---|---|
| Andar | `A` `D` | `←` `→` | Stick / cruceta |
| Trepar (junto a un **lateral** del edificio) | `W` `S` | `↑` `↓` | Stick / cruceta |
| Golpe | `F` | `K` (o `Ctrl` dcho., o `1` del teclado numérico) | X / □ (o B / ○, RB, RT) |
| Salto | `G` | `L` (o `Shift` dcho., o `2` del teclado numérico) | A / ✕ |
| Pausa | `P` o `Esc` | `P` o `Esc` | Start |

- Trepando: golpe = puñetazo a la pared; **golpe + abajo = golpe en diagonal hacia abajo**; golpe + arriba = diagonal hacia arriba.
- En la calle: golpe + arriba = hacia arriba (helicópteros); golpe + abajo = golpe bajo (tanques, soldados). En una azotea, golpe + abajo golpea el tejado.
- Trepando, pulsa hacia fuera del edificio para soltarte o salta para lanzarte.
- `M`: activar o silenciar el sonido. En la pausa, `Q` vuelve al menú.
- Las teclas van por **posición física**, así que funcionan igual con teclado español, inglés, etc.

**Mandos (Gamepad API):** conecta uno o dos mandos (Xbox, PlayStation, genéricos…) y pulsa un botón.
- Con 2 mandos: mando 1 → Jugador 1 y mando 2 → Jugador 2.
- Con 2 jugadores y 1 mando: el mando es para el Jugador 2 y el Jugador 1 usa WASD.
- En el menú, `TAB` intercambia la asignación.
- El teclado sigue funcionando aunque haya mandos conectados.

> 🔊 **Sonido en Mac / Safari:** el navegador no deja sonar nada hasta que pulsas una tecla o haces clic.
> Si ves el aviso "Pulsa una tecla o haz clic para activar el sonido", hazlo. Si solo usas mando, pulsa antes una tecla.
> Revisa también que no esté silenciado con `M`.

> 💡 Algunos teclados baratos no detectan muchas teclas a la vez (*ghosting*). Si a dos jugadores
> se les "atascan" teclas, prueba con las alternativas del jugador 2 o con un mando.

## 🏙️ Reglas (como en el original)
- Como en el Rampage de 1986, los monstruos **trepan por los laterales** de los edificios y los destrozan a puñetazos.
  Si una ventana ya está rota, el puño entra por el agujero y golpea las de dentro.
- **Daño estructural:** si dejas una planta casi sin paredes, **el edificio se derrumba** (+1000). Golpeando bien
  desde los lados y en diagonal hacia abajo se derriba en pocos golpes. Cuando cruje y se tambalea, ¡le falta poco!
- **Derriba todos los edificios** para destruir la ciudad y pasar al día siguiente.
- **Cada ciudad tiene sus edificios emblemáticos:**
  Barcelona (Sagrada Família, Casa Batlló, Torre Glòries, La Pedrera), Madrid (Metrópolis, Puerta de Alcalá, Edificio España, Torre Picasso),
  Valencia, Sevilla (Giralda, Torre del Oro…), Bilbao (Guggenheim…), Zaragoza (Pilar…), Nueva York (Empire State, Chrysler…),
  Tokio (Tokyo Tower, Skytree…), París (Torre Eiffel, Notre-Dame…), Londres (Big Ben, The Shard…), Chicago, Ciudad de México,
  Buenos Aires (Obelisco…), Roma (Coliseo, San Pedro…) y Berlín (Fernsehturm, Brandeburgo…).
- En las ventanas aparecen cosas:
  - 🙋 personas: *¡ñam!*, recuperas vida
  - 🍗 comida: más vida
  - 💰 dinero: puntos
  - 🔫 francotiradores: te disparan, pero también te los puedes comer
  - 💣 bombas y 📺 teles: ¡te hacen daño!
- **Soldados, helicópteros y tanques** te disparan. Los soldados se pueden comer y los helicópteros y los tanques se destrozan a golpes.
- En 2 jugadores también os podéis pegar entre vosotros. 😈
- Cada jugador tiene **3 vidas**. Al perder toda la energía, tu monstruo se convierte en un humano
  (con tu cara) que huye avergonzado… y después vuelves a entrar.

## 🗂️ Estructura
```
index.html        página y pantalla de foto
css/style.css     estilos
js/audio.js       música y efectos (WebAudio sintetizado)
js/input.js       teclado compartido + mandos
js/art.js         dibujo de monstruos y procesado de la foto
js/facecut.js     recorte automático de la cara (MediaPipe)
js/landmarks.js   edificios emblemáticos de cada ciudad
js/setup.js       cámara, foto y elección de monstruo
js/game.js        lógica del juego (edificios, enemigos, niveles, HUD)
```

## ⚖️ Aviso
Proyecto de fans sin ánimo de lucro, inspirado en *Rampage* (Bally Midway, 1986).
No está afiliado a los titulares de esa marca. Todo el código y los gráficos son originales.
