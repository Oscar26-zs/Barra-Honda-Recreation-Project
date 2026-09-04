-- ============================================================================
-- 005 — Corrige modalidad_tarifa: usar tarifas.modalidad en vez de recalcularla
-- ============================================================================
-- Bug: obtener_tarifa_vigente() y el trigger calcular_inscripcion() IGNORABAN
-- la columna tarifas.modalidad y la recalculaban con:
--   CASE WHEN hoy BETWEEN fecha_inicio AND fecha_fin THEN 'Promocional' ELSE 'Regular' END
-- Esa heurística asumía una tarifa "Promocional" con ventana corta y una
-- "Regular" fuera de ella. Con una sola fila de tarifa activa cuyo rango
-- (fecha_inicio=2026-01-01, fecha_fin=2027-12-31) cubre casi todo el evento,
-- CUALQUIER fecha dentro de ese rango caía en la rama 'Promocional' — aunque
-- la fila tuviera modalidad = 'Regular' guardada. Por eso el sitio mostraba
-- "Regular" (leída directo de la tabla en el Table Editor) pero la inscripción
-- se creaba con modalidad_tarifa = 'Promocional'.
--
-- Fix: usar t.modalidad tal cual está en la fila, sin recalcular por fechas.
-- Las fechas siguen filtrando la vigencia en otras partes; acá solo dejan de
-- decidir el nombre de la modalidad.
-- ============================================================================

begin;

-- ── obtener_tarifa_vigente() (definida en 003_descuentos.sql) ───────────────
CREATE OR REPLACE FUNCTION public.obtener_tarifa_vigente()
RETURNS TABLE(
  modalidad                 text,
  monto_por_persona         numeric,
  monto_final_con_descuento numeric,
  fecha_fin                 date
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    t.modalidad,
    t.monto_por_persona,
    COALESCE(
      (SELECT ROUND(t.monto_por_persona * (1 - d.porcentaje::numeric / 100), 2)
       FROM public.descuentos_estado d
       WHERE d.estado_descuento = 'Activo'
         AND (d.aplica_a IS NULL OR d.aplica_a = t.id)
       LIMIT 1),
      t.monto_por_persona
    ) AS monto_final_con_descuento,
    t.fecha_fin
  FROM public.tarifas t
  WHERE t.activa = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.obtener_tarifa_vigente() TO anon;
GRANT EXECUTE ON FUNCTION public.obtener_tarifa_vigente() TO authenticated;

-- ── calcular_inscripcion() (trigger BEFORE INSERT, definida en 002) ─────────
CREATE OR REPLACE FUNCTION public.calcular_inscripcion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tarifa    record;
  v_folio_num bigint;
BEGIN
  -- Asignar folio único
  v_folio_num := nextval('folio_seq');
  NEW.folio := 'BH-' || TO_CHAR(NOW() AT TIME ZONE 'America/Costa_Rica', 'YYYY') || '-' || LPAD(v_folio_num::text, 4, '0');

  -- Obtener tarifa vigente (activa = true)
  SELECT t.modalidad,
         t.monto_por_persona,
         COALESCE(
           (SELECT ROUND(t.monto_por_persona * (1 - d.porcentaje::numeric / 100), 2)
            FROM descuentos_estado d
            WHERE d.estado_descuento = 'Activo'
              AND (d.aplica_a IS NULL OR d.aplica_a = t.id)
            LIMIT 1),
           t.monto_por_persona
         ) AS monto_final
  INTO v_tarifa
  FROM public.tarifas t
  WHERE t.activa = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe ninguna tarifa activa. No se puede registrar la inscripción.';
  END IF;

  NEW.modalidad_tarifa := v_tarifa.modalidad;

  -- cantidad_personas viene del cliente (conteo real de participantes; el trigger
  -- de participantes actualiza este valor tras el INSERT)
  -- monto_esperado = precio_final × cantidad_personas
  NEW.monto_esperado := v_tarifa.monto_final * NEW.cantidad_personas;

  RETURN NEW;
END;
$$;

-- Refresca el caché de esquema de PostgREST.
NOTIFY pgrst, 'reload schema';

commit;

-- ----------------------------------------------------------------------------
-- Verificación (correr aparte, SQL Editor):
--   select modalidad, fecha_inicio, fecha_fin from public.tarifas where activa;
--   select * from public.obtener_tarifa_vigente();
--   -- 'modalidad' debe coincidir exactamente con el de la fila de tarifas.
-- ----------------------------------------------------------------------------
