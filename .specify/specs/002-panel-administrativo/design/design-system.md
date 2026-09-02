# Design System — Panel Administrativo Recreativa Barra Honda

> Fuente: prototipo funcional en Figma Make — `https://naming-upper-91511852.figma.site/`
> Todos los valores en este documento fueron extraídos leyendo los estilos computados
> (`getComputedStyle`) directamente del sitio publicado, no adivinados a partir de
> capturas de pantalla. Úsalo como referencia autoritativa al implementar el panel real
> en React + Vite.

## Overview

El panel administrativo es una herramienta operativa interna, no un sitio de marketing:
alta densidad de información, jerarquía clara por color de estado, y un único color de
marca (Azul Barra) reservado para navegación activa, acciones primarias y títulos. El
fondo de trabajo es un gris casi blanco (`#F9FAFB`), con tarjetas y tablas en blanco puro
flotando sobre él — nunca al revés. No hay gradientes, ni sombras difusas decorativas: la
única sombra presente es `none` en la mayoría de contenedores (planos, delimitados por
borde de 1px).

**Key characteristics:**
- Un solo color de marca (`--azul-barra`) usado consistentemente para: nav activo, botones
  primarios, títulos de sección (`h1`), enlaces (folio), montos destacados.
- Colores semánticos independientes del azul de marca para estado: ámbar (pendiente/programado
  usa dos tonos distintos — ver tabla), verde (aprobada/activo), rojo (rechazada), gris (vencido).
- Tarjetas y tablas: fondo blanco, borde 1px gris claro, radio de 12px (NO es flat-radio-0 tipo
  Nike — este panel usa esquinas suavemente redondeadas en tarjetas de contenido).
- Chips y badges: radio de píldora completo (`border-radius: 9999px`), siempre `padding: 4px 12px`
  (badges pequeños de estado) o `padding: 8px 16px` (chips de filtro más grandes).
- Tipografía única en toda la interfaz: **Manrope**. No hay una segunda familia tipográfica
  (a diferencia del sitio público, este panel no usa IBM Plex Mono en ningún elemento inspeccionado
  — folios, montos y fechas están en Manrope).

## Colors

### Marca
| Token | Valor | Uso |
|---|---|---|
| `--azul-barra` | `#0861CD` (`rgb(8, 97, 205)`) | Nav activo (texto), botones primarios, folios (enlace), títulos `h1`, montos de tarifa, porcentaje de descuento |
| `--azul-barra-tint` | `#EFF4FF` (`rgb(239, 244, 255)`) | Fondo del ítem de navegación activo en el sidebar |
| `--azul-cielo-texto` | `#4B80E8` (`rgb(75, 128, 232)`) | Texto del chip "Programado" |

### Superficie
| Token | Valor | Uso |
|---|---|---|
| `--canvas` | `#FFFFFF` | Fondo de tarjetas, tabla, sidebar, modal |
| `--fondo-app` | `#F9FAFB` (`rgb(249, 250, 251)`) | Fondo del área de contenido (detrás de las tarjetas/tabla) |
| `--hairline` | `#E5E7EB` (`rgb(229, 231, 235)`) | Borde de tarjetas de descuento |
| `--hairline-input` | `#D1D5DB` (`rgb(209, 213, 219)`) | Borde de chips de filtro sin seleccionar |

### Texto
| Token | Valor | Uso |
|---|---|---|
| `--ink` | `#12151C` (`rgb(18, 21, 28)`) | Títulos `h1`, texto de alto énfasis |
| `--mute` | `#6B7080` (`rgb(107, 112, 128)`) | Texto de chips de filtro sin seleccionar, labels secundarios |

### Semánticos de estado (inscripciones)
| Estado | Fondo | Texto |
|---|---|---|
| Pendiente | `#FEF3D7` (`rgb(254, 243, 215)`) | `#B7791F` (`rgb(183, 121, 31)`) |
| Aprobada | `#DCF5E0` (`rgb(220, 245, 224)`) | `#1C7A34` (`rgb(28, 122, 52)`) |
| Rechazada | `#FDD9D9` (`rgb(253, 217, 217)`) | `#B3261E` (`rgb(179, 38, 30)`) |

