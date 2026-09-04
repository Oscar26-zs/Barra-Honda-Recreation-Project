-- ============================================================================
-- 004 — Sitio público: `participantes.genero`, RPC `crear_inscripcion`,
--       bucket Storage `comprobantes`
-- ============================================================================
-- Especificado por 001-sitio-publico (plan.md → "contracts/", research.md §5).
-- Complementa lo que 002-panel-administrativo ya aplicó en el proyecto Supabase
-- `hiwgufaokesimivttvmn`:
--   YA EXISTE en el proyecto  →  inscripciones, participantes, tarifas, descuentos,
--                                vista descuentos_estado, RPC obtener_tarifa_vigente(),
--                                RPC buscar_estado_inscripcion(p_folio, p_cedula),
--                                RLS (INSERT directo de anon en inscripciones está
--                                restringido — por eso el alta pública va por RPC).
--   FALTA (lo crea este archivo) →  participantes.genero, crear_inscripcion(),
--                                   bucket `comprobantes` + políticas.
--
-- Idempotente: se puede correr en el SQL Editor ahora y re-aplicar con
-- `supabase db push` sin efectos secundarios.
--
-- Cómo aplicarlo (sin CLI):
--   Dashboard de Supabase → SQL Editor → New query → pegar TODO → Run.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. participantes.genero  (Hombre | Mujer) — decisión del propietario 2026-09-03
-- ----------------------------------------------------------------------------
alter table public.participantes
  add column if not exists genero text;

update public.participantes set genero = 'Hombre' where genero is null;

alter table public.participantes
  alter column genero set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'participantes_genero_chk') then
    alter table public.participantes
      add constraint participantes_genero_chk check (genero in ('Hombre', 'Mujer'));
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Secuencia de respaldo para el folio  BH-<año CR>-<NNNN>
--    (solo se usa si el proyecto no tiene ya un trigger/default de folio en
--     `inscripciones` — la RPC de abajo detecta ese caso en tiempo de ejecución)
-- ----------------------------------------------------------------------------
create sequence if not exists public.folio_seq as int start 1;

select setval(
  'public.folio_seq',
  greatest(
    coalesce(
      (select max(split_part(folio, '-', 3)::int)
         from public.inscripciones
        where folio ~ '^BH-\d{4}-\d+$'),
      0
    ) + 1,
    1
  ),
  false
);

-- ----------------------------------------------------------------------------
-- 3. RPC crear_inscripcion(payload jsonb)
--    INSERT atómico inscripción + participantes, monto y folio en el servidor.
--    SECURITY DEFINER → no depende de la política RLS de INSERT de anon.
--    FR-006, FR-007, FR-022, FR-023, Principio IX.2 / VIII.
-- ----------------------------------------------------------------------------
create or replace function public.crear_inscripcion(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tarifa      record;
  v_cantidad    int;
  v_precio      numeric;
  v_monto       numeric;
  v_folio       text;
  v_inscripcion uuid;
  v_part        jsonb;
begin
  -- 3.1 Tarifa vigente (misma fuente que la tarjeta informativa del sitio).
  select * into v_tarifa from public.obtener_tarifa_vigente() limit 1;
  if not found then
    raise exception 'No hay una tarifa activa en este momento.' using errcode = 'P0001';
  end if;

  -- 3.2 Participantes.
  v_cantidad := jsonb_array_length(payload->'participantes');
  if v_cantidad is null or v_cantidad < 1 then
    raise exception 'Se requiere al menos un participante.' using errcode = 'P0001';
  end if;

  -- 3.3 Monto congelado = precio final con descuento activo × cantidad (FR-022).
  v_precio := coalesce(v_tarifa.monto_final_con_descuento, v_tarifa.monto_por_persona);
  v_monto  := v_precio * v_cantidad;

  -- 3.4 INSERT de la inscripción SIN folio: si el proyecto tiene un trigger/default
  --     de folio (T012 de 002), lo asigna él; si no, lo ponemos nosotros (3.6).
  insert into public.inscripciones (
    modalidad_tarifa, cantidad_personas, monto_esperado,
    url_comprobante, estado,
    nombre_contacto, telefono_contacto, correo_contacto
  )
  values (
    v_tarifa.modalidad, v_cantidad, v_monto,
    nullif(payload->>'url_comprobante', ''), 'pendiente',
    payload->'responsable'->>'nombre_contacto',
    payload->'responsable'->>'telefono_contacto',
    payload->'responsable'->>'correo_contacto'
  )
  returning id, folio into v_inscripcion, v_folio;

  -- 3.5 Participantes del grupo, en la misma transacción.
  for v_part in select * from jsonb_array_elements(payload->'participantes')
  loop
    insert into public.participantes (
      inscripcion_id, cedula, nombre, apellidos, talla_camisa, genero
    )
    values (
      v_inscripcion,
      v_part->>'cedula',
      v_part->>'nombre',
      v_part->>'apellidos',
      v_part->>'talla_camisa',
      v_part->>'genero'
    );
  end loop;

  -- 3.6 Folio de respaldo si nadie lo asignó.
  if v_folio is null or v_folio = '' then
    v_folio := 'BH-'
      || to_char(timezone('America/Costa_Rica', now()), 'YYYY')
      || '-' || lpad(nextval('public.folio_seq')::text, 4, '0');
    update public.inscripciones set folio = v_folio where id = v_inscripcion;
  end if;

  return jsonb_build_object(
    'folio', v_folio,
    'cantidad_personas', v_cantidad,
    'monto_esperado', v_monto
  );
end;
$$;

revoke all on function public.crear_inscripcion(jsonb) from public;
grant execute on function public.crear_inscripcion(jsonb) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Storage: bucket privado `comprobantes` + políticas
--    Principio III (bucket privado) · FR-004
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

-- limpia nombres antiguos (migración 001) y los de este archivo
drop policy if exists "anon_puede_subir"        on storage.objects;
drop policy if exists "admin_puede_leer"         on storage.objects;
drop policy if exists "comprobantes_anon_insert" on storage.objects;
drop policy if exists "comprobantes_admin_select" on storage.objects;

create policy "comprobantes_anon_insert"
  on storage.objects for insert to anon
  with check (bucket_id = 'comprobantes');

create policy "comprobantes_admin_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'comprobantes');

-- Refresca el caché de esquema de PostgREST para que la RPC quede disponible ya.
notify pgrst, 'reload schema';

commit;

-- ----------------------------------------------------------------------------
-- Verificación (correr aparte tras el commit):
--   select public.crear_inscripcion('{
--     "responsable": {"nombre_contacto":"Prueba","telefono_contacto":"8888-8888","correo_contacto":"p@p.com"},
--     "url_comprobante": null,
--     "participantes": [{"cedula":"1111","nombre":"Ana","apellidos":"Mora","talla_camisa":"M","genero":"Mujer"}]
--   }'::jsonb);
--   -- devuelve {"folio":"BH-2026-0001", ...}. Luego:
--   delete from public.inscripciones where folio = 'BH-2026-0001';  -- (rol service_role / SQL editor)
-- ----------------------------------------------------------------------------
