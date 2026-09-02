# Feature Specification: Panel Administrativo — Recreativa Barra Honda

**Feature Branch**: `002-panel-administrativo`

**Created**: 2026-09-01

**Status**: Aprobado — aclaraciones aplicadas 2026-09-02 (modalidad, exportación, cardinalidad de tarifas, motivo de rechazo)

**Alineado con constitution.md**: v2.0.1

**Módulo**: `/admin` — Panel de gestión de inscripciones (autenticación requerida)

**Spec hermano**: [001-sitio-publico](../001-sitio-publico/spec.md) — Crea las inscripciones y participantes que este módulo revisa y procesa.

**Modelo de datos compartido**: [\_shared/data-model.md](../_shared/data-model.md)

---

## Referencia de diseño

El sistema de diseño (colores, tipografía, componentes) y la estructura de cada pantalla
de este módulo están documentados en:

- [`design/design-system.md`](design/design-system.md)
- [`design/panel-layout.md`](design/panel-layout.md)

Cualquier componente nuevo que se implemente debe seguir los tokens definidos ahí. Si un
requisito de este spec entra en conflicto con lo ya documentado en esos archivos, se debe
señalar explícitamente antes de implementar, no asumir.

> **Known Gaps pendientes de resolución antes de implementar las pantallas afectadas:**
>
> 1. **Botón "Exportar a Excel"** (`design-system.md` → Components → Botones): posible
>    inconsistencia entre el estilo visual capturado (azul sólido, texto blanco) y el
>    query de estilos computados (tint + texto azul). Señalar antes de implementar la
>    barra de acciones de Inscripciones.
> 2. **Color del estado "Programado"** en Tarifas (`design-system.md` → Colors → Semánticos
>    de estado): usa `#4B80E8`, distinto al `--azul-barra` (`#0861CD`). Señalar antes de
>    implementar los badges de descuentos.
>
> **RESUELTO:** el punto 3 (comportamiento mobile) quedó confirmado por capturas de pantalla
> reales de la implementación mobile (2026-09-01). Ver [Mobile — confirmado por capturas de
> implementación](design/panel-layout.md). Queda sin resolver únicamente para desktop el
> detalle ya documentado de que "Aprobar"/"Rechazar" no son sticky y "Guardar descuento" sí lo es.

---

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 3 — Revisión de Inscripciones por el Administrador (Prioridad: P3)

**Aplicación**: Panel administrativo (`/admin`)

El administrador de la recreativa inicia sesión en el panel administrativo con sus
credenciales. Una vez dentro, puede ver la lista completa de inscripciones recibidas
ordenadas o filtradas por estado. Puede identificar visualmente cuáles están pendientes de
revisión y abrir el detalle de cualquier inscripción para ver los datos del responsable del
grupo, la lista de participantes con sus datos individuales, y el comprobante de pago adjunto.

**Por qué esta prioridad**: Sin esta capacidad el administrador no puede procesar las
solicitudes recibidas; es el núcleo del flujo de trabajo administrativo.

**Prueba independiente**: Puede probarse iniciando sesión con credenciales válidas,
verificando que la lista de inscripciones carga correctamente y que el detalle muestra
los datos del responsable, la lista completa de participantes y la imagen del comprobante.

**Escenarios de Aceptación**:

1. **Dado** que el administrador accede al panel sin haber iniciado sesión, **cuando**
   intenta ver la lista de inscripciones, **entonces** es redirigido a la pantalla de
   inicio de sesión.
2. **Dado** que el administrador introduce credenciales incorrectas, **cuando** intenta
   iniciar sesión, **entonces** el sistema muestra un mensaje de error y no otorga acceso.
3. **Dado** que el administrador inició sesión correctamente, **cuando** accede a la lista
   de inscripciones, **entonces** ve todas las inscripciones con su estado actual
   (pendiente, aprobada, rechazada) y puede distinguir visualmente las pendientes.
4. **Dado** que el administrador selecciona una inscripción de la lista, **cuando** abre
   su detalle, **entonces** puede ver los datos del responsable del grupo (nombre, teléfono,
   correo), la lista de participantes (cédula, nombre, apellidos, talla de camisa de cada
   uno), el folio, la modalidad aplicada, la cantidad de personas, el monto esperado y la
   imagen del comprobante de pago.

---

### Historia de Usuario 4 — Aprobación o Rechazo con Notificación por Correo (Prioridad: P4)

**Aplicación**: Panel administrativo (`/admin`)

