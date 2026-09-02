# Layout & Estructura de Pantallas — Panel Administrativo

> Complementa a `design-system.md` (tokens de color/tipografía/componentes). Este documento
> describe qué contiene cada pantalla y cómo se organiza espacialmente, según el prototipo
> funcional en `https://naming-upper-91511852.figma.site/` (usuario de prueba:
> `admin@barrahonda.cr` / `admin123`).

## Arquitectura general (desktop)

Layout de dos columnas fijas:
- **Sidebar izquierdo** (~210px, fijo, altura completa): identidad del proyecto arriba,
  navegación al medio, perfil del admin + cerrar sesión abajo.
- **Área de contenido** (resto del ancho, fondo `#F9FAFB`, scroll independiente): cada
  módulo (Inscripciones, Tarifas) renderiza aquí.

No hay topbar superior separada del sidebar — el buscador y las acciones de cada pantalla
viven dentro del área de contenido, no en una barra global.

## Pantalla 1 — Login

- Fondo gris claro de pantalla completa, contenido centrado.
- Ícono circular azul (globo) + nombre del proyecto ("Recreativa Barra Honda") + subtítulo
  del evento ("MTB Valle del Nacaome") arriba del formulario, fuera de la tarjeta.
- Tarjeta blanca centrada con: campo "Correo electrónico", campo "Contraseña", botón primario
  "Iniciar sesión" a ancho completo.
- (Solo en el prototipo de demo: credenciales de prueba visibles arriba del formulario — esto
  no debe pasar a producción.)

## Pantalla 2 — Inscripciones (lista)

**Header de módulo**, de arriba hacia abajo:
1. Buscador de ancho completo ("Buscar por folio, cédula o nombre...").
2. Fila con: chips de filtro por estado (Todas / Pendiente / Aprobada / Rechazada, el activo
   relleno en azul) a la izquierda, botón "Exportar a Excel" a la derecha.
3. Título "Inscripciones" (h1) + contador ("6 registros encontrados") en gris debajo del título.

**Tabla** (columnas, en orden): Folio · Contacto (nombre + correo apilados) · Participantes ·
Monto · Estado (badge) · Fecha · "Ver detalle" (enlace azul con chevron, alineado a la derecha).

Cada fila es de altura cómoda para lectura rápida (no comprimida), sin bordes verticales entre
columnas — solo separación horizontal sutil entre filas.

## Pantalla 3 — Detalle de inscripción

Se abre al hacer click en "Ver detalle" de cualquier fila. Estructura vertical de arriba hacia
abajo dentro del área de contenido (el sidebar se mantiene):

1. Enlace "‹ Volver a inscripciones" arriba del todo.
2. Encabezado: "Folio" (label) + número de folio en grande y azul + badge de estado al lado,
   con la fecha de inscripción alineada a la derecha del mismo renglón.
3. Sección "DATOS DE CONTACTO" (eyebrow azul mayúscula) → tarjeta con filas Nombre / Teléfono /
   Correo.
4. Sección "PARTICIPANTES (n)" → tabla con columnas Cédula · Nombre completo · Talla (la talla
   se muestra como badge pequeño, ej. "S", "M").
5. Sección "COMPROBANTE DE PAGO" → imagen a ancho completo dentro de un contenedor oscuro, con
   botón "Ampliar" (ícono de lupa) flotando en la esquina inferior derecha de la imagen.
6. Acciones al final: botón primario "Aprobar" + botón outline "Rechazar", lado a lado.

Al hacer click en "Rechazar" se espera un modal de confirmación con campo de motivo (definido
en iteraciones previas de este proyecto, confirmar que esté implementado en el código fuente).

## Pantalla 4 — Tarifas

1. Título "Tarifas" (h1) + subtítulo descriptivo ("Tarifas vigentes y descuentos configurados").
2. Sección "TARIFA VIGENTE" (eyebrow) → una tarjeta por categoría de tarifa (ej. "Individual",
   "Por persona") mostrando el monto en azul grande, alineado a la derecha de la tarjeta.
3. Sección "Descuentos": título + contador ("3 configurados") a la izquierda, botón primario
   "+ Nuevo descuento" a la derecha.
4. Lista de descuentos, cada uno como una fila/tarjeta con:
   - Nombre del descuento + badge de estado (Programado/Activo/Vencido) en la misma línea.
   - Debajo: rango de fechas, porcentaje (en azul, destacado), y a qué tarifa aplica (chip
     gris: "Todas" o el nombre específico).
   - Menú de tres puntos (⋮) a la derecha de cada fila para editar/eliminar.

### Modal "Nuevo descuento"
Modal centrado sobre overlay oscuro. Campos, en orden:
1. Nombre del descuento (texto libre, placeholder "Ej. Descuento navideño").
2. Fecha de inicio / Fecha de fin — dos inputs de fecha lado a lado.
3. Porcentaje de descuento — input numérico con `%` fijo a la derecha.
4. "Aplica a" — grupo de chips tipo toggle (Todas / Individual / [otras categorías]),
   selección única, el activo relleno en azul.
5. Footer del modal: botón "Cancelar" (outline) + botón primario "Guardar descuento" —
   este último aparece deshabilitado (azul pastel) hasta que el formulario esté completo.

> **CONFIRMADO** (verificado en implementación mobile, 2026-09-01): la vista previa en
> vivo SÍ está implementada. Aparece como una caja con eyebrow "VISTA PREVIA" que muestra
> el nombre de la tarifa afectada, el precio original tachado en gris, una flecha `→`, y
> el precio con descuento en verde bold. Se actualiza en tiempo real según el porcentaje y
> la tarifa seleccionada en "Aplica a". Asumir comportamiento equivalente en desktop hasta
> verificar el componente en código fuente.

