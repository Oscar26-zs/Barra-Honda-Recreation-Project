# Quickstart — Validación manual del Panel Administrativo

**Branch**: `002-panel-administrativo` | **Fecha**: 2026-09-02 | **Spec**: [spec.md](spec.md)

Guía de validación de extremo a extremo. No hay pruebas automatizadas en este alcance
(ver `tasks.md` → "Tests"); esta lista es el criterio de aceptación manual junto con
`pnpm build` sin errores en `admin/`.

## Precondiciones

- Migraciones `002_schema_completo.sql` y `003_descuentos.sql` aplicadas en el proyecto
  Supabase de pruebas.
- Al menos una fila en `tarifas` con `activa = true` (modalidad `Promocional` o `Regular`).
- Un usuario admin creado en Supabase Auth.
- `RESEND_API_KEY` configurada como variable de entorno de la Edge Function
  `notificar-inscripcion` (no en el cliente).
- Algunas inscripciones de prueba con estado `pendiente`, con participantes y comprobante.

## Escenarios

### Autenticación (FR-010, FR-011)

1. Abrir cualquier ruta protegida sin sesión → redirige a `/login`.
2. Login con credenciales incorrectas → mensaje de error, sin acceso.
3. Login con credenciales válidas → entra al panel (lista de inscripciones).
4. Cerrar sesión y reintentar una acción protegida → redirige a `/login`.

### Revisión de inscripciones — HU3 (FR-012 a FR-014, FR-032)

5. Ver la lista → se muestran folio, contacto, participantes, monto, estado (badge),
   fecha; las `pendiente` se distinguen visualmente.
6. Filtrar por estado (Todas / Pendiente / Aprobada / Rechazada) → la lista se acota.
7. Buscar por folio / cédula / nombre → la lista se acota.
8. Abrir el detalle de una inscripción → se ven datos del responsable (nombre, teléfono,
   correo), lista de participantes (cédula, nombre, apellidos, talla), folio, modalidad,
   cantidad de personas, monto esperado y la imagen del comprobante (botón "Ampliar").
9. Exportar (Excel/CSV) con un filtro + búsqueda aplicados → el archivo contiene solo las
   filas visibles, con folio, contacto, personas, modalidad, monto, estado y fecha.

### Aprobación / rechazo con notificación — HU4 (FR-015 a FR-020, FR-019a)

10. En una inscripción `pendiente`, pulsar "Aprobar" → aparece modal de confirmación;
    al confirmar, el estado pasa a `aprobada` en la lista.
11. Tras aprobar → llega un correo al `correo_contacto` indicando aprobación, con folio y
    nombre del responsable.
12. En una inscripción `pendiente`, pulsar "Rechazar" → modal con campo de motivo
    **obligatorio** (no permite confirmar vacío).
13. Confirmar el rechazo con motivo → estado pasa a `rechazada`, el motivo queda guardado
    en `inscripciones.motivo_rechazo`, y llega un correo de rechazo que **incluye el
    motivo**, el folio y el nombre.
14. Abrir una inscripción ya `aprobada` o `rechazada` → los botones Aprobar/Rechazar no
    están disponibles (estado final).
15. Simular fallo de Resend (clave inválida) y cambiar de estado → el estado se guarda
    igual; la UI muestra un aviso no bloqueante; el error queda en el log de la función.

### Gestión de descuentos — HU5 (FR-027 a FR-031, FR-033)

16. Pantalla de Tarifas → una sola tarjeta "Tarifa vigente" con la modalidad activa y el
    monto por persona.
17. Crear un descuento con fechas que lo hagan "Activo" hoy → aparece en la lista con
    badge "Activo" calculado automáticamente.
18. Crear un descuento con `fecha_inicio` futura → badge "Programado".
19. Un descuento con `fecha_fin` pasada → badge "Vencido".
20. Mientras se ingresa el porcentaje → la caja "VISTA PREVIA" actualiza en vivo el precio
    original tachado → precio con descuento en verde.
21. Editar un descuento → los cambios se reflejan de inmediato en la lista.
22. Eliminar un descuento → desaparece de la lista.
23. Con un descuento "Activo", usar "Desactivar" → el badge cambia a "Vencido" de inmediato y
    `obtener_tarifa_vigente()` deja de aplicar su descuento. Crear un nuevo descuento con
    fechas que se hubieran superpuesto con el desactivado → ya NO se rechaza.
24. Intentar crear/editar un descuento con fechas que se superponen con otro "Activo" o
    "Programado" → se rechaza con un mensaje de error claro (validación de cliente).
25. Intentar la misma superposición saltándose la UI (insert directo) → el trigger de BD
    rechaza la escritura.
26. Con un descuento "Activo", llamar a `obtener_tarifa_vigente()` con la clave `anon` →
    devuelve `modalidad`, `monto_por_persona`, `monto_final_con_descuento` y `fecha_fin`;
    `monto_final_con_descuento` refleja el descuento.

### Registro manual de inscripción — HU6 (FR-034 a FR-037)

27. Desde la lista de Inscripciones, pulsar "Registrar inscripción" → se abre el formulario con
    los mismos campos que el formulario público (responsable + participantes) pero sin
    comprobante obligatorio.
28. Registrar una inscripción **sin comprobante** (responsable + al menos un participante) →
    aparece en la lista con `url_comprobante` vacío y estado "pendiente"; folio asignado,
    `modalidad_tarifa` y `monto_esperado` calculados por el servidor.
29. Registrar una inscripción **con comprobante adjunto** → la imagen se comprime y sube igual
    que en el flujo público, y queda asociada a la inscripción.
30. Intentar registrar sin que exista ninguna tarifa activa → la operación falla con un error
    controlado y no se registra ninguna fila parcial.
31. Abrir el detalle de una inscripción registrada manualmente → sigue exactamente el mismo
    flujo de aprobar/rechazar (con motivo) + notificación por correo que cualquier otra, sin
    distinción visual salvo que el comprobante puede estar vacío.

### Responsive

32. En viewport mobile → sin sidebar; bottom tab bar (Inscripciones / Tarifas / Perfil);
    la lista se muestra como tarjetas apiladas; "Perfil" abre un bottom sheet (no ruta).
33. Formulario de descuento en mobile → pantalla completa, botón "Guardar descuento"
    sticky al fondo; en el detalle de inscripción, "Aprobar"/"Rechazar" NO son sticky.

## Seguridad (verificación rápida)

- Con la clave `anon`, `SELECT` directo sobre `tarifas` y `descuentos` → denegado por RLS.
- `RESEND_API_KEY` no aparece en el bundle de `admin/` (`pnpm build` + grep).
- El bucket `comprobantes` no es accesible sin sesión de admin.
