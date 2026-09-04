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

**Decisión resuelta (2026-09-02)**: los valores de `modalidad` son `Promocional` y
`Regular` (ver `spec.md` → "Modalidades de tarifa (valores fijos)" y
`../_shared/data-model.md`). La migración `002_schema_completo.sql` aplica
`CHECK (modalidad IN ('Promocional','Regular'))`. En esta versión existe una única fila
`tarifas.activa = true` a la vez.

## Project Structure

### Documentation (this feature)

```text
specs/002-panel-administrativo/
├── plan.md                 # Este archivo
├── research.md             # Phase 0: decisiones técnicas y known gaps (existe)
├── quickstart.md           # Phase 1: guía de validación manual (existe)
├── data-model.md           # NO se genera como archivo aparte — el esquema vive en este
│                           #   plan.md (sección "Phase 1 → data-model.md") + ../_shared/data-model.md
├── contracts/              # NO se genera como carpeta aparte — el mapeo spec→componente
│                           #   vive en este plan.md (sección "contracts/")
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
│   │   ├── ExportarExcel.tsx           # NUEVO: botón "Exportar a Excel" (FR-032) — exporta
│   │   │                               # la lista visible (filtro + búsqueda) a CSV/Excel.
│   │   │                               # Estilo POR DEFINIR (sólido vs. tint; Known Gap #1)
│   │   └── NuevaInscripcion.tsx        # NUEVO: formulario de registro manual (HU6) —
│   │                                   # reutiliza estructura de datos de responsable +
│   │                                   # participantes del sitio público pero SIN comprobante
│   │                                   # obligatorio (FR-035); botón de acceso "Registrar
│   │                                   # inscripción" en ListaInscripciones.tsx
│   │
│   ├── tarifas/                        # MÓDULO: Historia 5 (FR-027 a FR-031)
│   │   ├── TarifaCard.tsx              # NUEVO: tarjeta "Tarifa vigente" con monto
│   │   ├── ListaDescuentos.tsx         # NUEVO: lista de descuentos con badges de estado,
│   │   │                               # menú ⋮ (editar/eliminar + "Desactivar" cuando
│   │   │                               # estado_descuento es 'Programado'/'Activo' — FR-033)
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
│   │   │                               # approve, reject) + `crearInscripcionManual(datos)` para
│   │   │                               # el INSERT atómico (inscripción + participantes) vía
│   │   │                               # cliente autenticado (HU6, FR-034 a FR-037)
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
│   ├── 002_schema_completo.sql         # NUEVO: completa el esquema alineado con
│   │                                   # constitution.md. Renombra las columnas de 001
│   │                                   # (nombre_completo→nombre_contacto, telefono→
│   │                                   # telefono_contacto, correo_electronico→correo_contacto,
│   │                                   # comprobante_path→url_comprobante, created_at→
│   │                                   # fecha_creacion) y amplía inscripciones (folio,
│   │                                   # modalidad_tarifa, cantidad_personas, monto_esperado,
│   │                                   # motivo_rechazo). Crea participantes y tarifas
│   │                                   # (modalidad CHECK 'Promocional'/'Regular', una fila
│   │                                   # activa) + RLS + RPCs.
│   │                                   #
│   │                                   # PROPIEDAD: esta migración es la ÚNICA fuente de
│   │                                   # verdad para las tablas inscripciones, participantes
│   │                                   # y tarifas. El módulo 001-sitio-publico NO debe crear
│   │                                   # migraciones propias para estas tablas — las consume
│   │                                   # ya creadas. Ver también la sección "Propiedad de las
│   │                                   # migraciones" en ../_shared/data-model.md.
│   └── 003_descuentos.sql              # NUEVO: tabla descuentos (exclusiva panel admin)
│                                       # + vista descuentos_estado (estado calculado; NO
│                                       # generated column: now() no es IMMUTABLE)
│                                       # + trigger plpgsql BEFORE INSERT/UPDATE anti-
│                                       # solapamiento de fechas (FR-031).
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

Decisión: **vista `descuentos_estado`** en Postgres que expone `estado_descuento` calculado
con `CASE` que **prioriza el campo `desactivado`** (si `true` → "Vencido") sobre la
comparación de `(now() AT TIME ZONE 'America/Costa_Rica')::date` vs `fecha_inicio` /
`fecha_fin` (ambas inclusivas): `< fecha_inicio → 'Programado'`, `> fecha_fin → 'Vencido'`,
resto `→ 'Activo'`. Ver `research.md` §1 para el SQL completo (incluye el CASE con
`desactivado`, FR-033).

Rationale: el estado es función pura de las fechas y la hora del servidor. Una vista
garantiza consistencia y una única fuente de verdad en el servidor, y no duplica lógica
cliente/servidor.

Alternativa rechazada — `GENERATED ALWAYS AS ... STORED`: Postgres exige que la expresión
sea `IMMUTABLE`, y `now()` / `CURRENT_DATE` no lo son, por lo que esa definición no es
válida.

Alternativa rechazada — calcular en el cliente con `new Date()`: violaría que el servidor
es la fuente de verdad.

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

**5. Precedencia de descuentos superpuestos (FR-031)**

Decisión: **NO se permite superposición.** En esta versión hay una sola tarifa activa, así
que todos los descuentos aplican sobre ella; no puede existir más de un descuento "Activo"
o "Programado" con rangos de fecha superpuestos. Doble validación: (1) cliente
(`FormularioDescuento.tsx` + `useDescuentos.ts`) para feedback inmediato, y (2) función
`plpgsql` `BEFORE INSERT OR UPDATE` en `descuentos` que es la garantía real.

Rationale: la doble capa cumple "el servidor es la fuente de verdad" (Principio II/VIII) sin
depender solo de la UI, y sigue siendo simple (Principio V): un trigger corto, sin
extensiones. Evita además la ambigüedad de "cuál gana" o "se suman los porcentajes".

Alternativa descartada (constraint de exclusión con `btree_gist`): requiere la extensión
`btree_gist` (no habilitada por defecto en Supabase). El trigger `plpgsql` logra lo mismo
sin extensión.

Alternativa descartada (solo validación en cliente): dejaría una ventana de carrera y
ninguna defensa si se escribiera por fuera del formulario.

Alternativa descartada (el más reciente gana / se suman): reglas de negocio adicionales sin
necesidad real en este alcance.

**8. Registro manual de inscripción (HU6) reutiliza el cálculo de servidor**

Decisión: el registro manual (HU6) reutiliza el **mismo trigger de cálculo de servidor**
(folio, `modalidad_tarifa`, `monto_esperado`) que el INSERT público — no se duplica lógica de
negocio entre `/sitio` y `/admin`. La única diferencia es que el INSERT lo hace el rol
`authenticated` en vez de `anon`, y el comprobante es opcional.

Rationale: Principio V (simplicidad/no duplicación) — el cálculo vinculante de
`monto_esperado` ocurre en el trigger de INSERT de `inscripciones` (módulo 001), que usa
`obtener_tarifa_vigente()`. El panel solo dispara el mismo INSERT; no recalcula ni ingresa
montos manualmente (FR-036). No requiere cambios de RLS: `admin_acceso_total` (rol
`authenticated`) ya cubre INSERT sobre `inscripciones` y `participantes` (FR-034 a FR-037).

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

4. **Pantalla "Registrar inscripción" (HU6)**: no existe referencia visual en
   `design-system.md` ni `panel-layout.md` para esta pantalla. Se implementa reutilizando los
   mismos componentes shadcn ya establecidos (Input, Button, Card) en el mismo estilo del
   resto del panel; señalar al propietario para validación visual antes de considerarlo
   definitivo.

## Phase 0: Research

*(Se genera como `research.md` — ver archivo independiente)*

Todas las decisiones técnicas clave están documentadas arriba en "Research & Decisions".
El archivo `research.md` consolidará: (a) decisiones de cálculo de estado, (b) mapeo de
componentes shadcn↔design system, (c) estrategia de migración de BD, (d) integración
Resend, y (e) Known Gaps abiertos.

## Phase 1: Design & Contracts

*(`quickstart.md` se genera como archivo independiente. El detalle de `data-model.md` y
`contracts/` se mantiene embebido en las subsecciones siguientes de este plan, no como
archivos separados — ver "Project Structure".)*

### data-model.md

Contiene el esquema completo de PostgreSQL:
- Tabla `inscripciones` (ampliada alineada con constitution.md: folio, modalidad_tarifa,
  cantidad_personas, monto_esperado, url_comprobante, estado, `motivo_rechazo text NULL`,
  nombre_contacto, telefono_contacto, correo_contacto, fecha_creacion). La migración
  **renombra** las columnas equivalentes de `001` (ver comentario de `002_schema_completo.sql`).
- Tabla `participantes` (inscripcion_id, cedula, nombre, apellidos, talla_camisa)
- Tabla `tarifas` (`modalidad CHECK (modalidad IN ('Promocional','Regular'))`,
  monto_por_persona, fecha_inicio, fecha_fin, activa — **una única fila `activa = true`** en
  esta versión)
- Tabla `descuentos` (nombre, fecha_inicio, fecha_fin, porcentaje, `aplica_a` FK NULLABLE
  → tarifas.id — reservado para múltiples tarifas; **SIEMPRE NULL en esta versión**,
  `desactivado boolean NOT NULL DEFAULT false` — ver FR-033). El
  estado Programado/Activo/Vencido NO se almacena: se expone por la vista `descuentos_estado`
  (ver research.md §1). Trigger `plpgsql` BEFORE INSERT/UPDATE que rechaza el solapamiento de
  fechas con otro descuento no "Vencido" — **excluyendo** los `desactivado = true` (FR-031, FR-033).
- RPC `obtener_tarifa_vigente()` (SECURITY DEFINER, solo lectura) — **requisito
  obligatorio (FR-031)**. Filtra la fila con `activa = true` (una sola en esta versión).
  Las fechas de la tarifa (`fecha_inicio`/`fecha_fin`) determinan la modalidad vigente
  (Promocional o Regular) pero **NO actúan como filtro de existencia**: la RPC devuelve la
  tarifa siempre que `activa = true`, incluso cuando la fecha actual está fuera del período
  Promocional (en ese caso la modalidad calculada es `Regular`). El único caso en que la
  RPC devuelve vacío es cuando no existe ninguna fila con `activa = true`. `LEFT JOIN` a la
  vista `descuentos_estado` donde `estado_descuento = 'Activo'` (en esta versión `aplica_a`
  es siempre `NULL`). DEBE devolver `modalidad`, `monto_por_persona`,
  `monto_final_con_descuento` y `fecha_fin`.
- **Contrato hacia 001-sitio-publico (cálculo de `monto_esperado`)**: el trigger/función
  de INSERT que calcula `monto_esperado` en `inscripciones` (FR-022 del spec hermano)
  pertenece al módulo 001 y no se implementa aquí. Sin embargo, ese cálculo DEBE usar el
  **precio final con descuento** expuesto por `obtener_tarifa_vigente()`
  (`monto_final_con_descuento`), no solo `monto_por_persona`. Este módulo es responsable
  de que `obtener_tarifa_vigente()` exponga ambos valores; el módulo 001 es responsable
  de consumir `monto_final_con_descuento` en su trigger de INSERT.
- Vista `descuentos_estado` para el estado calculado (NO generated column: `now()` no es
  IMMUTABLE — ver research.md §1)
- **RLS (Campo 3)**: la tabla `tarifas`, igual que `descuentos`, NO permite SELECT
  directo al rol `anon` — el sitio público solo lee el precio vigente vía
  `obtener_tarifa_vigente()` (RPC SECURITY DEFINER). El rol `authenticated` (admin) sí
  tiene SELECT directo sobre `tarifas` para mostrar la "Tarifa vigente" en el panel.
- **RLS descuentos**: solo rol autenticado (admin) tiene SELECT/INSERT/UPDATE/DELETE.
  Sin políticas para el rol `anon` — nunca se lee `descuentos` directamente.
- **Precedencia de descuentos superpuestos (FR-031)**: NO se permite superposición. Como
  hay una sola tarifa activa, todos los descuentos aplican sobre ella; no puede existir más
  de un descuento "Activo" o "Programado" con rangos de fecha superpuestos. Doble
  validación: cliente (`FormularioDescuento.tsx` + `useDescuentos.ts`) para feedback
  inmediato + función `plpgsql` BEFORE INSERT/UPDATE en `descuentos` como garantía real. Se
  descarta la constraint de exclusión con `btree_gist` (requeriría la extensión `btree_gist`,
  no habilitada por defecto en Supabase); el trigger `plpgsql` logra lo mismo sin extensión.

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
| `outline` | Outline: fondo transparente, borde visible, texto oscuro | "Rechazar", chips de filtro no seleccionados |
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
| Registrar inscripción (HU6) | inscripciones/ | NuevaInscripcion.tsx | Input, Button, Card |
| Perfil (desktop) | perfil/ | PerfilSidebar.tsx | Avatar, Button |
| Perfil (mobile) | perfil/ | PerfilBottomSheet.tsx | Sheet, Avatar, Button |
| Bottom Tab Bar | layout/ | BottomTabBar.tsx | custom (Lucide icons) |
| App Layout (sidebar + contenido) | layout/ | AppLayout.tsx | custom |

**Componentes shadcn sin mapeo directo** (señalados en vez de forzar):
- **Toggle "Aplica a"**: **no se implementa en esta versión** (una sola tarifa activa; el
  descuento siempre aplica sobre ella). Reservado para una versión con múltiples tarifas;
  cuando exista, sería un grupo de `Button` variant `outline`/`default` con estado local.
- **Caja "VISTA PREVIA"** (precio tachado → precio con descuento en verde): es un componente
  custom (`VistaPreviaDescuento.tsx`) que no encaja en ningún shadcn existente. Se construye
  desde cero con tokens del design system.

### quickstart.md

Generado como archivo independiente: [`quickstart.md`](quickstart.md). Cubre
autenticación, lista/filtros/búsqueda, detalle, aprobar/rechazar con **motivo obligatorio**
+ correo, fallo de correo (no revierte estado), descuentos (estados calculados,
vista previa en vivo, no-superposición en cliente y en trigger de BD, **desactivación manual —
FR-033**), registro manual de inscripción (**HU6**, FR-034 a FR-037),
`obtener_tarifa_vigente()` con la clave `anon`, exportación de la lista visible, responsive
y verificación rápida de seguridad (RLS de `tarifas`/`descuentos`, aislamiento de
`RESEND_API_KEY`, bucket privado).
