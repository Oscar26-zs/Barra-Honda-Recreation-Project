/*
 * Pantalla de éxito tras el INSERT atómico (FR-007). Muestra el folio asignado y el
 * estado "pendiente"; pide guardarlo para la consulta posterior.
 * Fuente: desing/docs/07 → "Stepper de Inscríbete" (bloque submitted) · 03 (folio)
 */
import type { ResultadoCrearInscripcion } from '../../../lib/tipos'
import { formatoColones } from '../../../lib/tipos'

export default function ConfirmacionEnvio({
  resultado,
}: {
  resultado: ResultadoCrearInscripcion
}) {
  return (
    <div className="bg-emerald-50 border border-emerald-300 p-6 sm:p-8 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-700">
        ¡Inscripción recibida!
      </p>
      <h2 className="mt-3 text-lg sm:text-xl font-poster font-black uppercase text-ink">
        Tu grupo quedó registrado
      </h2>

      <p className="mt-6 text-xs font-semibold tracking-[0.14em] uppercase text-slate">Folio</p>
      <p className="font-poster font-black text-3xl tracking-wider text-ink mt-1">
        {resultado.folio}
      </p>

      <span className="mt-3 inline-block px-4 py-1.5 text-xs font-bold tracking-widest uppercase border bg-amber-50 text-amber-700 border-amber-300">
        Pendiente de revisión
      </span>

      <p className="mt-6 text-sm text-slate leading-relaxed max-w-md mx-auto">
        {resultado.cantidad_personas}{' '}
        {resultado.cantidad_personas === 1 ? 'persona' : 'personas'} ·{' '}
        {formatoColones(resultado.monto_esperado)}. Guarda este folio: lo necesitarás junto
        con tu cédula para consultar el estado en la página “Consultar”. Te enviaremos un
        correo cuando el equipo revise el comprobante.
      </p>

      <a
        href="/consultar"
        className="mt-6 inline-block px-6 py-2.5 border border-river/40 text-river hover:bg-river hover:text-white font-poster font-bold text-xs tracking-[0.2em] uppercase transition-colors"
      >
        Ir a consultar mi inscripción
      </a>
    </div>
  )
}
