export type EstadoInscripcion = 'pendiente' | 'aprobada' | 'rechazada'
export type TipoPago = 'completo' | 'reserva'
export type EstadoPago = 'completo' | 'saldo_pendiente' | 'saldo_en_revision'
export type EstadoDescuento = 'Programado' | 'Activo' | 'Vencido'

export interface Inscripcion {
  id: string
  folio: string
  nombre_contacto: string
  telefono_contacto: string
  correo_contacto: string
  url_comprobante: string | null
  estado: EstadoInscripcion
  motivo_rechazo: string | null
  modalidad_tarifa: string
  cantidad_personas: number
  monto_esperado: number
  fecha_creacion: string
  tipo_pago: TipoPago
  estado_pago: EstadoPago
  url_comprobante_saldo: string | null
  motivo_rechazo_saldo: string | null
  fecha_pago_saldo: string | null
  fecha_edicion: string | null
}

export type Genero = 'Hombre' | 'Mujer'

export interface Participante {
  id: string
  inscripcion_id: string
  cedula: string
  nombre: string
  apellidos: string
  talla_camisa: string
  genero: Genero
}

export interface Tarifa {
  id: string
  modalidad: 'Promocional' | 'Regular'
  monto_por_persona: number
  fecha_inicio: string
  fecha_fin: string
  activa: boolean
  permite_reserva: boolean
}

export interface Descuento {
  id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  porcentaje: number
  aplica_a: string | null
  desactivado: boolean
  estado_descuento: EstadoDescuento
}
