<!--
INFORME DE IMPACTO DE SINCRONIZACIÓN
=====================================
Cambio de versión: 2.0.0 → 2.0.1 (PARCHE — corrección de coherencia interna)

Corrección aplicada:
  - Se resolvió una contradicción entre el Principio VIII y la sección "Requisitos de
    Seguridad" respecto al acceso público a la tabla `tarifas`.
    * Estado anterior (contradictorio): el Principio VIII, regla 1, indicaba que el
      sitio público PUEDE mostrar la tarifa vigente para UX, pero "Requisitos de
      Seguridad" declaraba que el rol público NO tenía ningún acceso a la tabla
      `tarifas`, sin proveer ningún mecanismo técnico que permitiera resolver esa
      contradicción.
    * Corrección: se introduce la RPC de solo lectura `obtener_tarifa_vigente()`,
      siguiendo el mismo patrón ya aprobado para la consulta de estado (Principio IX).
      Esta RPC es invocable con la clave `anon` vía `supabase.rpc(...)` y devuelve
      únicamente la modalidad, monto por persona y fecha de fin de vigencia de la
      tarifa activa en el momento de la llamada. No expone historial, tarifas
      futuras/pasadas ni ninguna otra columna. La tabla `tarifas` sigue SIN tener
      política RLS de SELECT para el rol público; el único camino de lectura pública
      es esta RPC. El cálculo vinculante del monto (trigger/función PostgreSQL en el
      INSERT) no se modifica en absoluto.
  - Aclaración de nomenclatura: el Principio VIII usaba "Madrugada" / "Regular" como
    ejemplos de `modalidad`; el alcance original mencionaba "promocional" / "regular".
    Se añade una nota explícita indicando que los valores definitivos de `modalidad`
    DEBEN fijarse en `spec.md` antes de la implementación.

Principios modificados en esta enmienda:
  - VIII. Tarifas con Promoción por Tiempo Limitado: regla 1 ampliada para mencionar
    `obtener_tarifa_vigente()` como el mecanismo formal de lectura pública; nota de
    nomenclatura añadida.
Secciones modificadas:
  - Requisitos de Seguridad — ítem "Tabla `tarifas` — acceso restringido": actualizado
    para reflejar que el único acceso público permitido es vía `obtener_tarifa_vigente()`,
    y que la tabla sigue sin tener SELECT directo ni política RLS pública.
TODOs pendientes:
  - Fijar los valores exactos de `modalidad` en `spec.md` antes de la implementación.
-->

# Constitución — Recreativa Barra Honda

## Principios Fundamentales

### I. Stack Tecnológico Fijo (INNEGOCIABLE)

El stack tecnológico está definido para todo el ciclo de vida del proyecto. Proponer o
introducir alternativas está PROHIBIDO salvo que el propietario del proyecto lo solicite
explícitamente por escrito.

- **Sitio público**: Carpeta `/sitio` dentro del mismo repositorio (monorepo), construida
  con Astro. Es un sitio **multipágina** con, como mínimo, las siguientes páginas
  separadas (referencia de estructura y estilo: rutatempisquemtb.com — múltiples páginas,
  no un solo scroll):
  - **Home**: presentación general, resumen del evento, llamado a inscripción.
  - **Precios / Inscripción**: tarifas vigentes + formulario de inscripción (isla
    interactiva n.º 1).
  - **Galería**: imágenes de ediciones anteriores e instalaciones.
  - **Consultar mi inscripción**: formulario de búsqueda por folio + cédula y resultado
    de estado (isla interactiva n.º 2).

  El contenido de todas las páginas es estático, salvo las dos islas interactivas
  descritas, implementadas con React, Vue o Svelte como islas de Astro. No existe otra
  lógica dinámica en el sitio público.

- **Panel administrativo**: Carpeta `/admin` dentro del mismo repositorio (monorepo),
  construida con React + Vite. Tiene su propio `package.json`, `node_modules` y proceso
  de build independiente. NO comparte código fuente, componentes ni dependencias con el
  sitio público. El monorepo es solo un contenedor de git; ambos proyectos son autónomos
  en código, build y despliegue.
