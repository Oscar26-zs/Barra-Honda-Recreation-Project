# Implementation Plan: Sitio Público — Recreativa Barra Honda

**Branch**: `001-sitio-publico` | **Date**: 2026-09-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-sitio-publico/spec.md`

**Alineado con**: `constitution.md` v2.0.1 · `../_shared/data-model.md` · spec hermano [002-panel-administrativo](../002-panel-administrativo/plan.md)

## Summary

Sitio público **multipágina en Astro** (`/sitio` del monorepo) que presenta el evento y
capta inscripciones. Cuatro páginas estáticas —**Home**, **Galería**, **Inscríbete**
(tarifa vigente + formulario) y **Consultar**— construidas con el sistema de diseño ya
documentado en [`desing/`](desing/README.md) (Tailwind v4 vía `@tailwindcss/vite`, tokens
`@theme`, tipografía Barlow Condensed + Inter). Toda la interactividad decorativa (countdown,
animación de ruta con scroll, acordeones, filtros y lightbox de galería, menú mobile) es
`<script>` plano dentro de los `.astro`. Las **dos islas interactivas** exigidas por la
constitución —el **formulario de inscripción** (stepper de 3 pasos) y la **consulta de
estado**— se implementan como **islas de React** (`@astrojs/react`, `client:load`).

El sitio consume Supabase con la clave `anon` únicamente:

- `obtener_tarifa_vigente()` (RPC) para mostrar la tarifa e informar el total estimado.
- Subida del comprobante comprimido en el cliente al bucket privado `comprobantes`.
- INSERT atómico de `inscripciones` + `participantes` mediante **una sola RPC**
  (`crear_inscripcion`) que congela `folio`, `modalidad_tarifa` y `monto_esperado` en el
  servidor.
- `consultar_estado_inscripcion(folio, cédula)` (RPC) para la consulta pública de estado.

El módulo **no crea ni mantiene migraciones** de `inscripciones` / `participantes` /
`tarifas`: esas tablas y RPCs son propiedad de 002 (ver `../_shared/data-model.md` →
"Propiedad de las migraciones"). Este plan **especifica el contrato** que 002 debe exponer y
lo consume.

## Technical Context

**Language/Version**: TypeScript 5.6, Astro 4.16, React 18.3 (solo en las 2 islas)

**Primary Dependencies**:
- Ya presentes en `sitio/package.json`: `astro`, `@astrojs/react`, `react`, `react-dom`,
  `@supabase/supabase-js` 2.45, `browser-image-compression` 2.0
- **Nuevas**: `tailwindcss` 4 + `@tailwindcss/vite` (plugin de Vite, sin `tailwind.config`
  — todo el theming vive en `src/styles/global.css` con `@theme`, tal como documenta
  `desing/docs/01-overview.md` y `02-colors.md`)

**Storage**: Supabase PostgreSQL (RLS: rol `anon` solo INSERT en `inscripciones` y
`participantes`) · Supabase Storage, bucket `comprobantes` **privado** (rol `anon` solo
INSERT)

**Lectura de datos**: exclusivamente vía RPC `SECURITY DEFINER` con clave `anon`
(`obtener_tarifa_vigente`, `consultar_estado_inscripcion`). Sin SELECT directo ni políticas
RLS de lectura para el público sobre ninguna tabla.

**Testing**: no hay framework configurado en `sitio/`. La validación de este plan es
**manual** vía `quickstart.md`. `npm run build` + `astro check` deben pasar sin errores
(Flujo de Trabajo de Desarrollo → "Control de calidad antes de integrar").

**Target Platform**: navegadores modernos (Chrome, Firefox, Safari, Edge), mobile-first.
Salida estática de Astro (SSG) — hosting estático.

**Project Type**: sitio estático multipágina (Astro SSG) + 2 islas cliente. Sin backend
propio: Supabase es la única capa de datos.

**Performance Goals**: carga completa < 3 s en banda ancha (SC-006). HTML estático + CSS
Tailwind purgado + JS solo en las 2 islas y en los `<script>` decorativos.

**Constraints**:
- Sin autenticación en ninguna página (FR-002).
- La clave `anon` es la única credencial de Supabase en el bundle; variables con prefijo
  `PUBLIC_` únicamente (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`).
- Ningún cálculo de monto se confía al cliente: `monto_esperado` se congela en el servidor
  (FR-022).
- El comprobante se comprime en el cliente **antes** de subir (FR-005, límite del nivel
  gratuito de Storage).
- La consulta de estado nunca revela cuál de folio/cédula falló (FR-026, SC-007).

**Scale/Scope**: decenas a cientos de inscripciones por período (Supuestos del spec).
4 páginas + 1 layout + ~8 componentes `.astro` compartidos + ~12 componentes de sección de
Home + 2 islas React.

## Constitution Check