### Semánticos de estado (descuentos — nota: paleta ligeramente distinta a la de inscripciones)
| Estado | Fondo | Texto |
|---|---|---|
| Programado | `#EFF4FF` (`rgb(239, 244, 255)`) | `#4B80E8` (`rgb(75, 128, 232)`) |
| Activo | `#DCF5E0` (`rgb(220, 245, 224)`) | `#1C7A34` (`rgb(28, 122, 52)`) — idéntico a "Aprobada" |
| Vencido | `#F3F4F6` (`rgb(243, 244, 246)`) | `#6B7080` (`rgb(107, 112, 128)`) — mismo gris que `--mute` |

> **Nota de consistencia:** "Programado" usa un azul distinto (`#4B80E8`) al azul de marca
> (`#0861CD`). Si se quiere unificar en una futura iteración, lo más simple es que
> "Programado" reutilice `--azul-cielo` (`#72A0F6`) del sitio público para mantener una sola
> escala de azules en todo el proyecto — actualmente son dos azules de tono similar pero no
> idénticos coexistiendo en la misma pantalla de Tarifas.

## Typography

### Font Family
Una sola familia en todo el panel: **Manrope** (con fallback `sans-serif`). No se detectó
ninguna fuente monoespaciada en folios, montos, cédulas o fechas — a diferencia del sitio
público (que reserva IBM Plex Mono para datos tabulares), el panel administrativo usa
Manrope de forma uniforme.

### Hierarchy (valores medidos)
| Elemento | Tamaño | Peso | Uso |
|---|---|---|---|
| `h1` de pantalla | 20px | 800 (extrabold) | "Inscripciones", "Tarifas" |
| Nav / botón / label | 14px | 600 (semibold) | Ítems de sidebar, botones, chips de filtro grandes |
| Badge de estado | 12px | 600 (semibold) | Pendiente/Aprobada/Rechazada/Programado/Activo/Vencido |
| Botón "Exportar a Excel" | 14px | 700 (bold) | Único botón detectado con peso 700 en vez de 600 |

### Principios
- Jerarquía por **peso**, no por variación drástica de tamaño: casi todo el texto de UI vive
  entre 12–20px. No hay un tamaño "display" gigante como en el sitio público — este es un
  panel denso en información, no editorial.
- El folio (`BH-0001`) se muestra en el mismo Manrope semibold azul que el resto de enlaces,
  sin tratamiento tabular/mono especial.

## Shapes — Border Radius

| Token | Valor | Uso |
|---|---|---|
| `--radius-card` | 12px | Tarjetas de contenido (tarjeta de tarifa vigente, tarjeta de cada descuento) |
| `--radius-pill` | 9999px (`border-radius: 3.35544e+07px` computado, equivale a full) | Todo chip, badge y botón: filtros, badges de estado, botón "Nuevo descuento", toggle "Aplica a" |
| Tabla / fila | 0px | Las filas de la tabla de inscripciones no tienen radio individual |

No se usa ningún radio "duro" (0px, esquinas rectas) en tarjetas — a diferencia del sitio
público inspirado en Nike, el panel usa 12px en tarjetas y píldora completa en todo lo
interactivo. Este es un sistema propio del panel, distinto del sitio público — documentarlo
así evita que a futuro alguien intente "aplanar" las tarjetas del panel para que coincidan
con el sitio público; son proyectos hermanos con la misma paleta pero geometría de tarjeta
distinta.

## Elevation & Depth

- `box-shadow: none` en absolutamente todos los contenedores inspeccionados (tarjetas, modal,
  sidebar). La única separación visual es el contraste de fondo blanco sobre `#F9FAFB`, más
  el borde de 1px `#E5E7EB` en tarjetas.
- El modal ("Nuevo descuento") se superpone con un overlay oscuro semitransparente detrás,
  pero el modal mismo tampoco lleva sombra propia perceptible más allá del contraste con el overlay.

## Components

### Botones
**Primario** (`Aprobar`, `Guardar descuento`, `Inscribirme` en el sitio público)
- Fondo `--azul-barra`, texto blanco, radio píldora, peso 600–700.
- Estado deshabilitado observado en "Guardar descuento" (mientras el formulario está
  incompleto): mismo azul pero con opacidad reducida (~tono más claro/desaturado, visualmente
  un azul pastel) — es decir, el botón primario deshabilitado no es gris, sigue siendo azul
  pero "apagado".
