/*
 * Isla n.º 2 (React) — Consulta pública de estado por folio + cédula (HU2).
 * Fuente de estilo: desing/docs/07 ("Consultar") · 02 (colores de estado) · 05 (badge)
 * Datos: consultarEstado() → RPC buscar_estado_inscripcion (SECURITY DEFINER, anon).
 * Nunca revela cuál dato falló (FR-026, SC-007).
 * Spec 003 (HU9): muestra el pago de una reserva y permite subir el comprobante del
 * saldo → enviarComprobanteSaldo() → RPC subir_comprobante_saldo.
 */
import { useState } from 'react'
import { consultarEstado, normalizarConsulta, type ResultadoBusqueda } from '../../lib/consulta'
import { comprimirComprobante, enviarComprobanteSaldo } from '../../lib/inscripcion'
import { validarComprobante, validarTamañoFinal } from '../../lib/validacion'
import type { EstadoInscripcion, ResultadoConsulta } from '../../lib/tipos'
import { formatoColones } from '../../lib/tipos'
import { Campo, MensajeError } from './inscripcion/campos'

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

type Consultado = { folio: string; cedula: string }

export default function ConsultaEstado() {
  const [folio, setFolio] = useState('')
  const [cedula, setCedula] = useState('')
  const [errores, setErrores] = useState<{ folio?: string; cedula?: string }>({})
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoBusqueda | null>(null)
  // Datos con los que se obtuvo el resultado visible (para subir el saldo con los mismos).
  const [consultado, setConsultado] = useState<Consultado | null>(null)

  async function buscar(f: string, c: string) {
    setCargando(true)
    const r = await consultarEstado(f, c)
    setResultado(r)
    setConsultado({ folio: f, cedula: c })
    setCargando(false)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err: { folio?: string; cedula?: string } = {}
    if (!folio.trim()) err.folio = 'Ingrese el folio.'
    if (!cedula.trim()) err.cedula = 'Ingrese la cédula.'
    setErrores(err)
    if (Object.keys(err).length > 0) return

    setResultado(null)
    await buscar(folio, cedula)
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

      {resultado && (
        <Resultado
          resultado={resultado}
          consultado={consultado}
          onRecargar={() => consultado && buscar(consultado.folio, consultado.cedula)}
        />
      )}
    </div>
  )
}

function Resultado({
  resultado,
  consultado,
  onRecargar,
}: {
  resultado: ResultadoBusqueda
  consultado: Consultado | null
  onRecargar: () => void
}) {
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
      {datos.tipo_pago === 'reserva' && datos.estado !== 'rechazada' && (
        <BloquePago datos={datos} consultado={consultado} onRecargar={onRecargar} />
      )}
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

/* ------------------------------------------------------------------ */
/*  Reserva 50 %: montos, estado del pago y subida del saldo (HU9)     */
/* ------------------------------------------------------------------ */

const BADGE_PAGO: Record<ResultadoConsulta['estado_pago'], { cls: string; label: string }> = {
  completo: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-300', label: 'Pago completo' },
  saldo_pendiente: { cls: 'bg-amber-50 text-amber-700 border-amber-300', label: 'Saldo pendiente' },
  saldo_en_revision: { cls: 'bg-sky-50 text-sky-700 border-sky-300', label: 'Saldo en revisión' },
}

function BloquePago({
  datos,
  consultado,
  onRecargar,
}: {
  datos: ResultadoConsulta
  consultado: Consultado | null
  onRecargar: () => void
}) {
  const badge = BADGE_PAGO[datos.estado_pago]

  return (
    <div className="mt-6 border-t border-river/15 pt-5">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs font-semibold tracking-[0.14em] uppercase text-slate">Reserva 50 %</p>
        <span className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase border ${badge.cls}`}>
          {badge.label}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
        {(
          [
            ['Total', datos.monto_esperado],
            ['Pagado', datos.monto_pagado],
            ['Saldo', datos.saldo_pendiente],
          ] as const
        ).map(([label, monto]) => (
          <div key={label}>
            <dt className="text-xs font-semibold tracking-[0.14em] uppercase text-slate">{label}</dt>
            <dd className="text-ink mt-0.5">{formatoColones(monto)}</dd>
          </div>
        ))}
      </dl>

      {datos.estado === 'pendiente' && (
        <p className="mt-4 text-sm text-slate leading-relaxed">
          Podrás pagar el saldo cuando aprobemos tu reserva.
        </p>
      )}
      {datos.estado_pago === 'saldo_en_revision' && (
        <p className="mt-4 text-sm text-slate leading-relaxed">
          Recibimos el comprobante del saldo y lo estamos revisando. Te enviaremos un correo
          cuando confirmemos el pago completo.
        </p>
      )}
      {datos.estado_pago === 'saldo_pendiente' && datos.motivo_rechazo_saldo && (
        <p className="mt-4 bg-red-50 text-red-700 border border-red-300 text-sm px-4 py-3">
          <strong>Tu último comprobante del saldo fue rechazado:</strong> {datos.motivo_rechazo_saldo}
        </p>
      )}
      {datos.estado === 'aprobada' && datos.estado_pago === 'saldo_pendiente' && consultado && (
        <SubidaSaldo consultado={consultado} onEnviado={onRecargar} />
      )}
    </div>
  )
}

function SubidaSaldo({
  consultado,
  onEnviado,
}: {
  consultado: Consultado
  onEnviado: () => void
}) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    const errArchivo = validarComprobante(archivo)
    if (errArchivo) {
      setError(errArchivo)
      return
    }
    setError(undefined)
    setEnviando(true)
    try {
      const blob = await comprimirComprobante(archivo as File)
      const errTam = validarTamañoFinal(blob.size)
      if (errTam) {
        setError(errTam)
        return
      }
      const { p_folio, p_cedula } = normalizarConsulta(consultado.folio, consultado.cedula)
      const r = await enviarComprobanteSaldo(p_folio, p_cedula, archivo as File, blob)
      if (r === 'ok') {
        onEnviado()
      } else if (r === 'rechazado') {
        setError('No se pudo registrar el comprobante. Vuelve a consultar tu inscripción e intenta de nuevo.')
      } else if (r === 'sin-config') {
        setError('El envío no está disponible: falta configurar la conexión con Supabase.')
      } else {
        setError('Ocurrió un error al subir el comprobante. Intenta de nuevo en unos minutos.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mt-5 bg-cloud border border-river/20 p-4 sm:p-5">
      <p className="text-sm font-medium text-ink">Subir comprobante del saldo</p>
      <p className="text-xs text-slate mt-1">
        JPG, PNG o PDF. Las imágenes se comprimen automáticamente antes de subir.
      </p>
      <input
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        disabled={enviando}
        onChange={(e) => {
          setArchivo(e.target.files?.[0] ?? null)
          setError(undefined)
        }}
        className="mt-3 block w-full text-sm text-ink file:mr-3 file:py-2 file:px-4 file:border-0 file:bg-river file:text-white file:font-poster file:font-bold file:text-xs file:tracking-[0.14em] file:uppercase hover:file:bg-sky"
      />
      <MensajeError>{error}</MensajeError>
      <button
        type="button"
        onClick={enviar}
        disabled={enviando}
        className="mt-4 w-full py-3 bg-river hover:bg-sky disabled:bg-ridge text-white font-poster font-bold text-sm tracking-[0.2em] uppercase transition-colors"
      >
        {enviando ? 'Enviando…' : 'Enviar comprobante del saldo'}
      </button>
    </div>
  )
}
