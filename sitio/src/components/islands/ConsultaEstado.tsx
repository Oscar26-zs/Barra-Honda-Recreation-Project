/*
 * Isla n.º 2 (React) — Consulta pública de estado por folio + cédula (HU2).
 * Fuente de estilo: desing/docs/07 ("Consultar") · 02 (colores de estado) · 05 (badge)
 * Datos: consultarEstado() → RPC consultar_estado_inscripcion (SECURITY DEFINER, anon).
 * Nunca revela cuál dato falló (FR-026, SC-007).
 */
import { useState } from 'react'
import { consultarEstado, type ResultadoBusqueda } from '../../lib/consulta'
import type { EstadoInscripcion } from '../../lib/tipos'
import { Campo } from './inscripcion/campos'

const BADGE: Record<EstadoInscripcion, { cls: string; label: string }> = {
  pendiente: {
    cls: 'bg-amber-50 text-amber-700 border-amber-300',
    label: 'Pendiente de revisión',
  },
  aprobada: {
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    label: 'Aprobada',
  },
  rechazada: {
    cls: 'bg-red-50 text-red-700 border-red-300',
    label: 'Rechazada',
  },
}

export default function ConsultaEstado() {
  const [folio, setFolio] = useState('')
  const [cedula, setCedula] = useState('')
  const [errores, setErrores] = useState<{ folio?: string; cedula?: string }>({})
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoBusqueda | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err: { folio?: string; cedula?: string } = {}
    if (!folio.trim()) err.folio = 'Ingrese el folio.'
    if (!cedula.trim()) err.cedula = 'Ingrese la cédula.'
    setErrores(err)
    if (Object.keys(err).length > 0) return

    setCargando(true)
    setResultado(null)
    const r = await consultarEstado(folio, cedula)
    setResultado(r)
    setCargando(false)
  }

  return (
    <div className="bg-paper border border-river/20 p-5 sm:p-6 md:p-8">
      <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <Campo
          id="folio"
          label="Folio"
          value={folio}
          onChange={setFolio}
          placeholder="BH-2026-0142"
          error={errores.folio}
        />
        <Campo
          id="cedula"
          label="Número de cédula"
          value={cedula}
          onChange={setCedula}
          inputMode="numeric"
          placeholder="1 0456 0789"
          error={errores.cedula}
        />
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={cargando}
            className="w-full py-3 bg-river hover:bg-sky disabled:bg-ridge text-white font-poster font-bold text-sm tracking-[0.2em] uppercase transition-colors"
          >
            {cargando ? 'Consultando…' : 'Consultar'}
          </button>
        </div>
      </form>

      {resultado && <Resultado resultado={resultado} />}
    </div>
  )
}

function Resultado({ resultado }: { resultado: ResultadoBusqueda }) {
  if (resultado.estado === 'sin-config') {
    return (
      <p className="mt-6 text-sm text-slate">
        La consulta no está disponible: falta configurar la conexión con Supabase.
      </p>
    )
  }
  if (resultado.estado === 'error') {
    return (
      <p className="mt-6 text-sm text-red-600">
        Ocurrió un error al consultar. Intente de nuevo en unos minutos.
      </p>
    )
  }
  if (resultado.estado === 'no-encontrada') {
    return (
      <p className="mt-6 text-sm text-slate">
        No se encontró ninguna inscripción con esos datos.
      </p>
    )
  }

  const { datos } = resultado
  const badge = BADGE[datos.estado]
  return (
    <div className="mt-6 border-t border-river/15 pt-6">
      <p className="font-poster font-black text-3xl tracking-wider text-ink">{datos.folio}</p>
      <span
        className={`mt-3 inline-block px-4 py-1.5 text-xs font-bold tracking-widest uppercase border ${badge.cls}`}
      >
        {badge.label}
      </span>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-xs font-semibold tracking-[0.14em] uppercase text-slate">Modalidad</dt>
          <dd className="text-ink mt-0.5">{datos.modalidad_tarifa}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold tracking-[0.14em] uppercase text-slate">Personas</dt>
          <dd className="text-ink mt-0.5">{datos.cantidad_personas}</dd>
        </div>
      </dl>
      {datos.estado === 'pendiente' && (
        <p className="mt-5 text-sm text-slate leading-relaxed">
          Tu comprobante aún está en revisión. Recibirás un correo cuando el equipo confirme
          el pago.
        </p>
      )}
      {datos.estado === 'rechazada' && (
        <p className="mt-5 text-sm text-slate leading-relaxed">
          Tu inscripción fue rechazada. Revisa el correo que te enviamos con el motivo, o
          escríbenos por redes sociales.
        </p>
      )}
    </div>
  )
}
