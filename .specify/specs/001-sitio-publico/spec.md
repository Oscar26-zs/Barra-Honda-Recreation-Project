# Feature Specification: Sitio Público — Recreativa Barra Honda

**Feature Branch**: `001-sitio-publico`

**Created**: 2026-09-01

**Status**: Draft

**Alineado con constitution.md**: v2.0.1

**Módulo**: `/sitio` — Sitio público de la recreativa (Astro, sin autenticación requerida)

**Spec hermano**: [002-panel-administrativo](../002-panel-administrativo/spec.md) — Lee y modifica el estado de las inscripciones que este módulo crea.

**Modelo de datos compartido**: [\_shared/data-model.md](../_shared/data-model.md)

---

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 — Inscripción Pública (Prioridad: P1)

**Página**: Precios / Inscripción

Una persona interesada visita la página "Precios / Inscripción" del sitio de la recreativa,
completa el formulario con los datos de contacto del responsable del grupo y los datos
individuales de cada participante (cédula, nombre, apellidos, talla de camisa). Adjunta el
comprobante de pago del grupo y envía el formulario. Al finalizar, recibe una confirmación
visual en pantalla con el folio asignado y el estado "pendiente". No necesita crear una
cuenta ni iniciar sesión para realizar este proceso.

**Por qué esta prioridad**: Es la razón de ser del sistema. Sin inscripciones públicas no
hay datos que administrar. Es el único punto de contacto del público con el sistema.

**Prueba independiente**: Puede probarse llenando el formulario con datos de contacto del
responsable y al menos un participante, adjuntando una imagen y verificando que aparece el
mensaje de confirmación con folio, y que la fila en `inscripciones` y las filas en
`participantes` existen en la base de datos con estado "pendiente".

**Escenarios de Aceptación**:

1. **Dado** que el formulario está vacío, **cuando** el usuario intenta enviarlo sin llenar
   los campos obligatorios, **entonces** el sistema muestra mensajes de error por campo
   faltante y no envía el formulario.
2. **Dado** que el usuario llena todos los campos del responsable y de al menos un
   participante, y adjunta un comprobante, **cuando** presiona "Enviar", **entonces** el
   sistema registra la inscripción con estado "pendiente" (INSERT atómico en `inscripciones`
   y `participantes`) y muestra un mensaje de confirmación con el folio asignado.
3. **Dado** que el usuario adjunta una imagen demasiado grande, **cuando** el sistema la
   procesa en el cliente, **entonces** la imagen es comprimida automáticamente antes de
   enviarse, sin intervención del usuario.
4. **Dado** que el usuario agrega varios participantes en el mismo formulario, **cuando**
   presiona "Enviar", **entonces** todos los participantes quedan registrados bajo el mismo
   folio y la misma inscripción en la base de datos.

---

### Historia de Usuario 2 — Consulta Pública de Estado por Folio + Cédula (Prioridad: P2)

**Página**: Consultar mi inscripción

Un participante que ya se inscribió desea saber si su inscripción fue aprobada o rechazada.
Visita la página "Consultar mi inscripción", ingresa el folio que recibió al momento del
envío y su número de cédula, y el sistema le muestra el estado actual del grupo. No necesita
iniciar sesión ni proporcionar ningún otro dato.

**Por qué esta prioridad**: Cierra el ciclo de comunicación con el participante sin requerir
autenticación ni exponer datos de otros grupos. Resuelve la necesidad de seguimiento sin
abrir vistas de listado.

**Prueba independiente**: Puede probarse ingresando un folio y cédula válidos y verificando
que retorna el estado correcto; luego ingresando una combinación inválida y verificando que
el mensaje de error no revela cuál de los dos datos fue incorrecto.

**Escenarios de Aceptación**:

1. **Dado** que el usuario ingresa un folio y una cédula que corresponden a un participante
   de ese folio, **cuando** presiona "Consultar", **entonces** el sistema muestra el estado
   actual de la inscripción (pendiente, aprobada o rechazada) y los datos generales del
   grupo (folio, modalidad, cantidad de personas).
2. **Dado** que el usuario ingresa una combinación de folio + cédula que no existe en el
   sistema, **cuando** presiona "Consultar", **entonces** el sistema muestra un mensaje
   genérico de "no se encontró ninguna inscripción" sin indicar si el folio, la cédula, o
   ambos son incorrectos.
