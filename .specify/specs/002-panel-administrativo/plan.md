# Implementation Plan: Panel Administrativo — Recreativa Barra Honda

**Branch**: `002-panel-administrativo` | **Date**: 2026-09-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-panel-administrativo/spec.md`

## Summary

Panel de gestión interna (React + Vite) para que el administrador de la recreativa revise,
apruebe o rechace inscripciones (HU3, HU4), gestione descuentos sobre tarifas existentes
(HU5) y reciba notificaciones automáticas por correo al cambiar de estado. El panel se
conecta a Supabase (PostgreSQL + Auth + Storage) y usa Resend vía Edge Function para
correos. El stack ya está inicializado en `/admin` con código funcional parcial: login,
lista de inscripciones, detalle con aprobar/rechazar, y un stub de Edge Function.

## Technical Context

**Language/Version**: TypeScript 5.6, React 18.3, Vite 5.4

**Primary Dependencies**: react-router-dom 6.27, @supabase/supabase-js 2.45, Tailwind CSS 4 (nueva),
shadcn/ui (nueva, sobre Tailwind), Lucide React (nueva, íconos)

**Storage**: Supabase PostgreSQL (RLS habilitado), Supabase Storage (bucket `comprobantes`, privado)

**Email**: Resend vía Supabase Edge Function (`notificar-inscripcion`)

**Testing**: No hay framework configurado; se sugiere Vitest + React Testing Library (agregar si
se requiere en una iteración futura; no forma parte de este plan)

**Target Platform**: Navegadores modernos (Chrome, Firefox, Safari, Edge). Responsive: desktop
(layout sidebar) + mobile (bottom tab bar + bottom sheets)

**Project Type**: SPA web (frontend React autónomo, sin backend propio — Supabase es el backend)

**Performance Goals**: Carga inicial < 3 s en banda ancha; no hay requisitos de latencia estrictos
para operaciones CRUD del admin (volumen de uso moderado)

**Constraints**: Autenticación requerida en todas las rutas excepto `/login`. RLS en todas las
tablas. Clave `anon` es la única clave de Supabase en el cliente. No se permite Resend
directo desde el navegador. El monto final se calcula exclusivamente en servidor.

**Scale/Scope**: 1 administrador (o equipo pequeño compartiendo credenciales). Decenas a cientos
de inscripciones por período. 3 pantallas principales (Inscripciones, Tarifas, Perfil) +
Login + modales/bottom sheets auxiliares.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Notas |
|---|---|---|
| I. Stack fijo (React+Vite / Supabase / Resend) | PASS | Cumplido. Tailwind + shadcn/ui son librerías de UI dentro del mismo stack React. |
| II. Seguridad datos públicos (RLS INSERT-only) | PASS | Tablas `inscripciones` y `participantes` requieren RLS. Nueva tabla `descuentos` es exclusiva del admin, sin acceso público. |
| III. Storage privado comprobantes | PASS | Bucket `comprobantes` ya configurado como privado. |
| IV. Secretos del servidor (Resend solo en Edge Function) | PASS | Clave Resend SOLO en Edge Function. No se expone al cliente. |
| V. Simplicidad y mantenibilidad | PASS | Organización por módulo funcional; abstracciones solo cuando hay 3+ duplicaciones. |
| VI. Flujo de notificaciones por cambio de estado | PASS | Edge Function existente se extiende; se invoca al aprobar/rechazar. |
| VII. Consultar antes de asumir | PASS | Decisiones abiertas documentadas en Research (Known Gaps). |
| VIII. Tarifas con promoción por tiempo limitado | PASS | Tabla `tarifas` maneja vigencia. `obtener_tarifa_vigente()` RPC ya definida. Descuentos son overlay sobre tarifas existentes, no reemplazo. |
| IX. Modelo grupal + consulta pública | PASS | Dos tablas (`inscripciones` + `participantes`). RPC SECURITY DEFINER para consulta pública. |

**Decisión pendiente (fuera de este plan)**: valores exactos de `modalidad` — se requiere
antes de la implementación de la tabla `tarifas` en el spec hermano 001. Este plan crea la
estructura de `tarifas` pero los valores de `modalidad` se dejan como `[PENDIENTE DE
DECISIÓN]` en la migración.

## Project Structure

### Documentation (this feature)

```text
specs/002-panel-administrativo/
├── plan.md                 # Este archivo
├── research.md             # Phase 0: decisiones técnicas y known gaps
├── data-model.md           # Phase 1: esquema completo de BD
├── quickstart.md           # Phase 1: guía de validación
├── contracts/              # Phase 1: contratos de UI (mapeo spec→componentes)
├── tasks.md                # Phase 2 (generado por /speckit-tasks)
├── spec.md                 # Feature specification (ya existe)
├── design/design-system.md # Tokens de diseño (ya existe)
├── design/panel-layout.md  # Layout de pantallas (ya existe)
└── checklists/requirements.md  # Checklist de requisitos (ya existe)
```

### Source Code (repository root)

```text
admin/
├── index.html
├── package.json                        # Dependencias nuevas: tailwindcss, @tailwindcss/vite,
│                                       # class-variance-authority, clsx, tailwind-merge,
│                                       # lucide-react
├── vite.config.ts                      # MODIFICADO: integrar plugin @tailwindcss/vite
├── src/
│   ├── main.tsx                        # Sin cambios
│   ├── index.css                       # NUEVO: Tailwind v4 — @import "tailwindcss" +
│                                       # bloque @theme con mapeo completo de tokens del
│                                       # design system a CSS variables de shadcn/ui
│                                       # (ver sección "Design Token Mapping" más abajo)
│   ├── vite-env.d.ts                   # Sin cambios
│   │
│   ├── lib/
│   │   ├── supabase.ts                 # Sin cambios (ya existe)
│   │   └── utils.ts                    # NUEVO: función cn() de shadcn (clsx + tailwind-merge)
│   │
│   ├── types/
│   │   └── index.ts                    # MODIFICADO: tipos Inscripcion, Participante,
│   │                                   # Tarifa, Descuento, EstadoInscripcion,
│   │                                   # EstadoDescuento (reemplaza types.ts actual)
│   │
│   ├── components/ui/                  # NUEVO: componentes shadcn/ui
│   │   ├── button.tsx                  # Mapeo: Botón primario/secundario/outline
│   │   ├── badge.tsx                   # Mapeo: Badges de estado (inscripciones + descuentos)
│   │   ├── card.tsx                    # Mapeo: Tarjeta de tarifa vigente, tarjeta de descuento
│   │   ├── table.tsx                   # Mapeo: Tabla de inscripciones (desktop)
│   │   ├── dialog.tsx                  # Mapeo: Modal "Nuevo descuento" (desktop)
│   │   ├── sheet.tsx                   # Mapeo: Bottom sheets mobile (Filtros, Perfil)
│   │   ├── input.tsx                   # Campos de formulario (texto, fecha, porcentaje)
│   │   ├── avatar.tsx                  # Avatar circular en Perfil
│   │   └── dropdown-menu.tsx           # Menú de tres puntos (⋮) en lista de descuentos
│   │
│   ├── auth/                           # MÓDULO: Autenticación (envuelve y protege los demás)
│   │   ├── AuthGuard.tsx               # NUEVO: wrapper de rutas que redirige a /login si
│   │                                   # no hay sesión (FR-011). Se conecta con App.tsx para
│   │                                   # envolver las rutas de inscripciones/tarifas/perfil.
│   │   └── Login.tsx                   # MOVIDO desde pages/Login.tsx + refactorizado con
│   │                                   # componentes shadcn (Input, Button)
│   │
│   ├── inscripciones/                  # MÓDULO: Historias 3 y 4 (FR-012 a FR-020)
│   │   ├── ListaInscripciones.tsx      # MODIFICADO: migrado desde components/ al módulo,
│   │   │                               # refactorizado con shadcn Table + Badge, responsive
│   │   │                               # (tabla desktop, tarjetas mobile)
│   │   ├── DetalleInscripcion.tsx      # MODIFICADO: migrado desde components/, refactorizado
│   │   │                               # con shadcn Card, responsive (encabezado desktop vs
│   │   │                               # dos columnas mobile, botones no-sticky)
│   │   ├── FiltrosInscripciones.tsx    # NUEVO: chips de filtro desktop + bottom sheet mobile
│   │   │                               # (4 opciones radio, botón "Aplicar")
│   │   ├── BuscadorInscripciones.tsx   # NUEVO: input de búsqueda (compartido desktop/mobile)
│   │   └── ExportarExcel.tsx           # NUEVO: botón "Exportar a Excel" — POR DEFINIR estilo
│   │                                   # (sólido vs. tint; ver Known Gaps)
│   │
│   ├── tarifas/                        # MÓDULO: Historia 5 (FR-027 a FR-031)
│   │   ├── TarifaCard.tsx              # NUEVO: tarjeta "Tarifa vigente" con monto
│   │   ├── ListaDescuentos.tsx         # NUEVO: lista de descuentos con badges de estado,
│   │   │                               # menú ⋮ (editar/eliminar)
│   │   ├── FormularioDescuento.tsx     # NUEVO: formulario crear/editar descuento
│   │   │                               # (campos compartidos desktop/mobile)
│   │   ├── FormularioDescuentoDesktop.tsx  # NUEVO: wrapper modal (Dialog) para desktop
│   │   ├── FormularioDescuentoMobile.tsx   # NUEVO: wrapper pantalla completa con header
│   │   │                               # propio para mobile (botón "Guardar" sticky)
│   │   └── VistaPreviaDescuento.tsx    # NUEVO: caja "VISTA PREVIA" con precio tachado →
│   │                                   # precio con descuento en verde (vista previa en vivo)
│   │
│   ├── perfil/                         # MÓDULO: Perfil del admin
│   │   ├── PerfilSidebar.tsx           # NUEVO: versión desktop (al fondo del sidebar, inline)
│   │   └── PerfilBottomSheet.tsx       # NUEVO: versión mobile (bottom sheet, no ruta propia)
│   │                                   # Mismo módulo de lógica (datos admin + cerrar sesión)
│   │                                   # renderizado en dos formas según breakpoint.
│   │
│   ├── hooks/                          # Hooks compartidos entre módulos
│   │   ├── useAuth.ts                  # NUEVO: hook para sesión actual, signOut, loading
│   │   ├── useInscripciones.ts         # NUEVO: hook para CRUD de inscripciones (fetch, filter,
│   │   │                               # approve, reject)
│   │   ├── useDescuentos.ts            # NUEVO: hook para CRUD de descuentos (fetch, create,
│   │   │                               # update, delete)
│   │   └── useBreakpoint.ts            # NUEVO: hook responsive para desktop vs mobile
│   │
│   ├── layout/                         # Layout compartido (sidebar + contenido)
│   │   ├── AppLayout.tsx               # NUEVO: layout de dos columnas (sidebar + área contenido)
│   │   │                               # Contiene: sidebar con navegación + perfil desktop,
│   │   │                               # bottom tab bar mobile, y <Outlet/> para contenido
│   │   └── BottomTabBar.tsx            # NUEVO: barra de tabs inferior (Inscripciones, Tarifas,
│   │                                   # Perfil) — solo mobile
│   │
│   └── App.tsx                         # MODIFICADO: integrar AuthGuard, rutas con layout,
│                                       # rutas protegidas de los 3 módulos
│
supabase/
├── migrations/
│   ├── 001_inscripciones.sql           # Ya existe (INSUFICIENTE — ver nota abajo)
│   ├── 002_schema_completo.sql         # NUEVO: migración que completa el esquema alineado
│   │                                   # con constitution.md (inscripciones ampliada,
│   │                                   # participantes, tarifas, descuentos + RLS + RPCs).
│   │                                   #
│   │                                   # PROPIEDAD: esta migración es la ÚNICA fuente de
│   │                                   # verdad para las tablas inscripciones, participantes
│   │                                   # y tarifas. El módulo 001-sitio-publico NO debe crear
│   │                                   # migraciones propias para estas tablas — las consume
│   │                                   # ya creadas. Ver también la sección "Propiedad de las
│   │                                   # migraciones" en ../_shared/data-model.md.
│   └── 003_descuentos.sql              # NUEVO: tabla descuentos (exclusiva panel admin)
│                                       # + función SQL calcular_estado_descuento()
│                                       # RLS: solo rol autenticado (admin) tiene
│                                       # SELECT/INSERT/UPDATE/DELETE. Sin políticas para
│                                       # el rol anon — el sitio público no lee esta tabla;
│                                       # accede al efecto del descuento solo vía
│                                       # obtener_tarifa_vigente() con precio final calculado.
└── functions/
    └── notificar-inscripcion/
        └── index.ts                    # MODIFICADO: implementar envío real con Resend
                                        # (actualmente es stub)
