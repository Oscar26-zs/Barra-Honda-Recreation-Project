# Feature Specification: Edición de Inscripciones y Reserva con 50 % del Pago

**Feature Branch**: `003-edicion-reserva-pago`

**Created**: 2026-10-07

**Status**: Draft — decisiones del propietario confirmadas 2026-10-07 (ver "Decisiones confirmadas")

**Alineado con constitution.md**: v2.1.0 (enmienda aprobada 2026-10-07)

**Módulos afectados**: `/admin` (panel) y `/sitio` (sitio público)

**Specs relacionados**:
- [001-sitio-publico](../001-sitio-publico/spec.md) — formulario de inscripción y consulta de estado (se amplían).
- [002-panel-administrativo](../002-panel-administrativo/spec.md) — detalle, registro manual, aprobación (se amplían).

**Modelo de datos compartido**: [\_shared/data-model.md](../_shared/data-model.md)

**Input**: Descripción del propietario: "Quiero que se pueda editar una inscripción, ya que
los dueños decidieron que personas que ya estaban inscritas y no van a asistir vendieron la
inscripción, y ahora la talla de camisa, la persona y demás información va a cambiar. Además
se va a poder reservar una inscripción con el 50 % del precio, es decir, que se pague en dos
tractos, por lo que las inscripciones deben tener el estado de que se pagó una parte y falta
pagar la otra."

---

## Decisiones confirmadas (propietario, 2026-10-07)

| Tema | Decisión |
|---|---|
| ¿Dónde se elige reservar con 50 %? | En el **formulario público** y en el **registro manual del panel**. |
| ¿Cómo se registra el saldo (segundo 50 %)? | **De las dos formas**: el cliente sube el segundo comprobante desde "Consultar mi inscripción" (folio + cédula) y el admin lo confirma; **o** el admin registra el saldo directamente en el panel. |
| ¿Qué se puede editar? | Datos del responsable y de cada participante **existente**. **No** se agregan ni quitan participantes; el monto no cambia. |
| Correos | Al aprobar una reserva, el correo indica el **saldo pendiente**. Al confirmar el saldo se envía un correo de **"Pago completo"**. |
| ¿La reserva está siempre disponible? | **No.** Es un **interruptor** en la pantalla Tarifas del panel (no es un descuento). Apagado por defecto; el formulario público solo ofrece "Reserva 50 %" cuando está encendido. |

---

## Conceptos

- **Tipo de pago** (se elige al crear la inscripción, no cambia después):
  - **Pago completo**: el comprobante cubre el 100 % del monto. Es el comportamiento actual.
  - **Reserva 50 %**: el comprobante inicial cubre el 50 % del monto; el otro 50 % (el
    **saldo**) se paga después.
- **Estado del pago**: dimensión **independiente** del estado de revisión
  (`pendiente`/`aprobada`/`rechazada`, que no cambia). Valores visibles:
  - **Pago completo** — no se debe nada.
  - **Saldo pendiente** — reserva cuyo segundo pago aún no se ha recibido.
  - **Saldo en revisión** — el cliente subió el comprobante del saldo y el admin aún no lo
    confirma.
- **Monto de reserva** = 50 % del `monto_esperado`, redondeado al colón entero hacia arriba.
  **Saldo** = `monto_esperado` − monto de reserva. Ambos se calculan en el servidor.

Ciclo de vida de una reserva:

```
Crear (Reserva 50 %) ─► pendiente · Saldo pendiente
        │ admin aprueba (correo "Reserva confirmada — saldo pendiente ₡X")
        ▼
   aprobada · Saldo pendiente ──(cliente sube 2.º comprobante)──► aprobada · Saldo en revisión
        │                                                              │
        │ admin registra saldo                       admin confirma ──┤── admin rechaza comprobante
        ▼                                                              ▼          (con motivo)
   aprobada · Pago completo  ◄─────────────────────────────────────────┘     vuelve a Saldo pendiente
   (correo "Pago completo")
```

---

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 7 — Edición de una Inscripción por el Administrador (Prioridad: P1)

