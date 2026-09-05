/*
 * Tipos compartidos del sitio público.
 * Plan: .specify/specs/001-sitio-publico/plan.md → "lib/tipos.ts"
 * Modelo: .specify/specs/_shared/data-model.md
 */
export type ModalidadTarifa = 'Promocional' | 'Regular'
export type EstadoInscripcion = 'pendiente' | 'aprobada' | 'rechazada'

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
}

export interface PayloadCrearInscripcion {
  responsable: Responsable
  url_comprobante: string
  participantes: Participante[]
}

export interface ResultadoCrearInscripcion {
  folio: string
  cantidad_personas: number
  monto_esperado: number
}

export interface ResultadoConsulta {
  folio: string
  estado: EstadoInscripcion
  modalidad_tarifa: ModalidadTarifa
  cantidad_personas: number
}

/** Formatea un entero de colones como "₡18 000" (es-CR). */
export function formatoColones(monto: number): string {
  return `₡${Math.round(monto).toLocaleString('es-CR')}`
}