## Mobile — confirmado por capturas de implementación (2026-09-01)

### Arquitectura mobile general

Sin sidebar. Layout de una sola columna con **bottom tab bar fija** al fondo de la pantalla.
El área de contenido ocupa todo el ancho y hace scroll de forma independiente por encima de
la tab bar.

### Navegación — Bottom tab bar

- 3 ítems: **Inscripciones**, **Tarifas**, **Perfil** (cada uno con ícono + label).
- El ítem activo se distingue con color azul (`--azul-barra`) en ícono y label, más un
  indicador de línea/subrayado debajo del ícono.
- Los ítems inactivos aparecen en gris.

### Navegación — Perfil (bottom sheet, no pantalla propia)

Al tocar "Perfil" en la tab bar **no se navega a una pantalla nueva** — se abre un bottom
sheet sobre el contenido actual con overlay oscuro semitransparente detrás. Contenido del
sheet (de arriba hacia abajo):
1. Avatar circular con iniciales del admin.
2. Nombre del admin en negro.
3. Correo electrónico en gris debajo del nombre.
4. Botón azul primario "Cerrar sesión" a ancho completo.

Ver componente "Bottom sheet" en `design-system.md` para el patrón visual del contenedor.

### Lista de Inscripciones (mobile)

Estructura de arriba hacia abajo:

1. **Buscador** a ancho completo ("Buscar por folio, cédula o nombre...").
2. **Fila de acciones**: botón "Filtros" (outline, ícono de embudo) a la izquierda +
   botón "Exportar" (sólido azul, ícono de descarga) a la derecha — el texto se abrevia a
   "Exportar" en mobile (en desktop dice "Exportar a Excel"). Ambos caben en la misma fila;
   ninguno se oculta.
3. **Tarjetas de inscripción** apiladas verticalmente (no tabla). Estructura de cada tarjeta:
   - Primera línea: folio en azul (Manrope semibold) a la izquierda + badge de estado a la derecha.
   - Segunda línea: nombre de contacto en negro.
   - Tercera línea: `₡monto · N participantes` en gris a la izquierda + "Ver detalle >" en
     azul a la derecha.

### Bottom sheet de filtros

Se abre al tocar "Filtros". Título "Filtrar por estado" en el encabezado del sheet. Cuatro
opciones de radio button (Todas / Pendiente / Aprobada / Rechazada), separadas por líneas
divisorias finas. Patrón visual por estado:

- **Seleccionada**: fondo azul muy claro, borde izquierdo azul de acento, radio button y
  texto en `--azul-barra`.
- **No seleccionada**: fondo blanco, radio button gris vacío, texto negro.

Botón "Aplicar" azul primario a ancho completo al fondo del sheet.

Ver componente "Bottom sheet" en `design-system.md` para el patrón visual del contenedor.

### Detalle de inscripción (mobile)

El sidebar desaparece; la bottom tab bar permanece fija abajo durante todo el scroll.
Estructura vertical de arriba hacia abajo:

1. Enlace "‹ Volver a inscripciones".
2. **Encabezado en dos columnas** (no apilado verticalmente): columna izquierda con "Folio"
   (label) + número de folio en azul grande + badge de estado en la misma línea; columna
   derecha con "Fecha de inscripción" + fecha, alineada a la derecha.
3. Secciones "DATOS DE CONTACTO", "PARTICIPANTES (n)" y "COMPROBANTE DE PAGO" apiladas a
   ancho completo, mismo contenido que desktop.
4. Botones "Aprobar" (primario) y "Rechazar" (outline) lado a lado, **en flujo normal del
   contenido** justo debajo del comprobante de pago — **no son sticky**. El usuario hace
   scroll normal hasta ellos.

> **Corrección respecto a documentación anterior**: se había asumido que "Aprobar"/"Rechazar"
> eran sticky en mobile. La implementación real confirma que no lo son. Solo "Guardar
> descuento" en el formulario de descuento es sticky.

### Tarifas y Descuentos (mobile)

Mismo layout que desktop: tarjeta de "Tarifa vigente", luego sección "Descuentos" con el
contador a la izquierda y el botón "+ Nuevo descuento" a la derecha **en la misma fila** — sí
cabe en mobile sin apilarse. Cada descuento como tarjeta con nombre + badge de estado, debajo
fechas + porcentaje en azul + chip de tarifa aplicable, y menú de tres puntos (⋮) arriba a
la derecha de cada tarjeta.

### Formulario Nuevo / Editar Descuento (mobile)

Pantalla completa (no modal centrado) con header propio:
- Flecha `<` para volver + título dinámico: "Nuevo descuento" o "Editar descuento" según
  el contexto.

Campos apilados verticalmente, en el mismo orden que el modal de desktop. Diferencias
respecto al modal desktop:

- **Fechas**: una vez completadas, se muestran en formato legible ("1 ago 2026"), no en
  formato crudo `dd/mm/aaaa` (ese formato solo aparece como placeholder de campo vacío).
- **Vista previa en vivo**: caja con eyebrow "VISTA PREVIA" que muestra el nombre de la
  tarifa afectada, precio original tachado en gris, flecha `→`, y precio con descuento en
  verde bold. Se actualiza en tiempo real según porcentaje y selección de "Aplica a".
- **Botón "Guardar descuento"**: fijo al fondo de la pantalla (**sticky**), a diferencia de
  los botones Aprobar/Rechazar del detalle de inscripción que no lo son. Estado deshabilitado:
  mismo azul con opacidad reducida (azul pastel), no gris — confirmado.
