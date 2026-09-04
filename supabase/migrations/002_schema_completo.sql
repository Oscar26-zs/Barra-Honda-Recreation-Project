-- ─── Renombrar columnas de inscripciones (001 → esquema final) ─────────────────
-- nombre_completo → nombre_contacto
-- telefono → telefono_contacto
-- correo_electronico → correo_contacto
-- comprobante_path → url_comprobante
-- created_at → fecha_creacion

ALTER TABLE public.inscripciones
  RENAME COLUMN nombre_completo    TO nombre_contacto;
ALTER TABLE public.inscripciones
  RENAME COLUMN telefono           TO telefono_contacto;
ALTER TABLE public.inscripciones
  RENAME COLUMN correo_electronico TO correo_contacto;
ALTER TABLE public.inscripciones
  RENAME COLUMN comprobante_path   TO url_comprobante;
ALTER TABLE public.inscripciones
  RENAME COLUMN created_at         TO fecha_creacion;

-- ─── Ampliar inscripciones ──────────────────────────────────────────────────
ALTER TABLE public.inscripciones
  ADD COLUMN IF NOT EXISTS folio            text        UNIQUE,
  ADD COLUMN IF NOT EXISTS modalidad_tarifa text        NOT NULL DEFAULT 'Regular'
    CONSTRAINT modalidad_tarifa_valida
    CHECK (modalidad_tarifa IN ('Promocional', 'Regular')),
  ADD COLUMN IF NOT EXISTS cantidad_personas integer     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS monto_esperado   numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motivo_rechazo   text;

-- ─── Secuencia para folio ────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS folio_seq START 1;

-- ─── Trigger: asignar folio y calcular monto_esperado en INSERT ──────────────
CREATE OR REPLACE FUNCTION public.calcular_inscripcion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tarifa    record;
  v_n         integer;
  v_folio_num bigint;
BEGIN
  -- Asignar folio único
  v_folio_num := nextval('folio_seq');
  NEW.folio := 'BH-' || TO_CHAR(NOW() AT TIME ZONE 'America/Costa_Rica', 'YYYY') || '-' || LPAD(v_folio_num::text, 4, '0');

  -- Obtener tarifa vigente (activa = true)
  SELECT t.monto_por_persona,
         CASE
           WHEN (NOW() AT TIME ZONE 'America/Costa_Rica')::date
                BETWEEN t.fecha_inicio AND t.fecha_fin
           THEN 'Promocional'
           ELSE 'Regular'
         END AS modalidad,
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

DROP TRIGGER IF EXISTS trg_calcular_inscripcion ON public.inscripciones;
CREATE TRIGGER trg_calcular_inscripcion
  BEFORE INSERT ON public.inscripciones
  FOR EACH ROW EXECUTE FUNCTION public.calcular_inscripcion();

-- ─── Tabla participantes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.participantes (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inscripcion_id uuid NOT NULL REFERENCES public.inscripciones(id) ON DELETE CASCADE,
  cedula         text NOT NULL,
  nombre         text NOT NULL,
  apellidos      text NOT NULL,
  talla_camisa   text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_participantes_inscripcion
  ON public.participantes (inscripcion_id);

ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_participantes"
  ON public.participantes
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "admin_total_participantes"
  ON public.participantes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── Tabla tarifas ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tarifas (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  modalidad       text NOT NULL
    CONSTRAINT modalidad_valida CHECK (modalidad IN ('Promocional', 'Regular')),
  monto_por_persona numeric(10,2) NOT NULL,
  fecha_inicio    date NOT NULL,
  fecha_fin       date NOT NULL,
  activa          boolean NOT NULL DEFAULT false
);

ALTER TABLE public.tarifas ENABLE ROW LEVEL SECURITY;

-- Solo rol autenticado puede leer y modificar tarifas directamente
CREATE POLICY "admin_total_tarifas"
  ON public.tarifas
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- NOTA: obtener_tarifa_vigente() se define en 003_descuentos.sql (después de que
-- la vista descuentos_estado existe) para evitar dependencia circular.
-- Aquí solo van las RPCs que NO referencian descuentos_estado.

-- ─── RPC: buscar_estado_inscripcion() ────────────────────────────────────────
-- Para el spec hermano (001-sitio-publico). Consulta pública por folio + cédula.
CREATE OR REPLACE FUNCTION public.buscar_estado_inscripcion(
  p_folio  text,
  p_cedula text
)
RETURNS TABLE(
  folio            text,
  estado           text,
  modalidad_tarifa text,
  cantidad_personas integer,
  monto_esperado   numeric,
  nombre_contacto  text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    SELECT
      i.folio,
      i.estado,
      i.modalidad_tarifa,
      i.cantidad_personas,
      i.monto_esperado,
      i.nombre_contacto
    FROM public.inscripciones i
    WHERE i.folio = p_folio
      AND EXISTS (
        SELECT 1 FROM public.participantes p
        WHERE p.inscripcion_id = i.id
          AND p.cedula = p_cedula
      );
END;
$$;

GRANT EXECUTE ON FUNCTION public.buscar_estado_inscripcion(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.buscar_estado_inscripcion(text, text) TO authenticated;
