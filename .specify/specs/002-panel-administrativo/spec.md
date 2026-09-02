# Feature Specification: Panel Administrativo — Recreativa Barra Honda

**Feature Branch**: `002-panel-administrativo`

**Created**: 2026-09-01

**Status**: Draft

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
> 3. **Comportamiento mobile** (`panel-layout.md` → Mobile): no verificado por inspección
>    de estilos computados — proviene de capturas de preview de Figma. Señalar antes de
>    implementar cualquier componente con lógica responsive (bottom tab bar, bottom sheet
>    de filtros, tarjetas de lista mobile).

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
   uno), el folio, el monto esperado y la imagen del comprobante de pago.

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
   "pendiente", **cuando** selecciona "Rechazar" y confirma, **entonces** el estado cambia
   a "rechazada" en la lista y el responsable recibe un correo de rechazo.
3. **Dado** que una inscripción ya tiene estado "aprobada" o "rechazada", **cuando** el
   administrador la visualiza, **entonces** los botones de Aprobar/Rechazar no están
   disponibles (estado final, no reversible).
4. **Dado** que se realiza un cambio de estado, **cuando** el correo de notificación es
   enviado, **entonces** el correo indica claramente si fue aprobada o rechazada e incluye
   el nombre del responsable del grupo y el folio.

---

### Casos Límite

- ¿Qué ocurre si el correo de notificación falla al enviarse? → El cambio de estado se
  guarda igualmente; el error de envío de correo se registra internamente pero no revierte
  la transición de estado.
- ¿Qué ocurre si el administrador cierra sesión mientras revisa una inscripción? → Al
  reintentar cualquier acción protegida, es redirigido al inicio de sesión.

---

## Requisitos *(obligatorio)*

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
  "rechazada").
- **FR-016**: Los cambios de estado DEBEN ser definitivos en esta versión; una inscripción
  aprobada o rechazada no puede volver a estado "pendiente" ni cambiar al estado contrario.
- **FR-017**: El administrador NO DEBE poder eliminar inscripciones.

**Notificaciones por correo**

- **FR-018**: Cuando una inscripción pase a estado "aprobada", el sistema DEBE enviar
  automáticamente un correo de notificación al `correo_contacto` del responsable informando
  la aprobación, incluyendo el folio y el nombre del responsable.
- **FR-019**: Cuando una inscripción pase a estado "rechazada", el sistema DEBE enviar
  automáticamente un correo de notificación al `correo_contacto` del responsable informando
  el rechazo, incluyendo el folio y el nombre del responsable.
- **FR-020**: El envío del correo DEBE ocurrir sin intervención manual adicional del
  administrador y de forma transparente para él.

### Entidades Clave

**Administrador** (exclusiva de este módulo): Usuario con acceso al panel de gestión
(`/admin`). Se autentica con correo y contraseña vía Supabase Auth. Es el único tipo de
usuario con privilegios de lectura y modificación directa sobre inscripciones y
participantes.

Las demás entidades que este módulo opera están definidas completamente en
[`../_shared/data-model.md`](../_shared/data-model.md).

- El panel administrativo **LEE** y **MODIFICA el estado de** `Inscripción` — ver definición completa en `../_shared/data-model.md`.
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

---

## Fuera de Alcance

- Recuperación de contraseña del administrador o gestión de múltiples roles/usuarios admin.
- Eliminación de inscripciones.
- Notificaciones push, SMS o cualquier canal distinto al correo electrónico.
- Reportes, estadísticas, gráficas o exportación de datos de inscripciones.
- Gestión de tarifas desde el panel administrativo (crear, editar, desactivar tarifas) —
  las tarifas se administran directamente en la base de datos.

---

## Supuestos

- Existe un solo administrador (o un equipo pequeño que comparte las mismas credenciales);
  no se requiere diferenciación de roles ni auditoría por usuario admin.
- Los correos de notificación no requieren plantillas de diseño elaboradas; un formato
  claro y funcional con el nombre del responsable, el folio y el resultado es suficiente.
- El volumen de inscripciones es moderado (decenas a cientos por período, no miles
  simultáneas), coherente con el nivel gratuito de los servicios utilizados.
