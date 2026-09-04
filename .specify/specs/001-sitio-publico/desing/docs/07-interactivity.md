# 07 — Interactividad (scripts Astro, sin framework)

Ninguna interacción del sitio necesita una isla de React/Vue — son todas manipulación de DOM local. Cada bloque de abajo es el `<script>` que va al final del `.astro` correspondiente (Astro los procesa como módulos, con scope de archivo — no hace falta `client:load` porque no son componentes de framework, son JS plano que corre en el navegador tal cual).

## Countdown del Hero

Original: `useState` + `setInterval` cada 1000ms, recalculando `getTimeLeft(EVENT_DATE)`.

```html
<div class="flex gap-4 sm:gap-6 md:gap-10" id="countdown">
  <div class="flex flex-col items-center">
    <span class="font-poster font-black text-4xl sm:text-5xl md:text-6xl text-foam tabular-nums leading-none" data-unit="days">00</span>
    <span class="text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-mist mt-1.5">Días</span>
  </div>
  <span class="font-poster font-black text-2xl sm:text-4xl text-mist/40 self-start mt-1 sm:mt-2">:</span>
  <!-- ...horas, min, seg, mismo patrón -->
</div>

<script>
  const EVENT_DATE = new Date('2026-12-06T07:00:00-06:00')
  const units = {
    days: document.querySelector('[data-unit="days"]')!,
    hours: document.querySelector('[data-unit="hours"]')!,
    minutes: document.querySelector('[data-unit="minutes"]')!,
    seconds: document.querySelector('[data-unit="seconds"]')!,
  }
  function tick() {
    const diff = Math.max(0, EVENT_DATE.getTime() - Date.now())
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    units.days.textContent = String(days).padStart(2, '0')
    units.hours.textContent = String(hours).padStart(2, '0')
    units.minutes.textContent = String(minutes).padStart(2, '0')
    units.seconds.textContent = String(seconds).padStart(2, '0')
  }
  tick()
  setInterval(tick, 1000)
</script>
```

## Silueta de ciclista animada con scroll (`RouteAnimationSection`)

Original: `getBoundingClientRect` en `scroll`/`resize`, calcula progreso 0-1 según cuánto ha entrado la sección en viewport, obtiene punto en el path SVG con `getPointAtLength`, y posiciona la silueta (vía CSS `mask-image: url(cyclist-silhouette.png)`) en ese punto. También anima el trazo recorrido (`stroke-dashoffset`) y un gradiente radial que sigue al punto.

```html
<section id="route-anim" class="relative h-36 sm:h-44 md:h-52 overflow-hidden bg-gradient-to-b from-night via-dusk to-abyss">
  <div class="absolute inset-0" id="route-anim-flip">
    <div class="absolute inset-0 transition-[background] duration-300 ease-out" id="route-anim-glow"></div>
    <svg viewBox="0 0 1000 280" class="absolute inset-0 w-full h-full" preserveAspectRatio="none">
      <path id="route-track" d="M0,150 C90,60 160,220 260,140 C360,60 420,230 520,150 C620,70 690,220 790,140 C870,80 930,180 1000,120" stroke="#1c2c42" stroke-width="5" fill="none" stroke-linecap="round" />
      <path id="route-progress" d="M0,150 C90,60 160,220 260,140 C360,60 420,230 520,150 C620,70 690,220 790,140 C870,80 930,180 1000,120" stroke="#3499cc" stroke-width="5" fill="none" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" />
    </svg>
    <div
      id="route-cyclist"
      aria-hidden="true"
      class="absolute w-11 sm:w-16 md:w-20 aspect-[302/251] pointer-events-none bg-paper drop-shadow-[0_0_14px_rgba(52,153,204,0.55)]"
      style="mask-image: url('/assets/cyclist-silhouette.png'); mask-size: contain; mask-repeat: no-repeat; mask-position: center; -webkit-mask-image: url('/assets/cyclist-silhouette.png'); -webkit-mask-size: contain; -webkit-mask-repeat: no-repeat; -webkit-mask-position: center;"
    ></div>
  </div>
</section>

<script>
  const VB_W = 1000, VB_H = 280
  const section = document.getElementById('route-anim')!
  const path = document.getElementById('route-progress') as unknown as SVGPathElement
  const cyclist = document.getElementById('route-cyclist')!
  const glow = document.getElementById('route-anim-glow')!

  function update() {
    const rect = section.getBoundingClientRect()
    const vh = window.innerHeight
    const total = rect.height + vh
    const traveled = vh - rect.top
    const progress = Math.min(1, Math.max(0, traveled / total))
    const len = path.getTotalLength()
    const pt = path.getPointAtLength(progress * len)

    path.setAttribute('stroke-dashoffset', String(100 - progress * 100))
    const xPct = (pt.x / VB_W) * 100
    const yPct = (pt.y / VB_H) * 100
    cyclist.style.left = `${xPct}%`
    cyclist.style.top = `${yPct}%`
    cyclist.style.transform = 'translate(-12%, -66%)'
    glow.style.background = `radial-gradient(90px circle at ${xPct}% ${yPct}%, rgba(52,153,204,0.4), transparent 55%)`
  }
  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
</script>
```

