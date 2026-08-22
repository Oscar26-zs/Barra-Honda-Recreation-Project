-- Tabla principal de inscripciones
CREATE TABLE IF NOT EXISTS public.inscripciones (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_completo     text        NOT NULL,
  telefono            text        NOT NULL,
  correo_electronico  text        NOT NULL,
  comprobante_path    text,
  estado              text        NOT NULL DEFAULT 'pendiente'
                        CONSTRAINT estado_valido
                        CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inscripciones_estado
  ON public.inscripciones (estado);

CREATE INDEX IF NOT EXISTS idx_inscripciones_created_at
  ON public.inscripciones (created_at DESC);

ALTER TABLE public.inscripciones ENABLE ROW LEVEL SECURITY;

-- Rol anónimo (público): solo INSERT
CREATE POLICY "anon_solo_insert"
  ON public.inscripciones
  FOR INSERT TO anon
  WITH CHECK (true);

-- Rol autenticado (admin): acceso completo
CREATE POLICY "admin_acceso_total"
  ON public.inscripciones
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── Storage ───────────────────────────────────────────────────────────────
-- Crea el bucket 'comprobantes' como privado
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', false)
ON CONFLICT (id) DO NOTHING;

-- Rol anónimo puede subir comprobantes
CREATE POLICY "anon_puede_subir"
  ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'comprobantes');

-- Rol autenticado (admin) puede leer comprobantes
CREATE POLICY "admin_puede_leer"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'comprobantes');
