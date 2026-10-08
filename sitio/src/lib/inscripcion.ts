/*
 * Flujo de envío del formulario de inscripción (isla n.º 1):
 *   1. comprimir el comprobante en el cliente (browser-image-compression) — FR-005
 *   2. subir a Storage, bucket privado 'comprobantes' (rol anon: solo INSERT) — FR-004
 *   3. crear_inscripcion(payload) — RPC SECURITY DEFINER: INSERT atómico de
 *      inscripciones + participantes; folio, modalidad y monto_esperado se congelan
 *      en el servidor (FR-006, FR-022, Principio IX.2).
 * Contrato: .specify/specs/001-sitio-publico/plan.md → "contracts/"
 */
import imageCompression from 'browser-image-compression'
import { supabase, supabaseConfigurado } from './supabase'
import type { PayloadCrearInscripcion, ResultadoCrearInscripcion, TipoPago } from './tipos'

/** Límite objetivo tras compresión (MB). Coherente con el nivel gratuito de Storage. */
const MAX_MB = 1
const MAX_LADO = 1920

export function esImagen(archivo: File): boolean {
  return archivo.type === 'image/jpeg' || archivo.type === 'image/png'
}

export function esPdf(archivo: File): boolean {
  return archivo.type === 'application/pdf'
}

/**
 * Comprime la imagen del comprobante. Los PDF no se comprimen como imagen: se
 * devuelven tal cual y `PasoComprobante` valida el tamaño antes de permitir el envío.
 */
export async function comprimirComprobante(archivo: File): Promise<Blob> {
  if (!esImagen(archivo)) return archivo
  return imageCompression(archivo, {
    maxSizeMB: MAX_MB,
    maxWidthOrHeight: MAX_LADO,
    useWebWorker: true,
  })
}

function extensionDe(archivo: File): string {
  if (esPdf(archivo)) return 'pdf'
  if (archivo.type === 'image/png') return 'png'
  return 'jpg'
}

/** Sube el comprobante ya comprimido y devuelve la ruta del objeto dentro del bucket. */
export async function subirComprobante(original: File, blob: Blob): Promise<string> {
  const ruta = `${crypto.randomUUID()}.${extensionDe(original)}`
  const { error } = await supabase.storage.from('comprobantes').upload(ruta, blob, {
    contentType: original.type || 'application/octet-stream',
    upsert: false,
  })
  if (error) throw new Error('No se pudo subir el comprobante.')
  return ruta
}

export type ResultadoEnvio =
  | { estado: 'ok'; resultado: ResultadoCrearInscripcion }
  | { estado: 'sin-tarifa' }
  | { estado: 'sin-reserva' }
  | { estado: 'sin-config' }
  | { estado: 'error' }

/**
 * Orquesta comprimir → subir → crear_inscripcion. Ningún monto ni folio del cliente
 * participa en el cálculo real (Principio VIII.4): el servidor los congela y los
 * devuelve.
 */
export async function enviarInscripcion(
  responsable: PayloadCrearInscripcion['responsable'],
  participantes: PayloadCrearInscripcion['participantes'],
  comprobante: File,
  tipo_pago: TipoPago,
): Promise<ResultadoEnvio> {
  if (!supabaseConfigurado) return { estado: 'sin-config' }

  try {
    const blob = await comprimirComprobante(comprobante)
    const url_comprobante = await subirComprobante(comprobante, blob)

    const payload: PayloadCrearInscripcion = { responsable, url_comprobante, participantes, tipo_pago }
    const { data, error } = await supabase.rpc('crear_inscripcion', { payload })

    if (error) {
      // La RPC lanza un error controlado cuando no hay tarifa activa (FR-023).
      if (/tarifa/i.test(error.message)) return { estado: 'sin-tarifa' }
      // El admin apagó la reserva 50 % mientras la persona llenaba el formulario.
      if (/reserva/i.test(error.message)) return { estado: 'sin-reserva' }
      return { estado: 'error' }
    }

    const fila = Array.isArray(data) ? data[0] : data
    return {
      estado: 'ok',
      resultado: {
        folio: fila.folio,
        cantidad_personas: Number(fila.cantidad_personas ?? participantes.length),
        monto_esperado: Number(fila.monto_esperado ?? 0),
        tipo_pago: fila.tipo_pago === 'reserva' ? 'reserva' : 'completo',
        monto_reserva: fila.monto_reserva == null ? null : Number(fila.monto_reserva),
      },
    }
  } catch {
    return { estado: 'error' }
  }
}

/**
 * Pago del saldo de una reserva (spec 003, HU9): subir el comprobante (ya comprimido
 * y validado por la isla) → RPC
 * subir_comprobante_saldo (SECURITY DEFINER, anon; constitución v2.1.0, Principio II).
 * La RPC revalida folio + cédula y solo responde true/false: nunca revela cuál falló.
 */
export async function enviarComprobanteSaldo(
  folio: string,
  cedula: string,
  comprobante: File,
  blob: Blob,
): Promise<'ok' | 'rechazado' | 'sin-config' | 'error'> {
  if (!supabaseConfigurado) return 'sin-config'
  try {
    const p_url = await subirComprobante(comprobante, blob)
    const { data, error } = await supabase.rpc('subir_comprobante_saldo', {
      p_folio: folio,
      p_cedula: cedula,
      p_url,
    })
    if (error) return 'error'
    return data === true ? 'ok' : 'rechazado'
  } catch {
    return 'error'
  }
}