Para la variante `reverse light` (segunda instancia de la sección, después de Experiencia): duplicar el bloque con `id`s sufijados (`route-anim-2`, etc.), `scaleX(-1)` en el wrapper `#route-anim-flip-2`, colores claros (`#a8c4d8`/`#2575b2`) y `bg-[#1c4f7a]` en la silueta en vez de `bg-paper`.

## Acordeones (Experiencia mobile, Reglamento mobile, FAQ)

**Nota de fidelidad importante:** el FAQ del sitio actual usa el mismo patrón `grid-rows-[1fr]`/`[0fr]` que Experiencia y Reglamento — es decir, al abrir una pregunta **la página sí crece** (empuja el contenido de abajo). No usa un patrón "overlay flotante". Se documenta tal cual está implementado hoy.

```html
<div class="border-b border-river/15">
  <button type="button" class="w-full text-left py-4 flex items-center justify-between gap-3" data-acc-trigger>
    <span class="text-sm font-semibold text-ink">¿Qué pasa si llueve?</span>
    <svg class="w-4 h-4 text-slate shrink-0 transition-transform" data-acc-icon fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16M4 12h16" />
    </svg>
  </button>
  <div class="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out" data-acc-panel>
    <div class="overflow-hidden">
      <p class="pb-5 pr-10 text-sm text-slate leading-relaxed">El evento se realiza bajo lluvia...</p>
    </div>
  </div>
</div>

<script>
  document.querySelectorAll<HTMLButtonElement>('[data-acc-trigger]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const panel = trigger.nextElementSibling as HTMLElement
      const icon = trigger.querySelector('[data-acc-icon]') as HTMLElement
      const isOpen = panel.classList.contains('grid-rows-[1fr]')
      panel.classList.toggle('grid-rows-[1fr]', !isOpen)
      panel.classList.toggle('grid-rows-[0fr]', isOpen)
      icon.classList.toggle('rotate-45', !isOpen)
    })
  })
</script>
```

Para Experiencia/Reglamento, cada fila añade además un thumbnail de 56×56px y un índice numerado (`01`, `02`...) antes del texto — mismo mecanismo de toggle, solo cambia el markup interno del botón.

## Carrusel de rutas Komoot (`MapaPerfilSection`)

3 rutas, cada una con su propio `iframe` embed de Komoot; solo una visible a la vez, con flechas prev/next y dots.