- **Backend / capa de datos**: Únicamente Supabase (PostgreSQL, Auth, Storage). No se
  permite ningún backend personalizado adicional.
- **Almacenamiento de comprobantes de pago**: Supabase Storage, bucket privado. Cloudinary
  y servicios equivalentes de alojamiento de imágenes de terceros están PROHIBIDOS para
  este alcance.
- **Notificaciones por correo**: Resend, invocado exclusivamente desde una Supabase Edge
  Function. El SDK o API de Resend NO DEBE ser llamado desde el navegador ni desde el
  código del panel administrativo.
- **Compresión de imágenes en el cliente**: Se aplica antes de subir los comprobantes de
  pago (ej. `browser-image-compression`) para mantenerse dentro del nivel gratuito de
  Supabase Storage.

**Justificación**: Minimizar las partes móviles reduce la carga de mantenimiento y mantiene
el proyecto dentro del conjunto de habilidades y presupuesto de un equipo pequeño. Desviarse
del stack invalidaría los supuestos de costo y complejidad establecidos durante la planificación.

### II. Seguridad de Datos Públicos

Los usuarios públicos SOLO pueden insertar (INSERT) registros de inscripción y sus
participantes asociados. Leer, modificar o eliminar inscripciones o participantes
directamente vía RLS estándar está PROHIBIDO, con la única excepción explícita y
controlada descrita a continuación.

- La Seguridad a Nivel de Fila (RLS) de Supabase DEBE estar habilitada en las tablas
  `inscripciones` y `participantes`.
- La política INSERT para el rol anónimo/público sobre `inscripciones` y `participantes`
  DEBE estar limitada al envío de la solicitud actual. Ambas tablas se insertan en la
  misma transacción (el registro del grupo y sus integrantes ocurren de forma atómica).
- El rol público NO DEBE tener políticas SELECT, UPDATE ni DELETE sobre ninguna de las
  dos tablas vía RLS estándar.
- **Única excepción de lectura pública**: la consulta del estado de la propia inscripción
  se resuelve mediante una función RPC de PostgreSQL con `SECURITY DEFINER` (ver
  Principio IX). El cliente la invoca con la clave `anon` usando `supabase.rpc(...)`.
  Esta RPC es el ÚNICO camino por el que el público puede obtener datos de una
  inscripción; no existe ningún endpoint ni política que permita listar o enumerar
  inscripciones.
- Ningún código del lado del cliente DEBE exponer datos de inscripciones de otros usuarios
  más allá de la confirmación del envío exitoso y la consulta de estado propia (vía RPC).

**Justificación**: Los registros de inscripción contienen datos personales. Filtrar datos
de otros usuarios constituiría una violación de privacidad y podría exponer a la organización
a responsabilidad legal. La excepción RPC está diseñada para revelar únicamente el estado
de la inscripción propia, sin posibilidad de enumeración.

### III. Almacenamiento Privado de Comprobantes

El bucket de comprobantes de pago en Supabase Storage DEBE ser privado en todo momento.

- Solo un usuario autenticado con el rol `admin` (verificado mediante Supabase Auth) PUEDE
  leer objetos del bucket de comprobantes.
- Las políticas RLS sobre el bucket de Storage DEBEN reforzar esta restricción; el bucket
  NO DEBE hacerse público ni siquiera temporalmente.
- Las URLs firmadas o las lecturas directas del administrador mediante la clave de rol de
  servicio (solo en el servidor) son los únicos patrones de acceso permitidos para los admins.

**Justificación**: Los comprobantes de pago pueden contener información financiera. Exponerlos
públicamente constituiría una grave violación de seguridad y privacidad.

### IV. Secretos del Servidor

Las claves de API y credenciales de servicio NUNCA deben aparecer en código del lado del
cliente ni ser confirmadas en el control de versiones.

- La clave de API de Resend SOLO debe existir como variable de entorno dentro del runtime
  de la Supabase Edge Function. NO DEBE estar presente en el bundle del sitio público en
  Astro, en el bundle del panel administrativo, ni en ninguna variable de entorno con
  prefijo de exposición al navegador (ej. `VITE_`, `PUBLIC_`).
