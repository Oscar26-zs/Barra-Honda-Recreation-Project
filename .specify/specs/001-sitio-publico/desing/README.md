# MTB El Valle del Nacaome — Sistema de diseño (versión Astro)

Documentación completa del diseño del sitio "MTB El Valle del Nacaome", extraída 1:1 del proyecto React/Vite original (`src/`), traducida a componentes y páginas Astro para que un rebuild en Astro quede **visualmente y funcionalmente idéntico**.

El sitio original es una SPA (React) que cambia de "sección" con estado de cliente (`App.tsx` + `Section` union type), sin router real. En Astro, cada sección se convierte en una **página real** (Astro es multi-page por naturaleza) — ver [06-pages-sections.md](docs/06-pages-sections.md) para el mapeo exacto de rutas.

## Índice

1. [Overview y stack](docs/01-overview.md) — stack técnico, estructura de carpetas, setup de Tailwind v4 en Astro.
2. [Colores](docs/02-colors.md) — paleta completa (`@theme`), tabla de uso semántico.
3. [Tipografía](docs/03-typography.md) — fuentes, escalas, tracking, convenciones por tipo de texto.
4. [Espaciado y layout](docs/04-spacing-layout.md) — contenedores, breakpoints, padding responsive, bordes.
5. [Componentes reutilizables](docs/05-components.md) — código Astro de `SectionGlow`, botones, inputs, acordeones, stepper, nav mobile, bento grid, badges.
6. [Páginas y secciones](docs/06-pages-sections.md) — mapeo de cada página/sección React → ruta Astro, con estructura de cada una.
7. [Interactividad](docs/07-interactivity.md) — cómo se replica cada comportamiento (countdown, scroll-linked animation, acordeones, stepper, filtros, lightbox) con `<script>` plano en Astro (sin frameworks — nada de esto necesita una isla de React).
8. [Imágenes y assets](docs/08-images-assets.md) — inventario de imágenes locales (copiadas en `design-astro/images/`) y placeholders externos (Unsplash) usados temporalmente.

## Carpeta `images/`

Copia exacta de los 4 assets locales usados en el proyecto original (`src/assets/`):

- `hero-salida.jpg` — foto de fondo del Hero y del FAQ (overlay claro).
- `cyclist-silhouette.png` — silueta usada como `mask-image` del ciclista animado en `RouteAnimationSection`.
- `sobre-ruta.jpg` — foto de "Sobre la ruta".
- `inclusion-feature.jpg` — foto de fondo de "Tu inscripción incluye".

El resto de imágenes del sitio (galería, historial, tarjetas de experiencia) son **placeholders temporales de Unsplash** vía URL directa — no son assets locales. Están documentadas en [08-images-assets.md](docs/08-images-assets.md) con nota de que deben reemplazarse por fotografía oficial.
