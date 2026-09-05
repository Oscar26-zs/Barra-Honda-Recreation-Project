export type EstadoInscripcion = 'pendiente' | 'aprobada' | 'rechazada'
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
