# 02 — Colores

Toda la paleta vive en `src/index.css` dentro de un bloque `@theme` (sintaxis nativa de Tailwind v4 — genera automáticamente utilidades `bg-*`, `text-*`, `border-*`, etc. para cada token). En Astro se copia el archivo **tal cual**, sin cambios:

```css
/* src/styles/global.css */
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,900;1,700&family=Inter:wght@300;400;500;600&display=swap');
@import 'tailwindcss';

@theme {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-poster: 'Barlow Condensed', sans-serif;

  --color-night:  #070c19;
  --color-abyss:  #0a1022;
  --color-dusk:   #0f1c32;
  --color-ridge:  #162540;
  --color-river:  #2575b2;
  --color-sky:    #3499cc;
  --color-foam:   #d8e8f3;
  --color-mist:   #6a8fa8;
  --color-pale:   #a8c4d8;

  --color-paper:  #ffffff;
  --color-cloud:  #f2f6fa;
  --color-ink:    #0a1022;
  --color-slate:  #4d6478;
}

html, body, #root {
  height: 100%;
}

body {
  background-color: #070c19;
  color: #d8e8f3;
  font-family: 'Inter', system-ui, sans-serif;
}

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(37,117,178,0.4); border-radius: 2px; }

* { scrollbar-width: thin; scrollbar-color: rgba(37,117,178,0.4) transparent; }
```

> En Astro, `#root` no existe (no hay montaje de React) — se puede dejar el selector igualmente (es inofensivo) o cambiarlo a `body` únicamente. El resto del archivo es copy-paste exacto.

## Paleta — grupo "oscuro" (dark surfaces / nav / footer / secciones night)

| Token | Hex | Uso principal |
|---|---|---|
| `night` | `#070c19` | Fondo `<body>`, fondo del Nav (`bg-night/96`), overlay del hero, fondo raíz de `App` (`bg-night`) |
| `abyss` | `#0a1022` | Fondo del Footer, fondo de `InclusionesSectionn` y `ReglamentoSection`, también = `ink` (mismo hex, tokens distintos por rol semántico) |
| `dusk` | `#0f1c32` | Gradiente intermedio en `RouteAnimationSection` (modo oscuro), hover de tarjetas de reglamento (`hover:bg-dusk/70`) |
| `ridge` | `#162540` | Separadores sutiles en menús oscuros (`text-ridge` como "·"), estado disabled de botones (`disabled:bg-ridge`) |
| `river` | `#2575b2` | **Color de marca / acento primario.** Botones CTA, bordes activos, iconos, links activos en light mode, círculo activo del stepper |
| `sky` | `#3499cc` | Acento secundario / hover del CTA (`hover:bg-sky`), texto de acento sobre fondo oscuro, iconos sobre `river` |
| `foam` | `#d8e8f3` | Texto claro principal sobre fondos oscuros (headings en dark sections, logo del nav) |
| `mist` | `#6a8fa8` | Texto secundario/tenue sobre fondo oscuro (labels, captions) |
| `pale` | `#a8c4d8` | Texto terciario sobre oscuro (párrafos secundarios, `text-pale/70`) |

## Paleta — grupo "claro" (light surfaces / formularios / cards)

| Token | Hex | Uso principal |
|---|---|---|
| `paper` | `#ffffff` | Fondo de inputs, tarjetas claras, fondo de secciones "paper" |
| `cloud` | `#f2f6fa` | Fondo de tarjetas/formularios sobre fondo `paper` (`bg-cloud`), placeholder de imágenes mientras cargan |
| `ink` | `#0a1022` | Texto principal sobre fondo claro (headings, valores) — mismo hex que `abyss` |
| `slate` | `#4d6478` | Texto secundario sobre fondo claro (párrafos, labels de formulario) |

## Reglas de uso (contraste)

- **Sobre fondo oscuro** (`night`/`abyss`/`dusk`): headings en `foam`, texto secundario en `mist` o `pale/70`, acentos en `sky`.
- **Sobre fondo claro** (`paper`/`cloud`): headings en `ink`, texto secundario en `slate`, acentos en `river`.
- Los bordes casi nunca son sólidos: se usan variantes con opacidad de `river`, ej. `border-river/20`, `border-river/15`, `border-river/25`, `hover:border-river/50` — esto da el efecto de "línea muy sutil" consistente en todo el sitio (cards, inputs, dividers).
- Errores de validación: **no** son tokens custom, usan la paleta de Tailwind estándar — `border-red-500/60`, `text-red-600`, `bg-red-50`/`text-red-700`/`border-red-300` (estado "rechazada" en Consultar), `bg-amber-50`/`text-amber-700`/`border-amber-300` (estado "pendiente"), `bg-emerald-50`/`text-emerald-700`/`border-emerald-300` (estado "aprobada").

## Botón primario (patrón de color más repetido del sitio)

```
bg-river hover:bg-sky text-white
```
Aparece en: CTA del Hero, submit de Inscríbete, submit de Patrocinar, submit de Consultar, botón "Siguiente" del stepper, filtros activos de Galería.
