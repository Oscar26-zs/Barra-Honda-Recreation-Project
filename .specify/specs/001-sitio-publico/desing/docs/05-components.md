# 05 — Componentes reutilizables (código Astro)

Todos los componentes de abajo son traducción directa de sus equivalentes React (`src/components/*.tsx`), carácter por carácter en las clases Tailwind. Donde el original usaba `useState`, se reemplaza por `<script>` plano manipulando `classList` / atributos `data-*` — ver el detalle de cada patrón interactivo en [07-interactivity.md](07-interactivity.md).

---

## `SectionGlow.astro`

Fondo decorativo compartido: 3 líneas SVG tipo "ruta punteada" + 1-2 blobs difuminados (`blur-3xl`). Se usa como primer hijo de casi cualquier `<section class="relative overflow-hidden">`, con el contenido real en un `<div class="relative">` hermano después, para pintar encima (ver [04-spacing-layout.md](04-spacing-layout.md#z-index--stacking)).

```astro
---
// src/components/SectionGlow.astro
interface Props {
  variant?: 'corners' | 'center'
  tone?: 'blue' | 'white'
}
const { variant = 'corners', tone = 'blue' } = Astro.props

const lineColor = tone === 'white' ? '#f4f7fa' : '#2575b2'
const lineOpacity = tone === 'white' ? 'opacity-[0.06]' : 'opacity-[0.09]'
const blobColor = tone === 'white' ? 'bg-foam/5' : 'bg-river/10'
const blobColorAlt = tone === 'white' ? 'bg-foam/5' : 'bg-sky/10'
const centerBlobColor = tone === 'white' ? 'bg-foam/[0.04]' : 'bg-river/5'
---

<div class="absolute inset-0 pointer-events-none" aria-hidden="true">
  <svg class={`absolute inset-0 w-full h-full ${lineOpacity}`} viewBox="0 0 100 100" preserveAspectRatio="none">
    <path d="M-5,18 C15,9 25,24 40,17 C55,9 65,21 80,14 C90,10 96,15 105,11" stroke={lineColor} stroke-width="0.3" fill="none" stroke-dasharray="1.4 1.2" />
    <path d="M-5,52 C16,45 28,58 43,50 C58,42 67,56 83,48 C92,44 98,50 105,46" stroke={lineColor} stroke-width="0.3" fill="none" stroke-dasharray="1.4 1.2" />
    <path d="M-5,84 C15,77 26,89 40,82 C56,75 64,87 80,80 C90,76 98,82 105,78" stroke={lineColor} stroke-width="0.3" fill="none" stroke-dasharray="1.4 1.2" />
  </svg>
  {variant === 'center' ? (
    <div class={`absolute w-80 h-80 sm:w-[28rem] sm:h-[28rem] rounded-full ${centerBlobColor} blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`} />
  ) : (
    <>
      <div class={`absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full ${blobColor} blur-3xl -top-16 -left-16`} />
      <div class={`absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full ${blobColorAlt} blur-3xl -bottom-20 -right-10`} />
    </>
  )}
</div>
```

Uso:
```astro
<section class="relative overflow-hidden py-16 sm:py-20 md:py-24 bg-paper">
  <SectionGlow />
  <div class="relative max-w-6xl mx-auto px-6">
    <!-- contenido real -->
  </div>
</section>
```

---

## `Button.astro` — CTA poster-style

El botón primario aparece ~10 veces en el sitio siempre con la misma fórmula de color; se extrae como componente:

```astro
---
// src/components/Button.astro
interface Props {
  type?: 'button' | 'submit'
  variant?: 'primary' | 'ghost'
  class?: string
}
const { type = 'button', variant = 'primary', class: className = '' } = Astro.props

const base = 'font-poster font-bold uppercase transition-colors'
const variants = {
  primary: 'bg-river hover:bg-sky text-white',
  ghost: 'text-slate hover:text-ink',
}
---
<button type={type} class={`${base} ${variants[variant]} ${className}`}>
  <slot />
</button>
```

Uso (CTA del Hero):
```astro
<Button class="px-8 py-3 text-base tracking-[0.18em]">
  Inscribirme — ₡18.000
</Button>
```

---

## `FormField.astro` — Label + Input + error

Traducción de los helpers `Label`, `Input`, `FieldError` de `Inscribete.tsx` (también usados con la misma fórmula en `Consultar.tsx` y `Patrocinar.tsx`, aunque ahí están inline en vez de extraídos).

```astro
---
// src/components/FormField.astro
interface Props {
  label: string
  name: string
  type?: string
  placeholder?: string
  error?: string
  value?: string
}
const { label, name, type = 'text', placeholder = '', error, value = '' } = Astro.props
---
<div>
  <label for={name} class="block text-xs font-semibold tracking-[0.14em] uppercase text-slate mb-1.5">
    {label}
  </label>
  <input
    id={name}
    name={name}
    type={type}
    value={value}
    placeholder={placeholder}
    class:list={[
      'w-full bg-paper border text-ink text-sm px-4 py-2.5 placeholder-slate/40 focus:outline-none focus:border-river transition-colors',
      error ? 'border-red-500/60' : 'border-river/25 hover:border-river/50',
    ]}
  />
  {error && <p class="text-xs text-red-600 mt-1">{error}</p>}
</div>
```

> En el original la validación es 100% cliente (`useState` + funciones `compute*Errors`). En Astro, sin isla de framework, esto se resuelve con `<script>` que lee `FormData`, calcula errores y pinta el mensaje/borde manualmente (toggle de clases + `textContent`) — ver [07-interactivity.md](07-interactivity.md#validación-de-formularios).

---

## Patrón acordeón (`grid-rows-[1fr]`/`[0fr]`)

Usado en: acordeón mobile de Experiencia, acordeón mobile de Reglamento, y el FAQ completo (todas las resoluciones). Es el mecanismo estándar del sitio para expandir contenido **sin `height: auto` abrupto** — anima el `grid-template-rows` de un contenedor de 1 fila, con el contenido real dentro de un `div.overflow-hidden` (el contenido permanece siempre montado en el DOM, solo cambia de alto animado).

```astro
---
// src/components/AccordionRow.astro
interface Props {
  id: string      // id único para el botón/panel, usado por el script
  title: string
}
const { id, title } = Astro.props
---
<div class="border-b border-river/15" data-accordion-row>
  <button
    type="button"
    data-accordion-trigger={id}
    aria-expanded="false"
    class="w-full text-left py-4 flex items-center justify-between gap-3"
  >
    <span class="text-sm font-semibold text-ink">{title}</span>
    <svg data-accordion-icon class="w-4 h-4 text-slate shrink-0 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16M4 12h16" />
    </svg>
  </button>
  <div data-accordion-panel={id} class="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out">
    <div class="overflow-hidden">
      <div class="pb-4">
        <slot />
      </div>
    </div>
  </div>
</div>
```

CSS-only, cero JS necesario **si** se acepta que solo un panel puede tener el estado inicial "abierto"; para el toggle interactivo (clic → abre/cierra, rotación del ícono +45°) sí hace falta el `<script>` mínimo documentado en [07-interactivity.md](07-interactivity.md#acordeones).

---

## Patrón stepper (formulario Inscríbete)

Indicador de 3 pasos con círculos numerados, conectores, y estado `activo` / `completado` / `bloqueado`. En React esto es JSX generado desde un array `STEPS` + estado `step`/`maxStep`; en Astro se genera el HTML estático de los 3 pasos y el script alterna `data-state` + `hidden` en los paneles.

```astro
---
// src/components/Stepper.astro
const STEPS = ['Responsable', 'Participantes', 'Pago']
---
<div class="mb-8 sm:mb-10">
  <div class="flex items-center justify-center gap-2 sm:gap-4" data-stepper>
    {STEPS.map((label, idx) => {
      const n = idx + 1
      return (
        <div class="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            data-step-trigger={n}
            class="flex items-center gap-2 sm:gap-2.5"
          >
            <span data-step-badge={n} class="flex items-center justify-center w-8 h-8 shrink-0 rounded-full font-poster font-bold text-xs sm:text-sm transition-colors bg-paper border border-river/25 text-slate/50">
              {n}
            </span>
            <span data-step-label={n} class="hidden sm:inline text-xs font-semibold tracking-widest uppercase text-slate/50">
              {label}
            </span>
          </button>
          {idx < STEPS.length - 1 && <span class="w-8 sm:w-10 h-px bg-river/20" />}
        </div>
      )
    })}
  </div>
  <p data-step-caption class="sm:hidden text-center text-xs font-semibold tracking-[0.2em] uppercase text-river mt-3">
    Paso 1 de 3 · Responsable
  </p>
</div>
```

Estados visuales por paso (aplicados/quitados por el script en `data-step-badge`):

| Estado | Clases del círculo |
|---|---|
| Activo | `bg-river text-white` |
| Completado | `bg-river/15 text-river` (+ ícono check en vez del número) |
| Bloqueado (no alcanzado) | `bg-paper border border-river/25 text-slate/50` |

Lógica completa (validación por paso, salto a pestaña con error, navegación) en [07-interactivity.md](07-interactivity.md#stepper-de-inscríbete).

---

## Pestañas de "Participante" (dentro del paso 2 del stepper)

```astro
<div class="flex items-stretch gap-2 overflow-x-auto pb-1 mb-6 -mx-1 px-1" data-participant-tabs>
  <!-- una por participante, generada por el script según el input "Cantidad de personas" -->
  <button type="button" data-participant-tab="0" class="relative shrink-0 px-3.5 sm:px-4 py-2 text-xs font-poster font-bold uppercase tracking-widest transition-colors bg-river text-white">
    Participante 1
    <!-- <span class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border border-cloud" /> si tiene error -->
  </button>
</div>
```

---

## Selector "Sexo" (toggle de 2 opciones, dentro del panel de cada participante)

Campo obligatorio del panel de participante: elegir **Hombre** / **Mujer**. En vez de un `<select>` (reservado para "Talla de jersey", que tiene 6 opciones), es un toggle segmentado de 2 botones — mismo lenguaje visual que las pestañas de participante (`bg-river text-white` activo / `bg-paper border-river/25 text-slate` inactivo), más apropiado para una elección binaria.

```astro
<div>
  <label class="block text-xs font-semibold tracking-[0.14em] uppercase text-slate mb-1.5">Sexo *</label>
  <div class="grid grid-cols-2 gap-2" data-genero-toggle>
    <button type="button" data-genero-option="Hombre" class="py-2.5 text-sm font-medium border transition-colors bg-paper border-river/25 text-slate hover:border-river/50">
      Hombre
    </button>
    <button type="button" data-genero-option="Mujer" class="py-2.5 text-sm font-medium border transition-colors bg-paper border-river/25 text-slate hover:border-river/50">
      Mujer
    </button>
  </div>
  <p data-genero-error class="text-xs text-red-600 mt-1 hidden">Seleccione una opción</p>
</div>

<script>
  document.querySelectorAll<HTMLElement>('[data-genero-toggle]').forEach(toggle => {
    toggle.querySelectorAll<HTMLButtonElement>('[data-genero-option]').forEach(btn => {
      btn.addEventListener('click', () => {
        toggle.querySelectorAll('[data-genero-option]').forEach(b => {
          b.classList.remove('bg-river', 'border-river', 'text-white')
          b.classList.add('bg-paper', 'border-river/25', 'text-slate')
        })
        btn.classList.remove('bg-paper', 'border-river/25', 'text-slate')
        btn.classList.add('bg-river', 'border-river', 'text-white')
        // guardar btn.dataset.generoOption en el participante activo, igual que
        // cedula/nombre/apellidos/talla
      })
    })
  })
</script>
```

Ubicación en la grilla del panel de participante (`grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5`): **Cédula, Sexo, Talla, Nombre, Apellidos** (Apellidos ocupa `sm:col-span-2` para no quedar huérfano en una grilla de 5 campos a 2 columnas). Error de validación: mismo mecanismo que los demás campos (`Seleccione una opción`, mismo `border-red-500/60` en los botones inactivos si aplica).

---

## Bento grid card (Inclusiones, desktop)

Grid `4 columnas × auto-rows-[136px]`, con la primera celda (`isFeatured`) ocupando `col-span-2 row-span-2` y la última (`isWide`) `col-span-2`:

```astro
<div class="hidden lg:grid grid-cols-4 auto-rows-[136px] gap-4">
  {inclusions.map((item, i) => {
    const isFeatured = i === 0
    const isWide = i === inclusions.length - 1
    const sizeClass = isFeatured
      ? 'col-span-2 row-span-2 p-7 flex flex-col justify-center'
      : isWide
        ? 'col-span-2 p-6 flex items-center gap-5'
        : 'p-5 flex flex-col justify-center'
    return (
      <div class={`group relative overflow-hidden bg-night/60 hover:bg-night/80 border border-river/15 hover:border-river/50 transition-all duration-300 hover:-translate-y-1 ${sizeClass}`}>
        <span class={`absolute -right-1 -top-3 font-poster font-black text-river/10 group-hover:text-river/25 leading-none transition-colors duration-300 select-none ${isFeatured ? 'text-8xl' : 'text-5xl'}`} aria-hidden="true">
          {String(i + 1).padStart(2, '0')}
        </span>
        <!-- ícono + label, ver Inicio.tsx líneas 468-490 para el detalle exacto -->
      </div>
    )
  })}
</div>
```

---

## Badge / pill

Dos variantes usadas en todo el sitio:

```
/* pill de estado, sobre fondo oscuro */
self-start font-poster font-bold text-xs tracking-[0.2em] uppercase text-sky bg-night/50 border border-river/40 px-4 py-2

/* pill de estado, sobre fondo claro (Consultar: pendiente/aprobada/rechazada) */
inline-block px-4 py-1.5 text-xs font-bold tracking-widest uppercase border bg-{color}-50 text-{color}-700 border-{color}-300
```

---

## Hairline / línea de elevación decorativa (Footer, perfil de ruta)

SVG delgado tipo "cardiograma", usado como separador visual entre secciones:

```astro
<div class="w-full overflow-hidden opacity-40">
  <svg viewBox="0 0 1440 32" preserveAspectRatio="none" class="w-full h-8">
    <path
      d="M0,20 L60,16 L140,10 L220,18 L300,8 L380,14 L460,4 L540,12 L620,6 L700,14 L780,2 L860,10 L940,16 L1020,6 L1100,12 L1180,8 L1260,16 L1340,10 L1440,14"
      stroke="#2575b2"
      stroke-width="1"
      fill="none"
    />
  </svg>
</div>
```
