/*
 * Isla n.º 1 (React) — Formulario de inscripción. Stepper de 3 pasos (HU1).
 * Fuente de estilo: desing/docs/07 ("Stepper de Inscríbete") · 05 (stepper, pestañas)
 * Datos:
 *   - obtenerTarifaVigente() al montar → tarjeta de tarifa (FR-021). Sin tarifa →
 *     formulario deshabilitado (FR-023).
 *   - enviarInscripcion() → comprime + sube comprobante + RPC crear_inscripcion
 *     (INSERT atómico, folio y monto congelados en servidor — FR-006, FR-022).
 */
import { useEffect, useMemo, useState } from 'react'
import { obtenerTarifaVigente, type ResultadoTarifa } from '../../lib/tarifa'
import { enviarInscripcion } from '../../lib/inscripcion'
import { validarComprobante, validarCorreo, validarTamañoFinal } from '../../lib/validacion'
import { comprimirComprobante } from '../../lib/inscripcion'
import type { Participante, Responsable, ResultadoCrearInscripcion } from '../../lib/tipos'
import { formatoColones } from '../../lib/tipos'
import Stepper from './inscripcion/Stepper'
import PasoResponsable, {
  MAX_PARTICIPANTES,
  type ErroresResponsable,
} from './inscripcion/PasoResponsable'
import PasoParticipantes from './inscripcion/PasoParticipantes'
import type { ErroresParticipante } from './inscripcion/PanelParticipante'
import PasoComprobante from './inscripcion/PasoComprobante'
import ConfirmacionEnvio from './inscripcion/ConfirmacionEnvio'

const responsableVacio: Responsable = {
  nombre_contacto: '',
  telefono_contacto: '',
  correo_contacto: '',
}
const participanteVacio = (): Participante => ({
  cedula: '',
  nombre: '',
  apellidos: '',
  genero: '',
  talla_camisa: '',
})

function sincronizar(lista: Participante[], cantidad: number): Participante[] {
  if (cantidad === lista.length) return lista
  if (cantidad < lista.length) return lista.slice(0, cantidad)
  return [...lista, ...Array.from({ length: cantidad - lista.length }, participanteVacio)]
}

