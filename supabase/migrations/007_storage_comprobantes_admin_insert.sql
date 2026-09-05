-- ============================================================================
-- 007 — Storage `comprobantes`: permitir subida desde el panel (rol authenticated)
-- ============================================================================
-- Bug: al registrar una inscripción manual desde el panel y adjuntar comprobante,
-- Storage devolvía 403 "new row violates row-level security policy". La política
-- `comprobantes_anon_insert` (migración 004) solo cubre el rol `anon` (sitio
-- público). El panel usa una sesión `authenticated`, que no tenía política de
-- INSERT en el bucket.
--
-- Fix: política de INSERT para `authenticated` en el bucket `comprobantes`.
-- SELECT ya lo permite `comprobantes_admin_select` (004).
-- ============================================================================

begin;

drop policy if exists "comprobantes_admin_insert" on storage.objects;

create policy "comprobantes_admin_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'comprobantes');

commit;

-- ----------------------------------------------------------------------------
-- Verificación: registrar una inscripción manual con comprobante desde el panel.
-- No debe aparecer el error 403 y `inscripciones.url_comprobante` queda con el
-- nombre del archivo subido.
-- ----------------------------------------------------------------------------
