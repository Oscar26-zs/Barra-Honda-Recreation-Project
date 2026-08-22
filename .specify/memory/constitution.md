<!--
INFORME DE IMPACTO DE SINCRONIZACIÓN
=====================================
Cambio de versión: 1.0.0 → 1.1.0
Principios modificados: todos traducidos al español (sin cambios semánticos)
Secciones añadidas: ninguna
Secciones eliminadas: ninguna
TODOs pendientes: ninguno
-->

# Constitución — Recreativa Barra Honda

## Principios Fundamentales

### I. Stack Tecnológico Fijo (INNEGOCIABLE)

El stack tecnológico está definido para todo el ciclo de vida del proyecto. Proponer o
introducir alternativas está PROHIBIDO salvo que el propietario del proyecto lo solicite
explícitamente por escrito.

- **Sitio público**: Astro con contenido estático (información general, horarios, ubicación,
  precios, galería). El formulario de inscripción es la ÚNICA isla dinámica, implementada
  con React, Vue o Svelte como isla interactiva de Astro.
- **Panel administrativo**: Proyecto separado construido con React + Vite. NO DEBE compartir
  código fuente ni artefactos de build con el sitio público en Astro.
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

Los usuarios públicos SOLO pueden insertar (INSERT) registros de inscripción. Leer o
modificar inscripciones enviadas por otros usuarios está PROHIBIDO.

- La Seguridad a Nivel de Fila (RLS) de Supabase DEBE estar habilitada en la tabla
  `inscripciones`.
- La política INSERT para el rol anónimo/público DEBE estar limitada únicamente a la
  solicitud actual (sin SELECT, UPDATE ni DELETE para el rol público).
- Ningún código del lado del cliente DEBE exponer datos de inscripciones más allá de la
  confirmación del envío exitoso del propio usuario.

**Justificación**: Los registros de inscripción contienen datos personales. Filtrar datos
de otros usuarios constituiría una violación de privacidad y podría exponer a la organización
a responsabilidad legal.

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

## Requisitos de Seguridad

Todos los controles de seguridad que se indican a continuación son INNEGOCIABLES y DEBEN
estar presentes antes de que cualquier funcionalidad se considere completa.

- **RLS en `inscripciones`**: habilitada; el rol público tiene solo INSERT; el rol admin
  tiene acceso completo.
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

**Versión**: 1.1.0 | **Ratificada**: 2026-08-22 | **Última enmienda**: 2026-08-22
