# 03 — Tipografía

## Fuentes

Cargadas vía Google Fonts `@import` en la primera línea de `global.css` (mismo mecanismo funciona igual en Astro, sin plugin adicional):

```css
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,900;1,700&family=Inter:wght@300;400;500;600&display=swap');
```

| Token Tailwind | Familia | Pesos cargados | Rol |
|---|---|---|---|
| `font-poster` | Barlow Condensed | 400, 600, 700, 900, 700*italic* | **Todos los headings, botones, labels de UI, cifras destacadas (countdown, total ₡).** Condensada, mayúsculas, tracking amplio — es la "voz" gráfica del sitio tipo póster de evento deportivo. |
| `font-sans` (default, no hace falta declararlo) | Inter | 300, 400, 500, 600 | Texto de cuerpo, párrafos, inputs, texto de navegación secundaria. |

`body` fija `font-family: 'Inter', system-ui, sans-serif` como base — cualquier texto sin clase `font-poster` explícita hereda Inter.

## Escalas de heading (`font-poster font-black uppercase`)

El patrón universal de un `<h1>`/`<h2>` de sección es:

```
font-poster font-black uppercase leading-none
```

Con tamaño responsive de 3 pasos (mobile → tablet → desktop). Tabla de escalas usadas literalmente en el código:

| Contexto | Clases | Ejemplo |
|---|---|---|
| H1 de página interior (Inscríbete, Consultar, Galería, Historial, Patrocinar) | `text-4xl min-[420px]:text-5xl sm:text-6xl md:text-7xl lg:text-8xl` *(Inscríbete, ya responsive-tuneado)* / `text-6xl md:text-8xl` *(el resto)* | "Inscríbete", "Consultar inscripción", "Galería" |
| H1 del Hero (dos líneas, tamaños distintos por línea) | Línea 1: `text-5xl sm:text-6xl md:text-8xl lg:text-9xl tracking-tight` · Línea 2: `text-3xl sm:text-4xl md:text-6xl lg:text-7xl tracking-wide text-sky` | "MTB El Valle" / "del Nacaome" |
| H2 de sección estándar | `text-4xl sm:text-5xl md:text-6xl` | "Todo lo que necesitas", "Mapa y perfil de la ruta", "Reglamento básico", "Todo lo que necesitas saber" |
| H2 variante grande (Sobre la ruta, mobile) | `text-4xl sm:text-5xl` | "Un evento de la comunidad..." |
| H2 variante desktop ancha (Sobre la ruta, desktop, 1 sola línea larga) | `text-5xl xl:text-6xl` | idem, layout desktop |
| H2 de step dentro de Inscríbete (`p-8` cards) | `text-lg sm:text-xl` (sin `uppercase` extra grande — es un heading de card, no de sección) | "Responsable del grupo", "Participantes" |
| H3 de tarjeta (Experiencia, Reglamento desktop) | `text-2xl` / `text-base sm:text-lg` | "Concierto en vivo", "Casco obligatorio" |

## Kicker / eyebrow (texto pequeño sobre cada heading de sección)

Patrón fijo en **todas** las secciones, sin excepción:

```
text-xs font-semibold tracking-[0.25em] uppercase text-river   /* sobre fondo claro */
text-xs font-semibold tracking-[0.25em] uppercase text-sky     /* sobre fondo oscuro */
```

Ejemplos de contenido: "Sobre la ruta", "Tu inscripción incluye", "Fin de semana completo", "Recorrido", "Antes de inscribirte", "Preguntas frecuentes", "5.ª Edición · 6 de diciembre de 2026".

## Labels de formulario

```
block text-xs font-semibold tracking-[0.14em] uppercase text-slate mb-1.5
```
Usado en absolutamente todos los `<label>` del sitio (Inscríbete, Consultar, Patrocinar) vía el componente compartido `Label`.

## Botones (poster-style)

```
font-poster font-bold text-xs|sm|base tracking-[0.16em]|[0.18em]|[0.2em] uppercase
```
El tracking crece a medida que el botón es más prominente: filtros de galería `tracking-[0.16em]`, CTA secundario `tracking-[0.18em]`, CTA principal / submit `tracking-[0.2em]`.

## Texto de cuerpo

- Párrafo estándar: `text-sm text-slate leading-relaxed` (sobre claro) / `text-sm text-pale/70 leading-relaxed` (sobre oscuro).
- Párrafo de intro de página (bajo el H1): `text-sm text-slate leading-relaxed` o `text-base text-slate max-w-2xl leading-relaxed` en páginas con más contexto (Historial, Patrocinar).
- Texto muy secundario / notas: `text-xs text-slate/50` o `text-xs text-slate/60`.

## Cifras destacadas (countdown, total a pagar, folio)

```
font-poster font-black text-4xl sm:text-5xl md:text-6xl tabular-nums leading-none   /* countdown */
font-poster font-black text-3xl sm:text-4xl                                          /* total ₡ */
font-poster font-black text-3xl tracking-wider                                       /* folio BH-2026-XXXX */
```
`tabular-nums` es importante en el countdown para que los dígitos no salten de ancho cada segundo.

## Astro — cómo declarar las fuentes

Idéntico al original: el `@import` de Google Fonts vive en `global.css`, y `font-poster` / `font-sans` quedan disponibles como clases Tailwind automáticamente gracias al `@theme` (no requiere ningún paso extra en Astro, ni `astro:assets`, ni `@font-face` local — es exactamente el mismo mecanismo CSS-only que en Vite/React).
