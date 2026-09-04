# 06 — Páginas y secciones

## Layout base

```astro
---
// src/layouts/Base.astro
import '../styles/global.css'
import Nav from '../components/Nav.astro'
import Footer from '../components/Footer.astro'

interface Props {
  title: string
  active: 'inicio' | 'historial' | 'galeria' | 'inscribete' | 'consultar' | 'patrocinar'
}
const { title, active } = Astro.props
---
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title} · MTB El Valle del Nacaome</title>
  </head>
  <body class="min-h-full bg-night text-foam">
    <Nav active={active} />
    <main class="pt-16">
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

Reemplaza exactamente al `App.tsx` original: `<div class="min-h-full bg-night text-foam">` → `<body>`, `<main class="pt-16">` igual, `Nav`/`Footer` reciben la sección activa para resaltar el link correspondiente (antes vía prop de estado, ahora vía prop estática por página).

---

## `Nav.astro`

Traducción de `src/components/Nav.tsx`. El menú desktop (`xl:flex`) es estático; el menú mobile full-screen usa el mismo patrón de opacidad + `translate-y` escalonado por link, ahora con `<script>` en vez de `useState`.

```astro
---
// src/components/Nav.astro
interface Props { active: string }
const { active } = Astro.props

const LINKS = [
  { id: 'inicio',     href: '/',            label: 'Inicio' },
  { id: 'galeria',    href: '/galeria',     label: 'Galería' },
  { id: 'inscribete', href: '/inscribete',  label: 'Inscríbete' },
  { id: 'consultar',  href: '/consultar',   label: 'Consultar' },
]
---
<nav
  id="nav-bar"
  data-active={active}
  class="fixed top-0 left-0 right-0 z-50 transition-colors duration-300 bg-night/96 backdrop-blur-md border-b border-river/10"
>
  <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
    <a href="/" class="font-poster font-black text-lg tracking-[0.12em] text-foam uppercase">
      MTB El Valle
    </a>

    <div class="hidden xl:flex items-center gap-7">
      {LINKS.map(l => (
        <a
          href={l.href}
          class:list={['text-xs font-semibold tracking-[0.14em] uppercase transition-colors',
            active === l.id ? 'text-sky' : 'text-mist hover:text-foam']}
        >
          {l.label}
        </a>
      ))}
    </div>

    <a href="/inscribete" class="hidden xl:block px-5 py-1.5 bg-river hover:bg-sky text-white text-xs font-poster font-bold tracking-[0.16em] uppercase transition-colors">
      Inscribirme
    </a>

    <button id="nav-toggle" class="xl:hidden relative z-10 p-2 text-foam" aria-label="Menú" aria-expanded="false">
      <svg id="nav-icon-open" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 6h18M3 12h18M3 18h18" />
      </svg>
      <svg id="nav-icon-close" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</nav>

<!-- Menú mobile — pantalla completa -->
<div id="nav-mobile" class="xl:hidden fixed inset-0 z-40 bg-night transition-opacity duration-300 opacity-0 pointer-events-none">
  <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <svg class="absolute inset-0 w-full h-full opacity-[0.07]" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="M-5,22 C15,12 25,28 40,20 C55,12 65,25 80,17 C90,13 96,18 105,14" stroke="#f4f7fa" stroke-width="0.3" fill="none" stroke-dasharray="1.4 1.2" />
      <path d="M-5,62 C16,54 28,68 43,59 C58,50 67,65 83,56 C92,51 98,58 105,53" stroke="#f4f7fa" stroke-width="0.3" fill="none" stroke-dasharray="1.4 1.2" />
    </svg>
    <div class="absolute w-80 h-80 rounded-full bg-river/20 blur-3xl -bottom-24 -right-16" />
  </div>

  <div class="relative h-full flex flex-col px-8 pt-24 pb-10 overflow-y-auto">
    <nav class="flex-1">
      {LINKS.map((l, i) => (
        <a
          href={l.href}
          class:list={['group flex items-baseline gap-4 py-3 w-full text-left border-b border-river/10 transition-all duration-300 opacity-0 translate-y-4']}
          style={`transition-delay: ${90 + i * 55}ms`}
          data-nav-link
        >
          <span class="font-poster font-black text-xs text-river/70 shrink-0">{String(i + 1).padStart(2, '0')}</span>
          <span class:list={['font-poster font-black text-4xl sm:text-5xl uppercase tracking-tight transition-colors',
            active === l.id ? 'text-sky' : 'text-foam group-hover:text-sky']}>
            {l.label}
          </span>
        </a>
      ))}
    </nav>

    <div class="mt-8 transition-all duration-300 opacity-0 translate-y-4" data-nav-cta style={`transition-delay: ${90 + LINKS.length * 55 + 60}ms`}>
      <a href="/inscribete" class="block text-center w-full py-4 bg-river hover:bg-sky text-white font-poster font-bold text-sm tracking-[0.2em] uppercase transition-colors">
        Inscribirme — ₡18.000
      </a>
      <div class="mt-6 flex gap-5">
        <a href="https://facebook.com/MTBElValleDelNacaome" target="_blank" rel="noopener noreferrer" class="text-mist hover:text-sky transition-colors text-xs font-semibold tracking-widest uppercase">Facebook</a>
        <span class="text-ridge">·</span>
        <a href="https://instagram.com/MTBElValleDelNacaome" target="_blank" rel="noopener noreferrer" class="text-mist hover:text-sky transition-colors text-xs font-semibold tracking-widest uppercase">Instagram</a>
      </div>
    </div>
  </div>
