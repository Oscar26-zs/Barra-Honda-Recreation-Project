---
description: "Task list for Panel Administrativo implementation"
---

# Tasks: Panel Administrativo — Recreativa Barra Honda

**Input**: Design documents from `/specs/002-panel-administrativo/`

**Prerequisites**: plan.md (required), spec.md (required), research.md

**Tests**: No se generaron tareas de pruebas automatizadas — el spec no las solicita
explícitamente. La validación se hace vía `quickstart.md` (escenarios manuales) y
`pnpm build` en cada hito (equivale al `npm run build` de la constitución: control de
calidad antes de integrar).

**Organization**: Tasks are grouped by user story (HU3, HU4, HU5, HU6) to enable independent
implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (HU3, HU4, HU5, HU6)
- Include exact file paths in descriptions

## Path Conventions

El código vive en `/admin/src/` organizado por módulo funcional (auth/, inscripciones/,
tarifas/, perfil/, layout/, hooks/, components/ui/). Las migraciones viven en
`/supabase/migrations/`. La Edge Function en `/supabase/functions/notificar-inscripcion/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del proyecto: dependencias nuevas y base de estilos.

- [X] T001 Instalar dependencias de Tailwind CSS v4 y shadcn/ui en `admin/package.json`
      (`tailwindcss`, `@tailwindcss/vite`, `class-variance-authority`, `clsx`,
      `tailwind-merge`, `lucide-react`) con pnpm
- [X] T002 [P] Integrar plugin `@tailwindcss/vite` en `admin/vite.config.ts`
- [X] T003 [P] Configurar `cn()` en `admin/src/lib/utils.ts` (clsx + tailwind-merge) para shadcn/ui
- [X] T004 [P] Crear el bloque `@import "tailwindcss"` + `@theme` con el Design Token Mapping completo
      en `admin/src/index.css` (ver sección "Design Token Mapping" de plan.md) — mapeo de
      `--azul-barra`, `--azul-barra-tint`, `--canvas`, `--ink`, `--mute`, `--hairline`,
      `--hairline-input` a `--primary`, `--secondary`, `--background`, `--foreground`,
      `--muted-foreground`, `--border`, `--input`; y los `--status-*` para estados de
      inscripciones y descuentos (Programado → `--status-scheduled-*`, NO `--primary`)
- [X] T005 [P] Inicializar shadcn/ui con `components.json` y crear los componentes base en
      `admin/src/components/ui/` (button, badge, card, table, dialog, sheet, input, avatar,
      dropdown-menu)
- [X] T006 [P] Actualizar `admin/src/types/index.ts` con los tipos `Inscripcion`, `Participante`,
      `Tarifa`, `Descuento`, `EstadoInscripcion`, `EstadoDescuento` (reemplaza `admin/src/types.ts` actual)
- [X] T007 [P] Crear hook `useBreakpoint` en `admin/src/hooks/useBreakpoint.ts` (detección
      responsive desktop/mobile)
- [X] T008 [P] Crear hook `useAuth` en `admin/src/hooks/useAuth.ts` (sesión actual, `signOut`, loading)
- [X] T009 [P] Auditar `supabase/migrations/001_inscripciones.sql` y `admin/src/types.ts`
      actuales y documentar (comentario en `002_schema_completo.sql`) el mapeo de columnas
      viejas→nuevas que la migración debe **renombrar**: `nombre_completo`→`nombre_contacto`,
      `telefono`→`telefono_contacto`, `correo_electronico`→`correo_contacto`,
      `comprobante_path`→`url_comprobante`, `created_at`→`fecha_creacion`

---

## Phase 2: Foundational (Blocking Prerequisites) — MIGRACIONES

**Purpose**: Infraestructura de base de datos DEBE estar completa antes de cualquier historia.
**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T010 Crear `supabase/migrations/002_schema_completo.sql` — **renombrar** las columnas
      de `001` (ver T009) y **ampliar** `inscripciones` (folio, modalidad_tarifa,
      cantidad_personas, monto_esperado, `motivo_rechazo text NULL`); crear tabla
      `participantes` (inscripcion_id FK, cedula, nombre, apellidos, talla_camisa); crear
      tabla `tarifas` (`modalidad text CHECK (modalidad IN ('Promocional','Regular'))`,
      monto_por_persona, fecha_inicio, fecha_fin, activa — **una única fila `activa = true`**).
      Esta migración es la **ÚNICA fuente de verdad** para estas tablas (ver "Propiedad de
      las migraciones")
- [X] T011 [P] Crear `supabase/migrations/003_descuentos.sql` — tabla `descuentos` (nombre,
      fecha_inicio, fecha_fin, porcentaje, `aplica_a` FK NULLABLE → tarifas.id, reservado y
      **SIEMPRE NULL en esta versión**, `desactivado boolean NOT NULL DEFAULT false` — FR-033).
      Crear vista `descuentos_estado` que expone `estado_descuento` calculado con `CASE` que
      **prioriza `desactivado`** (si `true` → 'Vencido') sobre la comparación de
      `(now() AT TIME ZONE 'America/Costa_Rica')::date` vs fecha_inicio/fecha_fin inclusivas
      (**NO** usar `GENERATED ALWAYS AS`: `now()` no es IMMUTABLE). Crear función + trigger
      `plpgsql` BEFORE INSERT/UPDATE que rechaza el solapamiento de fechas con otro descuento
      no "Vencido" (FR-031), **EXCLUYENDO** de la comparación los descuentos con
      `desactivado = true` (FR-033). RLS: solo rol authenticated
      (SELECT/INSERT/UPDATE/DELETE) sobre `descuentos` y `descuentos_estado`,
      sin políticas para rol anon
- [X] T012 [P] Implementar generación de folio (`BH-2026-####`) en la migración de esquema
      (trigger en INSERT de `inscripciones`)