```

**Structure Decision**: Organización por módulo funcional (`auth/`, `inscripciones/`,
`tarifas/`, `perfil/`) en vez de por tipo de archivo (`components/`, `pages/`). Esto refleja
la arquitectura real del panel (3 módulos protegidos + 1 módulo transversal de auth) y hace
que cada módulo sea autocontenido para un desarrollador que trabaje en una historia de
usuario específica. Los componentes shadcn/ui (`components/ui/`) y los hooks compartidos
(`hooks/`) quedan fuera de los módulos porque se usan en múltiples de ellos.

**Sobre archivos existentes**: `components/ListaInscripciones.tsx` y
`components/DetalleInscripcion.tsx` se **reubican** dentro de `inscripciones/` en vez de
dejarse en `components/` y agregar nuevos al lado. Razón: la estructura por módulo exige que
cada pieza de un módulo viva en su carpeta. El costo de moverlos es bajo (un cambio de
import en `App.tsx`), y evita tener una carpeta `components/` mixta que contradiga la
organización elegida. `pages/Login.tsx` se reubica en `auth/Login.tsx` por la misma razón.
`pages/Dashboard.tsx` se elimina (su lógica se distribuye entre `AppLayout.tsx`,
`ListaInscripciones.tsx` y `FiltrosInscripciones.tsx`).

## Complexity Tracking

| Violación | Por qué se necesita | Alternativa más simple rechazada porque |
|---|---|---|
| shadcn/ui (nueva dependencia) | El panel requiere bottom sheets, dialogs, tablas y badges que coincidan con el design system documentado; implementar desde cero violaría el principio V de simplicidad | Construir cada componente UI manualmente duplicaría trabajo resuelto por shadcn, que ya tiene la integración con Tailwind y es el estándar de facto para React + Tailwind |
| Tailwind CSS (nueva dependencia) | El panel actual usa inline styles; migrar a Tailwind es necesario para integrar shadcn/ui correctamente | Mantener inline styles no escala y hace imposible usar shadcn/ui, que depende de Tailwind |
| useBreakpoint hook | Mobile vs. desktop afecta la renderización de 5+ componentes (perfil, filtros, formulario descuento, tabla vs tarjetas, bottom tab bar vs sidebar) | Duplicar la lógica de detección de breakpoint en cada componente violaría DRY y el principio V |

## Research & Decisions

### Decisiones clave del plan

**1. Cálculo automático de estado de descuento (FR-030)**

Decisión: **Columna generated en Postgres** (`estado_descuento` calculado como
`CASE WHEN NOW() < fecha_inicio THEN 'Programado' WHEN NOW() BETWEEN fecha_inicio AND fecha_fin THEN 'Activo' ELSE 'Vencido' END`).

Rationale: El estado es una función pura de `fecha_inicio`, `fecha_fin` y la fecha actual.
No depende de datos del usuario ni de lógica de negocio compleja. Una generated column:
- garantiza consistencia (nunca se "desincroniza" con las fechas)
- funciona tanto para el panel como para cualquier consulta futura
- evita lógica duplicada cliente/servidor

Alternativa rechazada: calcular en el cliente con `new Date()` — violaría el principio de
que el servidor es la fuente de verdad, y sería inconsistente si dos clientes muestran la
misma lista en momentos distintos del día.

**2. Entidad Descuento: exclusiva del panel**

Decisión: la tabla `descuentos` es **exclusiva del panel administrativo** y no se registra
en `_shared/data-model.md`.

Rationale: el sitio público solo necesita el precio final calculado (via
`obtener_tarifa_vigente()` + `monto_esperado` congelado). No necesita leer la entidad
cruda de descuento. El panel es quien crea/edita/elimina descuentos; el sitio público
consume el resultado.

**3. Notificaciones por correo**

Decisión: extender la Edge Function existente `notificar-inscripcion` en vez de crear una
nueva.

Rationale: la Edge Function ya recibe `inscripcion_id` y `nuevo_estado`. Se le agrega la
integración real con Resend (actualmente stub). Crear una función nueva duplicaría la
invocación del panel y violaría el principio V.

**4. Perfil: una lógica, dos renderizaciones**

Decisión: un solo módulo `perfil/` con dos componentes de vista (`PerfilSidebar.tsx` para
desktop, `PerfilBottomSheet.tsx` para mobile), ambos consumiendo el mismo hook `useAuth`.
El `useBreakpoint()` decide cuál renderizar.

Rationale: la lógica (datos del admin + cerrar sesión) es idéntica en ambos breakpoints.
Duplicarla en dos componentes independientes violaría DRY. Separar la vista de la lógica
permite cumplir el diseño documentado en `panel-layout.md` (sidebar inline en desktop,
bottom sheet en mobile) sin duplicación.

### Known Gaps que afectan la implementación

Los siguientes gaps de `design-system.md` quedan **señalados pero sin resolver** en este
plan. El desarrollador DEBE consultar al propietario antes de implementar la pieza afectada:

1. **Botón "Exportar a Excel"** (desktop): ¿estilo sólido azul (`--azul-barra` + blanco) o
   tint (`--azul-barra-tint` + `--azul-barra`)? La captura visual y las screenshots mobile
   sugieren sólido; el query de estilos computados sugiere tint. Señalar antes de implementar
   `ExportarExcel.tsx`. En mobile el texto se abrevia a "Exportar".

2. **Color de "Programado"** en badges de descuento: usa `#4B80E8` (distinto del azul de
   marca `#0861CD`). El plan implementa el color documentado en `design-system.md`
   (`#4B80E8`); si se decide unificar, el cambio es un solo token.

