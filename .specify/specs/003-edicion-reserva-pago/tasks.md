# Tasks: Edición de Inscripciones y Reserva con 50 % del Pago

**Input**: [spec.md](spec.md) · [plan.md](plan.md)

## Fase 1 — Base de datos y correo (bloquea todo lo demás)

- [x] T001 Migración `supabase/migrations/008_edicion_reserva_pago.sql`: columnas, CHECKs, trigger `trg_inicializar_pago`, `monto_reserva()`
- [x] T002 En 008: `crear_inscripcion` con `tipo_pago`
- [x] T003 En 008: `buscar_estado_inscripcion` ampliada (DROP + CREATE)
- [x] T004 En 008: `subir_comprobante_saldo` (anon) y `editar_inscripcion` (authenticated)
- [x] T005 Edge Function: variante "Reserva confirmada" y plantilla `pago_completo`

## Fase 2 — HU7 Edición (P1)

- [x] T006 [P] Tipos del panel (`admin/src/types/index.ts`) y `admin/src/lib/pago.ts`
- [x] T007 `EditarInscripcion.tsx` + ruta `/inscripciones/:id/editar` en `App.tsx`
- [x] T008 Botón "Editar" y "Editada el …" en `DetalleInscripcion.tsx` (oculto si rechazada)

## Fase 3 — HU8 Reserva (P2)

- [x] T009 [P] Sitio: `tipos.ts`, `inscripcion.ts` (tipo_pago en payload)
- [x] T010 Sitio: selector y montos en `PasoComprobante.tsx`; estado en `FormularioInscripcion.tsx`; `ConfirmacionEnvio.tsx`
- [x] T011 Panel: selector en `NuevaInscripcion.tsx` + `useInscripciones.crearInscripcionManual`
- [x] T012 Panel: badge de pago (lista), filtros por estado del pago, bloque de pago en detalle
- [x] T013 Panel: columnas de pago en `ExportarExcel.tsx`

## Fase 4 — HU9 Pago del saldo (P3)

- [x] T014 Sitio: `consulta.ts` con campos nuevos; `subirComprobanteSaldo()` en `inscripcion.ts`
- [x] T015 Sitio: bloque de pago + subida del saldo en `ConsultaEstado.tsx`
- [x] T016 Panel: confirmar / rechazar (motivo) / registrar saldo en `DetalleInscripcion.tsx`, con correo `pago_completo`

## Fase 5 — Verificación

- [x] T017 `npm run build` en `admin` y `sitio` sin errores
- [ ] T018 Aplicar 008 y desplegar la Edge Function (propietario)
- [ ] T019 Prueba manual: quickstart de la spec (HU7, HU8, HU9)