**Aplicación**: Panel administrativo (`/admin`)

Un participante inscrito no podrá asistir y vendió su cupo a otra persona. El responsable
avisa a la recreativa y el administrador abre el detalle de la inscripción, selecciona
"Editar", reemplaza los datos del participante (cédula, nombre, apellidos, género, talla de
camisa) y, si cambió el responsable, también su nombre, teléfono y correo. Al guardar, los
nuevos datos quedan registrados bajo el mismo folio, con el mismo monto y estado.

**Por qué esta prioridad**: Es una necesidad operativa inmediata (cupos revendidos) y hoy
no hay forma de resolverla sin editar la base de datos a mano.

**Prueba independiente**: Editar la talla y la cédula de un participante de una inscripción
aprobada, guardar, y verificar que el detalle, la lista, la exportación a Excel y la
consulta pública (con la cédula nueva) reflejan el cambio, y que el folio, la cantidad de
personas, el monto y el estado no cambiaron.

**Escenarios de Aceptación**:

1. **Dado** que el administrador está en el detalle de una inscripción "pendiente" o
   "aprobada", **cuando** selecciona "Editar", **entonces** ve un formulario precargado con
   los datos del responsable y de cada participante.
2. **Dado** que el administrador modifica uno o varios campos válidos, **cuando** guarda,
   **entonces** todos los cambios se aplican juntos (o ninguno si algo falla) y el detalle
   muestra los datos nuevos inmediatamente.
3. **Dado** que el formulario de edición está abierto, **cuando** el administrador lo
   revisa, **entonces** no existe ninguna opción para agregar ni quitar participantes, ni
   para modificar folio, monto, modalidad, tipo de pago o estado.
4. **Dado** que el administrador deja un campo obligatorio vacío o pone un correo inválido,
   **cuando** intenta guardar, **entonces** el sistema muestra el error en el campo y no
   guarda nada.
5. **Dado** que una inscripción está "rechazada", **cuando** el administrador abre su
   detalle, **entonces** la acción "Editar" no está disponible.
6. **Dado** que se cambió la cédula de un participante, **cuando** la nueva persona consulta
   en el sitio con el folio y su cédula nueva, **entonces** obtiene el estado de la
   inscripción; la cédula anterior deja de funcionar para ese folio.
7. **Dado** que el administrador sale del formulario sin guardar, **cuando** confirma
   descartar los cambios, **entonces** la inscripción queda exactamente como estaba.

---

### Historia de Usuario 8 — Inscripción con Reserva del 50 % (Prioridad: P2)

**Aplicación**: Sitio público (`/sitio`) y panel administrativo (`/admin`, registro manual)

Al inscribirse, el responsable elige entre "Pago completo" y "Reserva 50 %". El formulario
le muestra el monto que debe pagar ahora según su elección (y, en una reserva, el saldo que
quedará pendiente). Sube el comprobante del monto elegido y recibe su folio. El
administrador ve en la lista y el detalle que es una reserva, la aprueba normalmente y el
responsable recibe un correo de "Reserva confirmada" que indica el saldo pendiente y cómo
pagarlo.

**Por qué esta prioridad**: Es la nueva modalidad comercial decidida por los dueños; sin
ella no se pueden ofrecer reservas.

**Prueba independiente**: Crear una inscripción "Reserva 50 %" desde el sitio, verificar el
monto mostrado, aprobarla en el panel y verificar que queda "aprobada · Saldo pendiente" y
que el correo indica el saldo correcto.

**Escenarios de Aceptación**:

1. **Dado** que el administrador encendió "Reserva con 50 %" en Tarifas, **cuando** el
   responsable llega al paso del comprobante, **entonces** debe elegir "Pago completo" o
   "Reserva 50 %" y ve el monto a pagar ahora (total o 50 %) y, si es reserva, el saldo
   restante.
1a. **Dado** que el interruptor está apagado, **cuando** el responsable llega al paso del
   comprobante, **entonces** no ve la opción de reserva y la inscripción se registra como
   "Pago completo", igual que antes de esta función.
