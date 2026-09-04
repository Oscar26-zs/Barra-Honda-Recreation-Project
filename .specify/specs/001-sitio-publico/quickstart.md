# Quickstart — Validación manual del Sitio Público

**Feature**: `001-sitio-publico` | **Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

Guía para verificar de punta a punta que el sitio cumple HU1, HU2, los casos límite y los
criterios de éxito. No incluye código de implementación — solo pasos ejecutables y
resultados esperados.

---

## 0. Prerrequisitos

| Requisito | Detalle |
|---|---|
| Node + pnpm | El proyecto usa `pnpm` (hay `pnpm-lock.yaml` en `sitio/`). |
| Proyecto Supabase | Con el esquema de 002 aplicado: tablas `inscripciones`, `participantes`, `tarifas`; RLS `anon` = solo INSERT; bucket `comprobantes` privado; RPCs `obtener_tarifa_vigente`, `crear_inscripcion`, `consultar_estado_inscripcion`. |
| Al menos una fila `tarifas.activa = true` | Vigente por fecha (`fecha_inicio`/`fecha_fin` cubren hoy, zona `America/Costa_Rica`). |
| `sitio/.env` | `PUBLIC_SUPABASE_URL=…` y `PUBLIC_SUPABASE_ANON_KEY=…` (clave **anon**, nunca `service_role`). |

```bash
cd sitio
pnpm install
pnpm dev            # http://localhost:4321
```

---

## 1. Build y type-check (Flujo de Trabajo → "Control de calidad antes de integrar")

```bash
cd sitio
pnpm build
pnpm exec astro check
```

**Esperado**: `pnpm build` termina sin errores y genera `dist/`. `astro check` reporta
0 errores de tipos.

---

## 2. Contenido estático y navegación (FR-001, FR-002, SC-006)

1. Abrir `/`. **Esperado**: Home con Hero + countdown en vivo, animación de ruta, secciones
   Sobre la ruta / Inclusiones / Experiencia / Mapa (iframes Komoot) / Reglamento / FAQ.
2. Usar el Nav: `Inicio`, `Galería`, `Inscríbete`, `Consultar` navegan a `/`, `/galeria`,
   `/inscribete`, `/consultar`. En mobile, el botón de menú abre/cierra el overlay.
3. Ninguna página pide login ni sesión.
4. Con DevTools → Network, recargar `/`. **Esperado**: carga completa < 3 s en banda ancha
   (SC-006).
5. `/galeria`: los filtros (Todo/Fotos/Videos y por edición) ocultan/muestran tiles; hacer
   clic en una imagen abre el lightbox; clic fuera lo cierra.

---

## 3. Tarjeta de tarifa vigente (FR-021)

1. Abrir `/inscribete`. **Esperado**: tarjeta con la **modalidad** (`Promocional` o
   `Regular`), el **monto por persona** y la **fecha de fin de vigencia** — los valores que
   devuelve `obtener_tarifa_vigente()`.
2. En Supabase, poner `tarifas.activa = false` en la única fila activa (o dejar su vigencia
   fuera de rango). Recargar `/inscribete`.
   **Esperado**: aviso "las tarifas no están disponibles en este momento" y el formulario
   **deshabilitado** (no se puede enviar).
3. Revertir el cambio (`activa = true`) para el resto de las pruebas.

---

## 4. Inscripción de 1 participante (HU1 — escenarios 1, 2, 3)

1. En `/inscribete`, con el formulario habilitado, pulsar **Enviar** sin llenar nada.
   **Esperado** (escenario 1): errores por campo, no se envía, no se avanza de paso.
2. **Paso 1**: llenar `nombre_contacto`, `telefono_contacto`, `correo_contacto` válidos;
   "Cantidad de personas" = 1. Avanzar.
3. **Paso 2**: 1 pestaña "Participante 1". Llenar `cedula`, `nombre`, `apellidos`,
   `talla_camisa`. Avanzar.
4. **Paso 3**: adjuntar una imagen JPG/PNG **grande** (> 3 MB). Verificar que el total
   mostrado = `monto_final_con_descuento × 1` y está rotulado como **estimado**.
5. Pulsar **Enviar**.
   **Esperado** (escenarios 2 y 3):
   - La imagen se comprime en el cliente sin interacción del usuario.
   - Aparece la pantalla de confirmación con el **folio** (`BH-2026-XXXX`) y estado
     "pendiente".