3. **Estados hover/focus** de botones y chips: no documentados. Se implementa el patrón más
   simple (`opacity` en hover, `box-shadow` sutil en focus-visible) y se señala para
   revisión.

## Phase 0: Research

*(Se genera como `research.md` — ver archivo independiente)*

Todas las decisiones técnicas clave están documentadas arriba en "Research & Decisions".
El archivo `research.md` consolidará: (a) decisiones de cálculo de estado, (b) mapeo de
componentes shadcn↔design system, (c) estrategia de migración de BD, (d) integración
Resend, y (e) Known Gaps abiertos.

## Phase 1: Design & Contracts

*(Se generan como `data-model.md`, `contracts/` y `quickstart.md` — ver archivos
independientes)*

### data-model.md

Contiene el esquema completo de PostgreSQL:
- Tabla `inscripciones` (ampliada alineada con constitution.md: folio, modalidad_tarifa,
  cantidad_personas, monto_esperado, url_comprobante, estado, nombre_contacto,
  telefono_contacto, correo_contacto, fecha_creacion)
- Tabla `participantes` (inscripcion_id, cedula, nombre, apellidos, talla_camisa)
- Tabla `tarifas` (modalidad [PENDIENTE DE DECISIÓN], monto_por_persona, fecha_inicio,
  fecha_fin, activa)
