-- ============================================================================
-- 006 — obtener_tarifa_vigente(): la vigencia mostrada sigue al descuento activo
-- ============================================================================
-- Bug: la tarjeta "Tarifa vigente" del sitio muestra el precio YA rebajado por el
-- descuento activo, pero "Vigente hasta el ..." usaba SIEMPRE tarifas.fecha_fin.
-- Con un descuento que termina antes que la tarifa, el sitio anunciaba el precio
-- con descuento como válido hasta una fecha en la que ese descuento ya no existe.
--
-- Fix: cuando hay un descuento 'Activo' aplicable, el RPC devuelve como fecha_fin
-- el menor entre (fin del descuento, fin de la tarifa). Sin descuento, se mantiene
-- tarifas.fecha_fin. El precio con descuento y esa fecha ahora salen de la MISMA
-- fila de descuento (LEFT JOIN LATERAL, ordenado por el que termina antes).
-- ============================================================================

begin;

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
      ROUND(t.monto_por_persona * (1 - d.porcentaje::numeric / 100), 2),
      t.monto_por_persona
    ) AS monto_final_con_descuento,
    CASE
      WHEN d.fecha_fin IS NOT NULL THEN LEAST(d.fecha_fin, t.fecha_fin)
      ELSE t.fecha_fin
    END AS fecha_fin
  FROM public.tarifas t
  LEFT JOIN LATERAL (
    SELECT de.porcentaje, de.fecha_fin
    FROM public.descuentos_estado de
    WHERE de.estado_descuento = 'Activo'
      AND (de.aplica_a IS NULL OR de.aplica_a = t.id)
    ORDER BY de.fecha_fin ASC
    LIMIT 1
  ) d ON true
  WHERE t.activa = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.obtener_tarifa_vigente() TO anon;
GRANT EXECUTE ON FUNCTION public.obtener_tarifa_vigente() TO authenticated;

-- Refresca el caché de esquema de PostgREST.
NOTIFY pgrst, 'reload schema';

commit;

-- ----------------------------------------------------------------------------
-- Verificación (correr aparte, SQL Editor):
--   select * from public.obtener_tarifa_vigente();
--   -- Con descuento activo que termina antes: 'fecha_fin' = fin del descuento.
--   -- Sin descuento activo: 'fecha_fin' = tarifas.fecha_fin.
-- ----------------------------------------------------------------------------
