# Feature Specification: Sistema de Administración de Inscripciones — Recreativa Barra Honda

**Feature Branch**: `001-admin-inscripciones`

**Created**: 2026-08-22

**Status**: Draft

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 — Inscripción Pública (Prioridad: P1)

Una persona interesada visita el sitio web de la recreativa, completa el formulario de
inscripción con sus datos personales, adjunta el comprobante de pago de su inscripción y
envía el formulario. Al finalizar, recibe una confirmación visual en pantalla de que su
solicitud fue registrada correctamente con estado "pendiente". No necesita crear una cuenta
ni iniciar sesión para realizar este proceso.

**Por qué esta prioridad**: Es la razón de ser del sistema. Sin inscripciones públicas no
hay datos que administrar. Es el único punto de contacto del público con el sistema.

**Prueba independiente**: Puede probarse completamente llenando el formulario, adjuntando
una imagen y verificando que aparece el mensaje de confirmación y que el registro existe en
la base de datos con estado "pendiente".

**Escenarios de Aceptación**:

1. **Dado** que el formulario está vacío, **cuando** el usuario intenta enviarlo sin llenar
   los campos obligatorios, **entonces** el sistema muestra mensajes de error por campo
   faltante y no envía el formulario.
2. **Dado** que el usuario llena todos los campos correctamente y adjunta un comprobante,
   **cuando** presiona "Enviar", **entonces** el sistema registra la inscripción con estado
   "pendiente" y muestra un mensaje de confirmación exitosa en pantalla.
3. **Dado** que el usuario adjunta una imagen demasiado grande, **cuando** el sistema la
   procesa en el cliente, **entonces** la imagen es comprimida automáticamente antes de
   enviarse, sin intervención del usuario.
4. **Dado** que el formulario fue enviado exitosamente, **cuando** el usuario recarga la
   página o navega al sitio nuevamente, **entonces** no puede ver ni consultar el estado de
   su inscripción (no existe vista de seguimiento público).

---

### Historia de Usuario 2 — Revisión de Inscripciones por el Administrador (Prioridad: P2)

El administrador de la recreativa inicia sesión en el panel administrativo con sus
credenciales. Una vez dentro, puede ver la lista completa de inscripciones recibidas
ordenadas o filtradas por estado. Puede identificar visualmente cuáles están pendientes de
revisión y abrir el detalle de cualquier inscripción para ver los datos del solicitante y
el comprobante de pago adjunto.

**Por qué esta prioridad**: Sin esta capacidad el administrador no puede procesar las
solicitudes recibidas; es el núcleo del flujo de trabajo administrativo.

**Prueba independiente**: Puede probarse iniciando sesión con credenciales válidas,
verificando que la lista de inscripciones carga correctamente y que el detalle de cada una
muestra los datos ingresados por el solicitante y la imagen del comprobante.

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
   su detalle, **entonces** puede ver todos los datos personales ingresados por el
   solicitante y visualizar la imagen del comprobante de pago.

---

### Historia de Usuario 3 — Aprobación o Rechazo con Notificación por Correo (Prioridad: P3)

Desde el detalle de una inscripción pendiente, el administrador toma una decisión: aprueba
o rechaza la solicitud. Al confirmar la acción, el estado de la inscripción cambia de forma
inmediata en la lista y el solicitante recibe automáticamente un correo electrónico
informando el resultado de su solicitud.

**Por qué esta prioridad**: Completa el ciclo de vida de la inscripción y garantiza
comunicación con el solicitante sin intervención manual adicional del administrador.

**Prueba independiente**: Puede probarse cambiando el estado de una inscripción de prueba
y verificando que el estado se actualiza en la lista y que el correo de notificación llega
al correo del solicitante.

**Escenarios de Aceptación**:

1. **Dado** que el administrador está en el detalle de una inscripción con estado
   "pendiente", **cuando** selecciona "Aprobar" y confirma, **entonces** el estado cambia
   a "aprobada" en la lista y el solicitante recibe un correo de aprobación.