- La clave de rol de servicio de Supabase SOLO debe usarse en el servidor (Edge Functions).
  La clave `anon` es la única clave de Supabase permitida en código del lado del cliente.
- Los archivos `.env` que contengan secretos DEBEN estar listados en `.gitignore` y NO
  DEBEN ser confirmados en el repositorio.

**Justificación**: Filtrar la clave de Resend o la clave de rol de servicio de Supabase
permitiría a terceros no autorizados enviar correos en nombre de la organización u obtener
acceso completo a la base de datos.

### V. Simplicidad y Mantenibilidad

Las soluciones DEBEN ser el enfoque más simple que cumpla correctamente el requisito.
El sobre-diseño, la abstracción prematura y la sobre-ingeniería están PROHIBIDOS.

- Tres líneas de código similares son preferibles a una abstracción prematura.
- Las funciones auxiliares y utilidades compartidas SOLO deben introducirse cuando la
  duplicación esté presente al menos tres veces Y la abstracción reduzca la carga cognitiva.
- Las dependencias SOLO deben añadirse cuando aporten un valor claro y no trivial; se
  prefieren primero los elementos integrados de la plataforma y el framework.
- Los nombres de archivos y componentes DEBEN ser autodescriptivos; su ubicación en el
  árbol de directorios DEBE ser predecible y estar documentada explícitamente en los
  documentos de spec y plan.

**Justificación**: Este es un proyecto de tamaño moderado con un equipo pequeño de
mantenedores. La complejidad introducida hoy se convierte en deuda técnica mañana.

### VI. Flujo de Notificaciones por Cambio de Estado

Cada cambio en el estado de una inscripción (`pendiente` → `aprobada` o `rechazada`) DEBE
disparar una notificación por correo al solicitante mediante Resend.

- Las transiciones de estado DEBEN ser manejadas por el panel administrativo llamando a
  una Supabase Edge Function (o mediante un trigger/función de base de datos de Supabase
  que invoque la Edge Function).
- La Edge Function es el ÚNICO emisor de correos de notificación; el panel administrativo
  NO DEBE llamar a Resend directamente.
- Las plantillas de correo DEBEN comunicar claramente el resultado (aprobación o rechazo)
  y cualquier paso siguiente relevante.

**Justificación**: Los solicitantes necesitan retroalimentación oportuna sobre el estado de
su inscripción. Centralizar el envío de correos en la Edge Function mantiene la clave de
API de Resend en el servidor y garantiza una ruta de código única y auditable para todo
el correo saliente.

### VII. Consultar Antes de Asumir

Cuando un requisito no está explícitamente cubierto por `constitution.md`, `spec.md` o
`plan.md`, el desarrollador o agente de IA DEBE detenerse y consultar al propietario del
proyecto antes de tomar una decisión de diseño o arquitectura.

- Los supuestos NO DEBEN incorporarse silenciosamente al código.
- Cualquier ambigüedad en el spec o plan DEBE plantearse como una pregunta, indicando
  claramente las opciones candidatas y sus ventajas y desventajas.
- Una vez confirmada una decisión, DEBE registrarse en el documento correspondiente antes
  de que comience la implementación.

**Justificación**: Las decisiones no documentadas crean deuda técnica invisible y hacen que
los cambios futuros sean impredecibles.

### VIII. Tarifas con Promoción por Tiempo Limitado

Las tarifas del evento son administrables y pueden tener períodos de vigencia distintos
(ej. precio de madrugada, precio regular). El cálculo del precio final SIEMPRE ocurre en
el servidor; el cliente es solo informativo.

**Tabla `tarifas`** (administrable desde el panel admin, no hardcodeada en código ni en
variables de entorno). Columnas mínimas obligatorias:

| Columna | Descripción |
|---|---|
| `modalidad` | Nombre legible de la tarifa (ej. "Madrugada", "Regular") |
| `monto_por_persona` | Precio unitario por participante |
| `fecha_inicio` | Inicio de vigencia (con zona horaria) |
| `fecha_fin` | Fin de vigencia (con zona horaria) |
| `activa` | Indicador booleano de habilitación manual |