Desde el detalle de una inscripción pendiente, el administrador toma una decisión: aprueba
o rechaza la solicitud. Al confirmar la acción, el estado de la inscripción cambia de forma
inmediata en la lista y el responsable del grupo recibe automáticamente un correo electrónico
informando el resultado de su solicitud.

**Por qué esta prioridad**: Completa el ciclo de vida de la inscripción y garantiza
comunicación con el solicitante sin intervención manual adicional del administrador.

**Prueba independiente**: Puede probarse cambiando el estado de una inscripción de prueba
y verificando que el estado se actualiza en la lista y que el correo de notificación llega
al correo del responsable del grupo.

**Escenarios de Aceptación**:

1. **Dado** que el administrador está en el detalle de una inscripción con estado
   "pendiente", **cuando** selecciona "Aprobar" y confirma, **entonces** el estado cambia
   a "aprobada" en la lista y el responsable recibe un correo de aprobación.
2. **Dado** que el administrador está en el detalle de una inscripción con estado
   "pendiente", **cuando** selecciona "Rechazar", ingresa el motivo obligatorio y confirma,
   **entonces** el estado cambia a "rechazada" en la lista, el motivo queda guardado en la
   inscripción y el responsable recibe un correo de rechazo que incluye ese motivo.
3. **Dado** que una inscripción ya tiene estado "aprobada" o "rechazada", **cuando** el
   administrador la visualiza, **entonces** los botones de Aprobar/Rechazar no están
   disponibles (estado final, no reversible).
4. **Dado** que se realiza un cambio de estado, **cuando** el correo de notificación es
   enviado, **entonces** el correo indica claramente si fue aprobada o rechazada, incluye
   el nombre del responsable del grupo y el folio, y —si fue rechazada— el motivo indicado
   por el administrador.

---

### Historia de Usuario 5 — Gestión de Descuentos sobre Tarifas (Prioridad: P5)

**Aplicación**: Panel administrativo (`/admin`)

El administrador puede ver la tarifa vigente y gestionar descuentos temporales que se
aplican sobre ella. En esta versión existe una única tarifa activa a la vez, por lo que
todo descuento aplica sobre esa tarifa. Puede crear un descuento indicando nombre, rango de
fechas y porcentaje, viendo una vista previa en vivo del precio resultante. Puede editar o
eliminar descuentos existentes. El estado de cada descuento (Programado, Activo, Vencido) se
calcula automáticamente según la fecha actual (zona horaria `America/Costa_Rica`).

**Por qué esta prioridad**: Es una capacidad de valor agregado sobre el flujo core
(HU3/HU4); las tarifas base siguen administrándose directamente en la base de datos, pero
las promociones temporales necesitan una interfaz operativa para no requerir SQL manual en
cada temporada.

**Prueba independiente**: Crear un descuento con fechas que lo hagan "Activo" hoy, verificar
que la vista previa muestra el precio correcto, editarlo, eliminarlo, y verificar que no se
puede crear un segundo descuento con fechas superpuestas.

**Escenarios de Aceptación**:

1. **Dado** que el administrador accede a la pantalla de Tarifas, **cuando** la carga,
   **entonces** ve la tarifa vigente actual y la lista de descuentos existentes con su estado
   (Programado/Activo/Vencido).
2. **Dado** que el administrador crea un nuevo descuento con nombre, fechas y porcentaje,
   **cuando** guarda, **entonces** el descuento aparece en la lista con su estado calculado
   automáticamente según la fecha actual.
3. **Dado** que el administrador está llenando el formulario de descuento, **cuando**
   ingresa el porcentaje, **entonces** ve una vista previa en vivo del precio final con
   descuento aplicado.
4. **Dado** que ya existe un descuento "Activo" o "Programado" en un rango de fechas,
   **cuando** el administrador intenta crear o editar otro descuento con fechas
   superpuestas, **entonces** el sistema rechaza la operación con un mensaje de error claro
   (validado en el cliente y reforzado en el servidor).
5. **Dado** que el administrador edita o elimina un descuento existente, **cuando**
   confirma la acción, **entonces** los cambios se reflejan inmediatamente en la lista.

---

### Casos Límite

- ¿Qué ocurre si el correo de notificación falla al enviarse? → El cambio de estado se
  guarda igualmente; el error de envío de correo se registra internamente pero no revierte
  la transición de estado.
- ¿Qué ocurre si el administrador cierra sesión mientras revisa una inscripción? → Al
  reintentar cualquier acción protegida, es redirigido al inicio de sesión.

---

## Requisitos *(obligatorio)*

