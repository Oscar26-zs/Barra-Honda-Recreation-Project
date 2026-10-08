import type { EstadoPago, Inscripcion, TipoPago } from '../types'

// Misma regla que public.monto_reserva() (migración 008): 50 % redondeado hacia arriba.
export function montoReserva(total: number): number {
  return Math.ceil(total / 2)
}

export function montoPagado(ins: Pick<Inscripcion, 'estado_pago' | 'monto_esperado'>): number {
  return ins.estado_pago === 'completo' ? ins.monto_esperado : montoReserva(ins.monto_esperado)
}

export function saldoPendiente(ins: Pick<Inscripcion, 'estado_pago' | 'monto_esperado'>): number {
  return ins.monto_esperado - montoPagado(ins)
}

export const colones = (n: number) => `₡${n.toLocaleString('es-CR')}`

export const LABEL_TIPO_PAGO: Record<TipoPago, string> = {
  completo: 'Pago completo',
  reserva: 'Reserva 50 %',
}

export const LABEL_ESTADO_PAGO: Record<EstadoPago, string> = {
  completo: 'Pago completo',
  saldo_pendiente: 'Saldo pendiente',
  saldo_en_revision: 'Saldo en revisión',
}