- **Comportamiento sticky confirmado (mobile, 2026-09-01)**: "Guardar descuento" es el único
  botón primario que se fija al fondo de la pantalla (`position: sticky`). En contraste, los
  botones "Aprobar"/"Rechazar" del detalle de inscripción **no** son sticky — fluyen en el
  scroll normal debajo del comprobante de pago. Ver `panel-layout.md` → Mobile.

**Secundario** (`Exportar a Excel`, `Filtros`)
- Fondo `--azul-barra-tint` (`#EFF4FF`), texto `--azul-barra`, radio píldora.
- Nota: "Exportar a Excel" en desktop se ve con fondo azul sólido y texto blanco en la
  captura visual (revisar contra el screenshot) — hay una posible inconsistencia entre el
  botón que aparece "sólido azul con ícono de descarga" visualmente y lo que devolvió el
  primer query de estilos (que puede haber capturado un botón distinto con el mismo nombre
  accesible). Verificar en el código fuente real del componente antes de dar esto por
  definitivo.

**Outline / Rechazar**
- Fondo transparente/blanco, borde visible, texto oscuro. Usado para la acción secundaria
  destructiva en el detalle de inscripción ("Rechazar"), que abre un modal de confirmación.

### Chips de filtro (barra superior de Inscripciones)
- Default (no seleccionado): fondo blanco, texto `--mute`, borde 1px `--hairline-input`,
  radio píldora, padding `8px 16px`.
- Activo (ej. "Todas" seleccionado): fondo `--azul-barra` sólido, texto blanco — mismo patrón
  de "inversión total" que un filter-chip tipo Nike (default outline → activo relleno).

### Badges de estado
- Radio píldora, padding `4px 12px`, tamaño 12px, peso 600. Ver tabla de colores semánticos
  arriba. Un badge = una palabra (Pendiente/Aprobada/Rechazada/Programado/Activo/Vencido),
  nunca combinan ícono + texto.

### Tarjetas
- Fondo blanco, borde 1px `#E5E7EB`, radio 12px, sin sombra, sin padding definido a nivel del
  contenedor raíz (el padding vive en los elementos internos).
- Usadas para: tarjeta de "Tarifa vigente", cada fila de "Descuentos" (que en desktop se
  comporta más como fila de lista que tarjeta aislada, pero comparte el mismo token visual).

### Inputs
- Campos de fecha (`Fecha de inicio` / `Fecha de fin`): input nativo `type="date"` con
  placeholder visual `dd/mm/aaaa`, borde simple, sin estilos custom llamativos.
- Input numérico de porcentaje: mismo tratamiento de borde simple + símbolo `%` fijo a la derecha.
- No se detectaron estados de foco custom (halo, cambio de color de borde) más allá del
  comportamiento nativo del navegador — a diferencia del sitio público, que si define un
  `search-pill-focused` con halo. **Gap**: si se quiere foco consistente con el resto del
  sistema, considerar agregar `border-color: var(--azul-barra)` + halo suave en foco.

### Bottom sheet (mobile)

Contenedor que se desliza desde abajo sobre la pantalla actual, con overlay oscuro
semitransparente detrás. Usado en dos contextos mobile:

1. **Filtros de estado** (pantalla Inscripciones): opciones de radio button apiladas con
   separadores finos entre ellas y botón de acción primario al fondo.
2. **Perfil del admin** (tab bar): avatar + nombre + correo + botón "Cerrar sesión".

**Patrón visual de opción seleccionada dentro de un bottom sheet (tipo radio)**:
- Fondo: azul muy claro (`--azul-barra-tint`, `#EFF4FF`).
- Borde izquierdo: línea de acento en `--azul-barra`.
- Radio button y texto: `--azul-barra`.

**Opción no seleccionada**:
- Fondo blanco.
- Radio button gris vacío, texto negro (`--ink`).
- Separada de la siguiente por una línea divisoria fina (`--hairline`).

El contenedor del sheet mismo no tiene radio en la esquina inferior (está pegado al fondo de
la pantalla); las esquinas superiores sí pueden tener radio para indicar que el sheet se
deslizó desde abajo — verificar valor exacto en el código fuente.

### Navegación (sidebar — desktop)
- Ancho aproximado 210px, fondo blanco (transparente sobre blanco de fondo general).
- Header del sidebar: eyebrow "PANEL ADMINISTRATIVO" (mayúsculas, gris, pequeño) + nombre del
  proyecto en dos líneas ("Recreativa" / "Barra Honda") en azul, + subtítulo del evento
  ("MTB Valle del Nacaome") en gris.
