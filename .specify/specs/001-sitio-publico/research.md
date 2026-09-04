# Phase 0 — Research & Decisiones: Sitio Público

**Feature**: `001-sitio-publico` | **Fecha**: 2026-09-03 | **Plan**: [plan.md](plan.md)

Consolida las decisiones técnicas del sitio público y los vacíos abiertos (Known Gaps) que
deben resolverse con el propietario antes de implementar la pieza afectada (Principio VII).

---

## §0 — Decisiones del propietario (2026-09-03)

Se plantearon 4 conflictos entre `spec.md`, `constitution.md` y la carpeta `desing/`. Las
respuestas del propietario:

| # | Pregunta | Decisión |
|---|---|---|
| 1 | Islas interactivas: ¿React/Vue/Svelte (constitución I) o `<script>` plano (`desing/docs/01`, `07`)? | **React** (`@astrojs/react`, `client:load`) para las 2 islas de datos. La interacción decorativa sigue siendo `<script>` plano. |
| 2 | ¿4 páginas del spec o 6 del diseño? | **4**, con los nombres del diseño: `/` (Home), `/galeria`, `/inscribete`, `/consultar`. Sin Historial ni Patrocinar. `inscribete` = "Precios / Inscripción" del spec. |
| 3 | ¿Contenido de marca del diseño o placeholder? | **Del diseño tal cual** (MTB El Valle del Nacaome, 5.ª Edición, 6-dic-2026, salida en la Escuela de Barra Honda). |
| 4 | ¿Precio hardcodeado (₡18.000 del diseño) o vía RPC + servidor (FR-021/022/023)? | **RPC + servidor.** Sin monto fijo en el cliente para el cálculo vinculante. |

> Consecuencia de (3) + (4): el contenido es el del diseño **excepto** las cifras de monto,
> que pasan a ser dinámicas — ver Known Gap #4.

---

## §1 — Interactividad decorativa sin framework

**Decisión**: countdown del Hero, animación de la silueta de ciclista por scroll, acordeones
(Experiencia / Reglamento / FAQ), carrusel de iframes Komoot, filtros + lightbox de la
galería y el menú mobile del Nav se implementan como `<script>` plano dentro de su `.astro`,
tal como los documenta `desing/docs/07-interactivity.md`.

**Rationale**: son manipulación de DOM local (toggle de clases, un `setInterval`, un cálculo
con `getBoundingClientRect`). No comparten estado, no consumen datos, no necesitan
hidratación. Meterlos en React añadiría peso de bundle y complejidad sin beneficio
(Principio V). No cuentan como "tercera pieza del stack" porque no agregan dependencias ni
paso de build.

**Alternativa rechazada** — todo en React: lo sugería `desing/docs/01`, pero la constitución
solo autoriza framework para "las dos islas interactivas descritas"; ampliarlo a lo
decorativo no aporta y contradice el espíritu del Principio V.

**Alternativa rechazada** — `<script>` plano también para las 2 islas de datos: contradice
el Principio I ("implementadas con React, Vue o Svelte como islas de Astro"). Gobernanza:
el conflicto se resuelve a favor de la constitución salvo enmienda aprobada, que no se
solicitó.

---

## §2 — INSERT atómico mediante una sola RPC

**Decisión**: el envío del formulario llama a **una** RPC de PostgreSQL,
`crear_inscripcion(payload jsonb)` (`SECURITY DEFINER`), que en una única transacción:
lee la tarifa vigente, calcula `cantidad_personas` y `monto_esperado`, genera el `folio`,
inserta la fila de `inscripciones` (estado `pendiente`) y todas las de `participantes`, y
devuelve `{ folio, cantidad_personas, monto_esperado }`. Si no hay tarifa activa,
`RAISE EXCEPTION` y **no se escribe ninguna fila** (FR-023).

