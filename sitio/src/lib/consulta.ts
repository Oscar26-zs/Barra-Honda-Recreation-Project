/*
 * Consulta pública de estado por folio + cédula — RPC SECURITY DEFINER, clave anon.
 * Devuelve el estado del grupo solo si folio + cédula coinciden exactamente con un
 * participante de ese folio. Nunca revela cuál de los dos datos falló (FR-026, SC-007,
 * Principio IX.4) ni datos de otros grupos.
 *
 * Nombre de la RPC: el contrato del plan la llama `consultar_estado_inscripcion`, pero
 * el proyecto Supabase (propiedad del módulo 002) la expone como `buscar_estado_inscripcion`
 * con los mismos parámetros `p_folio` / `p_cedula`. Se intenta el nombre del contrato y,
 * si no existe (PGRST202), se reintenta con el nombre real. Discrepancia registrada en
 * .specify/specs/001-sitio-publico/research.md.
 */
import { supabase, supabaseConfigurado } from './supabase'
import type { ResultadoConsulta } from './tipos'

export type ResultadoBusqueda =
  | { estado: 'encontrada'; datos: ResultadoConsulta }
  | { estado: 'no-encontrada' }
  | { estado: 'sin-config' }
  | { estado: 'error' }

// La RPC real va primero: es la que la migración 008 amplía con los datos del pago.
const NOMBRES_RPC = ['buscar_estado_inscripcion', 'consultar_estado_inscripcion'] as const

/** Normaliza folio y cédula igual para la consulta y para la subida del saldo. */
export function normalizarConsulta(folio: string, cedula: string) {
  return {
    p_folio: folio.trim().toUpperCase(),
    p_cedula: cedula.trim().replace(/[\s-]/g, ''),
  }
}

export async function consultarEstado(
  folio: string,
  cedula: string,
): Promise<ResultadoBusqueda> {
  if (!supabaseConfigurado) return { estado: 'sin-config' }

  const params = normalizarConsulta(folio, cedula)

  let data: unknown = null
  for (const nombre of NOMBRES_RPC) {
    const res = await supabase.rpc(nombre, params)
    if (!res.error) {
      data = res.data
      break
    }
    // PGRST202 = la función no existe con ese nombre/firma: probar el siguiente.
    if (res.error.code !== 'PGRST202') return { estado: 'error' }
    if (nombre === NOMBRES_RPC[NOMBRES_RPC.length - 1]) return { estado: 'error' }
  }

  const fila = Array.isArray(data) ? data[0] : data
  if (!fila || typeof fila !== 'object' || !('folio' in fila) || !fila.folio) {
    return { estado: 'no-encontrada' }
  }

  const f = fila as Record<string, unknown>
  return {
    estado: 'encontrada',
    datos: {
      folio: String(f.folio),
      estado: f.estado as ResultadoConsulta['estado'],
      modalidad_tarifa: f.modalidad_tarifa as ResultadoConsulta['modalidad_tarifa'],
      cantidad_personas: Number(f.cantidad_personas ?? 0),
      monto_esperado: Number(f.monto_esperado ?? 0),
      tipo_pago: f.tipo_pago === 'reserva' ? 'reserva' : 'completo',
      estado_pago: (f.estado_pago as ResultadoConsulta['estado_pago']) ?? 'completo',
      monto_pagado: Number(f.monto_pagado ?? f.monto_esperado ?? 0),
      saldo_pendiente: Number(f.saldo_pendiente ?? 0),
      motivo_rechazo_saldo: (f.motivo_rechazo_saldo as string | null) ?? null,
    },
  }
}
