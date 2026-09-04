# Modelo de Datos Compartido — Recreativa Barra Honda

**Fuente única de verdad para las entidades compartidas entre el sitio público (`/sitio`) y el panel administrativo (`/admin`).**

Ambos módulos operan sobre las mismas tablas de base de datos. Cualquier cambio en la definición de estas entidades debe actualizarse aquí y revisarse en los dos specs que las referencian.

## Propiedad de las migraciones

Las migraciones de las tablas `inscripciones`, `participantes` y `tarifas` viven en
`supabase/migrations/` (en la raíz del monorepo, fuera de `/sitio` y `/admin`) y son
responsabilidad del módulo **002-panel-administrativo**. El módulo 001-sitio-publico
**consume** estas tablas
vía RLS (INSERT para el rol público) y RPCs (`obtener_tarifa_vigente()`,
consulta de estado), pero **NO debe** crear ni mantener migraciones propias para
ellas. Cualquier cambio de esquema a estas tablas se coordina a través de este
módulo (002), que es la fuente de verdad de la estructura de la base de datos.

---

## Valores de `modalidad` (FIJADOS — 2026-09-02)

Los valores definitivos del campo `modalidad` de la tabla `tarifas` son **exactamente dos**:

| Valor | Descripción |
|---|---|
| `Promocional` | Tarifa temprana con precio reducido, vigente durante la inscripción anticipada. |
| `Regular` | Tarifa estándar, vigente el resto del período. |

En esta versión existe **una única fila con `activa = true` a la vez**. El servidor
determina la modalidad vigente comparando `now() AT TIME ZONE 'America/Costa_Rica'` contra
`fecha_inicio`/`fecha_fin` de esa fila. La migración aplica
`CHECK (modalidad IN ('Promocional','Regular'))`.

Estos valores se usan en:

- Las validaciones del formulario de inscripción en el sitio público.
- El campo `modalidad_tarifa` congelado en `inscripciones` en el momento del INSERT.
- Las plantillas de correo de notificación enviadas desde el panel administrativo.

Fuente de la decisión: `002-panel-administrativo/spec.md` → "Modalidades de tarifa (valores fijos)".

---

## Entidades

### Inscripción (grupo)

Representa el envío colectivo de un grupo de participantes bajo un único comprobante de pago.

| Atributo | Descripción |
|---|---|
| `folio` | Identificador único legible asignado al grupo (ej. `BH-2026-0142`) |
| `modalidad_tarifa` | `Promocional` o `Regular` — valor congelado en el momento del INSERT (ver "Valores de `modalidad`") |
| `cantidad_personas` | Número total de participantes en el grupo |
| `monto_esperado` | Calculado y congelado en servidor (`monto_por_persona × cantidad_personas` de la tarifa vigente al INSERT) |
| `url_comprobante` | URL del archivo de comprobante en Supabase Storage. **Nullable**: queda `null` cuando el pago fue verificado fuera del sistema y el registro se hace manualmente desde el panel sin comprobante (HU6) |
| `estado` | `pendiente` / `aprobada` / `rechazada` |
| `motivo_rechazo` | Texto ingresado por el admin al rechazar; `null` mientras esté `pendiente` o si es `aprobada`. Se incluye en el correo de rechazo. |
| `nombre_contacto` | Nombre completo del responsable del grupo |
| `telefono_contacto` | Teléfono del responsable |
| `correo_contacto` | Correo electrónico del responsable (destino de las notificaciones) |
| `fecha_creacion` | Timestamp del INSERT, zona horaria `America/Costa_Rica` |

**Quién opera sobre esta entidad:**
- Sitio público (`/sitio`): **CREA** filas nuevas vía INSERT atómico con estado inicial `pendiente`.
- Panel administrativo (`/admin`): **LEE** todas las filas; **MODIFICA** el campo `estado` a `aprobada` o `rechazada` (transición definitiva, no reversible) y, al rechazar, `motivo_rechazo`.
- Panel administrativo (`/admin`): también **CREA** filas nuevas directamente (registro manual por el administrador cuando el pago fue verificado fuera del sistema — ver `002-panel-administrativo/spec.md`, HU6), con las mismas reglas de cálculo de servidor que el sitio público (folio, `modalidad_tarifa`, `monto_esperado`), pero sin exigir comprobante (`url_comprobante` queda `null`).

---

### Participante

Representa a cada persona individual inscrita dentro de un grupo.

| Atributo | Descripción |
|---|---|
| `inscripcion_id` | Llave foránea → `inscripciones` |
| `cedula` | Número de cédula del participante |
| `nombre` | Nombre del participante |
| `apellidos` | Apellidos del participante |
| `genero` | `Hombre` o `Mujer` — `CHECK (genero IN ('Hombre','Mujer'))`. Añadido 2026-09-03 (decisión del propietario). Se captura en el formulario público por participante; la columna se crea en `supabase/migrations/004_crear_inscripcion_genero_storage.sql` |
| `talla_camisa` | Talla de camisa del participante |

**Quién opera sobre esta entidad:**
- Sitio público (`/sitio`): **CREA** filas nuevas en el mismo INSERT atómico que la Inscripción.
- Panel administrativo (`/admin`): **LEE** la lista completa de participantes de cada inscripción al visualizar su detalle.
- Panel administrativo (`/admin`): también **CREA** filas nuevas en el mismo INSERT atómico del registro manual de inscripción (HU6 — ver `002-panel-administrativo/spec.md`).

---

### Comprobante de pago

Imagen o foto subida por el responsable del grupo como evidencia del pago colectivo. Almacenada de forma privada en un bucket de Supabase Storage; solo accesible por el administrador autenticado.

**Quién opera sobre esta entidad:**
- Sitio público (`/sitio`): **SUBE** el archivo al bucket de Supabase Storage; la URL resultante se guarda en `inscripciones.url_comprobante`.
- Panel administrativo (`/admin`): **LEE** (visualiza) el comprobante desde la URL almacenada al revisar el detalle de una inscripción.

---

### Tarifa

Define el precio por persona vigente. En esta versión se administra directamente en base de
datos (no hay CRUD de tarifas en el panel; sí de **Descuentos** sobre ella — ver
`002-panel-administrativo/spec.md`, HU5).

| Atributo | Descripción |
|---|---|
| `modalidad` | `Promocional` o `Regular` (ver "Valores de `modalidad`") |
| `monto_por_persona` | Precio unitario por participante |
| `fecha_inicio` | Inicio de vigencia (timestamptz) |
| `fecha_fin` | Fin de vigencia (timestamptz) |
| `activa` | Booleano de habilitación manual. En esta versión, exactamente **una** fila `activa = true`. |

**Quién opera sobre esta entidad:**
- Sitio público (`/sitio`): **NO** tiene SELECT directo (sin política RLS pública). Lee la
  tarifa vigente solo vía la RPC `obtener_tarifa_vigente()` (SECURITY DEFINER, clave `anon`),
  que devuelve `modalidad`, `monto_por_persona`, `monto_final_con_descuento` y `fecha_fin`.
- Panel administrativo (`/admin`): **LEE** la fila activa (rol `authenticated`) para mostrar
  la tarjeta "Tarifa vigente".

> El cálculo vinculante de `inscripciones.monto_esperado` ocurre en el trigger de INSERT
> (módulo 001) y DEBE usar `monto_final_con_descuento` de `obtener_tarifa_vigente()`, no
> solo `monto_por_persona`.
