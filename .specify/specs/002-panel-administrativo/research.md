# Research — Panel Administrativo Recreativa Barra Honda

**Branch**: `002-panel-administrativo` | **Date**: 2026-09-01 | **Spec**: [spec.md](spec.md)

Consolida las decisiones técnicas de Phase 0/1 del plan. Sirve de referencia de "por qué se
eligió X" para el implementador.

## Decisiones técnicas

### 1. Cálculo automático de estado de descuento (FR-030)

**Decisión**: el estado NO se almacena. Se calcula en el servidor mediante una **vista**
`descuentos_estado` que envuelve la tabla `descuentos` y expone la columna calculada:

```sql
CREATE VIEW descuentos_estado AS
SELECT d.*,
  CASE
    WHEN (now() AT TIME ZONE 'America/Costa_Rica')::date < d.fecha_inicio THEN 'Programado'
    WHEN (now() AT TIME ZONE 'America/Costa_Rica')::date > d.fecha_fin   THEN 'Vencido'
    ELSE 'Activo'
  END AS estado_descuento
FROM descuentos d;
```

Regla de bordes: `fecha_inicio` y `fecha_fin` son **inclusivas** (el día `fecha_fin`
todavía es "Activo"). La comparación usa la fecha del servidor en zona
`America/Costa_Rica` (constitución, Principio VIII, regla 2).

**Por qué una vista y no `GENERATED ALWAYS AS ... STORED`**: una generated column exige que
la expresión sea `IMMUTABLE`; `now()` / `CURRENT_DATE` no lo son, así que Postgres rechaza
esa definición. La vista da la misma garantía de "fuente única de verdad en el servidor" sin
ese límite, y no duplica lógica cliente/servidor.

**Alternativa considerada**: calcular en el cliente con `new Date()` — rechazada por la
misma razón (el servidor es la fuente de verdad).

El panel lee `descuentos_estado` (no `descuentos`) para listar; `obtener_tarifa_vigente()`
hace JOIN contra `descuentos_estado` con `estado_descuento = 'Activo'`.

### 2. Entidad Descuento: exclusiva del panel

**Decisión**: la tabla `descuentos` es **exclusiva del panel administrativo** y no se registra
en `_shared/data-model.md`.

**Rationale**: el sitio público solo necesita el precio final calculado (vía
`obtener_tarifa_vigente()` + `monto_esperado` congelado). No necesita leer la entidad cruda
de descuento.

### 3. Notificaciones por correo

**Decisión**: extender la Edge Function existente `notificar-inscripcion` en vez de crear una
nueva.

**Rationale**: la Edge Function ya recibe `inscripcion_id` y `nuevo_estado`. Se le agrega la
integración real con Resend (actualmente stub). Crear una función nueva duplicaría la
invocación y violaría el Principio V.

### 4. Perfil: una lógica, dos renderizaciones

**Decisión**: un solo módulo `perfil/` con dos componentes de vista (`PerfilSidebar.tsx` para
desktop, `PerfilBottomSheet.tsx` para mobile), ambos consumiendo el mismo hook `useAuth`.
`useBreakpoint()` decide cuál renderizar.

**Rationale**: la lógica (datos del admin + cerrar sesión) es idéntica en ambos breakpoints;
duplicarla violaría DRY.

### 5. Precedencia de descuentos superpuestos (FR-031)

**Decisión**: **NO se permite superposición.** Como en esta versión hay una sola tarifa
activa, todos los descuentos aplican sobre ella; no puede existir más de un descuento
"Activo" o "Programado" con rangos de fecha superpuestos. Se valida en dos capas:
1. **Cliente** (`FormularioDescuento.tsx` + `useDescuentos.ts`): feedback inmediato al
   crear/editar.
2. **Servidor**: función `plpgsql` `BEFORE INSERT OR UPDATE` en `descuentos` que rechaza la
   fila si se solapa (por fechas) con otro descuento no "Vencido". Es la garantía real.

**Rationale**: la doble capa cumple "el servidor es la fuente de verdad" (Principio II/VIII)
sin depender solo de la UI, y sigue siendo simple (Principio V): un trigger corto, sin
extensiones. Evita además la ambigüedad de "cuál gana" o "se suman los porcentajes".

**Alternativas descartadas**:
- **Constraint de exclusión con `btree_gist`**: impondría la regla a nivel de BD, pero
  requiere la extensión `btree_gist` (no por defecto en Supabase). El trigger `plpgsql`
  logra lo mismo sin extensión.
- **Solo validación en cliente**: dejaría una ventana de carrera y ninguna defensa si se
  escribe por fuera del formulario.
- **El más reciente gana / se suman**: reglas de negocio adicionales sin necesidad real.

### 6. Integración del descuento en `obtener_tarifa_vigente()` (FR-031)

**Decisión**: obligatorio. `obtener_tarifa_vigente()` hace `LEFT JOIN` con la vista
`descuentos_estado` donde `estado_descuento = 'Activo'` (en esta versión `aplica_a` es
siempre `NULL` → aplica a la única tarifa activa) y devuelve tanto el precio original
(`monto_por_persona`) como el precio final (`monto_final_con_descuento`), además de
`modalidad` y `fecha_fin`. Dos descuentos "Activo" simultáneos son un estado imposible por
la regla de no-superposición (decisión 5).

**Rationale**: FR-031 es un requisito obligatorio; el precio final con descuento debe estar
disponible para que el trigger de `monto_esperado` (spec hermano) lo consuma.

### 7. RLS de `tarifas` y `descuentos`

**Decisión**: ambas tablas NO permiten SELECT directo al rol `anon`. Solo el rol
`authenticated` (admin) tiene acceso directo. El sitio público accede al precio vigente
exclusivamente vía `obtener_tarifa_vigente()` (RPC SECURITY DEFINER).

**Rationale**: alineado con la constitución (Principio VIII, Requisitos de Seguridad):
la lectura pública del precio es solo vía RPC; las tablas operativas del precio/tarifas no
se exponen al rol público.

## Integración técnica (stack)

- **Frontend**: React 18.3 + Vite 5.4 + TypeScript 5.6
- **UI**: Tailwind CSS v4 (`@import "tailwindcss"` + `@theme` en `src/index.css`) + shadcn/ui.
  No se usa `tailwind.config.ts` (Tailwind v4 configura en CSS, no en archivo separado).
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Email**: Resend vía Edge Function `notificar-inscripcion`
- **Gestor de paquetes**: pnpm

## Known Gaps abiertos (no resueltos en este plan)

1. **Botón "Exportar a Excel"**: la función está **en alcance** (FR-032). Gap sólo de
   estilo (desktop): sólido azul vs. tint. Las screenshots mobile sugieren sólido; el query
   de estilos computados sugiere tint. Resolver antes de finalizar `ExportarExcel.tsx`. En
   mobile el texto se abrevia a "Exportar".
2. **Color de "Programado"** en badges de descuento: `#4B80E8` (distinto del azul de marca
   `#0861CD`). Se implementa el valor documentado; mapeado a `--status-scheduled-text`, no a
   `--primary`. Si se decide unificar, es un solo token en `@theme`.
3. **Estados hover/focus** de botones y chips: no documentados. Se implementa el patrón más
   simple (`opacity` en hover, `box-shadow` sutil en focus-visible) y se señala para revisión.