</div>

<script>
  const toggle = document.getElementById('nav-toggle')!
  const mobile = document.getElementById('nav-mobile')!
  const iconOpen = document.getElementById('nav-icon-open')!
  const iconClose = document.getElementById('nav-icon-close')!
  let open = false

  function setOpen(v: boolean) {
    open = v
    mobile.classList.toggle('opacity-100', open)
    mobile.classList.toggle('pointer-events-auto', open)
    mobile.classList.toggle('opacity-0', !open)
    mobile.classList.toggle('pointer-events-none', !open)
    iconOpen.classList.toggle('hidden', open)
    iconClose.classList.toggle('hidden', !open)
    toggle.setAttribute('aria-expanded', String(open))
    document.querySelectorAll<HTMLElement>('[data-nav-link], [data-nav-cta]').forEach(el => {
      el.classList.toggle('opacity-100', open)
      el.classList.toggle('translate-y-0', open)
      el.classList.toggle('opacity-0', !open)
      el.classList.toggle('translate-y-4', !open)
    })
  }

  toggle.addEventListener('click', () => setOpen(!open))

  // El Hero usa fondo transparente solo en "inicio" + sin scroll + menú cerrado
  const navBar = document.getElementById('nav-bar')!
  if (navBar.dataset.active === 'inicio') {
    const updateTransparency = () => {
      const transparent = window.scrollY <= 60 && !open
      navBar.classList.toggle('bg-transparent', transparent)
      navBar.classList.toggle('border-transparent', transparent)
      navBar.classList.toggle('bg-night/96', !transparent)
      navBar.classList.toggle('backdrop-blur-md', !transparent)
      navBar.classList.toggle('border-river/10', !transparent)
    }
    window.addEventListener('scroll', updateTransparency, { passive: true })
    updateTransparency()
  }
</script>
```

> Nota de fidelidad: en el original, `transparent = active === 'inicio' && !open && !scrolled`. Como en Astro cada página es su propia carga de documento, el efecto "nav transparente sobre el Hero" solo aplica en `index.astro` — está condicionado arriba por `data-active="inicio"`.

---

## `Footer.astro`

Traducción directa de `src/components/Footer.tsx` (estático, sin interactividad):

```astro
---
// src/components/Footer.astro
const LINKS = [
  { href: '/',            label: 'Inicio' },
  { href: '/galeria',     label: 'Galería' },
  { href: '/inscribete',  label: 'Inscríbete' },
  { href: '/consultar',   label: 'Consultar inscripción' },
]
---
<footer class="bg-abyss border-t border-river/15 mt-0">
  <div class="w-full overflow-hidden opacity-40">
    <svg viewBox="0 0 1440 32" preserveAspectRatio="none" class="w-full h-8">
      <path d="M0,20 L60,16 L140,10 L220,18 L300,8 L380,14 L460,4 L540,12 L620,6 L700,14 L780,2 L860,10 L940,16 L1020,6 L1100,12 L1180,8 L1260,16 L1340,10 L1440,14" stroke="#2575b2" stroke-width="1" fill="none" />
    </svg>
  </div>
  <div class="max-w-7xl mx-auto px-6 py-10 sm:py-12 md:py-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 md:gap-12">
    <div class="sm:col-span-2 md:col-span-1">
      <p class="font-poster font-black text-xl sm:text-2xl tracking-widest text-foam uppercase mb-2">MTB El Valle del Nacaome</p>
      <p class="text-xs text-mist leading-relaxed mb-4 sm:mb-6">
        5.ª Edición · Barra Honda, Guanacaste, Costa Rica<br />
        Domingo 6 de diciembre de 2026 · 7:00 a.m.<br />
        Punto de salida: Gimnasio de la Escuela de Barra Honda<br />
        Inversión: ₡18.000 por persona
      </p>
      <div class="flex gap-4">
        <a href="https://facebook.com/MTBElValleDelNacaome" target="_blank" rel="noopener noreferrer" class="text-mist hover:text-sky transition-colors text-xs font-semibold tracking-widest uppercase">Facebook</a>
        <span class="text-ridge">·</span>
        <a href="https://instagram.com/MTBElValleDelNacaome" target="_blank" rel="noopener noreferrer" class="text-mist hover:text-sky transition-colors text-xs font-semibold tracking-widest uppercase">Instagram</a>
      </div>
    </div>
    <div>
      <p class="text-xs font-semibold tracking-[0.2em] uppercase text-mist mb-3 sm:mb-5">Secciones</p>
      <ul class="space-y-2 sm:space-y-2.5">
        {LINKS.map(l => <li><a href={l.href} class="text-sm text-pale/70 hover:text-foam transition-colors">{l.label}</a></li>)}
      </ul>
    </div>
    <div>
      <p class="text-xs font-semibold tracking-[0.2em] uppercase text-mist mb-3 sm:mb-5">Contacto</p>
      <p class="text-sm text-pale/70 leading-relaxed">
        ¿Preguntas o coordinación?<br />
        Escríbenos por redes sociales<br />
        como <strong class="text-foam">MTB El Valle del Nacaome</strong><br />
        en Facebook o Instagram.
      </p>
      <p class="mt-4 sm:mt-5 text-xs text-mist/50">© 2026 MTB El Valle del Nacaome.<br />Todos los derechos reservados.</p>
    </div>
  </div>
