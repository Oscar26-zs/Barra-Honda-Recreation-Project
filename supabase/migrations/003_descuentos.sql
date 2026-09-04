-- ─── Tabla descuentos ────────────────────────────────────────────────────────
-- Exclusiva del panel administrativo. El rol anon nunca accede a esta tabla;
-- solo lee el efecto del descuento vía obtener_tarifa_vigente().
CREATE TABLE IF NOT EXISTS public.descuentos (
  id           uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre       text    NOT NULL,
  fecha_inicio date    NOT NULL,
  fecha_fin    date    NOT NULL,
  porcentaje   numeric(5,2) NOT NULL CHECK (porcentaje > 0 AND porcentaje <= 100),
  aplica_a     uuid    REFERENCES public.tarifas(id),  -- NULL = única tarifa activa (esta versión)
  desactivado  boolean NOT NULL DEFAULT false,
  CONSTRAINT fechas_validas CHECK (fecha_fin >= fecha_inicio)
);

ALTER TABLE public.descuentos ENABLE ROW LEVEL SECURITY;

-- Solo rol autenticado (admin) tiene acceso completo
CREATE POLICY "admin_total_descuentos"
  ON public.descuentos
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── Vista: descuentos_estado ─────────────────────────────────────────────────
-- El estado NO se almacena: se calcula en tiempo real.
-- Prioridad: desactivado = true → 'Vencido' (FR-033), luego comparación de fechas.
-- NO usar GENERATED ALWAYS AS: now() no es IMMUTABLE.
CREATE OR REPLACE VIEW public.descuentos_estado AS
SELECT
  d.*,
  CASE
    WHEN d.desactivado
    THEN 'Vencido'
    WHEN (NOW() AT TIME ZONE 'America/Costa_Rica')::date < d.fecha_inicio
    THEN 'Programado'
    WHEN (NOW() AT TIME ZONE 'America/Costa_Rica')::date > d.fecha_fin
    THEN 'Vencido'
    ELSE 'Activo'
  END AS estado_descuento
FROM public.descuentos d;

-- ─── Trigger: anti-solapamiento de fechas (FR-031) ───────────────────────────
-- Rechaza INSERT/UPDATE si el descuento solapa con otro que no esté 'Vencido'.
-- EXCLUYE los descuentos con desactivado = true (FR-033).
CREATE OR REPLACE FUNCTION public.validar_no_solapamiento_descuentos()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_conflicto integer;
BEGIN
  SELECT COUNT(*) INTO v_conflicto
  FROM public.descuentos d
  WHERE d.id <> NEW.id                   -- no comparar consigo mismo (UPDATE)
    AND d.desactivado = false             -- excluir desactivados (FR-033)
    AND d.fecha_inicio <= NEW.fecha_fin
    AND d.fecha_fin    >= NEW.fecha_inicio
    -- excluir los que ya estarían Vencidos por fechas
    AND (NOW() AT TIME ZONE 'America/Costa_Rica')::date <= d.fecha_fin;

  IF v_conflicto > 0 THEN
    RAISE EXCEPTION
      'Ya existe un descuento Activo o Programado con fechas superpuestas. '
      'Desactiva o elimina el descuento existente antes de crear uno nuevo.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_no_solapamiento_descuentos ON public.descuentos;
CREATE TRIGGER trg_no_solapamiento_descuentos
  BEFORE INSERT OR UPDATE ON public.descuentos
  FOR EACH ROW
  WHEN (NEW.desactivado = false)   -- no validar si se está desactivando
  EXECUTE FUNCTION public.validar_no_solapamiento_descuentos();

-- ─── RPC: obtener_tarifa_vigente() ───────────────────────────────────────────
-- Definida aquí (post-descuentos_estado) para evitar dependencia circular con 002.
-- LANGUAGE sql requiere que descuentos_estado exista al momento de CREATE.
-- Filtra por activa = true. Las fechas determinan la modalidad (Promocional o Regular)
-- pero NO actúan como filtro de existencia. Retorna vacío solo si no hay activa = true.
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
    CASE
      WHEN (NOW() AT TIME ZONE 'America/Costa_Rica')::date
           BETWEEN t.fecha_inicio AND t.fecha_fin
      THEN 'Promocional'
      ELSE 'Regular'
    END AS modalidad,
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