export default function FormularioInscripcion() {
  const [tarifa, setTarifa] = useState<ResultadoTarifa | null>(null)

  const [step, setStep] = useState(1)
  const [maxStep, setMaxStep] = useState(1)

  const [responsable, setResponsable] = useState<Responsable>(responsableVacio)
  const [cantidad, setCantidad] = useState(1)
  // Texto crudo del input para permitir borrarlo por completo en móvil; `cantidad`
  // solo se actualiza cuando el texto es un número válido (≥ 1).
  const [cantidadTexto, setCantidadTexto] = useState('1')
  const [participantes, setParticipantes] = useState<Participante[]>([participanteVacio()])
  const [activo, setActivo] = useState(0)
  const [comprobante, setComprobante] = useState<File | null>(null)

  const [errResp, setErrResp] = useState<ErroresResponsable>({})
  const [errParts, setErrParts] = useState<Record<number, ErroresParticipante>>({})
  const [errComp, setErrComp] = useState<string>()
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)

  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoCrearInscripcion | null>(null)

  useEffect(() => {
    obtenerTarifaVigente().then(setTarifa)
  }, [])

  useEffect(() => {
    const n = Math.floor(Number(cantidadTexto))
    if (cantidadTexto.trim() && Number.isFinite(n) && n >= 1) {
      setCantidad(Math.min(MAX_PARTICIPANTES, n))
    }
  }, [cantidadTexto])

  useEffect(() => {
    setParticipantes((prev) => sincronizar(prev, cantidad))
    setActivo((a) => Math.min(a, cantidad - 1))
  }, [cantidad])

  const disponible = tarifa?.estado === 'ok'

  function goTo(n: number) {
    if (n <= maxStep) setStep(n)
  }

  function validarResponsable(): boolean {
    const e: ErroresResponsable = {}
    if (!responsable.nombre_contacto.trim()) e.nombre_contacto = 'El nombre es obligatorio.'
    if (!responsable.telefono_contacto.trim()) e.telefono_contacto = 'El teléfono es obligatorio.'
    e.correo_contacto = validarCorreo(responsable.correo_contacto)
    const n = Math.floor(Number(cantidadTexto))
    if (!cantidadTexto.trim()) e.cantidad = 'Indica cuántas personas se inscriben.'
    else if (!Number.isFinite(n) || n <= 0) e.cantidad = 'Debe ser un número mayor que 0.'
    else if (n > MAX_PARTICIPANTES) e.cantidad = `Máximo ${MAX_PARTICIPANTES} personas.`
    const limpio = Object.fromEntries(Object.entries(e).filter(([, v]) => v)) as ErroresResponsable
    setErrResp(limpio)
    return Object.keys(limpio).length === 0
  }

  function validarParticipantes(): number {
    const mapa: Record<number, ErroresParticipante> = {}
    participantes.forEach((p, i) => {
      const e: ErroresParticipante = {}
      if (!p.cedula.trim()) e.cedula = 'Obligatorio.'
      if (!p.nombre.trim()) e.nombre = 'Obligatorio.'
      if (!p.apellidos.trim()) e.apellidos = 'Obligatorio.'
      if (!p.genero) e.genero = 'Seleccione una opción.'
      if (!p.talla_camisa) e.talla_camisa = 'Seleccione una talla.'
      if (Object.keys(e).length > 0) mapa[i] = e
    })
    setErrParts(mapa)
    const indices = Object.keys(mapa).map(Number)
    return indices.length > 0 ? Math.min(...indices) : -1
  }

  function irAParticipantes() {
    if (!validarResponsable()) return
    setActivo(0)
    setMaxStep((m) => Math.max(m, 2))
    setStep(2)
  }

  function irAPago() {
    const primerInvalido = validarParticipantes()
    if (primerInvalido !== -1) {
      setActivo(primerInvalido)
      return
    }
    setMaxStep((m) => Math.max(m, 3))
    setStep(3)
  }

  async function enviar() {
    setErrorEnvio(null)
    const errArchivo = validarComprobante(comprobante)
    if (errArchivo) {
      setErrComp(errArchivo)
      return
    }
    setErrComp(undefined)
    if (!disponible || tarifa?.estado !== 'ok') {
      setErrorEnvio('No hay una tarifa disponible en este momento. Intenta más tarde.')
      return
    }

    setEnviando(true)
    try {
      const blob = await comprimirComprobante(comprobante as File)
      const errTam = validarTamañoFinal(blob.size)
      if (errTam) {
        setErrComp(errTam)
        setEnviando(false)
        return
      }

      const r = await enviarInscripcion(responsable, participantes, comprobante as File)
      if (r.estado === 'ok') {
        setResultado(r.resultado)
      } else if (r.estado === 'sin-tarifa') {
        setErrorEnvio(
          'No hay una tarifa activa en este momento, así que no se registró ninguna inscripción. Intenta cuando el evento reabra las inscripciones.',
        )
      } else if (r.estado === 'sin-config') {
        setErrorEnvio('El envío no está disponible: falta configurar la conexión con Supabase.')
      } else {
        setErrorEnvio('Ocurrió un error al enviar tu inscripción. Por favor, intenta de nuevo.')
      }
    } finally {
      setEnviando(false)
    }
  }

  const tarjetaTarifa = useMemo(() => <TarjetaTarifa tarifa={tarifa} />, [tarifa])

  if (resultado) return <ConfirmacionEnvio resultado={resultado} />

  return (
    <div>
      {tarjetaTarifa}

      {!disponible ? (
        <p className="bg-amber-50 border border-amber-300 text-amber-800 text-sm px-4 py-3">
          {tarifa?.estado === 'sin-tarifa'
            ? 'Las inscripciones están cerradas: no hay una tarifa disponible en este momento.'
            : tarifa?.estado === 'sin-config'
              ? 'El formulario no está disponible: falta configurar la conexión con Supabase (sitio/.env).'
              : tarifa === null
                ? 'Cargando tarifa…'
                : 'No se pudo cargar la tarifa. Recarga la página en unos minutos.'}
        </p>
      ) : (
        <>
          <Stepper step={step} maxStep={maxStep} onGoTo={goTo} />

          {step === 1 && (
            <PasoResponsable
              responsable={responsable}
              onResponsable={setResponsable}
              cantidadTexto={cantidadTexto}
              onCantidadTexto={setCantidadTexto}
              errores={errResp}
              onSiguiente={irAParticipantes}
            />
          )}

          {step === 2 && (
            <PasoParticipantes
              participantes={participantes}
              errores={errParts}
              activo={activo}
              onActivo={setActivo}
              onParticipante={(i, p) =>
                setParticipantes((prev) => prev.map((x, idx) => (idx === i ? p : x)))
              }
              onAtras={() => setStep(1)}
              onSiguiente={irAPago}
            />
          )}

          {step === 3 && tarifa?.estado === 'ok' && (
            <PasoComprobante
              tarifa={tarifa.tarifa}
              cantidad={cantidad}
              comprobante={comprobante}
              errorComprobante={errComp}
              errorEnvio={errorEnvio}
              enviando={enviando}
              onComprobante={(f) => {
                setComprobante(f)
                setErrComp(undefined)
              }}
              onAtras={() => setStep(2)}
              onEnviar={enviar}
            />
          )}
        </>
      )}
    </div>
  )
}

function TarjetaTarifa({ tarifa }: { tarifa: ResultadoTarifa | null }) {
  if (!tarifa || tarifa.estado !== 'ok') return null
  const t = tarifa.tarifa
  const vence = new Date(t.fecha_fin).toLocaleDateString('es-CR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const hayDescuento = t.monto_final_con_descuento < t.monto_por_persona
  return (
    <div className="mb-6 bg-cloud border border-river/20 p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.14em] uppercase text-slate">
        Tarifa vigente · {t.modalidad}
      </p>
      <p className="font-poster font-black text-3xl sm:text-4xl text-ink mt-1">
        {formatoColones(t.monto_final_con_descuento)}{' '}
        <span className="text-base font-sans font-normal text-slate">por persona</span>
      </p>
      {hayDescuento && (
        <p className="text-sm text-slate mt-1">
          <span className="line-through">{formatoColones(t.monto_por_persona)}</span> con
          descuento activo
        </p>
      )}
      <p className="text-xs text-slate/60 mt-2">
        {hayDescuento ? 'Precio con descuento vigente' : 'Tarifa vigente'} hasta el {vence}.
      </p>
    </div>
  )
}