- Tabla `descuentos` (nombre, fecha_inicio, fecha_fin, porcentaje, aplica_a FK NULLABLE
  → tarifas.id — NULL significa "aplica a todas las tarifas", estado_descuento GENERATED
  ALWAYS AS)
- RPC `obtener_tarifa_vigente()` (SECURITY DEFINER, solo lectura) — cuando se considere
  integrar el efecto de descuentos en el precio público, la consulta debe incluir
  `WHERE (d.aplica_a IS NULL OR d.aplica_a = t.id)` para contemplar el caso NULL = todas
- RPC `calcular_estado_descuento()` o generated column
- RLS policies para cada tabla (incluyendo descuentos: solo rol autenticado)

### Design Token Mapping (Tailwind v4 + shadcn/ui)

En Tailwind v4 la configuración del theme vive en CSS, no en `tailwind.config.ts`.
El archivo `src/index.css` contiene un bloque `@theme` que mapea los tokens del
`design-system.md` a las CSS variables que shadcn/ui espera. Este mapeo es
**crítico**: sin él, los componentes shadcn se generan con la paleta default
(gris/azul genérico), no con el azul del proyecto.

**Mapeo de colores de marca y superficie:**

| Token design-system | CSS variable shadcn | Valor | Notas |
|---|---|---|---|
| `--azul-barra` | `--primary` | `#0861CD` | Azul de marca. Botones primarios, nav activo, títulos, folios |
| `--azul-barra-tint` | `--secondary` | `#EFF4FF` | Fondo de nav activo, fondo de chips secundarios |
| `--canvas` | `--background` | `#FFFFFF` | Fondo de tarjetas, sidebar, modal |
| `--fondo-app` | (clase `bg-[#F9FAFB]`) | `#F9FAFB` | Fondo del área de contenido — se usa como utility, no como variable global |
| `--ink` | `--foreground` | `#12151C` | Texto de alto énfasis |
| `--mute` | `--muted-foreground` | `#6B7080` | Labels secundarios, chips sin seleccionar |
| `--hairline` | `--border` | `#E5E7EB` | Borde de tarjetas |
| `--hairline-input` | `--input` | `#D1D5DB` | Borde de inputs y chips sin seleccionar |