```html
<div class="border-x border-b border-river/20 bg-cloud aspect-video relative overflow-hidden">
  <iframe id="komoot-frame" src="" title="" loading="lazy" class="absolute inset-0 w-full h-full" style="border:0"></iframe>
  <button type="button" id="route-prev" aria-label="Ruta anterior" class="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-paper/90 hover:bg-paper border border-river/30 hover:border-river/60 transition-colors">‹</button>
  <button type="button" id="route-next" aria-label="Siguiente ruta" class="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-paper/90 hover:bg-paper border border-river/30 hover:border-river/60 transition-colors">›</button>
  <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10" id="route-dots"></div>
</div>

<script>
  const ROUTES = [
    { name: 'Mirador Nacaome — Parque Nacional', km: '6.98 km', terrain: 'Caminos pavimentados y sendero de acceso a las cuevas', level: 'Moderado — buena condición física, senderos accesibles', komootUrl: 'https://www.komoot.com/smarttour/20108244/embed?layout=map&profile=1' },
    { name: 'Circuito de las Cuevas — Parque Nacional', km: '3.61 km', terrain: 'Sendero accesible dentro del Parque Nacional Barra Honda', level: 'Fácil — apto para todo nivel', komootUrl: 'https://www.komoot.com/smarttour/34323352/embed?layout=map&profile=1' },
    { name: 'Las Cavernas — Sendero La Flor', km: '1.80 km', terrain: 'Sendero corto y accesible cerca de las cuevas', level: 'Fácil — apto para todo nivel', komootUrl: 'https://www.komoot.com/tour/3252919856/embed?share_token=af6zUG06ZnlQQ9oJg7Up4TTl5ilQbYL6NkRfffEexqDMS9C469&layout=map&profile=1' },
  ]
  let idx = 0
  const frame = document.getElementById('komoot-frame') as HTMLIFrameElement
  const dotsWrap = document.getElementById('route-dots')!

  function render() {
    const r = ROUTES[idx]
    frame.src = r.komootUrl
    frame.title = r.name
    document.querySelectorAll('[data-route-name]').forEach(el => el.textContent = r.name)
    document.querySelectorAll('[data-route-km]').forEach(el => el.textContent = r.km)
    document.querySelectorAll('[data-route-terrain]').forEach(el => el.textContent = r.terrain)
    document.querySelectorAll('[data-route-level]').forEach(el => el.textContent = r.level)
    dotsWrap.querySelectorAll('button').forEach((b, i) => b.classList.toggle('bg-river', i === idx))
  }
  dotsWrap.innerHTML = ROUTES.map((_, i) => `<button type="button" class="w-1.5 h-1.5 rounded-full transition-colors ${i === 0 ? 'bg-river' : 'bg-river/25 hover:bg-river/50'}" data-dot="${i}"></button>`).join('')
  dotsWrap.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { idx = Number(b.dataset.dot); render() }))
  document.getElementById('route-prev')!.addEventListener('click', () => { idx = (idx - 1 + ROUTES.length) % ROUTES.length; render() })
  document.getElementById('route-next')!.addEventListener('click', () => { idx = (idx + 1) % ROUTES.length; render() })
  render()
</script>
```

## Galería — filtro + lightbox

