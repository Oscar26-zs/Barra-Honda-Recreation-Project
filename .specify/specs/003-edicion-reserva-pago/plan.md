# Implementation Plan: Edición de Inscripciones y Reserva con 50 % del Pago

**Branch**: `003-edicion-reserva-pago` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Resumen

Una migración (`008`) añade el estado del pago a `inscripciones` y tres RPCs; la Edge
Function `notificar-inscripcion` gana dos plantillas; el panel suma edición, filtros y
acciones de saldo; el sitio suma la elección del tipo de pago y la subida del saldo en la
consulta pública. Sin dependencias nuevas.

## Constitution Check (v2.1.0)

| Principio | Estado | Nota |
|---|---|---|
| I. Stack fijo | PASS | Astro/React + Vite/React + Supabase. Nada nuevo. |
| II. Datos públicos | PASS | Única escritura pública nueva: `subir_comprobante_saldo` (excepción aprobada v2.1.0). |
| III. Storage privado | PASS | El comprobante del saldo va al mismo bucket privado; admin lo lee con URL firmada. |
| IV. Secretos | PASS | Correos solo desde la Edge Function. |
| V. Simplicidad | PASS | Acciones de saldo del admin = `update` directo con guardas (patrón de `cambiarEstado`); RPC solo donde se requiere atomicidad (edición) o rol `anon`. |
| VI. Notificaciones | PASS | Nuevas variantes en la misma Edge Function. |
| IX. Consulta pública | PASS | `buscar_estado_inscripcion` amplía columnas; sigue sin enumeración. |

## Modelo de datos (migración `supabase/migrations/008_edicion_reserva_pago.sql`)

Columnas nuevas en `inscripciones` (ver `_shared/data-model.md`):

| Columna | Tipo | Regla |
|---|---|---|
| `tipo_pago` | text NOT NULL DEFAULT `'completo'` | CHECK `completo`/`reserva` |
| `estado_pago` | text NOT NULL DEFAULT `'completo'` | CHECK `completo`/`saldo_pendiente`/`saldo_en_revision`; CHECK coherencia: `tipo_pago = 'reserva' OR estado_pago = 'completo'` |
| `url_comprobante_saldo` | text NULL | |
| `motivo_rechazo_saldo` | text NULL | |
| `fecha_pago_saldo` | timestamptz NULL | |
| `fecha_edicion` | timestamptz NULL | |

- Trigger `BEFORE INSERT` `trg_inicializar_pago`: fuerza `estado_pago` según `tipo_pago` y
  limpia los campos del saldo (el cliente no puede crear una inscripción "ya pagada").
- `monto_reserva(numeric)` (IMMUTABLE): `ceil(monto / 2)`. Saldo = `monto − monto_reserva`.
- `tarifas.permite_reserva boolean NOT NULL DEFAULT false` — interruptor del admin (FR-059).
  `obtener_tarifa_vigente()` se recrea (DROP + CREATE) para exponerlo; `crear_inscripcion`
  rechaza `tipo_pago = 'reserva'` si está apagado (FR-060).

## Contratos

| RPC | Rol | Efecto |
|---|---|---|
| `crear_inscripcion(payload jsonb)` | anon, authenticated | Igual que 004 + `payload.tipo_pago` (`completo` por defecto). Devuelve también `tipo_pago` y `monto_reserva`. |
| `buscar_estado_inscripcion(p_folio, p_cedula)` | anon, authenticated | DROP + CREATE: añade `tipo_pago`, `estado_pago`, `monto_pagado`, `saldo_pendiente`, `motivo_rechazo_saldo`. |
| `subir_comprobante_saldo(p_folio, p_cedula, p_url)` → boolean | anon, authenticated | Solo si folio + cédula exactos, `estado = 'aprobada'`, `estado_pago = 'saldo_pendiente'` y `p_url` ~ `^[0-9a-f-]{36}\.(jpg|png|pdf)$`. `false` en cualquier otro caso. |
| `editar_inscripcion(p_id uuid, p_datos jsonb)` | authenticated | Atómica. Solo `pendiente`/`aprobada`. Actualiza contacto y participantes por `id` (deben pertenecer a la inscripción y ser todos). Valida obligatorios y correo. Sella `fecha_edicion`. |

Acciones de saldo del panel (UPDATE directo, rol `authenticated`, con guardas en `.eq`):
- Confirmar: `estado_pago: 'completo', fecha_pago_saldo: now` donde `estado_pago = 'saldo_en_revision'`.
- Registrar: igual, donde `estado_pago = 'saldo_pendiente'`, + `url_comprobante_saldo` opcional.
- Rechazar: `estado_pago: 'saldo_pendiente', motivo_rechazo_saldo, url_comprobante_saldo: null` donde `estado_pago = 'saldo_en_revision'`.

Edge Function `notificar-inscripcion`: `nuevo_estado` acepta además `'pago_completo'`.
La plantilla `aprobada` cambia a "Reserva confirmada" cuando `tipo_pago = 'reserva'`.

## Archivos

```
supabase/migrations/008_edicion_reserva_pago.sql            NUEVO
supabase/functions/notificar-inscripcion/index.ts           plantillas reserva / pago completo
admin/src/types/index.ts                                    TipoPago, EstadoPago, campos nuevos
admin/src/lib/pago.ts                                       NUEVO: montoReserva, etiquetas
admin/src/hooks/useInscripciones.ts                         filtro por estado_pago, tipo_pago en alta manual
admin/src/inscripciones/FiltrosInscripciones.tsx            chips "Saldo pendiente" / "Saldo en revisión"
admin/src/inscripciones/ListaInscripciones.tsx              badge de pago
admin/src/inscripciones/DetalleInscripcion.tsx              bloque de pago, acciones de saldo, botón Editar
admin/src/inscripciones/EditarInscripcion.tsx               NUEVO (ruta /inscripciones/:id/editar)
admin/src/inscripciones/NuevaInscripcion.tsx                selector de tipo de pago
admin/src/inscripciones/ExportarExcel.tsx                   columnas de pago
admin/src/components/ui/badge.tsx                           variantes de pago
admin/src/App.tsx                                           ruta de edición
admin/src/tarifas/TarifaCard.tsx                            interruptor "Reserva con 50 %"
sitio/src/lib/tarifa.ts                                     lee permite_reserva
sitio/src/lib/tipos.ts                                      TipoPago, montoReserva, campos nuevos
sitio/src/lib/inscripcion.ts                                tipo_pago en payload; subirComprobanteSaldo()
sitio/src/lib/consulta.ts                                   campos nuevos (RPC real primero)
sitio/src/components/islands/FormularioInscripcion.tsx      estado tipoPago
sitio/src/components/islands/inscripcion/PasoComprobante.tsx selector + montos
sitio/src/components/islands/inscripcion/ConfirmacionEnvio.tsx saldo pendiente
sitio/src/components/islands/ConsultaEstado.tsx             bloque de pago + subida del saldo
```

## Despliegue

1. SQL Editor → pegar `008_edicion_reserva_pago.sql` → Run.
2. `supabase functions deploy notificar-inscripcion` (o pegar el código en el dashboard).
3. Desplegar `admin` y `sitio` como siempre.

Orden obligatorio: 1 antes que 3 (el front nuevo usa columnas y RPCs nuevas).