- [X] T013 [P] Definir RLS: `inscripciones` y `participantes` con INSERT-only para rol anon y
      acceso total para authenticated (DELETE incluido por constitución; la ausencia de acción
      de borrado es una restricción de UI — FR-017, no de RLS); `tarifas` con SELECT/UPDATE
      solo para authenticated (sin SELECT para anon); `descuentos` + vista `descuentos_estado`
      solo authenticated
- [X] T014 [P] Crear RPC `obtener_tarifa_vigente()` (SECURITY DEFINER, solo lectura) en
      `supabase/migrations/002_schema_completo.sql` — filtra la fila con `activa = true` (una
      sola en esta versión). Usa `fecha_inicio`/`fecha_fin` para calcular la modalidad vigente
      (Promocional o Regular) pero **NO como filtro de existencia**: la RPC devuelve la tarifa
      siempre que `activa = true`; solo retorna vacío cuando no hay ninguna fila con
      `activa = true`. `LEFT JOIN` con la vista `descuentos_estado` donde
      `estado_descuento = 'Activo'` (aplica_a siempre NULL en esta versión). Devuelve
      `modalidad`, `monto_por_persona`, `monto_final_con_descuento`, `fecha_fin`
- [X] T015 [P] Crear RPC `buscar_estado_inscripcion()` (SECURITY DEFINER, folio + cédula) en
      la migración 002 — para el spec hermano; el panel no la usa directamente pero es parte
      del contrato de BD compartido

**Checkpoint**: Foundation ready — las historias de usuario pueden comenzar.

---

## Phase 3: User Story HU3 — Revisión de Inscripciones (Priority: P3)

**Goal**: El administrador autenticado ve la lista de inscripciones (con buscador, filtros por
estado) y el detalle completo de cualquier inscripción (responsable, participantes, comprobante).

**Independent Test**: Login, navegar a Inscripciones, filtrar por estado, abrir detalle de una
inscripción y ver los datos completos + comprobante.

### Implementación

- [X] T016 [P] [HU3] Implementar `AuthGuard` en `admin/src/auth/AuthGuard.tsx` que redirige a
      `/login` si no hay sesión (FR-011), conectado con `App.tsx`
- [X] T017 [P] [HU3] Reubicar y refactorizar `admin/src/pages/Login.tsx` → `admin/src/auth/Login.tsx`
      usando componentes shadcn (Input, Button)
