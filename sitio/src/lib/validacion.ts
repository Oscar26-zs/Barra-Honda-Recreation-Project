/*
 * Reglas de validación de cliente (espejo de las restricciones del servidor).
 * Requisitos de Seguridad → "Validación de entrada" (cliente para UX + servidor para
 * integridad). El regex de correo es idéntico al del diseño original.
 */
import { esImagen, esPdf } from './inscripcion'

export const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Tamaño máximo aceptado para el comprobante ANTES y DESPUÉS de comprimir (bytes). */
export const MAX_BYTES_COMPROBANTE = 1.5 * 1024 * 1024

export function obligatorio(valor: string): string | undefined {
  return valor.trim() ? undefined : 'Este campo es obligatorio.'
}

export function validarCorreo(valor: string): string | undefined {
  if (!valor.trim()) return 'El correo es obligatorio.'
  return REGEX_CORREO.test(valor.trim()) ? undefined : 'El correo no tiene un formato válido.'
}

export function validarComprobante(archivo: File | null): string | undefined {
  if (!archivo) return 'Debe adjuntar el comprobante de pago.'
  if (!esImagen(archivo) && !esPdf(archivo)) {
    return 'Formato no válido. Use JPG, PNG o PDF.'
  }
  return undefined
}

/** Se llama tras comprimir, con el tamaño final. */
export function validarTamañoFinal(bytes: number): string | undefined {
  return bytes <= MAX_BYTES_COMPROBANTE
    ? undefined
    : 'El archivo es demasiado grande incluso tras la compresión. Use una imagen más liviana.'
}