**Mapeo de colores semánticos de estado (inscripciones):**

| Estado | CSS variable | Fondo | Texto | Uso |
|---|---|---|---|---|
| Pendiente | `--status-pending-bg` / `--status-pending-text` | `#FEF3D7` | `#B7791F` | Badge "Pendiente" |
| Aprobada | `--status-approved-bg` / `--status-approved-text` | `#DCF5E0` | `#1C7A34` | Badge "Aprobada" |
| Rechazada | `--status-rejected-bg` / `--status-rejected-text` | `#FDD9D9` | `#B3261E` | Badge "Rechazada" |

**Mapeo de colores semánticos de estado (descuentos):**

| Estado | CSS variable | Fondo | Texto | Notas |
|---|---|---|---|---|
| Programado | `--status-scheduled-bg` / `--status-scheduled-text` | `#EFF4FF` | `#4B80E8` | **No se mapea a `--primary`** — es un azul distinto al de marca. Se mantiene como token independiente para preservar la distinción documentada en `design-system.md` (Known Gap #2) |
| Activo | Reutiliza `--status-approved-bg` / `--status-approved-text` | `#DCF5E0` | `#1C7A34` | Mismo verde que "Aprobada" (confirmado en design system) |
| Vencido | Reutiliza `--muted-bg` / `--muted-foreground` | `#F3F4F6` | `#6B7080` | Mismo gris que `--mute` |

**Resolución del Known Gap #2 (azul "Programado")**: el token `--status-scheduled-text`
(`#4B80E8`) se mantiene como valor independiente de `--primary` (`#0861CD`). Si en una
futura iteración se decide unificar, el cambio es un solo valor en `@theme`. No se fuerza
la unificación en este plan porque el design system documenta ambos azules como intencionales.

**Mapeo de Botones (variantes shadcn):**

| Variante shadcn | Estilo design-system | Uso |
|---|---|---|
| `default` | Primario: fondo `--primary`, texto blanco, radio píldora | "Guardar descuento", "Aprobar", "Iniciar sesión" |
| `secondary` | Secundario: fondo `--secondary`, texto `--primary`, radio píldora | "Filtros" (desktop), "Exportar" (por definir — ver Known Gap #1) |
| `outline` | Outline: fondo transparente, borde visible, texto oscuro | "Rechazar", toggle "Aplica a" (no seleccionado) |
| `ghost` | Sin fondo/borde | Navegación sidebar, menú ⋮ |

### contracts/

Mapeo spec→componente para cada pantalla de `panel-layout.md`:

| Pantalla | Módulo | Componente React | shadcn/ui |
|---|---|---|---|
| Login | auth/ | Login.tsx | Input, Button |
| Lista Inscripciones (desktop) | inscripciones/ | ListaInscripciones.tsx | Table, Badge, Button |
| Lista Inscripciones (mobile) | inscripciones/ | ListaInscripciones.tsx (responsive) | Card, Badge, Button |
| Detalle Inscripción | inscripciones/ | DetalleInscripcion.tsx | Card, Badge, Button |
| Filtros (desktop) | inscripciones/ | FiltrosInscripciones.tsx | Button (chips) |
| Filtros (mobile) | inscripciones/ | FiltrosInscripciones.tsx | Sheet, RadioGroup |
| Tarifas + Lista Descuentos | tarifas/ | ListaDescuentos.tsx | Card, Badge, DropdownMenu |
| Nuevo/Editar Descuento (desktop) | tarifas/ | FormularioDescuentoDesktop.tsx | Dialog, Input, Button |
| Nuevo/Editar Descuento (mobile) | tarifas/ | FormularioDescuentoMobile.tsx | Input, Button (sticky) |
| Vista Previa Precio | tarifas/ | VistaPreviaDescuento.tsx | Card (custom) |
| Perfil (desktop) | perfil/ | PerfilSidebar.tsx | Avatar, Button |
| Perfil (mobile) | perfil/ | PerfilBottomSheet.tsx | Sheet, Avatar, Button |
| Bottom Tab Bar | layout/ | BottomTabBar.tsx | custom (Lucide icons) |
| App Layout (sidebar + contenido) | layout/ | AppLayout.tsx | custom |

**Componentes shadcn sin mapeo directo** (señalados en vez de forzar):
- **Toggle "Aplica a"** (píldoras tipo chip que se seleccionan): no hay componente shadcn
  equivalente. Se implementa como grupo de `Button` variant `outline`/`default` con
  estado local, similar a los chips de filtro de inscripciones.
- **Caja "VISTA PREVIA"** (precio tachado → precio con descuento en verde): es un componente
  custom (`VistaPreviaDescuento.tsx`) que no encaja en ningún shadcn existente. Se construye
  desde cero con tokens del design system.

### quickstart.md

Guía de validación con escenarios verificables:
1. Login con credenciales válidas → redirige a dashboard
2. Login con credenciales incorrectas → muestra error
3. Ver lista de inscripciones → muestra datos
4. Filtrar por estado → muestra solo los del estado seleccionado
5. Abrir detalle de inscripción → muestra datos + comprobante
6. Aprobar inscripción pendiente → estado cambia + correo enviado
7. Rechazar inscripción pendiente → estado cambia + correo enviado
8. Crear descuento → aparece en lista con estado calculado
9. Editar descuento → cambios reflejados
10. Eliminar descuento → desaparece de lista
11. Vista previa de descuento → precio se actualiza en tiempo real
12. Responsive: mobile → bottom tab bar visible, perfil como bottom sheet