- [X] T018 [P] [HU3] Crear `admin/src/layout/AppLayout.tsx` — layout de dos columnas (sidebar
      izquierdo + área de contenido con `<Outlet/>`), fondo `--fondo-app`, sidebar con
      navegación a Inscripciones/Tarifas
- [X] T019 [P] [HU3] Crear `admin/src/layout/BottomTabBar.tsx` — bottom tab bar mobile
      (Inscripciones, Tarifas, Perfil)
- [X] T020 [P] [HU3] Crear hook `useInscripciones` en `admin/src/hooks/useInscripciones.ts`
      (fetch con filtro por estado, search)
- [X] T021 [HU3] Reubicar y refactorizar `admin/src/components/ListaInscripciones.tsx` →
      `admin/src/inscripciones/ListaInscripciones.tsx` con shadcn Table + Badge (columnas Folio,
      Contacto, Participantes, Monto, Estado, Fecha, "Ver detalle"). Responsive: tarjetas apiladas
      en mobile (ver panel-layout.md)
- [X] T022 [HU3] Crear `admin/src/inscripciones/BuscadorInscripciones.tsx` — input "Buscar por
      folio, cédula o nombre..." (compartido desktop/mobile)
- [X] T023 [HU3] Crear `admin/src/inscripciones/FiltrosInscripciones.tsx` — chips de filtro por
      estado (Todas/Pendiente/Aprobada/Rechazada) para desktop, y bottom sheet con opciones radio
      + botón "Aplicar" para mobile (Sheet + RadioGroup)
- [X] T024 [HU3] Crear `admin/src/inscripciones/ExportarExcel.tsx` — botón "Exportar a Excel"
      (desktop) / "Exportar" (mobile) que descarga la lista visible (respetando filtro por
      estado + búsqueda) como CSV/Excel con columnas folio, contacto, personas, modalidad,
      monto, estado, fecha (FR-032). Estilo (sólido vs. tint) = Known Gap #1, se ajusta en T045
- [X] T025 [HU3] Reubicar y refactorizar `admin/src/components/DetalleInscripcion.tsx` →
      `admin/src/inscripciones/DetalleInscripcion.tsx` con shadcn Card (datos contacto,
      participantes, comprobante con botón "Ampliar"). Encabezado en dos columnas en mobile.
      Botones Aprobar/Rechazar en flujo normal de scroll (NO sticky)
- [X] T026 [HU3] Modificar `admin/src/App.tsx` — integrar AuthGuard, rutas protegidas con
      AppLayout, ruta `/inscripciones` y `/inscripcion/:id`

**Checkpoint**: HU3 funcional y testeable de forma independiente.

---

## Phase 4: User Story HU4 — Aprobación/Rechazo con Notificación (Priority: P4)

**Goal**: Desde el detalle de una inscripción, el admin aprueba o rechaza; el estado cambia y se
envía correo automático al responsable vía Resend.

**Independent Test**: Aprobar una inscripción pendiente → estado cambia a "aprobada" y llega
correo; rechazar → estado cambia a "rechazada" y llega correo.

### Implementación

- [X] T027 [HU4] Implementar lógica `cambiarEstado(id, nuevo_estado, motivo?)` en
      `admin/src/hooks/useInscripciones.ts` — actualiza `estado` (y `motivo_rechazo` cuando es
      rechazo; el motivo es obligatorio en ese caso) en `inscripciones` (transición
      definitiva, no reversible) y dispara la Edge Function
- [X] T028 [HU4] Implementar la integración real con Resend en
      `supabase/functions/notificar-inscripcion/index.ts` — enviar correo al `correo_contacto`
      indicando aprobación o rechazo + folio + nombre, y el **motivo** cuando es rechazo
      (FR-018, FR-019, FR-019a). Si Resend falla: NO revertir el cambio de estado; registrar
      el error en el log de la función y devolver `200` con `{ email_enviado: false }` (caso
      límite del spec). La clave `RESEND_API_KEY` SOLO como variable de entorno de la función
      (Principio IV)