### Modalidades de tarifa (valores fijos)

Los valores definitivos del campo `modalidad` de la tabla `tarifas` son **exactamente dos**:

- **`Promocional`**: tarifa temprana con precio reducido, vigente durante el período de
  inscripción anticipada (definido por `fecha_inicio`/`fecha_fin` de la fila de `tarifas`).
- **`Regular`**: tarifa estándar, vigente el resto del período.

En esta versión existe **una única fila de `tarifas` con `activa = true` a la vez**. El
servidor determina la modalidad vigente comparando la fecha del INSERT en zona horaria
`America/Costa_Rica` contra el rango de esa fila. La pantalla de Tarifas del panel muestra
**una sola tarjeta** (la tarifa vigente). Estos valores son los que deben usarse en las
validaciones del formulario del sitio público, en el campo congelado
`inscripciones.modalidad_tarifa` y en las plantillas de correo. Cierra el TODO abierto en
`constitution.md` (informe de sincronización) y en `_shared/data-model.md`.

### Requisitos Funcionales

**Panel administrativo — Autenticación**

- **FR-010**: El panel administrativo DEBE requerir inicio de sesión con correo electrónico
  y contraseña para acceder a cualquier funcionalidad.
- **FR-011**: Cualquier ruta del panel administrativo DEBE redirigir al formulario de
  inicio de sesión si el usuario no está autenticado.

**Panel administrativo — Gestión de inscripciones**

- **FR-012**: El administrador autenticado DEBE poder ver una lista de todas las
  inscripciones con su folio, estado actual (pendiente, aprobada, rechazada) y fecha de
  creación.
- **FR-013**: La lista DEBE permitir identificar visualmente (ej. por filtro o indicador
  de color/etiqueta) cuáles inscripciones tienen estado "pendiente".
- **FR-014**: El administrador DEBE poder abrir el detalle de cualquier inscripción y ver:
  datos del responsable del grupo (nombre, teléfono, correo), lista completa de
  participantes (cédula, nombre, apellidos, talla de camisa de cada uno), folio, modalidad
  aplicada, cantidad de personas, monto esperado, y la imagen del comprobante de pago.
- **FR-015**: Desde el detalle de una inscripción con estado "pendiente", el administrador
  DEBE poder aprobarla (cambiar estado a "aprobada") o rechazarla (cambiar estado a
  "rechazada"). Ambas acciones DEBEN requerir un paso de confirmación explícito; la de
  rechazo incluye el campo obligatorio de motivo (ver FR-019a).
- **FR-016**: Los cambios de estado DEBEN ser definitivos en esta versión; una inscripción
  aprobada o rechazada no puede volver a estado "pendiente" ni cambiar al estado contrario.
- **FR-017**: La interfaz del panel NO DEBE ofrecer ninguna acción para eliminar
  inscripciones ni participantes. (Nota: a nivel de base de datos el rol `authenticated`
  conserva permisos completos según `constitution.md` → "Requisitos de Seguridad"; esta
  restricción es de producto/UI, no de RLS.)
- **FR-032**: El administrador DEBE poder exportar a un archivo (Excel/CSV) la lista de
  inscripciones actualmente visible —respetando el filtro por estado y la búsqueda
  aplicados—, incluyendo al menos: folio, datos de contacto del responsable, cantidad de
  personas, modalidad, monto esperado, estado y fecha de creación.

**Notificaciones por correo**

- **FR-018**: Cuando una inscripción pase a estado "aprobada", el sistema DEBE enviar
  automáticamente un correo de notificación al `correo_contacto` del responsable informando
  la aprobación, incluyendo el folio y el nombre del responsable.
- **FR-019**: Cuando una inscripción pase a estado "rechazada", el sistema DEBE enviar
  automáticamente un correo de notificación al `correo_contacto` del responsable informando
  el rechazo, incluyendo el folio, el nombre del responsable y el motivo de rechazo
  ingresado por el administrador.
- **FR-019a**: El motivo de rechazo DEBE ser obligatorio al rechazar y DEBE persistirse en
  la inscripción (`inscripciones.motivo_rechazo`) para referencia interna. No aplica al
  aprobar (permanece vacío).
- **FR-020**: El envío del correo DEBE ocurrir sin intervención manual adicional del
  administrador y de forma transparente para él. Si el envío falla, el cambio de estado NO
  se revierte: el error se registra internamente y no bloquea al administrador (ver Casos
  Límite).

**Panel administrativo — Gestión de descuentos**