2. **Dado** que el responsable elige "Reserva 50 %" y envía el formulario, **cuando** se
   registra la inscripción, **entonces** queda con estado "pendiente", tipo de pago
   "Reserva 50 %" y estado del pago "Saldo pendiente", y la confirmación en pantalla
   muestra el folio y el saldo pendiente.
3. **Dado** que el administrador registra una inscripción manual, **cuando** completa el
   formulario, **entonces** también puede elegir "Pago completo" o "Reserva 50 %" con el
   mismo efecto.
4. **Dado** que existen reservas, **cuando** el administrador ve la lista de inscripciones,
   **entonces** identifica visualmente las que tienen saldo pendiente o en revisión y puede
   filtrarlas por estado del pago.
5. **Dado** que el administrador aprueba una inscripción "Reserva 50 %", **cuando** se
   envía el correo, **entonces** este dice que la reserva fue confirmada, indica el monto
   pagado, el saldo pendiente y que puede subir el comprobante del saldo desde "Consultar
   mi inscripción" o enviarlo a la recreativa.
6. **Dado** que el administrador rechaza una reserva, **cuando** se envía el correo,
   **entonces** es el mismo correo de rechazo actual, con el motivo.
7. **Dado** que la inscripción es "Pago completo", **cuando** se registra y se aprueba,
   **entonces** todo funciona exactamente igual que hoy.

---

### Historia de Usuario 9 — Pago del Saldo (Prioridad: P3)

**Aplicación**: Sitio público (`/sitio`, Consultar mi inscripción) y panel (`/admin`)

El responsable de una reserva aprobada paga el saldo. Tiene dos caminos: (a) entra a
"Consultar mi inscripción" con su folio y cédula, ve el saldo pendiente y sube el
comprobante del segundo pago; el administrador lo revisa en el panel y lo confirma o lo
rechaza. (b) Envía el comprobante por WhatsApp o paga en persona, y el administrador
registra el saldo directamente en el panel, adjuntando el comprobante si lo tiene. En ambos
casos, al confirmarse el saldo el responsable recibe un correo de "Pago completo".

**Por qué esta prioridad**: Cierra el ciclo de la reserva; depende de que existan reservas
(HU8).

**Prueba independiente**: Con una reserva aprobada: subir el comprobante del saldo desde el
sitio, confirmarlo en el panel y verificar que queda "Pago completo" y llega el correo.
Repetir con otra reserva registrando el saldo directamente desde el panel sin comprobante.

**Escenarios de Aceptación**:

1. **Dado** que una reserva está "aprobada · Saldo pendiente", **cuando** el responsable la
   consulta con folio + cédula, **entonces** ve el monto total, el monto pagado, el saldo
   pendiente y la opción "Subir comprobante del saldo".
2. **Dado** que el responsable sube el comprobante del saldo, **cuando** el envío termina,
   **entonces** la imagen se comprime antes de subirse, la inscripción pasa a "Saldo en
   revisión" y la consulta muestra que el comprobante está en revisión.
3. **Dado** que una reserva está "Saldo en revisión", **cuando** el administrador abre el
   detalle, **entonces** ve ambos comprobantes (inicial y del saldo) y puede "Confirmar
   saldo" o "Rechazar comprobante del saldo".
4. **Dado** que el administrador confirma el saldo, **cuando** confirma la acción,
   **entonces** la inscripción pasa a "Pago completo" y el responsable recibe el correo de
   pago completo con el folio y el monto total pagado.
5. **Dado** que el administrador rechaza el comprobante del saldo, **cuando** ingresa el
   motivo obligatorio y confirma, **entonces** la inscripción vuelve a "Saldo pendiente", el
   motivo se muestra al responsable en la consulta pública y puede subir otro comprobante.
   La inscripción sigue "aprobada".
6. **Dado** que una reserva está "aprobada · Saldo pendiente", **cuando** el administrador
   selecciona "Registrar pago del saldo" en el panel (con o sin comprobante) y confirma,
   **entonces** la inscripción pasa directamente a "Pago completo" y se envía el correo de
   pago completo.
