# Messi Cup 🏆 — Infinite Side-Scrolling Runner

🎮 **[¡Hacé clic acá para jugar en vivo!](https://gallarfa.github.io/juego_messi_cup/)**

Este repositorio contiene el código fuente de **Messi Cup**, una aplicación de entretenimiento interactiva web estilo "Chrome Dino" desarrollada en JavaScript nativo. El diseño del sistema ha sido estructurado siguiendo estándares de ingeniería de software para priorizar el rendimiento, la accesibilidad móvil y una jugabilidad fluida a 60 FPS.

---

## 📊 Especificación de Análisis y Diseño de Sistemas

### 1. Definición del Problema y Objetivos
El objetivo principal del proyecto fue desarrollar un videojuego web temático con baja latencia y huella de memoria reducida, capaz de ser ejecutado en cualquier navegador moderno sin necesidad de descargas o plugins externos. 
Como requerimiento crítico, el sistema debía responder de manera fluida en dispositivos móviles con pantallas de baja gama, lo que exigió una optimización agresiva en las rutinas de renderizado gráfico.

### 2. Arquitectura de Software
El desarrollo implementa un patrón de diseño desacoplado centrado en la separación de responsabilidades:
*   **Estructura (DOM/HTML5):** Enrutado semántico mínimo mediante un lienzo `<canvas>` dinámico.
*   **Presentación (CSS3 Moderno):** Estilos fluidos adaptativos de tipo *Glassmorphic* con media queries responsivas.
*   **Motor Lógico (JavaScript ES6+):** Control del bucle principal de juego, físicas, generación de obstáculos y detección de colisiones.

---

## 🛠️ Especificaciones Técnicas y Algoritmos

### 1. Motor de Físicas y Cinemática
El movimiento del personaje (Messi) está regido por ecuaciones de física cinemática de aceleración constante en el eje vertical (\(y\)):
*   **Gravedad Aplicada:** \(g = 0.62\)
*   **Impulso de Salto Inicial:** \(V_0 = -12.5\)
*   **Salto Variable en Altura:** El sistema lee en tiempo real el evento de mantener presionada la tecla (o pantalla táctil). Si el jugador mantiene pulsado el botón, se reduce temporalmente el factor de gravedad aplicado a la velocidad de ascenso, permitiendo controlar la altura máxima del salto de manera dinámica.

### 2. Algoritmo de Detección de Colisiones
Se implementa una validación geométrica de tipo **AABB (Axis-Aligned Bounding Box)** para determinar contactos entre la caja de colisión del jugador y los obstáculos (defensores contrarios, tarjetas rojas):
\[
\text{Colisión} = (X_1 < X_2 + W_2) \land (X_1 + W_1 > X_2) \land (Y_1 < Y_2 + H_2) \land (Y_1 + H_1 > Y_2)
\]
Para mejorar la experiencia del usuario (UX) y evitar frustración por colisiones injustas, la caja de colisión real del jugador se reduce en un 12% con respecto al sprite dibujado (*Hitbox padding*).

### 3. Síntesis de Sonido Procedural (Web Audio API)
Para evitar la carga de archivos de audio tradicionales (`.mp3` o `.wav`) que aumentan los tiempos de carga iniciales y consumen ancho de banda, el juego genera sus propios efectos de sonido en tiempo real utilizando osciladores y nodos de ganancia de la **Web Audio API**:
*   **Salto:** Onda triangular con rampa exponencial de frecuencia de 150 Hz a 700 Hz.
*   **Pérdida (Game Over):** Onda senoidal modulada mediante un vibrato oscilante de 35 Hz.

### 4. Optimizaciones Críticas para Dispositivos Móviles (Performance Spec)
Tras un análisis de cuellos de botella de hardware en teléfonos de gama media y baja, se implementaron dos optimizaciones determinantes:
*   **Renderizado de Sombras Inteligente:** Las sombras y efectos luminosos tipo neón (`ctx.shadowBlur` y `ctx.shadowColor`) son altamente costosos en memoria GPU en celulares. El sistema detecta dispositivos móviles en su inicio (`isMobile`) y deshabilita por completo el desenfoque de sombras en Canvas 2D en dichos entornos.
*   **Bypass de Filtro CSS (Backdrop-Filter):** Se remueve el filtro de desenfoque de fondo en pantallas móviles dentro de [style.css](style.css) para evitar el re-renderizado continuo de la página (repaints), logrando que el juego pase de 22 FPS a **60 FPS estables**.

---

## 🎮 Controles y Guía de Uso

| Plataforma | Acción | Input |
|---|---|---|
| **Escritorio (PC)** | Saltar | Barra Espaciadora (`Space`) / Flecha Arriba (`↑`) |
| **Móviles** | Saltar | Tocar cualquier punto del botón de salto inferior en pantalla |

---

## 📂 Estructura del Código

```text
messi-runner/
├── index.html        # Estructura de visualización y contenedor del Canvas
├── style.css         # Especificaciones de diseño visual responsive y animaciones
├── script.js         # Lógica del motor, bucle de animación e inicializador físico
└── README.md         # Documentación de Ingeniería y Análisis de Sistemas
```

---

**Fernando Gallardo**  
*Analista de Sistemas & Desarrollador Full Stack*
