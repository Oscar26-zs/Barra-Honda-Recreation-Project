# 01 — Overview y stack técnico

## Proyecto original (React)

- React 19 + React DOM 19
- Vite 8 + `@vitejs/plugin-react`
- Tailwind CSS v4 vía `@tailwindcss/vite` (sin `tailwind.config.js`, sin PostCSS — todo el theming vive en `src/index.css` con el bloque `@theme`)
- TypeScript 5.7
- SPA de una sola ruta: `App.tsx` mantiene `const [active, setActive] = useState<Section>('inicio')` y renderiza condicionalmente la sección activa. `Nav` y `Footer` llaman `onNav(section)` para cambiar de "página" sin recargar.

## Traducción a Astro

Astro es multi-página por defecto (cada `.astro` en `src/pages/` es una ruta real), así que la forma **más fiel e idiomática** de portar este sitio es convertir cada "sección" de la SPA en una página real, reusando el mismo `Nav`/`Footer` como componentes de layout. Visualmente y en contenido es exactamente el mismo sitio; la única diferencia (invisible para el usuario) es que la navegación pasa de "cambiar de estado en cliente" a "navegar a otra URL" — el CSS, los componentes y el copy no cambian en absoluto.

```
Section 'inicio'      → src/pages/index.astro
Section 'historial'   → src/pages/historial.astro
Section 'galeria'     → src/pages/galeria.astro
Section 'inscribete'  → src/pages/inscribete.astro
Section 'consultar'   → src/pages/consultar.astro
Section 'patrocinar'  → src/pages/patrocinar.astro
```

## Stack Astro equivalente

- Astro 4/5 + `@astrojs/tailwind` **o** (recomendado, para calcar exactamente el setup original) el plugin oficial `@tailwindcss/vite` directamente en `astro.config.mjs`, ya que el proyecto original usa Tailwind v4 sin config file.
- Sin framework de UI. Toda la interactividad (acordeones, stepper, countdown, filtros, lightbox, nav mobile) se implementa con `<script>` plano dentro de los `.astro` — ver [07-interactivity.md](07-interactivity.md). No hace falta React/Vue/Svelte ni islas (`client:load`) porque ninguna de las interacciones del sitio requiere estado complejo compartido entre componentes: todo es DOM local (toggle de clases, un `setInterval`, un `fetch` mock).

### `astro.config.mjs`

```js
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
})
```

### `src/styles/global.css`

Idéntico al `src/index.css` original — ver contenido completo y explicado en [02-colors.md](02-colors.md) y [03-typography.md](03-typography.md). Se importa una sola vez en el layout base:

```astro
---
// src/layouts/Base.astro
import '../styles/global.css'
---
```

## Estructura de carpetas propuesta

```
src/
  layouts/
    Base.astro              # <html>, <head> (fonts, meta), Nav + <slot /> + Footer
  components/
    SectionGlow.astro
    Nav.astro
    Footer.astro
    Button.astro             # CTA poster-style reutilizable
    FormField.astro          # Label + Input + FieldError
    AccordionRow.astro       # patrón grid-rows[1fr]/[0fr]
  pages/
    index.astro               # Inicio: Hero, RouteAnimation, SobreRuta, Inclusiones,
                               # Experiencia, RouteAnimation (reverse/light), MapaPerfil,
                               # Reglamento, FAQ
    historial.astro
    galeria.astro
    inscribete.astro          # formulario en 3 pasos (stepper)
    consultar.astro
    patrocinar.astro
  styles/
    global.css
  assets/
    hero-salida.jpg
    cyclist-silhouette.png
    sobre-ruta.jpg
    inclusion-feature.jpg
```

## Convención de nomenclatura de clases

El proyecto original **no usa CSS Modules ni styled-components** — todo es Tailwind utility classes inline, con un puñado de tokens de color/fuente custom definidos vía `@theme`. La traducción a Astro mantiene exactamente las mismas clases Tailwind, carácter por carácter — es la forma más segura de garantizar "que quede exactamente igual".
