/*
 * obtener_tarifa_vigente() — RPC de solo lectura, clave anon (FR-021, Principio VIII.1).
 * Devuelve modalidad + monto por persona + monto ya con descuento + fecha de fin de
 * vigencia de la tarifa activa. No expone historial ni el cálculo vinculante del monto.
 * Contrato: .specify/specs/001-sitio-publico/plan.md → "contracts/"
 */
import { supabase, supabaseConfigurado } from './supabase'
import type { TarifaVigente } from './tipos'

export type ResultadoTarifa =
  | { estado: 'ok'; tarifa: TarifaVigente }
  | { estado: 'sin-tarifa' }
  | { estado: 'sin-config' }
  | { estado: 'error' }

export async function obtenerTarifaVigente(): Promise<ResultadoTarifa> {
  if (!supabaseConfigurado) return { estado: 'sin-config' }

  const { data, error } = await supabase.rpc('obtener_tarifa_vigente')
  if (error) return { estado: 'error' }

  const fila = Array.isArray(data) ? data[0] : data
  if (!fila) return { estado: 'sin-tarifa' }

  return {
    estado: 'ok',
    tarifa: {
      modalidad: fila.modalidad,
      monto_por_persona: Number(fila.monto_por_persona),
      monto_final_con_descuento: Number(
        fila.monto_final_con_descuento ?? fila.monto_por_persona,
      ),
      fecha_fin: fila.fecha_fin,
    },
  }
}