```html
<div class="flex gap-2" id="filter-type">
  <button data-filter-type="todo" class="px-4 py-1.5 text-xs font-poster font-bold tracking-[0.16em] uppercase transition-colors bg-river text-white">Todo</button>
  <button data-filter-type="foto" class="px-4 py-1.5 text-xs font-poster font-bold tracking-[0.16em] uppercase transition-colors border border-river/30 text-slate hover:text-ink hover:border-river/60">Fotos</button>
  <button data-filter-type="video" class="px-4 py-1.5 text-xs font-poster font-bold tracking-[0.16em] uppercase transition-colors border border-river/30 text-slate hover:text-ink hover:border-river/60">Videos</button>
</div>

<div class="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 space-y-3" id="gallery-grid">
  <!-- una tile por item, con data-type y data-edition para filtrar -->
</div>

<div id="lightbox" class="fixed inset-0 z-50 bg-night/95 hidden items-center justify-center p-6">
  <img id="lightbox-img" class="w-full max-h-[80vh] object-contain max-w-4xl" />
</div>

<script>
  document.querySelectorAll<HTMLButtonElement>('[data-filter-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-type]').forEach(b => {
        b.classList.remove('bg-river', 'text-white')
        b.classList.add('border', 'border-river/30', 'text-slate')
      })
      btn.classList.add('bg-river', 'text-white')
      const type = btn.dataset.filterType
      document.querySelectorAll<HTMLElement>('#gallery-grid > *').forEach(tile => {
        tile.hidden = type !== 'todo' && tile.dataset.type !== type
      })
    })
  })

  document.querySelectorAll<HTMLElement>('#gallery-grid > *').forEach(tile => {
    tile.addEventListener('click', () => {
      const img = tile.querySelector('img') as HTMLImageElement
      const lightbox = document.getElementById('lightbox')!
      const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement
      lightboxImg.src = img.src.replace('w=600', 'w=1200').replace(/h=\d+/, 'h=800')
      lightbox.classList.remove('hidden')
      lightbox.classList.add('flex')
    })
  })
  document.getElementById('lightbox')!.addEventListener('click', e => {
    (e.currentTarget as HTMLElement).classList.add('hidden')
  })
</script>
```

El filtro por edición sigue exactamente el mismo patrón (`data-filter-edition`), combinando ambos filtros con AND antes de decidir `tile.hidden`.

## Stepper de Inscríbete

El formulario más complejo del sitio: 3 pasos (Responsable+cantidad → Participantes en pestañas → Comprobante+pago), validación por paso, salto automático a la pestaña de participante con error, y un input numérico que genera/quita pestañas dinámicamente.