**Reglas obligatorias**:

1. **Cálculo exclusivo en servidor**: el precio final NUNCA se confía desde el cliente.
   El sitio público (Astro) PUEDE mostrar la tarifa vigente de forma informativa para UX
   invocando la RPC de solo lectura `obtener_tarifa_vigente()` con la clave `anon`
   (ver más abajo). Esta RPC devuelve únicamente la modalidad, el monto por persona y la
   fecha de fin de vigencia de la tarifa activa en ese instante; no expone historial ni
   tarifas futuras/pasadas, y no participa en absoluto en el cálculo vinculante del monto.
   El cálculo real ocurre exclusivamente en una función o trigger de PostgreSQL en Supabase,
   ejecutado en el momento del INSERT de la inscripción (reglas 2–5 sin cambios).

   **RPC `obtener_tarifa_vigente()` — lectura pública de tarifa activa**:
   - Invocable con la clave `anon` mediante `supabase.rpc('obtener_tarifa_vigente')`.
   - Implementada con `SECURITY DEFINER`, siguiendo el mismo patrón de la RPC de consulta
     de estado (Principio IX).
   - Devuelve ÚNICAMENTE: `modalidad`, `monto_por_persona`, `fecha_fin` de la tarifa cuyo
     campo `activa = true` y cuya vigencia aplique al momento de la llamada.
   - Es de solo lectura; nunca escribe ni decide montos.
   - La tabla `tarifas` en sí NO tiene política RLS de SELECT para el rol público; esta RPC
     es el único camino de lectura pública (ver "Requisitos de Seguridad").

   **Nota sobre nomenclatura de `modalidad`**: los ejemplos en esta constitución
   ("Madrugada", "Regular") son ilustrativos. Los valores exactos y definitivos de
   `modalidad` (ej. "promocional" / "regular" u otros que decida el propietario) DEBEN
   quedar fijados en `spec.md` antes de comenzar la implementación, para evitar
   ambigüedad en validaciones de formulario y plantillas de correo.

2. **Zona horaria explícita**: el servidor determina la modalidad vigente comparando
   `now() AT TIME ZONE 'America/Costa_Rica'` contra `fecha_inicio`/`fecha_fin` de la
   tabla `tarifas`. Nunca se asume UTC por defecto.

3. **Monto congelado**: el campo `monto_esperado` de la tabla `inscripciones` se calcula
   como `monto_por_persona × cantidad_personas` de la modalidad vigente en el instante del
   INSERT y se persiste de forma inmutable. No es un valor derivado que se recalcule si las
   tarifas cambian en el futuro.

4. **Cliente ignorado para el precio**: cualquier campo de "modalidad" o "monto" que el
   cliente envíe en la solicitud es únicamente informativo y DEBE ser ignorado por el
   cálculo real. El servidor es la única fuente de verdad del precio.

5. **Criterio temporal**: la vigencia se determina con la fecha del servidor en el momento
   del INSERT, no con la fecha en que el usuario abrió el formulario.

**Justificación**: Protege contra manipulaciones de precio desde el cliente, garantiza que
los registros contables reflejen el precio real cobrado en el momento de la inscripción, y
permite administrar promociones por tiempo limitado sin tocar el código. Esta decisión
cierra definitivamente la pregunta abierta anterior sobre fechas de vigencia administrables.

### IX. Modelo de Inscripción Grupal y Consulta Pública de Estado

Un mismo envío del formulario registra a un grupo de una o más personas bajo un único
comprobante de pago, un único estado y un único folio legible.

**Modelo de datos — dos tablas**:

**Tabla `inscripciones`** (representa el envío/grupo):