3. **Dado** que el usuario deja en blanco el folio o la cédula, **cuando** intenta consultar,
   **entonces** el sistema muestra un error de validación por campo vacío y no ejecuta
   la consulta.

---

### Casos Límite

- ¿Qué ocurre si el responsable proporciona un correo electrónico con formato inválido?
  → El formulario rechaza el envío y muestra un error de validación antes de procesar.
- ¿Qué ocurre si la imagen del comprobante excede el tamaño máximo incluso después de la
  compresión? → El sistema muestra un mensaje de error indicando que el archivo no puede
  ser procesado y no permite el envío.
- ¿Qué ocurre si no existe ninguna tarifa activa en el momento en que el usuario intenta
  enviar el formulario? → El formulario muestra un mensaje indicando que no hay una tarifa
  disponible en este momento y bloquea el envío hasta que el administrador active una tarifa.
- ¿Qué ocurre si el usuario ingresa folio + cédula incorrectos en la consulta pública?
  → El sistema responde con un mensaje genérico sin indicar cuál de los dos datos falló,
  como mitigación básica contra fuerza bruta y enumeración (Principio IX, regla 4).

---

## Requisitos *(obligatorio)*

### Requisitos Funcionales

**Sitio público — Contenido estático**

El sitio público es un sitio **multipágina** construido con Astro, con al menos las
siguientes páginas separadas: Home, Precios / Inscripción, Galería, Consultar mi
inscripción. Todo el contenido es estático salvo las dos islas interactivas (formulario de
inscripción y consulta de estado).

- **FR-001**: El sitio DEBE implementar las páginas: Home (presentación del evento, llamado
  a inscripción), Precios / Inscripción (tarifas + formulario), Galería (imágenes de
  ediciones anteriores), y Consultar mi inscripción (búsqueda por folio + cédula).
- **FR-002**: El contenido de todas las páginas (excepto las islas interactivas) DEBE ser
  completamente estático; no requiere autenticación ni sesión para ser visualizado.

**Sitio público — Precios / Tarifas** *(Página: Precios / Inscripción)*

- **FR-021**: La página "Precios / Inscripción" DEBE mostrar la tarifa vigente de forma
  informativa (modalidad `Promocional` o `Regular` —ver `../_shared/data-model.md` →
  "Valores de `modalidad`"—, monto por persona, fecha de fin de vigencia) invocando la RPC
  `obtener_tarifa_vigente()` con la clave `anon`. Si no hay tarifa activa, DEBE mostrar un
  aviso de que las tarifas no están disponibles en este momento.
- **FR-022**: El campo `monto_esperado` de la inscripción DEBE calcularse y congelarse
  exclusivamente en el servidor (trigger o función PostgreSQL en el INSERT) como
  `monto_por_persona × cantidad_personas` de la tarifa vigente en el instante del INSERT,
  usando la zona horaria `America/Costa_Rica`. Ningún valor de monto enviado por el cliente
  es aceptado para el cálculo real.
- **FR-023**: Si al momento del INSERT no existe ninguna tarifa activa, la operación DEBE
  fallar con un error controlado y el formulario DEBE mostrar al usuario un mensaje
  indicando que no hay tarifa disponible, sin registrar ninguna fila parcial.

**Sitio público — Formulario de inscripción** *(Página: Precios / Inscripción — isla interactiva n.º 1)*

- **FR-003**: El formulario DEBE solicitar los siguientes datos del **responsable del
  grupo** (datos de contacto únicos por inscripción): nombre completo (`nombre_contacto`),
  número de teléfono (`telefono_contacto`), correo electrónico (`correo_contacto`). Además,
  por cada **participante** del grupo, DEBE capturar: número de cédula (`cedula`), nombre
  (`nombre`), apellidos (`apellidos`) y talla de camisa (`talla_camisa`). El formulario
  DEBE permitir agregar múltiples participantes en un mismo envío.
- **FR-004**: El formulario DEBE permitir adjuntar una imagen del comprobante de pago del
  grupo (formatos JPG, PNG o PDF de imagen). Un único comprobante cubre a todos los
  participantes del grupo.