6. En Supabase:
   - `inscripciones`: 1 fila nueva, `estado = 'pendiente'`, `cantidad_personas = 1`,
     `modalidad_tarifa` = la vigente, `monto_esperado` = `monto_final_con_descuento × 1`
     (calculado en servidor, **no** enviado por el cliente), `fecha_creacion` en hora de
     Costa Rica, `url_comprobante` apuntando a un objeto del bucket `comprobantes`.
   - `participantes`: 1 fila con `inscripcion_id` = la fila anterior.
   - Storage `comprobantes`: 1 objeto nuevo, subido pero **no** legible con la clave `anon`.

---

## 5. Inscripción de grupo (HU1 — escenario 4)

1. Repetir el flujo con "Cantidad de personas" = 3.
   **Esperado**: el paso 2 muestra 3 pestañas; el nº de pestañas cambia solo al cambiar el
   input (no hay botón "Agregar"). Un dato inválido en la pestaña 2 marca esa pestaña y, al
   intentar avanzar, el foco salta a ella.
2. Adjuntar **un** comprobante para todo el grupo. Total estimado = `precio × 3`.
3. Enviar.
   **Esperado**: 1 fila en `inscripciones` (`cantidad_personas = 3`,
   `monto_esperado = monto_final_con_descuento × 3`) y **3** filas en `participantes` con el
   mismo `inscripcion_id` y el mismo `folio`.

---

## 6. Casos límite (spec → "Casos Límite")

| Caso | Pasos | Esperado |
|---|---|---|
| Correo inválido | Paso 1, `correo_contacto = "juan@"` | Error de validación antes de avanzar; no se procesa. |
| Archivo aún grande tras comprimir | Paso 3, adjuntar un archivo que exceda el límite incluso comprimido (p. ej. PDF pesado) | Mensaje de error "el archivo no puede ser procesado"; el envío queda bloqueado. |
| Sin tarifa activa al enviar | Poner `tarifas.activa = false` con el stepper ya abierto en paso 3, luego Enviar | La operación falla de forma controlada; se muestra "no hay tarifa disponible"; **no** se crea ninguna fila (ni parcial) en `inscripciones`/`participantes`. |

---

## 7. Consulta pública de estado (HU2 + SC-007)

1. Abrir `/consultar`. Dejar folio y cédula vacíos → **Consultar**.
   **Esperado** (escenario 3): error de validación por campo vacío; no se llama la RPC.
2. Ingresar el **folio** de la prueba §5 y la **cédula** de uno de sus 3 participantes.
   **Esperado** (escenario 1): tarjeta con `estado` actual (`pendiente`), `folio`,
   `modalidad_tarifa` y `cantidad_personas` (3). No aparece ningún dato de otros grupos
   (SC-004).
3. Ingresar el folio correcto y una **cédula que no pertenece** a ese folio.
   **Esperado** (escenario 2 + SC-007): mensaje genérico "No se encontró ninguna inscripción
   con esos datos". **No** dice si falló el folio o la cédula.
4. Ingresar un folio inexistente + cualquier cédula → mismo mensaje genérico.
5. En 002, aprobar esa inscripción; volver a consultar con folio + cédula válidos.
   **Esperado**: el estado ahora es `aprobada` (badge verde).

---

## 8. Verificación rápida de seguridad

| Chequeo | Cómo | Esperado |
|---|---|---|
| Solo clave `anon` en el bundle | `grep -r "service_role\|SUPABASE_SERVICE" sitio/dist` | 0 coincidencias. Solo aparecen `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`. |
| Sin SELECT directo del público | En consola del navegador: `supabase.from('inscripciones').select('*')` | Devuelve `[]` o error de permisos — nunca filas. Igual para `participantes` y `tarifas`. |
| Bucket privado | Intentar abrir la URL pública del objeto subido en §4 | 400/403 — no accesible sin sesión de admin. |
| RPC de consulta no enumera | Llamar `consultar_estado_inscripcion` con folios al azar | Nunca devuelve listas ni datos de folios no coincidentes. |
| Monto no confiado al cliente | En §4, interceptar la llamada a `crear_inscripcion` y alterar cualquier campo de monto del payload (si existiera) | `inscripciones.monto_esperado` sigue siendo `monto_final_con_descuento × cantidad_personas` del servidor. |

---

## 9. Estado de los Known Gaps (ver `research.md` §5)

Antes de dar por cerrada la implementación, confirmar con el propietario:

- **#1** dónde vive `crear_inscripcion` / cálculo de `monto_esperado` (bloqueante).
- **#2** si el formulario incluye o no el campo "Sexo".
- **#3** lista exacta de valores de `talla_camisa`.
- **#4** si se quita el monto del Nav/Footer.
- **#6** formato definitivo del `folio`.