*GATE: revisado antes de Phase 0 y de nuevo tras Phase 1. Todos los ítems PASS.*

| Principio | Estado | Notas |
|---|---|---|
| **I. Stack fijo** (Astro multipágina; islas en React/Vue/Svelte) | PASS | Astro 4 en `/sitio`. Las 2 islas exigidas (inscripción, consulta) son **islas de React** vía `@astrojs/react` + `client:load` (decisión del propietario 2026-09-03). La interactividad **decorativa** (countdown, scroll-anim, acordeones, filtros/lightbox, nav mobile) es DOM-only con `<script>` plano — no introduce estado de framework ni una tercera pieza (ver Research §1). |
| **II. Seguridad de datos públicos** (RLS INSERT-only) | PASS | El sitio solo hace INSERT (vía RPC `crear_inscripcion`) y lecturas vía RPC `SECURITY DEFINER`. Sin SELECT/UPDATE/DELETE directo. Políticas RLS son propiedad de 002. |
| **III. Almacenamiento privado de comprobantes** | PASS | Bucket `comprobantes` privado; el sitio solo hace `upload` (INSERT). Nunca lee comprobantes. |
| **IV. Secretos del servidor** | PASS | Solo `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` en el bundle. Sin `service_role`, sin clave de Resend. `sitio/.env` en `.gitignore`. |
| **V. Simplicidad y mantenibilidad** | PASS | Se añade **una** dependencia real (`tailwindcss` + su plugin de Vite), requerida por el sistema de diseño ya aprobado en `desing/`. Islas React reutilizan libs ya presentes. Interacción decorativa sin dependencias. |
| **VI. Flujo de notificaciones por cambio de estado** | N/A | Fuera de alcance de 001 (lo dispara 002 al aprobar/rechazar). El sitio solo crea la inscripción en estado `pendiente`. |
| **VII. Consultar antes de asumir** | PASS | Las ambigüedades spec↔diseño↔data-model se plantearon al propietario (4 decisiones tomadas 2026-09-03, ver Research §0) y las que quedan abiertas están listadas como **Known Gaps** sin resolver silenciosamente. |
| **VIII. Tarifas con promoción por tiempo limitado** | PASS | El sitio solo **muestra** la tarifa vía `obtener_tarifa_vigente()` (clave `anon`). El total en el stepper es informativo (`monto_final_con_descuento × cantidad_personas`). El monto vinculante lo congela el servidor en el INSERT (FR-022). Sin tarifa activa → se bloquea el envío (FR-023). |
| **IX. Modelo grupal + consulta pública** | PASS | Dos tablas (`inscripciones` + `participantes`) insertadas **atómicamente** por la RPC `crear_inscripcion`. Consulta pública por folio + cédula vía RPC `SECURITY DEFINER`, respuesta genérica sin enumeración (FR-024 a FR-026). |

**Decisiones del propietario (2026-09-03)** — ver detalle en `research.md` §0:

1. **Islas**: React (`@astrojs/react`), no `<script>` plano, para las 2 islas de datos.
2. **Páginas**: las 4 del diseño — Home, Galería, Inscríbete, Consultar (rutas `/`,
   `/galeria`, `/inscribete`, `/consultar`). Sin Historial ni Patrocinar. La página
   "Precios / Inscripción" del spec = `inscribete.astro` (tarjeta de tarifa + formulario).