2. **Dado** que el administrador está en el detalle de una inscripción con estado
   "pendiente", **cuando** selecciona "Rechazar" y confirma, **entonces** el estado cambia
   a "rechazada" en la lista y el solicitante recibe un correo de rechazo.
3. **Dado** que una inscripción ya tiene estado "aprobada" o "rechazada", **cuando** el
   administrador la visualiza, **entonces** los botones de Aprobar/Rechazar no están
   disponibles (estado final, no reversible).
4. **Dado** que se realiza un cambio de estado, **cuando** el correo de notificación es
   enviado, **entonces** el correo indica claramente si fue aprobada o rechazada e incluye
   el nombre del solicitante.

---

### Casos Límite

- ¿Qué ocurre si el solicitante proporciona un correo electrónico con formato inválido?
  → El formulario rechaza el envío y muestra un error de validación antes de procesar.
- ¿Qué ocurre si la imagen del comprobante excede el tamaño máximo incluso después de la
  compresión? → El sistema muestra un mensaje de error indicando que el archivo no puede
  ser procesado y no permite el envío.
- ¿Qué ocurre si el correo de notificación falla al enviarse? → El cambio de estado se
  guarda igualmente; el error de envío de correo se registra internamente pero no revierte
  la transición de estado.
- ¿Qué ocurre si el administrador cierra sesión mientras revisa una inscripción? → Al
  reintentar cualquier acción protegida, es redirigido al inicio de sesión.

## Requisitos *(obligatorio)*

### Requisitos Funcionales

**Sitio público — Contenido estático**

- **FR-001**: El sitio DEBE mostrar información general de la recreativa: descripción,
  horarios, ubicación, precios y galería de imágenes.
- **FR-002**: El contenido del sitio público (excepto el formulario de inscripción) DEBE
  ser completamente estático; no requiere autenticación ni sesión para ser visualizado.

**Sitio público — Formulario de inscripción**

- **FR-003**: El formulario DEBE solicitar los siguientes datos obligatorios al solicitante:
  nombre completo, número de teléfono, correo electrónico.
- **FR-004**: El formulario DEBE permitir adjuntar una imagen del comprobante de pago
  (formatos JPG, PNG o PDF de imagen).
- **FR-005**: El sistema DEBE comprimir la imagen del comprobante en el dispositivo del
  solicitante antes de subirla, para mantenerse dentro de los límites de almacenamiento
  disponibles.
- **FR-006**: Al enviar el formulario, el sistema DEBE registrar la inscripción con estado
  inicial "pendiente".
- **FR-007**: Tras el envío exitoso, el sistema DEBE mostrar al solicitante una confirmación
  visual clara en la misma página.
- **FR-008**: El formulario DEBE validar todos los campos obligatorios antes de permitir
  el envío; los errores de validación DEBEN mostrarse por campo.
- **FR-009**: El sitio público NO DEBE exponer ninguna vista de consulta de inscripciones;
  una vez enviado el formulario, el solicitante no puede ver ni rastrear su estado.

**Panel administrativo — Autenticación**

- **FR-010**: El panel administrativo DEBE requerir inicio de sesión con correo electrónico
  y contraseña para acceder a cualquier funcionalidad.
- **FR-011**: Cualquier ruta del panel administrativo DEBE redirigir al formulario de
  inicio de sesión si el usuario no está autenticado.

**Panel administrativo — Gestión de inscripciones**

- **FR-012**: El administrador autenticado DEBE poder ver una lista de todas las
  inscripciones con su estado actual (pendiente, aprobada, rechazada).
- **FR-013**: La lista DEBE permitir identificar visualmente (ej. por filtro o indicador
  de color/etiqueta) cuáles inscripciones tienen estado "pendiente".
- **FR-014**: El administrador DEBE poder abrir el detalle de cualquier inscripción y ver:
  todos los datos personales ingresados por el solicitante y la imagen del comprobante de
  pago adjunto.