7. **Dado** que una reserva está todavía "pendiente" (no aprobada) o "rechazada", **cuando**
   el responsable la consulta, **entonces** no se ofrece la opción de subir el comprobante
   del saldo; y en el panel no está disponible "Registrar pago del saldo".
8. **Dado** que la inscripción ya está "Pago completo" o "Saldo en revisión", **cuando** el
   responsable la consulta, **entonces** no puede subir otro comprobante del saldo.

---

### Casos Límite

- **Folio + cédula incorrectos al subir el saldo** → mismo mensaje genérico que la consulta
  actual; no se revela cuál dato falló y no se sube ni se registra nada.
- **Monto impar** (ej. total ₡25 001) → reserva = ₡12 501 (redondeo hacia arriba al colón),
  saldo = ₡12 500. La suma siempre es exactamente el total.
- **Dos administradores editan la misma inscripción a la vez** → gana el último en guardar
  (volumen bajo, un solo equipo admin; no se implementa bloqueo).
- **La edición cambia el correo del responsable** → los correos posteriores (aprobación,
  pago completo) van al correo nuevo. La edición en sí no envía correo.
- **Se edita una inscripción con saldo pendiente** → la edición no afecta el estado del
  pago ni los montos.
- **Falla el correo de "Reserva confirmada" o "Pago completo"** → el cambio de estado se
  guarda igual; el error se registra y no bloquea al admin (mismo criterio que HU4).
- **Falla la subida del comprobante del saldo** → no se cambia el estado del pago; el
  responsable ve un error y puede reintentar.
- **El responsable eligió Reserva 50 % pero pagó el total** → el admin aprueba y luego
  registra el pago del saldo desde el panel (HU9, escenario 6).
- **Inscripciones existentes antes de esta función** → todas quedan como "Pago completo",
  sin cambio de comportamiento.

---

## Requisitos *(obligatorio)*

### Requisitos Funcionales

La numeración continúa la de los specs 001 (FR-001…FR-026) y 002 (FR-010…FR-037).

**Edición de inscripciones (panel)**

- **FR-038**: El administrador autenticado DEBE poder editar una inscripción en estado
  "pendiente" o "aprobada": nombre, teléfono y correo del responsable, y cédula, nombre,
  apellidos, género y talla de camisa de cada participante existente.
- **FR-039**: La edición NO DEBE permitir agregar ni quitar participantes, ni modificar
  folio, cantidad de personas, modalidad, monto esperado, tipo de pago, estado ni estado
  del pago.
- **FR-040**: La edición DEBE guardarse de forma atómica: o se aplican todos los cambios del
  formulario o ninguno.
- **FR-041**: La edición DEBE aplicar las mismas validaciones que el formulario de
  inscripción (campos obligatorios, formato de correo, valores permitidos de género y talla),
  en el cliente y en el servidor.
- **FR-042**: Las inscripciones "rechazadas" NO DEBEN poder editarse.
- **FR-043**: El sistema DEBE registrar la fecha y hora de la última edición de la
  inscripción y mostrarla en el detalle ("Editada el …"). La edición no envía correo.

**Reserva con 50 % (sitio público y panel)**

- **FR-044**: Cuando la reserva está habilitada (FR-059), el formulario público DEBE obligar
  a elegir el tipo de pago: "Pago completo" o "Reserva 50 %". El registro manual del panel
  SIEMPRE ofrece ambas opciones (el admin puede registrar una reserva acordada aunque el
  interruptor esté apagado). El tipo elegido se guarda en la inscripción y no cambia después.
- **FR-059**: La pantalla Tarifas DEBE tener un interruptor "Reserva con 50 %" sobre la
  tarifa vigente, que el administrador enciende o apaga en cualquier momento. No es un
  descuento ni cambia precios. Apagado por defecto.
- **FR-060**: Con el interruptor apagado, el formulario público NO DEBE mostrar la opción de
  reserva, y el servidor DEBE rechazar cualquier intento de crear una reserva por el flujo
  público (garantía en servidor, no solo en la interfaz). Si el admin lo apaga mientras
  alguien llena el formulario, el envío falla sin registrar nada y se le pide revisar la
  opción de pago.
