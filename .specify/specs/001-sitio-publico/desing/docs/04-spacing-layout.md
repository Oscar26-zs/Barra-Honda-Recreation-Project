# 04 — Espaciado y layout

## Breakpoints (Tailwind v4 default — sin override en `@theme`)

| Prefijo | Min-width |
|---|---|
| `sm:` | 640px |
| `md:` | 768px |
| `lg:` | 1024px |
| `xl:` | 1280px — **reservado exclusivamente para el breakpoint desktop del Nav** (`hidden xl:flex`). No se usa para nada más en el sitio. |
| `min-[420px]:` | breakpoint arbitrario usado una sola vez, en el H1 de Inscríbete, para suavizar el salto entre `text-4xl` y `sm:text-6xl` |

Filosofía: **mobile-first**, 2-3 pasos de escala por elemento (nunca más de 4), casi siempre `base → sm → md` o `base → sm → md → lg`.

## Contenedores (ancho máximo + centrado)

| Clase | Uso |
|---|---|
| `max-w-3xl mx-auto` | Formularios angostos: Inscríbete, Consultar, FAQ |
| `max-w-5xl mx-auto` | Contenido del Hero |
| `max-w-6xl mx-auto` | Secciones de contenido de Inicio (Sobre la ruta, Inclusiones, Experiencia, Mapa, Reglamento), Historial, Patrocinar |
| `max-w-7xl mx-auto` | Galería, Nav, Footer |

Padding horizontal del contenedor: casi siempre `px-6`; en Inscríbete (tras el ajuste de responsividad) es `px-4 sm:px-6` para ganar unos px extra en pantallas muy angostas.

## Padding vertical de sección (`<section>`)

Patrón fijo para **todas** las secciones de contenido de Inicio:

```
py-16 sm:py-20 md:py-24
```

Excepciones: el Hero usa `min-h-[80vh] sm:min-h-[85vh]` (altura, no padding) y `py-20 sm:py-24` en su contenedor interno; `RouteAnimationSection` (la franja de la ruta animada) usa `h-36 sm:h-44 md:h-52` (altura fija, no padding).

## Padding de tarjetas / cards (`bg-cloud` / `bg-paper` boxes)

Progresión responsive estándar usada en Inscríbete, Consultar, tarjetas de Experiencia/Reglamento:

```
p-5 sm:p-6 md:p-8      /* card de formulario grande */
p-3 sm:p-4             /* tile compacto (inclusiones mobile) */
p-4 lg:p-5              /* card info de ruta (Mapa y perfil) */
p-6 sm:p-7              /* card de Experiencia (desktop) */
```

## Bordes y separadores

- Borde estándar de card: `border border-river/20` (claro) — el par oscuro equivalente no usa borde sólido en la mayoría de tarjetas oscuras, prefiere `border-l-2 border-river/25` (Reglamento desktop) o `bg-river/10` como "grid gap" entre celdas (truco de `gap-px bg-river/10` + celdas `bg-abyss`/`bg-cloud` para simular líneas de 1px).
- Divisores de header de card: `pb-4 border-b border-river/15`.
- Hairline decorativo (footer, elevación del perfil de ruta): un `<svg>` de 20-32px de alto con un `<path>` tipo "electrocardiograma" a `opacity-30`/`opacity-40`, color `river` o `sky` — ver [05-components.md](05-components.md).

## Gaps de grid

- Formularios en 2 columnas: `grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5` (Inscríbete) — el breakpoint de colapso a 2 columnas es `sm:`, no `md:`, tras el ajuste de responsividad de esta sesión.
- Bento grid de inclusiones (desktop): `grid grid-cols-4 auto-rows-[136px] gap-4`.
- Grid de tarjetas de Experiencia/Reglamento: `grid grid-cols-2 gap-4 sm:gap-5` / `grid-cols-2 lg:grid-cols-3 gap-px` (grid-de-líneas, ver arriba).

## z-index / stacking

Regla usada consistentemente: cualquier elemento decorativo de fondo (glow, líneas SVG, overlay de imagen) es `absolute inset-0` **sin** `position` explícito de stacking extra — el contenido real de la sección siempre está envuelto en un `<div className="relative">` hermano *después* en el DOM, de forma que pinta encima por la regla CSS "los elementos posicionados pintan después, en orden de aparición, entre hermanos posicionados". Nunca se usa `z-index` numérico salvo casos puntuales: `z-10` (flechas/dots del carrusel de Komoot sobre el iframe), `z-40`/`z-50` (overlay de nav mobile, lightbox de galería), `z-20` (ya no se usa tras revertir el patrón de overlay del FAQ — ver [07-interactivity.md](07-interactivity.md)).

## Astro — nada cambia

Todo lo anterior son utilidades de Tailwind puro aplicadas vía `class=""` en los `.astro` (en vez de `className=""` de JSX) — la migración es literalmente buscar/reemplazar `className` → `class`, sin tocar ningún valor.