- [X] T029 [HU4] Conectar la Edge Function en `useInscripciones.ts` — invocar
      `notificar-inscripcion` con `{ inscripcion_id, nuevo_estado, motivo }` tras el cambio de
      estado (FR-020, Principio VI). Un fallo de correo NO revierte el cambio de estado ni
      bloquea la UI; se muestra un aviso no bloqueante si `email_enviado === false`
- [X] T030 [HU4] Agregar en `DetalleInscripcion.tsx`: (a) modal de confirmación para "Aprobar"
      (sin campos), (b) modal de confirmación para "Rechazar" con campo **obligatorio** de
      motivo (Dialog de shadcn), (c) deshabilitar Aprobar/Rechazar cuando el estado ya es
      final ("aprobada"/"rechazada"). El motivo se pasa a `cambiarEstado` y se persiste en
      `inscripciones.motivo_rechazo` (FR-015, FR-019a)

**Checkpoint**: HU4 funcional. El correo se envía automáticamente al cambiar de estado.

---

## Phase 5: User Story HU5 — Gestión de Descuentos (Priority: P5)

**Goal**: El admin gestiona descuentos sobre tarifas existentes (crear, editar, eliminar), con
estado automático por fecha y vista previa en vivo del precio con descuento. FR-027 a FR-031.

**Independent Test**: Crear un descuento (vista previa en vivo, estado "Activo" si la fecha lo
indica), editarlo, eliminarlo; verificar validación de no-superposición.

### Implementación

- [X] T031 [P] [HU5] Crear hook `useDescuentos` en `admin/src/hooks/useDescuentos.ts` (fetch
      desde la vista `descuentos_estado`, create, update, delete) + validación en cliente de
      no-superposición (bloquea crear/editar si ya existe otro descuento "Activo" o
      "Programado" con fechas superpuestas). Agregar `desactivarDescuento(id)` →
      `UPDATE descuentos SET desactivado = true WHERE id = ...` (FR-033). La garantía
      definitiva es el trigger de BD (T011); el cliente sólo adelanta el error
- [X] T032 [P] [HU5] Crear `admin/src/tarifas/TarifaCard.tsx` — tarjeta "Tarifa vigente" con monto
      en azul (shadcn Card)