| Columna | Descripción |
|---|---|
| `folio` | Identificador único legible (ej. `BH-2026-0142`) |
| `modalidad_tarifa` | Modalidad aplicada (congelada en el momento del INSERT, ver Principio VIII) |
| `cantidad_personas` | Número de participantes del grupo |
| `monto_esperado` | Monto total calculado en servidor y congelado (ver Principio VIII) |
| `url_comprobante` | URL del comprobante de pago en Supabase Storage |
| `estado` | `pendiente` / `aprobada` / `rechazada` |
| `nombre_contacto` | Nombre de quien hace el envío |
| `telefono_contacto` | Teléfono de contacto del responsable del grupo |
| `correo_contacto` | Correo electrónico del responsable del grupo |
| `fecha_creacion` | Timestamp de creación |

**Tabla `participantes`** (una fila por persona inscrita):

| Columna | Descripción |
|---|---|
| `inscripcion_id` | Llave foránea → `inscripciones` |
| `cedula` | Número de identificación |
| `nombre` | Nombre del participante |
| `apellidos` | Apellidos del participante |
| `talla_camisa` | Talla de camisa |

**Reglas obligatorias**:

1. **Datos de contacto solo del responsable del grupo**: teléfono y correo se capturan
   únicamente para quien hace el envío, no por cada participante individual. Esto reduce
   fricción en el formulario y minimiza los datos personales de terceros almacenados,
   en alineación con el Principio V.

2. **INSERT atómico**: el envío del formulario inserta una fila en `inscripciones` y las
   filas correspondientes en `participantes` en una única transacción. El rol público tiene
   INSERT sobre ambas tablas; nunca SELECT, UPDATE ni DELETE directo vía RLS (ver
   Principio II).

3. **Consulta pública de estado — RPC SECURITY DEFINER**: el público puede consultar el
   estado de una inscripción combinando folio + cédula de cualquiera de los participantes
   de ese folio. El mecanismo técnico es una función RPC de PostgreSQL con
   `SECURITY DEFINER`, invocada mediante `supabase.rpc(...)` con la clave `anon`. La
   función devuelve el estado y los datos del grupo únicamente si hay coincidencia exacta.

4. **Sin enumeración posible**: no debe existir ningún endpoint ni política que permita
   listar inscripciones. La RPC solo devuelve datos si la combinación folio + cédula es
   exacta; en caso contrario responde de forma genérica (sin indicar cuál de los dos
   datos falló), como mitigación básica contra fuerza bruta y enumeración.

5. **RPC sobre Edge Function para este caso**: se elige la función RPC de PostgreSQL
   (y no una Edge Function) porque la consulta de estado no requiere secretos externos ni
   lógica de terceros, y evita una pieza móvil adicional, en línea con el Principio V. Las
   Edge Functions quedan reservadas para operaciones que requieren secretos de servidor
   (ej. Resend para notificaciones).

**Justificación**: El modelo de dos tablas separa la responsabilidad del envío (grupo +
comprobante) de los datos individuales de cada participante, facilitando la administración y
el control de acceso. La consulta por folio + cédula permite a los participantes verificar
su estado sin necesidad de autenticación ni de exponer datos de otros grupos.

## Requisitos de Seguridad

Todos los controles de seguridad que se indican a continuación son INNEGOCIABLES y DEBEN
estar presentes antes de que cualquier funcionalidad se considere completa.

- **RLS en `inscripciones`**: habilitada; el rol público tiene solo INSERT; el rol admin
  tiene acceso completo (SELECT, INSERT, UPDATE, DELETE).
- **RLS en `participantes`**: habilitada; el rol público tiene solo INSERT; el rol admin
  tiene acceso completo.
- **RPC SECURITY DEFINER para consulta de estado**: la función RPC (folio + cédula) es el
  ÚNICO camino de lectura pública sobre inscripciones. Debe responder de forma genérica en
  caso de no encontrar coincidencia; no debe indicar si el fallo fue en el folio o en la
  cédula.
