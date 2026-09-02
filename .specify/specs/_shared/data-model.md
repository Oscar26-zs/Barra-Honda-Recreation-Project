# Modelo de Datos Compartido — Recreativa Barra Honda

**Fuente única de verdad para las entidades compartidas entre el sitio público (`/sitio`) y el panel administrativo (`/admin`).**

Ambos módulos operan sobre las mismas tablas de base de datos. Cualquier cambio en la definición de estas entidades debe actualizarse aquí y revisarse en los dos specs que las referencian.

## Propiedad de las migraciones

Las migraciones de las tablas `inscripciones`, `participantes` y `tarifas` viven en
`admin/supabase/migrations/` y son responsabilidad del módulo
**002-panel-administrativo**. El módulo 001-sitio-publico **consume** estas tablas
vía RLS (INSERT para el rol público) y RPCs (`obtener_tarifa_vigente()`,
consulta de estado), pero **NO debe** crear ni mantener migraciones propias para
ellas. Cualquier cambio de esquema a estas tablas se coordina a través de este
módulo (002), que es la fuente de verdad de la estructura de la base de datos.

---

## [PENDIENTE DE DECISIÓN] — Valores de `modalidad`

La constitución deja explícitamente abierta la nomenclatura de los valores del campo `modalidad` en la tabla `tarifas` (ej. "Madrugada"/"Regular", "Promocional"/"Regular", u otros). Estos valores deben quedar fijados antes de comenzar la implementación, ya que afectan:

- Las validaciones del formulario de inscripción en el sitio público.
- El campo `modalidad_tarifa` congelado en `inscripciones` en el momento del INSERT.
- Las plantillas de correo de notificación enviadas desde el panel administrativo.

---

## Entidades

### Inscripción (grupo)

Representa el envío colectivo de un grupo de participantes bajo un único comprobante de pago.

| Atributo | Descripción |
|---|---|
| `folio` | Identificador único legible asignado al grupo (ej. `BH-2026-0142`) |
| `modalidad_tarifa` | [PENDIENTE DE DECISIÓN] — valor congelado en el momento del INSERT |
| `cantidad_personas` | Número total de participantes en el grupo |
| `monto_esperado` | Calculado y congelado en servidor (`monto_por_persona × cantidad_personas` de la tarifa vigente al INSERT) |
| `url_comprobante` | URL del archivo de comprobante en Supabase Storage |
| `estado` | `pendiente` / `aprobada` / `rechazada` |
| `nombre_contacto` | Nombre completo del responsable del grupo |
| `telefono_contacto` | Teléfono del responsable |
| `correo_contacto` | Correo electrónico del responsable (destino de las notificaciones) |
| `fecha_creacion` | Timestamp del INSERT, zona horaria `America/Costa_Rica` |

**Quién opera sobre esta entidad:**
- Sitio público (`/sitio`): **CREA** filas nuevas vía INSERT atómico con estado inicial `pendiente`.
- Panel administrativo (`/admin`): **LEE** todas las filas; **MODIFICA** el campo `estado` a `aprobada` o `rechazada` (transición definitiva, no reversible).

---

### Participante

Representa a cada persona individual inscrita dentro de un grupo.

| Atributo | Descripción |
|---|---|
| `inscripcion_id` | Llave foránea → `inscripciones` |
| `cedula` | Número de cédula del participante |
| `nombre` | Nombre del participante |
| `apellidos` | Apellidos del participante |
| `talla_camisa` | Talla de camisa del participante |

**Quién opera sobre esta entidad:**
- Sitio público (`/sitio`): **CREA** filas nuevas en el mismo INSERT atómico que la Inscripción.
- Panel administrativo (`/admin`): **LEE** la lista completa de participantes de cada inscripción al visualizar su detalle.

---

### Comprobante de pago

Imagen o foto subida por el responsable del grupo como evidencia del pago colectivo. Almacenada de forma privada en un bucket de Supabase Storage; solo accesible por el administrador autenticado.

**Quién opera sobre esta entidad:**
- Sitio público (`/sitio`): **SUBE** el archivo al bucket de Supabase Storage; la URL resultante se guarda en `inscripciones.url_comprobante`.
- Panel administrativo (`/admin`): **LEE** (visualiza) el comprobante desde la URL almacenada al revisar el detalle de una inscripción.
