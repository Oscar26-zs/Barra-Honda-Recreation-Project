/*
 * Tipos compartidos del sitio público.
 * Plan: .specify/specs/001-sitio-publico/plan.md → "lib/tipos.ts"
 * Modelo: .specify/specs/_shared/data-model.md
 */
export type ModalidadTarifa = 'Promocional' | 'Regular'
export type EstadoInscripcion = 'pendiente' | 'aprobada' | 'rechazada'

/** Spec 003 — reserva con 50 %. El estado del pago es independiente del estado. */
export type TipoPago = 'completo' | 'reserva'
export type EstadoPago = 'completo' | 'saldo_pendiente' | 'saldo_en_revision'

/** Misma regla que public.monto_reserva() (migración 008): 50 % hacia arriba al colón.
 *  Solo informativo: el servidor calcula los montos vinculantes. */
export function montoReserva(total: number): number {
  return Math.ceil(total / 2)
}

/**
 * Known Gap #3 (research.md §5): los valores exactos de `talla_camisa` no están fijados
 * en el spec ni en el modelo compartido. Set de jersey XS–4XL (confirmado por el
 * propietario). La columna `participantes.talla_camisa` es text sin CHECK, así que
 * ampliar esta lista no requiere migración.
 */
export const TALLAS_CAMISA = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'] as const
export type TallaCamisa = (typeof TALLAS_CAMISA)[number]

/** Género del participante. Columna `participantes.genero CHECK (genero IN ('Hombre','Mujer'))`
 *  — ver supabase/migrations/004_crear_inscripcion_genero_storage.sql. */
export const GENEROS = ['Hombre', 'Mujer'] as const
export type Genero = (typeof GENEROS)[number]

export interface Responsable {
  nombre_contacto: string
  telefono_contacto: string
  correo_contacto: string
}

/**
 * Known Gap #2 (research.md §5): RESUELTO por el propietario (2026-09-03) — el
 * participante incluye `genero` (Hombre/Mujer). Se añade la columna
 * `participantes.genero` en supabase/migrations/004_crear_inscripcion_genero_storage.sql.
 */
export interface Participante {
  cedula: string
  nombre: string
  apellidos: string
  genero: Genero | ''
  talla_camisa: TallaCamisa | ''
}

export interface TarifaVigente {
  modalidad: ModalidadTarifa
  monto_por_persona: number
  monto_final_con_descuento: number
  fecha_fin: string
  /** Interruptor del admin (Tarifas): ofrecer la reserva 50 % en el formulario. */
  permite_reserva: boolean
}

export interface PayloadCrearInscripcion {
  responsable: Responsable
  url_comprobante: string
  participantes: Participante[]
  tipo_pago: TipoPago
}

export interface ResultadoCrearInscripcion {
  folio: string
  cantidad_personas: number
  monto_esperado: number
  tipo_pago: TipoPago
  /** Solo en reservas: monto pagado con el comprobante inicial. */
  monto_reserva: number | null
}

export interface ResultadoConsulta {
  folio: string
  estado: EstadoInscripcion
  modalidad_tarifa: ModalidadTarifa
  cantidad_personas: number
  monto_esperado: number
  tipo_pago: TipoPago
  estado_pago: EstadoPago
  monto_pagado: number
  saldo_pendiente: number
  motivo_rechazo_saldo: string | null
}

/** Formatea un entero de colones como "₡18 000" (es-CR). */
export function formatoColones(monto: number): string {
  return `₡${Math.round(monto).toLocaleString('es-CR')}`
}