3. **Contenido**: el del diseño tal cual (marca "MTB El Valle del Nacaome", 5.ª Edición,
   6 de diciembre de 2026, punto de salida Escuela de Barra Honda). **Excepción**: el
   **monto** no se hardcodea — sale de `obtener_tarifa_vigente()` (ver Known Gap #4).
4. **Precio**: RPC + cálculo en servidor (FR-021/022/023), nunca monto fijo en el cliente.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/001-sitio-publico/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Phase 0: decisiones + Known Gaps (/speckit-plan)
├── quickstart.md        # Phase 1: guía de validación manual (/speckit-plan)
├── data-model.md        # NO se genera aparte — el contrato de datos/SQL que este módulo
│                        #   CONSUME vive embebido abajo ("Phase 1 → data-model.md") y la
│                        #   fuente de verdad de las tablas está en ../_shared/data-model.md
├── contracts/           # NO se genera como carpeta — el mapeo spec→página→componente y
│                        #   los contratos RPC viven embebidos abajo ("contracts/")
├── spec.md              # Feature specification (ya existe)
├── desing/              # Sistema de diseño (ya existe — READMEs + docs/ + images/)
├── checklists/requirements.md   # Checklist de requisitos (ya existe)
└── tasks.md             # Phase 2 (/speckit-tasks — NO lo crea este comando)
```

> Se sigue el mismo criterio que `002-panel-administrativo/plan.md`: `data-model.md` y
> `contracts/` no son archivos separados; su contenido está en este `plan.md`.
> `research.md` y `quickstart.md` sí son archivos independientes.

### Source Code (repository root)

`sitio/` ya existe con un scaffold mínimo (Astro 4 + `@astrojs/react` +
`@supabase/supabase-js` + `browser-image-compression`). Este plan lo **reescribe y expande**
a la estructura de abajo. Cada ruta está documentada aquí antes de crearse (Flujo de
Trabajo de Desarrollo → "Organización del código").

```text
sitio/
├── astro.config.mjs                 # MODIFICADO: añadir el plugin @tailwindcss/vite en
│                                    #   vite.plugins (junto a la integración react() ya
│                                    #   presente). Ver desing/docs/01-overview.md.
├── package.json                     # MODIFICADO: + "tailwindcss" y "@tailwindcss/vite"
│                                    #   en devDependencies. Sin tailwind.config.
├── tsconfig.json                    # Sin cambios (extends astro/tsconfigs/strict, jsx react)
├── .env                             # NUEVO (gitignored): PUBLIC_SUPABASE_URL,
│                                    #   PUBLIC_SUPABASE_ANON_KEY
├── .env.example                     # NUEVO (versionado): plantilla sin valores reales
├── .gitignore                       # NUEVO/MODIFICADO: .env, dist/, .astro/
│
├── public/
│   └── assets/                      # NUEVO: los 4 binarios locales del diseño, copiados
│       ├── hero-salida.jpg          #   desde desing/images/. Se sirven por ruta directa
│       ├── cyclist-silhouette.png   #   (/assets/...) — coincide con los <script> de
│       ├── sobre-ruta.jpg           #   desing/docs/07 (mask-image usa /assets/...).
│       └── inclusion-feature.jpg
│
└── src/
    ├── env.d.ts                     # Sin cambios
    │
    ├── styles/
    │   └── global.css               # NUEVO: copia exacta del index.css del diseño —
    │                                #   @import Google Fonts (Barlow Condensed + Inter) +
    │                                #   @import 'tailwindcss' + bloque @theme con todos los
    │                                #   tokens de color/fuente. Ver desing/docs/02 y 03.
    │                                #   (Reemplaza los estilos inline del Layout.astro
    │                                #   actual.)
    │
    ├── layouts/
    │   └── Base.astro               # NUEVO: <html>/<head> (meta, título por página) +
    │                                #   import de global.css + <Nav active={...} /> +
    │                                #   <main class="pt-16"><slot /></main> + <Footer />.
    │                                #   Reemplaza el Layout.astro actual. Prop:
    │                                #   { title: string; active: 'inicio'|'galeria'|
    │                                #   'inscribete'|'consultar' }. Ver desing/docs/06.
    │
    ├── components/                  # Componentes .astro ESTÁTICOS (sin framework)
    │   ├── Nav.astro                # NUEVO: barra fija + menú mobile full-screen.
    │   │                            #   LINKS = [Inicio /, Galería /galeria,
    │   │                            #   Inscríbete /inscribete, Consultar /consultar].
    │   │                            #   <script> de toggle mobile + transparencia sobre
    │   │                            #   el Hero solo si data-active="inicio". Ver
    │   │                            #   desing/docs/06 (código casi literal).
    │   ├── Footer.astro             # NUEVO: estático, 3 columnas + hairline SVG. Copy y
    │   │                            #   datos del evento del diseño. Ver Known Gap #4 sobre
    │   │                            #   el monto en "Inversión: ...".
    │   ├── SectionGlow.astro        # NUEVO: fondo decorativo (líneas SVG + blobs).
    │   │                            #   Props { variant?: 'corners'|'center';
    │   │                            #   tone?: 'blue'|'white' }. Ver desing/docs/05.
    │   ├── Button.astro             # NUEVO: CTA poster-style. Props { type, variant:
    │   │                            #   'primary'|'ghost', class }. Ver desing/docs/05.
    │   ├── AccordionRow.astro       # NUEVO: patrón grid-rows-[1fr]/[0fr]. Props
    │   │                            #   { id, title } + <slot />. Toggle por <script>
    │   │                            #   compartido. Ver desing/docs/05 y 07.
    │   ├── Kicker.astro             # NUEVO: eyebrow text sobre cada H2 de sección
    │   │                            #   (patrón fijo, desing/docs/03). Props { tone }.
    │   │
    │   ├── inicio/                  # Secciones de la Home, en orden de composición.
    │   │   │                        #   Markup traducido 1:1 del diseño (el src/ React
    │   │   │                        #   original NO está en este repo — ver Known Gap #5;
    │   │   │                        #   se construyen desde desing/docs + imágenes).
    │   │   ├── HeroSection.astro            # fondo hero-salida.jpg + countdown + CTA
    │   │   ├── RouteAnimationSection.astro  # franja con silueta animada por scroll.
    │   │   │                                #   Props { light?: boolean; reverse?: boolean;
    │   │   │                                #   idSuffix: string } para las 2 instancias.
    │   │   ├── SobreRutaSection.astro
    │   │   ├── InclusionesSection.astro     # fondo inclusion-feature.jpg + bento grid
    │   │   ├── ExperienciaSection.astro     # acordeón mobile / tarjetas desktop
    │   │   ├── MapaPerfilSection.astro      # carrusel de 3 iframes Komoot (<script>)
    │   │   ├── ReglamentoSection.astro
    │   │   └── FaqSection.astro             # acordeón sobre hero-salida.jpg + overlay
    │   │
    │   ├── galeria/
    │   │   └── GaleriaGrid.astro    # NUEVO: filtros (tipo + edición) + grid masonry +
    │   │                            #   lightbox. Todo por <script> (desing/docs/07).
    │   │                            #   Datos de imágenes: placeholders Unsplash
    │   │                            #   (desing/docs/08) — marcar como "reemplazar".
    │   │
    │   ├── iconos/
    │   │   └── iconos.ts            # NUEVO: Record<string,string> de paths SVG inline
    │   │                            #   (InclusionIcon ×12, RuleIcon ×6). Sin librería.
    │   │                            #   Ver desing/docs/08 → "Íconos".
    │   │
    │   └── islands/                 # Componentes REACT (las 2 islas de la constitución)
    │       ├── FormularioInscripcion.tsx   # NUEVO (reescribe el .tsx actual): stepper
    │       │                               #   de 3 pasos. Isla n.º 1. Detalle abajo.
    │       ├── ConsultaEstado.tsx          # NUEVO: form folio + cédula → RPC. Isla n.º 2.
    │       └── inscripcion/                # Subcomponentes de FormularioInscripcion
    │           ├── PasoResponsable.tsx     # datos del responsable + "Cantidad de personas"
    │           ├── PasoParticipantes.tsx   # pestañas dinámicas (1 por participante)
    │           ├── PanelParticipante.tsx   # cédula, nombre, apellidos, talla (ver Gap #2/#3)
    │           ├── PasoComprobante.tsx     # adjuntar comprobante + total informativo + submit
    │           ├── Stepper.tsx             # indicador de 3 pasos (activo/completado/bloqueado)
    │           ├── ConfirmacionEnvio.tsx   # pantalla "¡Inscripción recibida!" + folio
    │           └── campos.tsx              # helpers Label / Input / FieldError (compartidos
    │                                       #   con ConsultaEstado)
    │
    ├── lib/
    │   ├── supabase.ts              # YA EXISTE: cliente con clave anon. Sin cambios de
    │   │                            #   fondo (ya valida PUBLIC_SUPABASE_URL/ANON_KEY).
    │   ├── tarifa.ts                # NUEVO: obtenerTarifaVigente() → llama
    │   │                            #   supabase.rpc('obtener_tarifa_vigente'). Devuelve
    │   │                            #   { modalidad, monto_por_persona,
    │   │                            #   monto_final_con_descuento, fecha_fin } | null.
    │   ├── inscripcion.ts           # NUEVO: comprimirComprobante(File) (browser-image-
    │   │                            #   compression) + subirComprobante(File) →
    │   │                            #   supabase.storage.from('comprobantes').upload(
    │   │                            #   `${crypto.randomUUID()}.${ext}`) + crearInscripcion(
    │   │                            #   payload) → supabase.rpc('crear_inscripcion', ...)
    │   │                            #   que hace el INSERT atómico y devuelve { folio }.
    │   ├── consulta.ts              # NUEVO: consultarEstado(folio, cedula) →
    │   │                            #   supabase.rpc('consultar_estado_inscripcion', ...).
    │   ├── validacion.ts            # NUEVO: reglas de validación cliente compartidas
    │   │                            #   (correo regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    │   │                            #   obligatorios, tamaño/tipo de archivo). Espejo de
    │   │                            #   las restricciones del servidor (Requisitos de
    │   │                            #   Seguridad → "Validación de entrada").
    │   └── tipos.ts                 # NUEVO: tipos TS — Responsable, Participante,
    │                                #   TallaCamisa, ModalidadTarifa ('Promocional'|
    │                                #   'Regular'), EstadoInscripcion, TarifaVigente,
    │                                #   ResultadoConsulta, PayloadCrearInscripcion.
    │
    └── pages/
        ├── index.astro             # MODIFICADO (reescribe el actual): Home. Compone las
        │                           #   8 secciones de components/inicio/ en orden
        │                           #   (Hero → RouteAnim → SobreRuta → Inclusiones →
        │                           #   Experiencia → RouteAnim light/reverse → MapaPerfil →
        │                           #   Reglamento → FAQ). Usa <Base active="inicio">.
        ├── galeria.astro           # NUEVO: H1 + <GaleriaGrid />. <Base active="galeria">.
        ├── inscribete.astro        # NUEVO = "Precios / Inscripción" del spec. H1 +
        │                           #   tarjeta de tarifa vigente (renderiza el resultado
        │                           #   de obtener_tarifa_vigente(); si null, aviso de
        │                           #   "tarifas no disponibles" — FR-021) +
        │                           #   <FormularioInscripcion client:load />.
        │                           #   <Base active="inscribete">.
        └── consultar.astro         # NUEVO: H1 + <ConsultaEstado client:load />.
                                    #   <Base active="consultar">.
```

**Archivos existentes que se eliminan o reemplazan**:

| Actual | Acción | Razón |
|---|---|---|
| `src/layouts/Layout.astro` | **Reemplazado** por `src/layouts/Base.astro` | El diseño define un layout base con Nav+Footer y prop `active` por página; el actual solo tiene estilos inline provisionales. |
| `src/pages/index.astro` | **Reescrito** | El actual es un one-pager provisional con datos y precios inventados; la Home real es la composición de secciones del diseño. |
| `src/components/FormularioInscripcion.tsx` | **Reescrito** como `src/components/islands/FormularioInscripcion.tsx` | El actual: (a) no maneja participantes ni grupo; (b) usa columnas viejas (`nombre_completo`, `comprobante_path`) que 002 renombra; (c) hace `upload` + `insert` en **dos llamadas no atómicas** (viola FR-006 / Principio IX.2); (d) no consulta la tarifa. Se rehace sobre la RPC `crear_inscripcion`. |

**Structure Decision**: organización **por rol del archivo dentro de un sitio Astro
estático** — `layouts/`, `components/` (con subcarpetas por página/área: `inicio/`,
`galeria/`, `islands/`), `lib/` (acceso a datos + validación + tipos), `pages/` (una ruta =
un archivo). Es la estructura idiomática de Astro y la que ya propone
`desing/docs/01-overview.md`, adaptada a las 4 páginas elegidas. Las **2 islas de React**
se aíslan en `components/islands/` para que sea evidente qué se hidrata en el cliente y qué
no. `lib/` concentra **todo** el contacto con Supabase (3 RPC + 1 upload) en módulos
pequeños y testeables, de modo que ninguna `.astro` ni `.tsx` de UI llame a `supabase`
directamente.

## Complexity Tracking

| Violación / desviación | Por qué se necesita | Alternativa más simple rechazada porque |
|---|---|---|
| Nueva dependencia `tailwindcss` + `@tailwindcss/vite` | Todo el sistema de diseño de `desing/` está expresado en utilidades Tailwind v4 y tokens `@theme`. Sin Tailwind habría que reescribir a mano cientos de clases. | CSS a mano: multiplicaría el trabajo y divergiría del diseño ya aprobado (Principio V favorece no reinventar lo resuelto). |
| Islas de **React** (y no `<script>` plano como propone `desing/docs/01` y `07`) | La constitución (Principio I) **exige** que las 2 islas interactivas se implementen "con React, Vue o Svelte como islas de Astro". Gobernanza: el conflicto se resuelve a favor de la constitución. | `<script>` plano para todo: lo pedía el diseño, pero contradice el Principio I; requeriría enmienda formal a la constitución (no solicitada). |
| Subcarpeta `components/islands/inscripcion/` con 7 archivos para **una** isla | El stepper es el componente más complejo del sitio (3 pasos, pestañas dinámicas, validación por paso, compresión, subida, RPC atómica). Partirlo hace cada pieza legible y revisable. | Un único `.tsx` monolítico: >400 líneas, difícil de revisar y de mapear a los escenarios de aceptación de HU1. |

## Research & Decisions

*(Se genera como archivo independiente: [`research.md`](research.md). Resumen aquí.)*

- **§0 — Decisiones del propietario (2026-09-03)**: islas en React; 4 páginas
  (`/`, `/galeria`, `/inscribete`, `/consultar`); contenido del diseño tal cual salvo el
  monto; precio vía RPC + servidor.
- **§1 — Interactividad decorativa sin framework**: countdown, animación de ruta,
  acordeones, carrusel Komoot, filtros/lightbox de galería y nav mobile son DOM-only y van
  como `<script>` en sus `.astro`. Solo las 2 islas de datos son React. No cuenta como
  "tercera pieza" del stack (Principio V) porque no añade dependencias ni build.
- **§2 — INSERT atómico vía RPC única**: dos `supabase.from().insert()` seguidos **no son
  atómicos**. Se define la RPC `crear_inscripcion(payload jsonb)` (`SECURITY DEFINER`) que
  inserta `inscripciones` + `participantes` en una transacción, genera `folio`, congela
  `modalidad_tarifa` y calcula `monto_esperado` con `monto_final_con_descuento` de
  `obtener_tarifa_vigente()`, y **falla sin escribir nada** si no hay tarifa activa
  (FR-023). Alternativa rechazada: dos inserts desde el cliente (no atómico, deja filas
  huérfanas ante fallo de red).
- **§3 — Orden subida/insert del comprobante**: el rol público no tiene UPDATE, así que no
  se puede "crear fila y luego actualizar la URL". Flujo: (1) comprimir en cliente,
  (2) `upload` a `comprobantes/<uuid>.<ext>`, (3) pasar esa ruta a `crear_inscripcion`, que
  la guarda en `inscripciones.url_comprobante`. Si el paso 3 falla, queda un objeto
  huérfano en Storage (aceptable; limpieza es tarea de 002/mantenimiento).
- **§4 — Tarifa informativa**: `obtener_tarifa_vigente()` expone `modalidad`,
  `monto_por_persona`, `monto_final_con_descuento`, `fecha_fin`. El total del stepper es
  `monto_final_con_descuento × cantidad_personas`, **rotulado como estimado**. El valor
  real lo congela el servidor.
- **§5 — Known Gaps abiertos** (no resueltos en este plan; consultar al propietario antes
  de implementar la pieza afectada):
  1. **Propiedad de `crear_inscripcion` y de la lógica de `monto_esperado`**:
     `002/plan.md` dice que "el trigger/función de INSERT que calcula `monto_esperado`
     pertenece al módulo 001", pero `_shared/data-model.md` dice que 001 **no** mantiene
     migraciones de esas tablas. Propuesta: el objeto SQL vive físicamente en
     `supabase/migrations/` (raíz, propiedad operativa de 002) pero su **especificación**
     (firma, cálculo, manejo de "sin tarifa") es responsabilidad de este módulo y está en
     "contracts/" abajo. Falta ratificación del propietario.
  2. **Campo "Sexo" del diseño**: `desing/docs/05` captura Sexo (Hombre/Mujer) por
     participante, pero ni `spec.md` FR-003 ni `_shared/data-model.md` (`participantes`:
     `cedula`, `nombre`, `apellidos`, `talla_camisa`) tienen esa columna. Opciones:
     (a) **omitir** el campo Sexo del formulario (default propuesto — se ciñe al spec);
     (b) añadir `genero` a `participantes`, coordinado con 002. Decidir antes de
     `PanelParticipante.tsx`.
  3. **Valores de `talla_camisa`**: el diseño menciona un `<select>` de ~6 tallas sin
     fijar los valores. Falta la lista exacta (¿XS–XXL? ¿numérica?) y si se valida contra
     un `CHECK` en BD.
  4. **Monto en el "chrome" del sitio**: el diseño hardcodea "₡18.000" en el CTA del Nav
     ("Inscribirme — ₡18.000") y en el Footer ("Inversión: ₡18.000"). Como el monto ahora
     es dinámico (RPC), propuesta: quitar la cifra de Nav/Footer (queda "Inscribirme") y
     mostrar el monto **solo** en `inscribete.astro` desde la RPC. Confirmar.
  5. **Markup de las secciones de Home**: el `src/` React original que `desing/` traduce
     "1:1" **no está en este repo**. Las 8 secciones de `components/inicio/`, los tiles de
     galería y los íconos SVG se construyen desde `desing/docs/*` + las 4 imágenes locales
     + placeholders Unsplash. `tasks.md` debe presupuestar este trabajo de autoría, no solo
     "portar".
  6. **Formato y generación del `folio`**: `spec.md` ejemplifica `BH-2026-0142`. Lo genera
     `crear_inscripcion` en el servidor. Falta confirmar prefijo, año (¿del `INSERT`? ¿del
     evento?) y política de reinicio de secuencia entre ediciones.
  7. **Estados de "Consultar"**: el diseño usa un diccionario mock `DEMO_RECORDS`. Se
     reemplaza por la RPC real; el badge de estado mapea `pendiente`/`aprobada`/`rechazada`
     a los colores amber/emerald/red del diseño (`desing/docs/02`).

## Phase 1: Design & Contracts

*(`quickstart.md` se genera como archivo independiente. `data-model.md` y `contracts/` van
embebidos aquí, igual que en `002-panel-administrativo/plan.md`.)*

### data-model.md (contrato que este módulo CONSUME)

Fuente de verdad de las tablas: [`../_shared/data-model.md`](../_shared/data-model.md).
**Migraciones = propiedad de 002.** Este módulo solo necesita que el esquema exponga:

**Tabla `inscripciones`** — el sitio inserta (vía RPC) filas nuevas en estado `pendiente`:

| Columna | Origen del valor en el flujo público |
|---|---|
| `folio` | **Servidor** (generado por `crear_inscripcion`) |
| `modalidad_tarifa` | **Servidor** (congelado de `obtener_tarifa_vigente()` en el INSERT) |
| `cantidad_personas` | Cliente (nº de participantes del payload) — el servidor puede revalidar contra `array_length` |
| `monto_esperado` | **Servidor** (`monto_final_con_descuento × cantidad_personas`, FR-022) |
| `url_comprobante` | Cliente pasa la ruta del objeto subido; servidor la guarda tal cual |
| `estado` | **Servidor** (`'pendiente'` fijo) |
| `motivo_rechazo` | `null` (lo usa 002) |
| `nombre_contacto`, `telefono_contacto`, `correo_contacto` | Cliente (datos del responsable) |
| `fecha_creacion` | **Servidor** (`now() AT TIME ZONE 'America/Costa_Rica'`) |

**Tabla `participantes`** — una fila por persona, en el mismo INSERT atómico:

| Columna | Origen |
|---|---|
| `inscripcion_id` | **Servidor** (FK a la fila recién creada) |
| `cedula`, `nombre`, `apellidos`, `talla_camisa` | Cliente |
| *(`genero` — solo si se resuelve Known Gap #2 vía opción (b))* | Cliente |

**Tabla `tarifas`** — **sin acceso directo** del rol `anon`. Solo se lee vía RPC.

### contracts/ — RPC y Storage que 002 debe exponer y 001 consume

#### RPC `obtener_tarifa_vigente()`  *(ya definida por la constitución y 002)*

- **Invocación**: `supabase.rpc('obtener_tarifa_vigente')` con clave `anon`.
- **Devuelve** (0 o 1 fila): `{ modalidad: 'Promocional'|'Regular',
  monto_por_persona: number, monto_final_con_descuento: number, fecha_fin: timestamptz }`.
- **Consumo en 001**:
  - `inscribete.astro` → tarjeta "Tarifa vigente" (modalidad, monto por persona, vence el
    `fecha_fin`). Si devuelve 0 filas → aviso "las tarifas no están disponibles en este
    momento" y **el formulario se deshabilita** (FR-021, FR-023).
  - `PasoComprobante.tsx` → total estimado = `monto_final_con_descuento × cantidad_personas`.

#### RPC `crear_inscripcion(payload jsonb)` → `jsonb`  *(NUEVA — ver Known Gap #1)*

- **Invocación**: `supabase.rpc('crear_inscripcion', { payload })` con clave `anon`.
- **`payload`**:
  ```jsonc
  {
    "responsable": { "nombre_contacto": "…", "telefono_contacto": "…", "correo_contacto": "…" },
    "url_comprobante": "abc123….jpg",            // ruta del objeto ya subido a 'comprobantes'
    "participantes": [
      { "cedula": "…", "nombre": "…", "apellidos": "…", "talla_camisa": "…" }
      // … 1..N
    ]
  }
  ```
- **Comportamiento** (todo en una transacción, `SECURITY DEFINER`):
  1. Lee la tarifa vigente (misma lógica que `obtener_tarifa_vigente()`).
     Si **no hay** → `RAISE EXCEPTION` con código controlado → **no escribe nada** (FR-023).
  2. `cantidad_personas := jsonb_array_length(payload->'participantes')` (≥ 1).
  3. `monto_esperado := monto_final_con_descuento * cantidad_personas` (FR-022).
  4. Genera `folio` (formato pendiente — Known Gap #6).
  5. `INSERT` en `inscripciones` (estado `'pendiente'`, `modalidad_tarifa` congelada,
     `fecha_creacion` en `America/Costa_Rica`) + `INSERT` de cada `participantes`.
  6. **Devuelve** `{ "folio": "BH-2026-0142", "cantidad_personas": 3, "monto_esperado": 54000 }`.
- **Ningún monto ni folio del cliente es aceptado** (Principio VIII.4).
- **Errores** que 001 debe manejar en la UI:
  - "sin tarifa activa" → mensaje FR-023, no marca el envío como exitoso.
  - error de validación de campos → 001 ya valida en cliente; si el servidor rechaza,
    mostrar mensaje genérico de reintento.

#### RPC `consultar_estado_inscripcion(p_folio text, p_cedula text)` → `jsonb`

- **Invocación**: `supabase.rpc('consultar_estado_inscripcion', { p_folio, p_cedula })`
  con clave `anon`. `SECURITY DEFINER`.
- **Devuelve** si folio + cédula coinciden **exactamente** con un participante de ese folio:
  `{ folio, estado: 'pendiente'|'aprobada'|'rechazada', modalidad_tarifa, cantidad_personas }`.
- **Si no hay coincidencia**: devuelve vacío / `null` (nunca indica cuál dato falló —
  FR-026, SC-007, Principio IX.4).
- **Nunca** devuelve datos de otros participantes ni de otros folios.
- **Consumo en 001**: `ConsultaEstado.tsx` renderiza la tarjeta de resultado con badge de
  estado (amber/emerald/red) o el mensaje genérico "No se encontró ninguna inscripción con
  esos datos".

#### Storage — bucket `comprobantes`

- **Privado**. Rol `anon`: solo `INSERT` (`upload`). Sin `SELECT`.
- **001 hace**: `supabase.storage.from('comprobantes').upload(`${uuid}.${ext}`, blobComprimido)`.
- **Formatos aceptados** (cliente, FR-004): JPG, PNG, PDF de imagen. Compresión de imagen
  con `browser-image-compression` (`maxSizeMB` ~1, `maxWidthOrHeight` 1920). Para PDF: no se
  comprime como imagen — validar tamaño y rechazar si excede el límite (Caso Límite del
  spec).

### Isla n.º 1 — `FormularioInscripcion.tsx` (mapeo a HU1)

| Escenario de aceptación (HU1) | Implementación |
|---|---|
| 1 — envío vacío → errores por campo, no envía | `validacion.ts` + estado de errores por campo en cada paso; `Stepper` bloquea avanzar. |
| 2 — datos completos + comprobante → INSERT atómico `pendiente` + confirmación con folio | `subirComprobante()` → `crearInscripcion()` (RPC) → `ConfirmacionEnvio` muestra `folio`. |
| 3 — imagen grande → se comprime sola en cliente | `comprimirComprobante()` corre siempre antes de `upload`, sin UI extra. |
| 4 — varios participantes → todos bajo el mismo folio | `payload.participantes[]` → la RPC los inserta con el mismo `inscripcion_id`. |
| Caso límite — correo inválido | regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` en `PasoResponsable`. |
| Caso límite — archivo excede el límite tras comprimir | `PasoComprobante` bloquea el envío y muestra el error. |
| Caso límite — no hay tarifa activa | `inscribete.astro` deshabilita la isla; además la RPC falla de forma controlada. |

**Estructura del stepper** (de `desing/docs/07` → "Stepper de Inscríbete"):

- **Paso 1** `PasoResponsable`: `nombre_contacto`, `telefono_contacto`, `correo_contacto` +
  input "Cantidad de personas a inscribir" (min 1, incluye al responsable en el conteo; el
  nº de pestañas del paso 2 se deriva **solo** de este input, sin botón "Agregar").
- **Paso 2** `PasoParticipantes`: una pestaña por participante (`PanelParticipante`):
  `cedula`, `nombre`, `apellidos`, `talla_camisa` *(+ `genero` solo si Gap #2 → opción b)*.
  Validación por pestaña; salto automático a la primera con error.
- **Paso 3** `PasoComprobante`: adjuntar comprobante (JPG/PNG/PDF) + total **estimado**
  (`monto_final_con_descuento × cantidad`) + botón "Enviar inscripción".
- **Éxito**: `ConfirmacionEnvio` — folio grande (`font-poster font-black`), estado
  "pendiente", instrucción de guardarlo para la consulta.

### Isla n.º 2 — `ConsultaEstado.tsx` (mapeo a HU2)

| Escenario de aceptación (HU2) | Implementación |
|---|---|
| 1 — folio + cédula válidos → estado + datos del grupo | `consultarEstado()` → tarjeta con `estado`, `folio`, `modalidad_tarifa`, `cantidad_personas`. |
| 2 — combinación inexistente → mensaje genérico | RPC devuelve vacío → "No se encontró ninguna inscripción con esos datos" (sin decir cuál falló). |
| 3 — folio o cédula en blanco → error de validación, no consulta | `validacion.ts`: ambos obligatorios antes de llamar la RPC. |

### Design system (referencia, no se re-documenta)

Todo el detalle visual está en [`desing/`](desing/README.md):
`docs/02-colors.md` (tokens `@theme`), `docs/03-typography.md` (Barlow Condensed + Inter,
escalas), `docs/04-spacing-layout.md` (contenedores, breakpoints, `py-16 sm:py-20 md:py-24`),
`docs/05-components.md` (código `.astro` de los componentes compartidos),
`docs/06-pages-sections.md` (layout base + `Nav`/`Footer` + composición de cada página),
`docs/07-interactivity.md` (cada `<script>` decorativo), `docs/08-images-assets.md`
(4 assets locales + placeholders Unsplash + íconos SVG inline).

### quickstart.md

Archivo independiente: [`quickstart.md`](quickstart.md). Cubre: build + `astro check`;
variables de entorno; Home y navegación; tarjeta de tarifa (con y sin tarifa activa);
inscripción de 1 y de N participantes (INSERT atómico, folio, compresión); casos límite
(correo inválido, archivo grande, sin tarifa); consulta por folio + cédula (éxito y
combinación inválida genérica); verificación rápida de seguridad (solo clave `anon` en el
bundle, sin SELECT directo, bucket privado).

## Phase 2

`tasks.md` lo genera `/speckit-tasks`. **No** es salida de este comando.
