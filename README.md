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

## 📸 La foto
- Elige **1 o 2 jugadores**, después cada jugador (por turnos) elige su monstruo y pulsa **Hacer foto**:
  hay una cuenta atrás de 3 segundos. Pon la cara dentro del óvalo.
- Antes de hacer la foto ya ves al monstruo **con tu cara en directo**.
- Si no te gusta, **↺ Repetir**. También puedes **📁 Subir imagen** (en el móvil abre la cámara) o jugar **🙈 Sin foto**
  (el monstruo lleva una cara de monstruo de serie).
- Las fotos **no salen de tu ordenador**: se procesan en el navegador y no se guardan ni se envían a ningún sitio.

## 🎮 Controles

Los dos jugadores pueden compartir **un solo teclado**: WASD a la izquierda y flechas a la derecha,
que es el reparto habitual en los juegos de PC para 2 jugadores.

| Acción | Jugador 1 | Jugador 2 | Mando |
|---|---|---|---|
| Moverse / trepar | `W` `A` `S` `D` | `←` `↑` `→` `↓` | Stick izquierdo / cruceta |
| Golpe | `F` | `K` (o `Ctrl` dcho., o `1` del teclado numérico) | X / □ (o B / ○, RB, RT) |
| Salto | `G` | `L` (o `Shift` dcho., o `2` del teclado numérico) | A / ✕ |
| Pausa | `P` o `Esc` | `P` o `Esc` | Start |

- Golpe + **arriba**: golpe hacia arriba (para los helicópteros).
- Golpe + **abajo**: golpe bajo (para los tanques, los soldados o el suelo de una azotea).
- `M`: activar o silenciar el sonido. En la pausa, `Q` vuelve al menú.
- Las teclas van por **posición física**, así que funcionan igual con teclado español, inglés, etc.

**Mandos (Gamepad API):** conecta uno o dos mandos (Xbox, PlayStation, genéricos…) y pulsa un botón.
- Con 2 mandos: mando 1 → Jugador 1 y mando 2 → Jugador 2.
- Con 2 jugadores y 1 mando: el mando es para el Jugador 2 y el Jugador 1 usa WASD.
- En el menú, `TAB` intercambia la asignación.
- El teclado sigue funcionando aunque haya mandos conectados.

> 💡 Algunos teclados baratos no detectan muchas teclas a la vez (*ghosting*). Si a dos jugadores
> se les "atascan" teclas, prueba con las alternativas del jugador 2 o con un mando.

## 🏙️ Reglas
- **Trepa** por la fachada de los edificios (arriba sobre un edificio), muévete por ella y **rompe ventanas** a puñetazos.
  Si rompes la mitad de las ventanas, **el edificio se derrumba** (+1000).
- **Derriba todos los edificios** para destruir la ciudad y pasar al día siguiente (Barcelona, Madrid, Valencia… Tokio, Nueva York…).
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
js/setup.js       cámara, foto y elección de monstruo
js/game.js        lógica del juego (edificios, enemigos, niveles, HUD)
```

## ⚖️ Aviso
Proyecto de fans sin ánimo de lucro, inspirado en *Rampage* (Bally Midway, 1986).
No está afiliado a los titulares de esa marca. Todo el código y los gráficos son originales.