**Rationale**: FR-006 y Principio IX.2 exigen atomicidad ("INSERT atómico en `inscripciones`
y `participantes`… en una única transacción"). El cálculo de monto debe ocurrir
exclusivamente en el servidor (FR-022, Principio VIII). Una RPC cubre ambas cosas y deja el
folio y el monto fuera del alcance del cliente (Principio VIII.4).

**Alternativa rechazada** — `supabase.from('inscripciones').insert()` seguido de
`supabase.from('participantes').insert()` desde el cliente (lo que hace el scaffold actual,
parcialmente): son dos transacciones separadas; un fallo de red entre ambas deja una
inscripción sin participantes. Además obliga a exponer el cálculo del monto al cliente.

**Alternativa rechazada** — Edge Function: la constitución (Principio IX.5) reserva las Edge
Functions para operaciones con secretos externos (Resend). Esta operación no los necesita;
una RPC es la pieza más simple (Principio V).

**Abierto** (Known Gap #1): en qué migración vive el objeto SQL y quién lo mantiene.

---

## §3 — Orden de subida del comprobante vs. creación de la fila

**Decisión**: (1) comprimir en el cliente → (2) `upload` a `comprobantes/<uuid>.<ext>` →
(3) pasar esa ruta dentro del `payload` de `crear_inscripcion`, que la persiste en
`inscripciones.url_comprobante`.

**Rationale**: el rol `anon` no tiene `UPDATE` sobre `inscripciones` (Principio II), así que
no es posible "insertar primero y actualizar la URL después". La ruta del objeto se conoce
antes del INSERT porque la genera el cliente (`crypto.randomUUID()`).

**Consecuencia aceptada**: si el paso (3) falla tras un `upload` exitoso, queda un objeto
huérfano en Storage. Es tolerable (no expone datos — bucket privado) y su limpieza es tarea
de mantenimiento/002, no del flujo público.

**Formatos** (FR-004): JPG, PNG, PDF de imagen. `browser-image-compression` solo aplica a
imágenes rasterizadas; para PDF se valida tamaño y se rechaza si supera el límite del nivel
gratuito de Storage (Caso Límite del spec) — no hay "compresión de PDF" en el cliente.

---

## §4 — Tarifa informativa en el cliente

**Decisión**: `inscribete.astro` llama a `obtener_tarifa_vigente()` en build/carga y muestra
`modalidad`, `monto_por_persona` y `fecha_fin`. El total del paso 3 del stepper se calcula
como `monto_final_con_descuento × cantidad_personas` y se rotula explícitamente como
**estimado**. El valor vinculante lo congela `crear_inscripcion` en el servidor.

**Rationale**: FR-021 (mostrar tarifa vigente de forma informativa) + FR-022 (cálculo
congelado solo en servidor) + Principio VIII.1. Mostrar el estimado con el precio ya
descontado (`monto_final_con_descuento`) evita que el usuario vea una cifra y el servidor
congele otra distinta cuando hay un descuento activo.

**Sin tarifa activa**: `inscribete.astro` muestra el aviso "las tarifas no están disponibles
en este momento" y **deshabilita** la isla del formulario (FR-021, FR-023). Doble defensa:
la RPC `crear_inscripcion` también falla de forma controlada.

---

## §5 — Known Gaps

> **Estado tras la implementación (2026-09-03)**: los gaps #2, #3 y #4 recibieron una
> resolución **provisional en código** para no bloquear el build y priorizar la fidelidad
> visual del diseño (instrucción del propietario). Siguen abiertos para confirmación
> formal.
>
> - **#1 (RPC `crear_inscripcion`)** → SQL escrito en
>   `supabase/migrations/004_crear_inscripcion_genero_storage.sql` (SECURITY DEFINER +
>   secuencia de folio + bucket `comprobantes`). **Pendiente de aplicar** en el proyecto
>   Supabase `hiwgufaokesimivttvmn` (SQL Editor / `service_role`).
> - **#6 (folio)** → resuelto en esa migración: `BH-<YYYY CR>-<NNNN>` vía `public.folio_seq`.
> - **RPC de consulta**: el proyecto la expone como `buscar_estado_inscripcion(p_folio,
>   p_cedula)`, no `consultar_estado_inscripcion`. `src/lib/consulta.ts` prueba ambos nombres.
> - **#2 (Sexo/Género)** → **RESUELTO (2026-09-03, opción b)**: el propietario pidió el
>   campo. `participantes.genero` (`CHECK (genero IN ('Hombre','Mujer'))`) se añade en
>   `supabase/migrations/004_crear_inscripcion_genero_storage.sql`; el formulario lo
>   captura con un toggle segmentado (`PanelParticipante.tsx`).
> - **#3 (tallas)** → set `XS,S,M,L,XL,XXL` en `src/lib/tipos.ts` (`TALLAS_CAMISA`).
> - **#4 (monto en el chrome)** → se **mantuvo** "₡18.000" literal del diseño en `Nav.astro`
>   (CTA del menú mobile) y `Footer.astro` ("Inversión: ₡18.000"). El monto dinámico
>   (RPC) rige la tarjeta de tarifa y el total del stepper en `/inscribete`.
> - **Desvío del plan**: `inscribete.astro` **ya no** llama `obtener_tarifa_vigente()` en
>   build; la tarifa se pide en el cliente desde la isla (`FormularioInscripcion` →
>   `useEffect`), para que el build estático no dependa de Supabase. La tarjeta de tarifa
>   vive dentro de la isla, no en el `.astro`.


### Gap #1 — Propiedad de `crear_inscripcion` y del cálculo de `monto_esperado`

`002-panel-administrativo/plan.md` afirma: *"el trigger/función de INSERT que calcula
`monto_esperado` en `inscripciones` (FR-022 del spec hermano) pertenece al módulo 001 y no
se implementa aquí"*. Pero `_shared/data-model.md` → "Propiedad de las migraciones" dice que
las migraciones de `inscripciones`/`participantes`/`tarifas` **son de 002** y que 001
**"NO debe crear ni mantener migraciones propias para ellas"**.

**Contradicción**: 001 es responsable de la lógica pero no puede aportar la migración que la
contiene.

**Propuesta** (a ratificar): el objeto SQL (`crear_inscripcion` + generación de folio +
cálculo de `monto_esperado`) vive físicamente en `supabase/migrations/` (raíz), dentro del
set de migraciones que opera 002, pero su **especificación funcional** (firma, payload,
cálculo, manejo de "sin tarifa", formato de folio) es de este módulo y está fijada en
`plan.md` → "contracts/". Cualquier cambio de esa firma se coordina entre ambos specs.

**Impacto si no se decide**: bloquea la implementación del INSERT — la isla n.º 1 no tiene
contra qué llamar.

### Gap #2 — Campo "Sexo" del diseño sin columna en el modelo

`desing/docs/05-components.md` define un toggle **Sexo (Hombre / Mujer)** obligatorio por
participante. Ni `spec.md` FR-003 ni `_shared/data-model.md` (`participantes`: `cedula`,
`nombre`, `apellidos`, `talla_camisa`) contemplan ese dato.

**Opciones**:
- **(a) Omitir** el campo Sexo del formulario. Se ciñe al spec y al modelo compartido.
  *Propuesta por defecto.*
- **(b) Añadir** `genero` a `participantes` (migración de 002) + actualizar
  `_shared/data-model.md`, FR-003 y las plantillas de correo de 002 si aplica.

**Impacto**: afecta `PanelParticipante.tsx`, el payload de `crear_inscripcion` y la
validación por pestaña.

### Gap #3 — Valores de `talla_camisa`

El diseño menciona un `<select>` de ~6 tallas ("Talla de jersey") sin fijar los valores.
Falta: la lista exacta (¿`XS`,`S`,`M`,`L`,`XL`,`XXL`? ¿otra?) y si se refuerza con un
`CHECK` en la BD (lo aplicaría 002).

**Impacto**: `PanelParticipante.tsx` (opciones del select) y validación cliente/servidor.

### Gap #4 — Monto en el "chrome" del sitio

El diseño hardcodea "₡18.000" en el CTA del Nav ("Inscribirme — ₡18.000") y en el Footer
("Inversión: ₡18.000 por persona"). Con el monto ahora dinámico (§4):

**Propuesta**: quitar la cifra de Nav y Footer (el CTA queda "Inscribirme"); el monto se
muestra únicamente en `inscribete.astro` desde `obtener_tarifa_vigente()`.
**Alternativa**: hidratar también esos textos desde la RPC (más complejo, poco valor).

**Impacto**: `Nav.astro`, `Footer.astro`.

### Gap #5 — Markup real de las secciones de Home

`desing/README.md` y `docs/06` describen la traducción como "1:1 del `src/` React original"
(p. ej. *"ver `src/sections/Inicio.tsx` líneas 90-980"*). **Ese proyecto React original no
está en este repositorio.** Solo existen los `docs/*.md` del diseño + 4 imágenes locales +
IDs de placeholders Unsplash.

**Consecuencia**: las 8 secciones de `components/inicio/`, `GaleriaGrid.astro`, el historial
de íconos SVG y los tiles de galería deben **autorearse** desde los `docs/` del diseño, no
solo "portarse". `tasks.md` debe presupuestar esto como trabajo de construcción con
revisión visual del propietario, no como transcripción mecánica.

### Gap #6 — Formato y generación del `folio`

`spec.md` ejemplifica `BH-2026-0142`; `desing/docs/07` usa `BH-2026-${counter}`. Lo genera
`crear_inscripcion` en el servidor. Falta confirmar: prefijo (`BH`), de dónde sale el año
(fecha del INSERT vs. año del evento), ancho del contador (`0142` → 4 dígitos) y si la
secuencia se reinicia por edición.

**Impacto**: definición de `crear_inscripcion` (Gap #1) y el texto de `ConfirmacionEnvio`.

### Gap #7 — "Consultar": del mock a la RPC real

`desing/docs/07` resuelve la consulta con un diccionario `DEMO_RECORDS` en el cliente. Se
reemplaza por `consultar_estado_inscripcion(folio, cédula)`. El mapeo de estado → color del
badge (amber = pendiente, emerald = aprobada, red = rechazada) sale de `desing/docs/02`.
Sin gap de diseño; solo se registra que el mock **no** se porta.

---

## Resumen de dependencias nuevas

| Paquete | Motivo | Alternativa descartada |
|---|---|---|
| `tailwindcss` v4 + `@tailwindcss/vite` | Todo `desing/` está en utilidades Tailwind v4 + `@theme`. | CSS a mano → reescribir el diseño entero. |

Ya presentes en `sitio/package.json` (sin cambio): `astro`, `@astrojs/react`, `react`,
`react-dom`, `@supabase/supabase-js`, `browser-image-compression`.