</footer>
```

---

## Mapeo de páginas

### `src/pages/index.astro` — Inicio

Composición de 9 secciones, en este orden exacto (de `Inicio.tsx`):

1. `HeroSection` — fondo `hero-salida.jpg` + gradiente, título en 2 líneas, countdown en vivo, CTA.
2. `RouteAnimationSection` (modo oscuro, `light=false`) — franja de 36-52px, silueta de ciclista animada con scroll.
3. `SobreRutaSection` — layout dual: mobile/tablet apilado, desktop 12-col con foto full-bleed + timeline vertical de 3 hitos.
4. `InclusionesSectionn` — fondo `inclusion-feature.jpg` con overlay oscuro; grid compacto en mobile, bento grid 4 col en desktop.
5. `ExperienciaSection` — acordeón en mobile, tarjetas 2 col en tablet/desktop (4 actividades del fin de semana).
6. `RouteAnimationSection` (modo claro + espejado, `light reverse`) — segunda franja de ruta.
7. `MapaPerfilSection` — carrusel de 3 rutas embebidas de Komoot (iframe), con flechas/dots.
8. `ReglamentoSection` — acordeón en mobile, grid de tarjetas con borde izquierdo en desktop (6 reglas).
9. `FAQSection` — acordeón estándar (`grid-rows` push-down) sobre fondo `hero-salida.jpg` con overlay `bg-paper/92`.

Cada una es un componente `.astro` separado en `src/components/inicio/`, importado y renderizado en secuencia — ver código exacto de cada una en `src/sections/Inicio.tsx` del proyecto original (líneas 90-980), la traducción es 1:1 de JSX a template Astro.

### `src/pages/historial.astro`

H1 "Historial" + 4 ediciones en timeline horizontal (`grid-cols-5`: stats a la izq, fotos a la derecha), más un bloque de cierre "Cómo ha crecido el evento" en 3 columnas.

### `src/pages/galeria.astro`

H1 "Galería" + filtros por tipo (Todo/Fotos/Videos) y por edición (1.ª–4.ª), grid tipo masonry (`columns-1 sm:columns-2 lg:columns-3 xl:columns-4`), lightbox modal a pantalla completa. Ver interactividad en [07](07-interactivity.md#galería-filtro--lightbox).

### `src/pages/inscribete.astro`

Formulario en 3 pasos (stepper) — el componente más complejo del sitio. Detalle completo de estructura y validación en [07-interactivity.md](07-interactivity.md#stepper-de-inscríbete).

### `src/pages/consultar.astro`

Formulario simple (folio + cédula) que consulta un diccionario mock `DEMO_RECORDS`, muestra tarjeta de resultado con badge de estado (pendiente/aprobada/rechazada).

### `src/pages/patrocinar.astro`

Dos columnas: niveles de patrocinio (Oro/Plata/Bronce, cada uno con color de borde distinto) + formulario de contacto.