```html
<div data-step="1" class="step-panel"><!-- Responsable + input "Cantidad de personas" --></div>
<div data-step="2" class="step-panel hidden"><!-- pestañas de participantes --></div>
<div data-step="3" class="step-panel hidden"><!-- comprobante + total + submit --></div>

<script>
  type ParticipantError = { cedula?: string; nombre?: string; apellidos?: string; genero?: string; talla?: string }

  const MAX_PARTICIPANTES = 20
  const PRECIO = 18000
  let step = 1
  let maxStep = 1
  let cantidad = 1
  let activeParticipant = 0
  const participantErrors: ParticipantError[] = [{}]

  function renderParticipantTabs() {
    const wrap = document.querySelector('[data-participant-tabs]')!
    wrap.innerHTML = Array.from({ length: cantidad }, (_, i) => {
      const hasError = Object.keys(participantErrors[i] ?? {}).length > 0
      const active = i === activeParticipant
      return `<button type="button" data-participant-tab="${i}" class="relative shrink-0 px-3.5 sm:px-4 py-2 text-xs font-poster font-bold uppercase tracking-widest transition-colors ${active ? 'bg-river text-white' : 'bg-paper border border-river/25 text-slate hover:border-river/50'}">
        Participante ${i + 1}
        ${hasError ? '<span class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border border-cloud"></span>' : ''}
      </button>`
    }).join('')
    wrap.querySelectorAll<HTMLButtonElement>('[data-participant-tab]').forEach(btn => {
      btn.addEventListener('click', () => { activeParticipant = Number(btn.dataset.participantTab); renderActivePanel(); renderParticipantTabs() })
    })
  }

  function renderActivePanel() {
    // vuelca los valores guardados del participante activeParticipant en los 4 inputs
    // del panel (cedula, genero, talla, nombre, apellidos) — arrays paralelos en memoria, igual
    // que el estado `participantes: Participante[]` de React.
  }

  document.getElementById('cantidad-input')!.addEventListener('input', (e) => {
    cantidad = Math.min(MAX_PARTICIPANTES, Math.max(1, Math.floor(Number((e.target as HTMLInputElement).value)) || 1))
    activeParticipant = Math.min(activeParticipant, cantidad - 1)
    renderParticipantTabs()
    updateTotal()
  })

  function updateTotal() {
    document.querySelector('[data-total]')!.textContent = `₡${(cantidad * PRECIO).toLocaleString('es-CR')}`
    document.querySelector('[data-total-detail]')!.textContent = `${cantidad} ${cantidad === 1 ? 'persona' : 'personas'} × ₡18.000`
  }

  function goToStep(n: number) {
    if (n > maxStep) return
    step = n
    document.querySelectorAll<HTMLElement>('.step-panel').forEach(p => p.hidden = Number(p.dataset.step) !== n)
    document.querySelectorAll<HTMLElement>('[data-step-badge]').forEach(b => {
      const bn = Number(b.dataset.stepBadge)
      b.classList.toggle('bg-river', bn === n)
      b.classList.toggle('text-white', bn === n)
      b.classList.toggle('bg-river/15', bn < n)
      b.classList.toggle('text-river', bn < n && bn !== n)
      b.classList.toggle('bg-paper', bn > n)
      b.classList.toggle('border', bn > n)
      b.classList.toggle('border-river/25', bn > n)
      b.classList.toggle('text-slate/50', bn > n)
    })
    document.querySelector('[data-step-caption]')!.textContent = `Paso ${n} de 3 · ${['Responsable', 'Participantes', 'Pago'][n - 1]}`
  }

  document.getElementById('btn-to-participantes')!.addEventListener('click', () => {
    // valida nombre/telefono/correo del responsable (regex de correo igual al original:
    // /^[^\s@]+@[^\s@]+\.[^\s@]+$/) — si falla, pinta errores y no avanza.
    activeParticipant = 0
    maxStep = Math.max(maxStep, 2)
    goToStep(2)
  })

  document.getElementById('btn-to-pago')!.addEventListener('click', () => {
    // valida cedula/nombre/apellidos/genero/talla de cada participante -> participantErrors
    const firstInvalid = participantErrors.findIndex(e => Object.keys(e).length > 0)
    if (firstInvalid !== -1) { activeParticipant = firstInvalid; renderActivePanel(); renderParticipantTabs(); return }
    maxStep = Math.max(maxStep, 3)
    goToStep(3)
  })

  document.querySelector('form')!.addEventListener('submit', (e) => {
    e.preventDefault()
    // re-valida los 3 grupos (responsable, participantes, comprobante) por seguridad,
    // igual que el `handleSubmit` original — si algo falla, goToStep() al paso con el error.
    // Si todo pasa: genera folio `BH-2026-${String(counter++).padStart(4,'0')}` y muestra
    // la pantalla de "¡Inscripción recibida!" (swap de contenido, mismo markup que el
    // bloque `if (submitted)` de Inscribete.tsx).
  })
</script>
```

> El input **"Cantidad de personas a inscribir"** vive en el paso 1 (junto a los datos del responsable) e incluye al responsable en el conteo — mínimo 1. No existe botón "Agregar": la cantidad de pestañas de participante en el paso 2 se deriva **exclusivamente** de ese input.

## Consultar — búsqueda mock

```js
const DEMO_RECORDS = {
  'BH-2026-0001|123456789': { status: 'pendiente', folio: 'BH-2026-0001', modalidad: 'MTB — 5.ª Edición', personas: 2 },
  'BH-2026-0002|987654321': { status: 'aprobada',  folio: 'BH-2026-0002', modalidad: 'MTB — 5.ª Edición', personas: 1 },
  'BH-2026-0003|111222333': { status: 'rechazada', folio: 'BH-2026-0003', modalidad: 'MTB — 5.ª Edición', personas: 3 },
}
// key = `${folio.trim().toUpperCase()}|${cedula.trim().replace(/-/g, '')}`
```
Búsqueda directa en el diccionario al hacer submit; sin backend real (igual que el original — es un mock declarado con el comentario `[pendiente]` en varios lugares del código fuente).

## Patrocinar — validación de formulario

Mismo patrón de validación que Inscríbete pero para un solo grupo de campos (nombre, correo, teléfono, mensaje) — regex de correo idéntica, mensaje de error bajo cada input con `text-xs text-red-600 mt-1`.