- Ítems de navegación: "Inscripciones", "Tarifas". El activo tiene fondo `--azul-barra-tint`
  y texto `--azul-barra`; el inactivo, texto oscuro/gris sin fondo.
- Pie del sidebar: avatar circular con iniciales + nombre del admin + correo + "Cerrar sesión"
  con ícono, todo en la parte inferior fija.

## Known Gaps

### 1. Estados hover/focus del botón

**Qué dice el diseño actual**: el prototype no expone estilos de hover/focus en ningún
componente del panel; el prototipo Figma no se inspeccionó con interacción sostenida.

**Qué falta**: en el código React real, los botones de acción (primarios, secundarios,
outline) y los chips de filtro deben tener estados `:hover` y `:focus-visible` definidos.
Se recomienda definir un patrón único: `opacity: 0.9` en hover + un halo suave
(`box-shadow: 0 0 0 2px rgba(8,97,205,0.2)`) en focus-visible, coherente con lo que el
sitio público ya hace con `search-pill-focused`.

**Dónde afecta si no se resuelve**: accesibilidad (usuarios que navegan con teclado no
reciben feedback visual de foco); apariencia inconsistente entre elementos interactivos.

---

### 2. Estilo del botón "Exportar a Excel" (desktop) — sólido vs. tint

**Qué dice el diseño actual** (prototipo Figma, lectura de `getComputedStyle`):

| Propiedad | Valor computado (Figma) |
|---|---|
| Fondo | `--azul-barra-tint` (`#EFF4FF`) |
| Texto | `--azul-barra` (`#0861CD`) |
| Peso de fuente | **700** (bold) — el único botón en todo el panel con este peso |

**Qué dicen las capturas de implementación** (mobile, 2026-09-01):

| Propiedad | Valor capturado (mobile) |
|---|---|
| Fondo | `--azul-barra` sólido (`#0861CD`) |
| Texto | Blanco |
| Ícono | Descarga (download) |
| Texto visible | "Exportar" (abreviado vs. "Exportar a Excel" en desktop) |

**La contradicción**: en desktop el botón se clasificó como "Secundario" (tint), pero la
captura visual lo muestra como **Primario** (sólido azul + blanco). En mobile se confirmó
que es sólido azul + blanco. ¿Cuál de los dos es correcto para desktop?

**Qué falta verificar**: inspeccionar el botón "Exportar a Excel" **en la versión desktop del
prototipo o en el código fuente real** para confirmar: fondo sólido (`--azul-barra`) o tint
(`--azul-barra-tint`), y peso de fuente 600 o 700. Si es sólido (como en mobile), la tabla
de tipografía de este archivo (línea 89) y la clasificación "Secundario" de Botones están
incorrectas y deben corregirse.

**Dónde afecta si no se resuelve**: al implementar la barra de acciones de la pantalla
Inscripciones (desktop), el botón "Exportar a Excel" podría quedar con el estilo incorrecto.

---

### 3. Dos tonos de azul en la pantalla de Tarifas ("Programado" vs. marca)

**Qué dice el diseño actual**:

| Token | Azul | Uso |
|---|---|---|
| `--azul-barra` | `#0861CD` (`rgb(8,97,205)`) | Marca del sistema (nav activo, botones primarios, títulos, folios, porcentaje) |
| `--azul-cielo-texto` | `#4B80E8` (`rgb(75,128,232)`) | Texto del badge "Programado" en Descuentos |

Ambos azules son de tono similar pero no idénticos; coexisten en la misma pantalla de
Tarifas (el badge "Programado" al lado del badge "Activo" que usa verde `#1C7A34`).

**Qué falta decidir**: ¿se unifica "Programado" al azul de marca (`--azul-barra`) o se
mantiene como tono distinto como el diseño actual lo documenta? Si se unifica, el cambio más
simple es que el badge "Programado" reutilice `--azul-barra` como color de texto (el fondo
`#EFF4FF` ya es `--azul-barra-tint`, coherente con la marca). Si se decide mantener el tono
distinto, no hay que hacer nada.

**Dónde afecta si no se resuelve**: solo estético — puede generar una percepción de
inconsistencia de marca para el usuario final, pero no afecta funcionalidad. No bloquea la
implementación.