- **Tabla `tarifas` — acceso restringido**: la tabla `tarifas` NO tiene política RLS de
  SELECT para el rol público, ni ningún acceso directo desde el cliente. Solo el rol admin
  puede leer y modificar la tabla directamente. El único acceso de lectura pública
  permitido es a través de la RPC `obtener_tarifa_vigente()` (SECURITY DEFINER, clave
  `anon`), que expone exclusivamente la modalidad activa, monto por persona y fecha de fin
  de vigencia, sin historial ni columnas adicionales (ver Principio VIII, regla 1). El
  cálculo vinculante del precio sigue ocurriendo exclusivamente en el servidor (trigger/
  función PostgreSQL en el INSERT); esta RPC es puramente informativa para UX.
- **RLS en el bucket de Storage `comprobantes`**: privado; solo el rol admin puede
  SELECT/GET; el rol público no tiene acceso de lectura.
- **Sin clave de rol de servicio en el cliente**: la clave `service_role` de Supabase NUNCA
  debe aparecer en ningún código que se ejecute en el navegador.
- **Aislamiento de la clave de Resend**: la clave de API de Resend SOLO debe existir en las
  variables de entorno de la Supabase Edge Function.
- **Validación de entrada**: el formulario de inscripción DEBE validar todos los campos en
  el cliente (para UX) y en el servidor (políticas/restricciones de Supabase) para garantizar
  la integridad de los datos.
- **Límite de tamaño de imagen**: la compresión en el cliente DEBE garantizar que los
  comprobantes subidos no superen el límite de tamaño de objeto del nivel gratuito de
  Supabase Storage antes de enviar la solicitud de carga.

## Flujo de Trabajo de Desarrollo

- **Documentación primero**: `constitution.md` → `spec.md` → `plan.md` → `tasks.md` DEBEN
  existir y ser revisados antes de escribir o modificar cualquier código para el alcance
  correspondiente.
- **Un documento por fase**: este proyecto NO divide el trabajo en módulos de funcionalidades
  separados. Cada fase produce exactamente un documento (un spec, un plan, una lista de
  tareas) que cubre todo el entregable.
- **Organización del código**: cada archivo DEBE tener una ruta explícita y acordada
  documentada en `plan.md` antes de ser creado. No se deben añadir al repositorio archivos
  no documentados.
- **Sin comentarios que expliquen QUÉ**: el código DEBE ser autodocumentado mediante
  nombres claros. Los comentarios están reservados para el contexto no obvio del PORQUÉ
  (restricciones ocultas, soluciones alternativas).
- **Control de calidad antes de integrar**: el panel administrativo y el sitio público
  DEBEN compilar sin errores (`npm run build`) y superar cualquier verificación de tipos
  configurada en el proyecto antes de considerar una funcionalidad como terminada.
- **Cumplimiento de Spec Kit**: toda generación de código con asistencia de IA DEBE seguir
  las plantillas y principios de Spec Kit tal como se definen en esta constitución y en los
  documentos de spec y plan vinculados.

## Gobernanza

Esta constitución reemplaza todas las prácticas informales, acuerdos verbales y supuestos
previos sobre el proyecto. Es la fuente de autoridad de las reglas innegociables para el
proyecto web de la Recreativa Barra Honda.

**Procedimiento de enmienda**:
1. Proponer el cambio por escrito, indicando el motivo y el impacto.
2. Obtener la aprobación explícita del propietario del proyecto.
3. Actualizar `constitution.md`, incrementar la versión y actualizar `LAST_AMENDED_DATE`.
4. Si la enmienda rompe un spec o plan previamente ratificado, esos documentos DEBEN
   actualizarse antes de que continúe cualquier trabajo de implementación.

**Política de versiones** (semántica):
- MAYOR: eliminación o redefinición de un principio incompatible con versiones anteriores.
- MENOR: nuevo principio o sección añadida, o ampliación material de la guía existente.
- PARCHE: aclaraciones, correcciones de redacción, refinamientos no semánticos.

**Revisión de cumplimiento**:
- Cada sesión de PR o implementación DEBE comenzar volviendo a leer las secciones
  relevantes de esta constitución.
- Cualquier conflicto aparente entre la constitución y un spec/plan DEBE resolverse a favor
  de la constitución, salvo que se apruebe una enmienda.

**Versión**: 2.0.1 | **Ratificada**: 2026-08-22 | **Última enmienda**: 2026-08-23