- **FR-045**: El formulario DEBE mostrar, según el tipo elegido, el monto a pagar ahora
  (total o 50 %) y, en una reserva, el saldo restante. Estos montos son informativos; los
  montos vinculantes (reserva y saldo) DEBEN calcularse en el servidor a partir del
  `monto_esperado` congelado (FR-022), con el redondeo definido en "Conceptos".
- **FR-046**: Toda inscripción DEBE tener un estado del pago: "Pago completo", "Saldo
  pendiente" o "Saldo en revisión". Una "Pago completo" inicia en "Pago completo"; una
  "Reserva 50 %" inicia en "Saldo pendiente". El estado del pago es independiente del estado
  de revisión y NO altera la regla de FR-016 (aprobada/rechazada siguen siendo definitivos).
- **FR-047**: La lista de inscripciones del panel DEBE mostrar un indicador para las que
  tienen "Saldo pendiente" o "Saldo en revisión" y DEBE permitir filtrar por estado del pago.
- **FR-048**: El detalle de la inscripción en el panel DEBE mostrar el tipo de pago, el
  estado del pago, el monto total, el monto pagado y el saldo pendiente.
- **FR-049**: La exportación a Excel (FR-032) DEBE incluir tipo de pago, estado del pago,
  monto pagado y saldo pendiente.

**Pago del saldo**

- **FR-050**: La consulta pública (FR-024) DEBE mostrar, para una inscripción "Reserva 50 %",
  el monto total, el monto pagado, el saldo pendiente, el estado del pago y —si el último
  comprobante del saldo fue rechazado— el motivo.
- **FR-051**: Cuando la inscripción esté "aprobada" y en "Saldo pendiente", la consulta
  pública DEBE permitir subir un comprobante del saldo, validando de nuevo folio + cédula
  en el servidor. Al recibirlo, el estado del pago pasa a "Saldo en revisión". El
  comprobante se comprime en el cliente (FR-005) y se guarda en el mismo almacenamiento
  privado que el comprobante inicial.
- **FR-052**: La subida del comprobante del saldo NO DEBE permitir leer, modificar ni
  sobrescribir ningún otro dato de la inscripción ni de otras inscripciones, y ante datos
  incorrectos DEBE responder con el mismo mensaje genérico de FR-026.
- **FR-053**: Con una inscripción en "Saldo en revisión", el administrador DEBE poder ver el
  comprobante del saldo y elegir "Confirmar saldo" (pasa a "Pago completo") o "Rechazar
  comprobante del saldo" con motivo obligatorio (vuelve a "Saldo pendiente"). Ambas
  acciones requieren confirmación explícita.
- **FR-054**: Con una inscripción "aprobada" en "Saldo pendiente", el administrador DEBE
  poder "Registrar pago del saldo" directamente, adjuntando opcionalmente un comprobante
  (comprimido igual que en FR-035). La inscripción pasa a "Pago completo".
- **FR-055**: El sistema DEBE registrar la fecha en que el saldo quedó pagado.

**Notificaciones**

- **FR-056**: El correo de aprobación (FR-018) de una inscripción "Reserva 50 %" DEBE
  indicar que la reserva fue confirmada, el monto pagado, el saldo pendiente y cómo pagarlo
  (subirlo en "Consultar mi inscripción" o enviarlo a la recreativa).
- **FR-057**: Al pasar una inscripción a "Pago completo" por confirmación o registro del
  saldo (FR-053, FR-054), el sistema DEBE enviar automáticamente un correo de "Pago
  completo" al correo del responsable con el folio, el nombre del responsable y el monto
  total pagado. Si el envío falla, el cambio NO se revierte (mismo criterio que FR-020).
- **FR-058**: Rechazar el comprobante del saldo NO envía correo; el motivo se comunica en la
  consulta pública (FR-050).

### Entidades Clave