- **FR-015**: Desde el detalle de una inscripción con estado "pendiente", el administrador
  DEBE poder aprobarla (cambiar estado a "aprobada") o rechazarla (cambiar estado a
  "rechazada").
- **FR-016**: Los cambios de estado DEBEN ser definitivos en esta versión; una inscripción
  aprobada o rechazada no puede volver a estado "pendiente" ni cambiar al estado contrario.
- **FR-017**: El administrador NO DEBE poder eliminar inscripciones.

**Notificaciones por correo**

- **FR-018**: Cuando una inscripción pase a estado "aprobada", el sistema DEBE enviar
  automáticamente un correo de notificación al correo del solicitante informando la
  aprobación.
- **FR-019**: Cuando una inscripción pase a estado "rechazada", el sistema DEBE enviar
  automáticamente un correo de notificación al correo del solicitante informando el rechazo.
- **FR-020**: El envío del correo DEBE ocurrir sin intervención manual adicional del
  administrador y de forma transparente para él.

### Entidades Clave

- **Inscripción**: Representa la solicitud de una persona para unirse a la recreativa.
  Atributos: nombre completo, teléfono, correo electrónico, referencia al comprobante de
  pago, estado (pendiente / aprobada / rechazada), fecha de envío.
- **Comprobante de pago**: Imagen o foto subida por el solicitante como evidencia de su
  pago. Almacenado de forma privada; solo accesible por el administrador autenticado.
- **Administrador**: Usuario con acceso al panel de gestión. Se autentica con correo y
  contraseña. Es el único tipo de usuario con privilegios de lectura y modificación de
  inscripciones.

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles

- **SC-001**: Un solicitante puede completar el proceso de inscripción (llenar formulario,
  adjuntar comprobante y recibir confirmación) en menos de 5 minutos sin asistencia.
- **SC-002**: El 100% de las inscripciones enviadas exitosamente quedan registradas con
  estado "pendiente" y son visibles para el administrador.
- **SC-003**: El 100% de los cambios de estado (aprobación o rechazo) disparan el envío
  automático de un correo al solicitante, sin acción adicional del administrador.
- **SC-004**: Ninguna persona del público puede acceder a datos de inscripciones ajenas —
  cero incidentes de exposición de datos cruzados.
- **SC-005**: El administrador puede revisar el detalle completo (datos + comprobante) de
  una inscripción y tomar una decisión en menos de 2 minutos por inscripción.
- **SC-006**: El sitio público carga completamente en menos de 3 segundos en una conexión
  de banda ancha estándar.

## Fuera de Alcance

- Pagos en línea o integración con pasarelas de pago.
- Recuperación de contraseña del administrador o gestión de múltiples roles/usuarios admin.
- Edición de una inscripción ya enviada (por el público o por el admin).
- Notificaciones push, SMS o cualquier canal distinto al correo electrónico.
- Reportes, estadísticas, gráficas o exportación de datos de inscripciones.

## Supuestos

- Existe un solo administrador (o un equipo pequeño que comparte las mismas credenciales);
  no se requiere diferenciación de roles ni auditoría por usuario admin.
- El solicitante proporciona un correo electrónico válido y activo al momento de inscribirse;
  la verificación del correo no forma parte del flujo.
- El pago se realiza fuera del sistema (transferencia, depósito, SINPE u otro); el sistema
  solo gestiona la evidencia del pago (comprobante).
- El contenido estático del sitio (texto, imágenes de la galería, precios, horarios) es
  proporcionado por la recreativa antes del desarrollo y no cambia frecuentemente; no se
  requiere un CMS.
- El volumen de inscripciones es moderado (decenas a cientos por período, no miles
  simultáneas), coherente con el nivel gratuito de los servicios utilizados.
- Los correos de notificación no requieren plantillas de diseño elaboradas; un formato
  claro y funcional con el nombre del solicitante y el resultado es suficiente.