- **FR-027**: El administrador autenticado DEBE poder ver la tarifa vigente (modalidad,
  monto por persona) en la pantalla de Tarifas.
- **FR-028**: El administrador DEBE poder crear un descuento especificando nombre, fecha
  de inicio, fecha de fin y porcentaje, con vista previa en vivo del precio resultante antes
  de guardar. En esta versión el descuento aplica siempre sobre la única tarifa activa; el
  atributo `aplica_a` queda reservado para una futura versión con múltiples tarifas.
- **FR-029**: El administrador DEBE poder editar y eliminar descuentos existentes.
- **FR-030**: El estado de cada descuento (Programado / Activo / Vencido) DEBE
  calcularse automáticamente en función de la fecha actual (zona horaria
  `America/Costa_Rica`) y las fechas de inicio/fin del descuento (ambas inclusivas), sin
  intervención manual del administrador.
- **FR-031**: El sistema NO DEBE permitir que existan dos descuentos en estado "Activo"
  o "Programado" con rangos de fechas superpuestos. La operación de crear/editar DEBE
  rechazarse con un error claro. La validación se realiza en el cliente (feedback inmediato)
  y se refuerza en el servidor (función/trigger en la tabla `descuentos`), que es la
  garantía definitiva.

### Entidades Clave

**Administrador** (exclusiva de este módulo): Usuario con acceso al panel de gestión
(`/admin`). Se autentica con correo y contraseña vía Supabase Auth. Es el único tipo de
usuario con privilegios de lectura y modificación directa sobre inscripciones y
participantes.

**Descuento** (exclusiva de este módulo): Promoción temporal aplicada sobre la tarifa
activa. Atributos: `nombre`, `fecha_inicio`, `fecha_fin`, `porcentaje`, `aplica_a`
(reservado para una versión futura con múltiples tarifas; en esta versión siempre `null` =
la única tarifa activa), y un estado **calculado** (Programado/Activo/Vencido) derivado
automáticamente de la fecha actual en zona `America/Costa_Rica` — no se almacena
manualmente (se expone mediante la vista `descuentos_estado`). Es exclusiva del panel: el sitio público solo necesita leer el
precio final ya calculado (por `obtener_tarifa_vigente()` y el `monto_esperado` congelado en
servidor), no la entidad cruda; por eso **no** se registra en `../_shared/data-model.md`.

Las demás entidades que este módulo opera están definidas completamente en
[`../_shared/data-model.md`](../_shared/data-model.md).

- El panel administrativo **LEE** y **MODIFICA el `estado` (y `motivo_rechazo`) de** `Inscripción` — ver definición completa en `../_shared/data-model.md`.
- El panel administrativo **LEE** `Participante` — ver definición completa en `../_shared/data-model.md`.
- El panel administrativo **LEE** `Comprobante de pago` — ver definición completa en `../_shared/data-model.md`.

---

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles

- **SC-003**: El 100% de los cambios de estado (aprobación o rechazo) disparan el envío
  automático de un correo al responsable del grupo, sin acción adicional del administrador.
- **SC-005**: El administrador puede revisar el detalle completo (datos del responsable,
  lista de participantes y comprobante) de una inscripción y tomar una decisión en menos de
  2 minutos por inscripción.
- **SC-008**: El administrador puede crear un descuento y ver su estado
  (Programado/Activo/Vencido) calculado correctamente según la fecha, sin necesidad de
  SQL manual.

---

## Fuera de Alcance

- Recuperación de contraseña del administrador o gestión de múltiples roles/usuarios admin.
- Eliminación de inscripciones.
- Notificaciones push, SMS o cualquier canal distinto al correo electrónico.
- Reportes, estadísticas o gráficas de inscripciones. (La exportación simple de la lista
  visible a Excel/CSV SÍ está en alcance — ver FR-032.)
- Gestión de la tarifa base (crear, editar o desactivar el monto de una categoría de tarifa)
  — se administra directamente en la base de datos. La gestión de **Descuentos** sobre tarifas
  existentes **SÍ** está en el alcance de este módulo (ver Historia de Usuario 5).

---

## Supuestos

- Existe un solo administrador (o un equipo pequeño que comparte las mismas credenciales);
  no se requiere diferenciación de roles ni auditoría por usuario admin.
- Los correos de notificación no requieren plantillas de diseño elaboradas; un formato
  claro y funcional con el nombre del responsable, el folio y el resultado es suficiente.
- El volumen de inscripciones es moderado (decenas a cientos por período, no miles
  simultáneas), coherente con el nivel gratuito de los servicios utilizados.