- [X] T033 [P] [HU5] Crear `admin/src/tarifas/ListaDescuentos.tsx` — lista de descuentos
      (fuente: vista `descuentos_estado`) con badge de estado calculado, rango de fechas,
      porcentaje y menú ⋮ (editar/eliminar/**Desactivar**) (Card + Badge + DropdownMenu). El
      ítem "Desactivar" solo es visible cuando `estado_descuento` es 'Programado' o 'Activo'
      (FR-033), con modal de confirmación de acción irreversible (mismo patrón que rechazar
      inscripción). Sin chip de "tarifa aplicable" en esta versión (una sola tarifa)
- [X] T034 [HU5] Crear `admin/src/tarifas/FormularioDescuento.tsx` — formulario con nombre,
      fecha inicio/fin y porcentaje (input con `%`). En esta versión **NO** hay selector
      "Aplica a" (una sola tarifa activa; el descuento siempre aplica sobre ella). Vista
      previa en vivo: `VistaPreviaDescuento.tsx` (precio tachado → precio con descuento en verde)
- [X] T035 [HU5] Validar no-superposición en el cliente dentro de `FormularioDescuento.tsx`
      usando `useDescuentos` — mostrar error y bloquear "Guardar" si hay conflicto; además
      manejar el error que devuelva el trigger de BD (T011) si dos escrituras compiten
- [X] T036 [HU5] Crear `admin/src/tarifas/FormularioDescuentoDesktop.tsx` — wrapper modal (Dialog
      de shadcn) para desktop, botón "Guardar descuento" deshabilitado en azul pastel hasta
      completar el formulario
- [X] T037 [HU5] Crear `admin/src/tarifas/FormularioDescuentoMobile.tsx` — pantalla completa con
      header propio ("Nuevo/Editar descuento"), fechas en formato legible, botón "Guardar
      descuento" **sticky** al fondo, estado deshabilitado azul pastel (no gris)
- [X] T038 [P] [HU5] Crear rutas/pantalla de Tarifas en `App.tsx` o `AppLayout` — integrar
      `TarifaCard` + `ListaDescuentos` + formularios
- [X] T039 [P] [HU5] Crear `perfil/PerfilSidebar.tsx` (desktop, inline al fondo del sidebar) y
      `perfil/PerfilBottomSheet.tsx` (mobile, third tab, bottom sheet con avatar/nombre/correo +
      "Cerrar sesión") — ambos usando `useAuth` (una lógica, dos renderizaciones)

**Checkpoint**: HU5 funcional. Descuentos con estado automático, regla de no-superposición y
vista previa en vivo.

---

## Phase 6: User Story HU6 — Registro Manual de Inscripción (Priority: P6)

**Goal**: El administrador registra manualmente una inscripción desde el panel cuando el pago
fue verificado fuera del sistema, sin comprobante obligatorio. FR-034 a FR-037.

**Independent Test**: Registro manual con datos de responsable + al menos un participante sin
comprobante → aparece en la lista con `url_comprobante` vacío y estado "pendiente"; sigue el
mismo flujo de aprobar/rechazar que las inscripciones públicas.

### Implementación

- [X] T040 [HU6] Agregar `crearInscripcionManual` a `admin/src/hooks/useInscripciones.ts`
      (INSERT atómico inscripción + participantes, sin comprobante obligatorio — `url_comprobante`
      puede ser null —, reutiliza el cálculo de servidor: folio, `modalidad_tarifa`,
      `monto_esperado` FR-034, FR-036)
- [X] T041 [HU6] Crear `admin/src/inscripciones/NuevaInscripcion.tsx` — formulario con datos de
      responsable + participantes dinámicos (agregar/quitar), campo de comprobante OPCIONAL con
      la misma compresión en cliente que el sitio público (browser-image-compression, Principio I),
      validación de campos obligatorios excepto comprobante (FR-034, FR-035, FR-037)
- [X] T042 [HU6] Agregar botón "Registrar inscripción" en
      `admin/src/inscripciones/ListaInscripciones.tsx` y ruta `/inscripciones/nueva` en `App.tsx`
- [X] T043 [HU6] Manejar el caso "no hay tarifa activa" (FR-023 del spec hermano) en el
      formulario: mostrar error controlado, no permitir guardar fila parcial (FR-036)

**Checkpoint**: HU6 funcional. El admin puede registrar manualmente inscripciones desde el
panel con el mismo flujo de aprobación/rechazo que las públicas.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras que afectan a múltiples historias.

- [X] T044 [P] Verificar Known Gap #2 (color "Programado") — confirmar que `--status-scheduled-*`
      usa `#4B80E8` y NO `--primary`; señalar al propietario si se decide unificar
- [X] T045 [P] Verificar Known Gap #1 (botón "Exportar a Excel") — resolver con el propietario si
      es sólido azul o tint antes de finalizar `ExportarExcel.tsx`
- [X] T046 Verificar Known Gap #3 (estados hover/focus) — `opacity` en hover y `box-shadow`
      sutil en focus-visible en botones y chips
- [X] T047 [P] Verificar Known Gap #4 (pantalla "Registrar inscripción") — validar visualmente
      con el propietario que el estilo de `NuevaInscripcion.tsx` (shadcn Input, Button, Card
      en el mismo tono del panel) es aceptable antes de considerarlo definitivo (ver plan.md
      §Known Gaps #4); no bloquea T041 — la implementación procede con estilo genérico del panel
- [X] T048 [P] Ejecutar el build de producción en `admin/` (`pnpm build` → tsc + vite build;
      equivale al `npm run build` de la constitución) para garantizar que compila sin errores
- [X] T049 [P] Ejecutar la validación de `quickstart.md` — probar de extremo a extremo todos
      los escenarios listados (login, lista/filtros/búsqueda, detalle, aprobar/rechazar con
      motivo + correo, descuentos con estado y no-superposición **y desactivación manual FR-033**,
      registro manual de inscripción **HU6 FR-034 a FR-037**, exportación, responsive)
- [X] T050 Limpieza: eliminar `admin/src/pages/Dashboard.tsx` (lógica distribuida) y archivos
      viejos sin uso

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — puede empezar de inmediato
- **Foundational (Phase 2)**: Depende de Setup — **BLOQUEA todas las historias** (migraciones)
- **User Stories (Phase 3+)**: Todas dependen de Phase 1 + 2
  - Se pueden ejecutar en paralelo si hay capacidad, o en orden de prioridad (P3 → P4 → P5 → P6)
- **Polish (Fase 7)**: Depende de que las historias deseadas estén completas

### User Story Dependencies

- **HU3 (P3)**: Puede empezar tras Foundational. Sin dependencias de otras historias
- **HU4 (P4)**: Depende de HU3 (reutiliza DetalleInscripcion y la lista para el cambio de estado)
- **HU5 (P5)**: Puede empezar tras Foundational (migraciones 002/003). Depende de la tabla
  `tarifas` (creada en Foundational). Independiente de HU3/HU4
- **HU6 (P6)**: Puede empezar tras Foundational (Phase 2). Es independiente de HU3/HU4/HU5,
  salvo que reutiliza `ListaInscripciones.tsx` (creada en HU3) como punto de entrada del
  botón "Registrar inscripción"

### Within Each User Story

- Hooks/base antes de componentes de vista
- Core implementation antes de integración
- Historia completa antes de pasar a la siguiente prioridad

### Parallel Opportunities

- Todos los tasks del Setup marcados [P] son paralelos
- Los tasks de migración (T010-T015) son paralelos (archivos `.sql` distintos)
- T016-T020, T031, T032, T033, T038, T039 son paralelizables (archivos distintos)
- HU3, HU5 y HU6 pueden desarrollarse en paralelo en equipos distintos (HU4 depende de HU3;
  HU6 depende de la lista de HU3 solo para el punto de entrada del botón)

---

## Parallel Example: HU3 (después de Foundational)

```bash
# Lanzar componentes de vista HU3 en paralelo (archivos distintos):
Task: "Implement AuthGuard en admin/src/auth/AuthGuard.tsx"
Task: "Crear AppLayout en admin/src/layout/AppLayout.tsx"
Task: "Crear useInscripciones en admin/src/hooks/useInscripciones.ts"
```

---

## Implementation Strategy

### MVP (HU3 first)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (migraciones — CRÍTICO, bloquea todo)
3. Complete Phase 3: HU3 (Revisión de inscripciones)
4. **STOP and VALIDATE**: Probar HU3 independientemente
5. Deploy/demo si está listo

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add HU3 → Test independently → Deploy/Demo (MVP)
3. Add HU4 → Test independently → Deploy/Demo
4. Add HU5 → Test independently → Deploy/Demo
5. Add HU6 → Test independently → Deploy/Demo
6. Cada historia agrega valor sin romper las anteriores

---

## Notes

- [P] tasks = archivos distintos, sin dependencias
- [HUx] label mapea la tarea a la historia de usuario
- Las migraciones 002/003 forman parte de la fase Foundational y bloquean a todas las historias
- Regla de negocio clave: **NO se permite superposición de descuentos** (validación en cliente
  + trigger `plpgsql` en `descuentos` como garantía real). Una sola tarifa activa: los
  descuentos siempre aplican sobre ella (`aplica_a` reservado, siempre NULL)
- **Desactivación manual (FR-033)**: el campo `desactivado` fuerza el estado a "Vencido" y
  excluye al descuento de la validación de no-superposición; es irreversible en esta versión
- El estado del descuento (Programado/Activo/Vencido) se lee de la vista `descuentos_estado`,
  NO de una generated column (`now()` no es IMMUTABLE)
- `modalidad` de `tarifas`: valores fijos `Promocional` / `Regular` (spec.md)
- Cada historia es independientemente completable y testeable
- El cálculo de `monto_esperado` lo hace el spec hermano 001 (trigger en INSERT) usando
  `monto_final_con_descuento` de `obtener_tarifa_vigente()` — este módulo solo construye/expone
  la RPC