- **FR-005**: El sistema DEBE comprimir la imagen del comprobante en el dispositivo del
  responsable antes de subirla, para mantenerse dentro de los límites de almacenamiento
  disponibles.
- **FR-006**: Al enviar el formulario, el sistema DEBE registrar de forma atómica una fila
  en `inscripciones` y las filas correspondientes en `participantes`, con estado inicial
  "pendiente" en la inscripción.
- **FR-007**: Tras el envío exitoso, el sistema DEBE mostrar al responsable una confirmación
  visual clara con el folio asignado, para que pueda usarlo posteriormente en la consulta
  de estado.
- **FR-008**: El formulario DEBE validar todos los campos obligatorios antes de permitir
  el envío; los errores de validación DEBEN mostrarse por campo.

**Sitio público — Consulta de estado** *(Página: Consultar mi inscripción — isla interactiva n.º 2)*

- **FR-024**: La página "Consultar mi inscripción" DEBE proporcionar un formulario donde
  cualquier participante pueda consultar el estado de su inscripción ingresando el folio y
  su número de cédula.
- **FR-025**: La consulta DEBE realizarse mediante la RPC SECURITY DEFINER de PostgreSQL
  (`supabase.rpc(...)` con clave `anon`). No existe ningún endpoint REST ni política RLS
  de SELECT directo sobre `inscripciones` o `participantes` para el rol público.
- **FR-026**: Si la combinación folio + cédula no coincide con ningún registro, el sistema
  DEBE responder con un mensaje genérico (ej. "No se encontró ninguna inscripción con
  esos datos") sin indicar cuál de los dos valores es incorrecto.

### Entidades Clave

Las entidades que este módulo opera están definidas completamente en [`../_shared/data-model.md`](../_shared/data-model.md).

- El sitio público **CREA** `Inscripción` — ver definición completa en `../_shared/data-model.md`.
- El sitio público **CREA** `Participante` — ver definición completa en `../_shared/data-model.md`.
- El sitio público **SUBE** `Comprobante de pago` — ver definición completa en `../_shared/data-model.md`.

---

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles

- **SC-001**: Un responsable puede completar el proceso de inscripción del grupo (llenar
  datos del responsable y al menos un participante, adjuntar comprobante y recibir
  confirmación con folio) en menos de 5 minutos sin asistencia.
- **SC-002**: El 100% de las inscripciones enviadas exitosamente quedan registradas con
  estado "pendiente" — con sus participantes asociados — y son visibles para el
  administrador.
- **SC-004**: Ninguna persona del público puede acceder a datos de inscripciones ajenas —
  cero incidentes de exposición de datos cruzados. La consulta pública devuelve únicamente
  el estado del folio consultado, nunca datos de otros grupos.
- **SC-006**: El sitio público carga completamente en menos de 3 segundos en una conexión
  de banda ancha estándar.
- **SC-007**: Un participante puede consultar el estado de su inscripción usando folio +
  cédula y obtener una respuesta correcta; una combinación inválida devuelve siempre un
  mensaje genérico sin revelar cuál dato es incorrecto.

---

## Fuera de Alcance

- Pagos en línea o integración con pasarelas de pago.
- Edición de una inscripción ya enviada por el público.
- Gestión de tarifas desde el sitio público — las tarifas se administran directamente en
  la base de datos.
- Notificaciones push, SMS o cualquier canal distinto al correo electrónico.

---

## Supuestos

- El responsable del grupo proporciona un correo electrónico válido y activo al momento de
  inscribirse; la verificación del correo no forma parte del flujo.
- El pago se realiza fuera del sistema (transferencia, depósito, SINPE u otro); el sistema
  solo gestiona la evidencia del pago (comprobante compartido por todo el grupo).
- El contenido estático del sitio (texto, imágenes de la galería, horarios) es proporcionado
  por la recreativa antes del desarrollo y no cambia frecuentemente; no se requiere un CMS.
- El volumen de inscripciones es moderado (decenas a cientos por período, no miles
  simultáneas), coherente con el nivel gratuito de los servicios utilizados.
- Siempre existirá al menos una tarifa activa en la base de datos durante los períodos de
  inscripción abierta; el administrador es responsable de mantener esto.
