-- ============================================================================
-- 008 — Edición de inscripciones y reserva con 50 % del pago
-- ============================================================================
-- Especificado por 003-edicion-reserva-pago (spec.md, plan.md → "Contratos").
-- Constitución v2.1.0: Principio II (segunda excepción pública: subir_comprobante_saldo).
--
--   1. inscripciones: tipo_pago, estado_pago, url_comprobante_saldo,
--      motivo_rechazo_saldo, fecha_pago_saldo, fecha_edicion
--      tarifas: permite_reserva (interruptor del admin en la pantalla Tarifas)
--   2. Trigger BEFORE INSERT trg_inicializar_pago + función monto_reserva()
--      obtener_tarifa_vigente() — expone permite_reserva
--   3. crear_inscripcion(payload)            — acepta payload.tipo_pago (solo
--                                              'reserva' si la tarifa lo permite)
--   4. buscar_estado_inscripcion(folio, ced) — devuelve datos del pago
--   5. subir_comprobante_saldo(folio, ced, url) — anon, escritura acotada
--   6. editar_inscripcion(id, datos)         — authenticated, atómica
--
-- Idempotente. Cómo aplicarlo: Dashboard → SQL Editor → New query → pegar TODO → Run.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Columnas nuevas
-- ----------------------------------------------------------------------------
alter table public.inscripciones
  add column if not exists tipo_pago             text not null default 'completo',
  add column if not exists estado_pago           text not null default 'completo',
  add column if not exists url_comprobante_saldo text,
  add column if not exists motivo_rechazo_saldo  text,
  add column if not exists fecha_pago_saldo      timestamptz,
  add column if not exists fecha_edicion         timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'inscripciones_tipo_pago_chk') then
    alter table public.inscripciones
      add constraint inscripciones_tipo_pago_chk
      check (tipo_pago in ('completo', 'reserva'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'inscripciones_estado_pago_chk') then
    alter table public.inscripciones
      add constraint inscripciones_estado_pago_chk
      check (estado_pago in ('completo', 'saldo_pendiente', 'saldo_en_revision'));
  end if;
  -- Una inscripción de pago completo nunca puede tener saldo.
  if not exists (select 1 from pg_constraint where conname = 'inscripciones_pago_coherente_chk') then
    alter table public.inscripciones
      add constraint inscripciones_pago_coherente_chk
      check (tipo_pago = 'reserva' or estado_pago = 'completo');
  end if;
end $$;

create index if not exists idx_inscripciones_estado_pago
  on public.inscripciones (estado_pago);

-- Interruptor de la reserva 50 %: lo enciende/apaga el admin en Tarifas.
-- Apagado por defecto: el formulario público solo ofrece la reserva si está activo.
alter table public.tarifas
  add column if not exists permite_reserva boolean not null default false;

-- ----------------------------------------------------------------------------
-- 2. Monto de la reserva (50 %, redondeo hacia arriba al colón) y trigger de alta
-- ----------------------------------------------------------------------------
create or replace function public.monto_reserva(p_monto numeric)
returns numeric
language sql
immutable
as $$
  select ceil(p_monto / 2);
$$;

grant execute on function public.monto_reserva(numeric) to anon, authenticated;

-- El estado del pago lo decide el servidor: el cliente solo elige tipo_pago.
create or replace function public.inicializar_pago()
returns trigger
language plpgsql
as $$
begin
  new.tipo_pago := coalesce(new.tipo_pago, 'completo');
  new.estado_pago := case when new.tipo_pago = 'reserva' then 'saldo_pendiente' else 'completo' end;
  new.url_comprobante_saldo := null;
  new.motivo_rechazo_saldo := null;
  new.fecha_pago_saldo := null;
  new.fecha_edicion := null;
  return new;
end;
$$;

drop trigger if exists trg_inicializar_pago on public.inscripciones;
create trigger trg_inicializar_pago
  before insert on public.inscripciones
  for each row execute function public.inicializar_pago();

-- obtener_tarifa_vigente() — misma lógica que 006 + permite_reserva.
-- Cambia el tipo de retorno: DROP + CREATE.
drop function if exists public.obtener_tarifa_vigente();

create function public.obtener_tarifa_vigente()
returns table(
  modalidad                 text,
  monto_por_persona         numeric,
  monto_final_con_descuento numeric,
  fecha_fin                 date,
  permite_reserva           boolean
)
language sql
security definer
as $$
  select
    t.modalidad,
    t.monto_por_persona,
    coalesce(
      round(t.monto_por_persona * (1 - d.porcentaje::numeric / 100), 2),
      t.monto_por_persona
    ) as monto_final_con_descuento,
    case
      when d.fecha_fin is not null then least(d.fecha_fin, t.fecha_fin)
      else t.fecha_fin
    end as fecha_fin,
    t.permite_reserva
  from public.tarifas t
  left join lateral (
    select de.porcentaje, de.fecha_fin
    from public.descuentos_estado de
    where de.estado_descuento = 'Activo'
      and (de.aplica_a is null or de.aplica_a = t.id)
    order by de.fecha_fin asc
    limit 1
  ) d on true
  where t.activa = true
  limit 1;
$$;

grant execute on function public.obtener_tarifa_vigente() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. crear_inscripcion(payload) — igual que 004 + payload.tipo_pago
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
  v_tipo_pago   text;
begin
  v_tipo_pago := coalesce(nullif(payload->>'tipo_pago', ''), 'completo');
  if v_tipo_pago not in ('completo', 'reserva') then
    raise exception 'Tipo de pago inválido.' using errcode = 'P0001';
  end if;

  select * into v_tarifa from public.obtener_tarifa_vigente() limit 1;
  if not found then
    raise exception 'No hay una tarifa activa en este momento.' using errcode = 'P0001';
  end if;

  -- El servidor es la garantía: aunque el cliente lo envíe, sin interruptor no hay reserva.
  if v_tipo_pago = 'reserva' and not v_tarifa.permite_reserva then
    raise exception 'La reserva con 50 %% no está disponible en este momento.' using errcode = 'P0001';
  end if;

  v_cantidad := jsonb_array_length(payload->'participantes');
  if v_cantidad is null or v_cantidad < 1 then
    raise exception 'Se requiere al menos un participante.' using errcode = 'P0001';
  end if;

  v_precio := coalesce(v_tarifa.monto_final_con_descuento, v_tarifa.monto_por_persona);
  v_monto  := v_precio * v_cantidad;

  insert into public.inscripciones (
    modalidad_tarifa, cantidad_personas, monto_esperado,
    url_comprobante, estado, tipo_pago,
    nombre_contacto, telefono_contacto, correo_contacto
  )
  values (
    v_tarifa.modalidad, v_cantidad, v_monto,
    nullif(payload->>'url_comprobante', ''), 'pendiente', v_tipo_pago,
    payload->'responsable'->>'nombre_contacto',
    payload->'responsable'->>'telefono_contacto',
    payload->'responsable'->>'correo_contacto'
  )
  returning id, folio, monto_esperado into v_inscripcion, v_folio, v_monto;

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

  if v_folio is null or v_folio = '' then
    v_folio := 'BH-'
      || to_char(timezone('America/Costa_Rica', now()), 'YYYY')
      || '-' || lpad(nextval('public.folio_seq')::text, 4, '0');
    update public.inscripciones set folio = v_folio where id = v_inscripcion;
  end if;

  return jsonb_build_object(
    'folio', v_folio,
    'cantidad_personas', v_cantidad,
    'monto_esperado', v_monto,
    'tipo_pago', v_tipo_pago,
    'monto_reserva', case when v_tipo_pago = 'reserva' then public.monto_reserva(v_monto) end
  );
end;
$$;

revoke all on function public.crear_inscripcion(jsonb) from public;
grant execute on function public.crear_inscripcion(jsonb) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. buscar_estado_inscripcion — cambia el tipo de retorno: DROP + CREATE
-- ----------------------------------------------------------------------------
drop function if exists public.buscar_estado_inscripcion(text, text);

create function public.buscar_estado_inscripcion(
  p_folio  text,
  p_cedula text
)
returns table(
  folio                text,
  estado               text,
  modalidad_tarifa     text,
  cantidad_personas    integer,
  monto_esperado       numeric,
  nombre_contacto      text,
  tipo_pago            text,
  estado_pago          text,
  monto_pagado         numeric,
  saldo_pendiente      numeric,
  motivo_rechazo_saldo text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      i.folio,
      i.estado,
      i.modalidad_tarifa,
      i.cantidad_personas,
      i.monto_esperado,
      i.nombre_contacto,
      i.tipo_pago,
      i.estado_pago,
      case when i.estado_pago = 'completo' then i.monto_esperado
           else public.monto_reserva(i.monto_esperado) end,
      case when i.estado_pago = 'completo' then 0::numeric
           else i.monto_esperado - public.monto_reserva(i.monto_esperado) end,
      i.motivo_rechazo_saldo
    from public.inscripciones i
    where i.folio = p_folio
      and exists (
        select 1 from public.participantes p
        where p.inscripcion_id = i.id
          and p.cedula = p_cedula
      );
end;
$$;

grant execute on function public.buscar_estado_inscripcion(text, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. subir_comprobante_saldo — ÚNICA escritura pública posterior al alta
--    (constitución v2.1.0, Principio II). Devuelve true/false; nunca datos.
-- ----------------------------------------------------------------------------
create or replace function public.subir_comprobante_saldo(
  p_folio  text,
  p_cedula text,
  p_url    text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo rutas generadas por el sitio (uuid.ext), nunca rutas de otros objetos.
  if p_url is null or p_url !~ '^[0-9a-f-]{36}\.(jpg|png|pdf)$' then
    return false;
  end if;

  update public.inscripciones i
     set url_comprobante_saldo = p_url,
         estado_pago = 'saldo_en_revision',
         motivo_rechazo_saldo = null
   where i.folio = p_folio
     and i.estado = 'aprobada'
     and i.estado_pago = 'saldo_pendiente'
     and exists (
       select 1 from public.participantes p
       where p.inscripcion_id = i.id
         and p.cedula = p_cedula
     );

  return found;
end;
$$;

revoke all on function public.subir_comprobante_saldo(text, text, text) from public;
grant execute on function public.subir_comprobante_saldo(text, text, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. editar_inscripcion — panel (authenticated). Atómica (FR-040).
--    p_datos = { "responsable": {nombre_contacto, telefono_contacto, correo_contacto},
--                "participantes": [{id, cedula, nombre, apellidos, genero, talla_camisa}, …] }
-- ----------------------------------------------------------------------------
create or replace function public.editar_inscripcion(p_id uuid, p_datos jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_estado   text;
  v_resp     jsonb := p_datos->'responsable';
  v_parts    jsonb := p_datos->'participantes';
  v_part     jsonb;
  v_total    int;
begin
  select estado into v_estado from public.inscripciones where id = p_id for update;
  if not found then
    raise exception 'Inscripción no encontrada.' using errcode = 'P0001';
  end if;
  if v_estado not in ('pendiente', 'aprobada') then
    raise exception 'Solo se pueden editar inscripciones pendientes o aprobadas.' using errcode = 'P0001';
  end if;

  if coalesce(trim(v_resp->>'nombre_contacto'), '') = ''
     or coalesce(trim(v_resp->>'telefono_contacto'), '') = ''
     or coalesce(trim(v_resp->>'correo_contacto'), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Datos del responsable incompletos o correo inválido.' using errcode = 'P0001';
  end if;

  -- Deben venir exactamente los participantes actuales (no se agregan ni quitan).
  select count(*) into v_total from public.participantes where inscripcion_id = p_id;
  if coalesce(jsonb_typeof(v_parts), '') <> 'array' then
    raise exception 'La lista de participantes no coincide con la inscripción.' using errcode = 'P0001';
  end if;
  if jsonb_array_length(v_parts) <> v_total
     or (select count(distinct x->>'id') from jsonb_array_elements(v_parts) x) <> v_total then
    raise exception 'La lista de participantes no coincide con la inscripción.' using errcode = 'P0001';
  end if;

  update public.inscripciones
     set nombre_contacto   = trim(v_resp->>'nombre_contacto'),
         telefono_contacto = trim(v_resp->>'telefono_contacto'),
         correo_contacto   = trim(v_resp->>'correo_contacto'),
         fecha_edicion     = now()
   where id = p_id;

  for v_part in select * from jsonb_array_elements(v_parts)
  loop
    if coalesce(trim(v_part->>'cedula'), '') = ''
       or coalesce(trim(v_part->>'nombre'), '') = ''
       or coalesce(trim(v_part->>'apellidos'), '') = ''
       or coalesce(v_part->>'talla_camisa', '') = '' then
      raise exception 'Todos los datos de los participantes son obligatorios.' using errcode = 'P0001';
    end if;

    update public.participantes
       set cedula       = trim(v_part->>'cedula'),
           nombre       = trim(v_part->>'nombre'),
           apellidos    = trim(v_part->>'apellidos'),
           genero       = v_part->>'genero',   -- CHECK participantes_genero_chk
           talla_camisa = v_part->>'talla_camisa'
     where id = (v_part->>'id')::uuid
       and inscripcion_id = p_id;

    if not found then
      raise exception 'Participante no pertenece a la inscripción.' using errcode = 'P0001';
    end if;
  end loop;
end;
$$;

revoke all on function public.editar_inscripcion(uuid, jsonb) from public, anon;
grant execute on function public.editar_inscripcion(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;

-- ----------------------------------------------------------------------------
-- Verificación (correr aparte):
--   select tipo_pago, estado_pago, count(*) from public.inscripciones group by 1, 2;
--   -- todas las previas: completo / completo
--   select public.monto_reserva(25001);  -- 12501
--   select * from public.obtener_tarifa_vigente();  -- incluye permite_reserva
--   select * from public.buscar_estado_inscripcion('BH-2026-0001', '<cedula>');
-- ----------------------------------------------------------------------------