Se amplía la entidad **Inscripción** de [`../_shared/data-model.md`](../_shared/data-model.md):

- **Tipo de pago**: "Pago completo" o "Reserva 50 %", elegido al crear. Las existentes
  quedan como "Pago completo".
- **Estado del pago**: "Pago completo", "Saldo pendiente" o "Saldo en revisión".
- **Comprobante del saldo**: segundo comprobante, opcional, en el mismo almacenamiento
  privado que el inicial.
- **Motivo de rechazo del saldo**: texto del último rechazo del comprobante del saldo.
- **Fecha de pago del saldo** y **fecha de última edición**.
- **Monto de reserva / saldo**: derivados del `monto_esperado` en el servidor (no editables).

**Participante** no cambia de estructura; pasa a ser **modificable** por el panel (antes
solo lectura).

### Impacto en la constitución y en specs existentes

- **Principio II / IX** (constitución): hoy la única excepción pública es la RPC de
  **lectura** del estado. FR-051 introduce una **segunda excepción controlada**: una función
  del servidor que, con folio + cédula válidos, solo puede adjuntar el comprobante del saldo
  y cambiar el estado del pago de "Saldo pendiente" a "Saldo en revisión". Sin enumeración,
  respuesta genérica. **Enmienda aprobada y aplicada: constitución v2.1.0 (2026-10-07).**
- **Principio VI**: se añaden dos notificaciones (variante de aprobación para reservas y
  "Pago completo"), emitidas por la misma Edge Function.
- **002 — Fuera de Alcance**: se elimina "Edición de inscripciones existentes".
- **001 — Fuera de Alcance**: "Edición de una inscripción ya enviada por el público" sigue
  fuera de alcance (la edición es solo del panel).
- **\_shared/data-model.md**: se documentan los nuevos atributos y que el panel modifica
  Inscripción y Participante.

---

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles

- **SC-010**: El administrador puede reemplazar los datos de un participante (persona y
  talla) de una inscripción en menos de 2 minutos, sin intervención técnica.
- **SC-011**: El 100 % de las ediciones conservan folio, cantidad de personas, monto y
  estado de la inscripción.
- **SC-012**: Un responsable puede elegir "Reserva 50 %", ver cuánto paga ahora y cuánto
  después, y completar su inscripción en menos de 5 minutos (igual que SC-001).
- **SC-013**: El administrador identifica todas las inscripciones con saldo por cobrar en
  un solo paso (filtro), y la suma de monto pagado + saldo siempre es igual al monto total.
- **SC-014**: El 100 % de las inscripciones que pasan a "Pago completo" tras una reserva
  disparan el correo de "Pago completo" sin acción adicional del administrador.
- **SC-015**: Ninguna persona puede subir un comprobante del saldo ni ver datos de una
  inscripción sin la combinación exacta de folio + cédula (cero exposiciones cruzadas).

---

## Fuera de Alcance

- Agregar o quitar participantes de una inscripción existente (y recalcular el monto).
- Cambiar el tipo de pago después de crear la inscripción.
- Edición por parte del público.
- Porcentajes de reserva distintos al 50 % o pagos en más de dos tractos.
- Fecha límite para pagar el saldo, recordatorios automáticos o cancelación automática de
  reservas no pagadas (el seguimiento lo hace el administrador con el filtro de FR-047).
- Historial detallado de cambios (quién cambió qué); solo se guarda la fecha de última
  edición.
- Pagos en línea.

---

## Supuestos

- Editar se permite en "pendiente" y "aprobada"; no en "rechazada" (estado final sin cupo).
- La reventa de un cupo la gestionan las personas fuera del sistema; el sistema solo
  actualiza los datos.
- El saldo solo puede pagarse después de que la reserva fue aprobada (el admin primero
  verifica el comprobante del 50 %).
- El redondeo de la reserva es hacia arriba al colón entero.
- El equipo administrador es pequeño; no se requiere control de concurrencia en la edición.
- El cambio de cédula en una edición cambia quién puede consultar la inscripción en el
  sitio, lo cual es el comportamiento deseado en una reventa.
