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

const NOMBRES_RPC = ['consultar_estado_inscripcion', 'buscar_estado_inscripcion'] as const

export async function consultarEstado(
  folio: string,
  cedula: string,
): Promise<ResultadoBusqueda> {
  if (!supabaseConfigurado) return { estado: 'sin-config' }

  const params = {
    p_folio: folio.trim().toUpperCase(),
    p_cedula: cedula.trim().replace(/[\s-]/g, ''),
  }

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
    },
  }
}
