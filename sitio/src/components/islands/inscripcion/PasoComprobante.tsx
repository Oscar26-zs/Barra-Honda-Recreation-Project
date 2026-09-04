/*
 * Paso 3 — adjuntar el comprobante de pago del grupo (JPG/PNG/PDF, FR-004) + total
 * ESTIMADO (monto_final_con_descuento × cantidad) + envío.
 * El monto real lo congela el servidor (FR-022); aquí es solo informativo.
 * Fuente: desing/docs/07 → "Stepper de Inscríbete" · 03 (cifra total) · 02 (tokens)
 */
import { useEffect, useRef, useState } from 'react'
import type { TarifaVigente } from '../../../lib/tipos'
import { formatoColones } from '../../../lib/tipos'
import { esImagen, esPdf } from '../../../lib/inscripcion'
import { MensajeError, claseLabel } from './campos'

interface Props {
  tarifa: TarifaVigente
  cantidad: number
  comprobante: File | null
  errorComprobante?: string
  errorEnvio: string | null
  enviando: boolean
  onComprobante: (f: File | null) => void
  onAtras: () => void
  onEnviar: () => void
}

const ACEPTA = 'image/jpeg,image/png,application/pdf'

function pesoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function PasoComprobante({
  tarifa,
  cantidad,
  comprobante,
  errorComprobante,
  errorEnvio,
  enviando,
  onComprobante,
  onAtras,
  onEnviar,
}: Props) {
  const total = tarifa.monto_final_con_descuento * cantidad

  return (
    <div className="bg-paper border border-river/20 p-5 sm:p-6 md:p-8">
      <h2 className="text-lg sm:text-xl font-poster font-black uppercase text-ink">
        Comprobante y pago
      </h2>
      <p className="mt-1 text-sm text-slate">
        El pago se hace por transferencia o SINPE Móvil. Un solo comprobante cubre a todo el
        grupo.
      </p>

      <div className="mt-6">
        <span className={claseLabel}>Comprobante de pago *</span>
        <CargaComprobante
          archivo={comprobante}
          error={errorComprobante}
          onArchivo={onComprobante}
        />
        <MensajeError>{errorComprobante}</MensajeError>
      </div>

      <div className="mt-6 border-t border-river/15 pt-5">
        <p className="text-xs font-semibold tracking-[0.14em] uppercase text-slate">
          Total estimado
        </p>
        <p className="font-poster font-black text-3xl sm:text-4xl text-ink mt-1">
          {formatoColones(total)}
        </p>
        <p className="text-xs text-slate/60 mt-1">
          {cantidad} {cantidad === 1 ? 'persona' : 'personas'} ×{' '}
          {formatoColones(tarifa.monto_final_con_descuento)} · tarifa {tarifa.modalidad}. El
          monto definitivo lo confirma el sistema al registrar la inscripción.
        </p>
      </div>

      {errorEnvio && (
        <p className="mt-5 bg-red-50 text-red-700 border border-red-300 text-sm px-4 py-3">
          {errorEnvio}
        </p>
      )}

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={onAtras}
          disabled={enviando}
          className="px-6 py-3 text-slate hover:text-ink font-poster font-bold text-sm tracking-[0.2em] uppercase transition-colors disabled:opacity-50"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={onEnviar}
          disabled={enviando}
          className="px-8 py-3 bg-river hover:bg-sky disabled:bg-ridge text-white font-poster font-bold text-sm tracking-[0.2em] uppercase transition-colors inline-flex items-center gap-2"
        >
          {enviando && (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {enviando ? 'Enviando…' : 'Enviar inscripción'}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Contenedor de subida del comprobante (drag & drop + vista previa)  */
/* ------------------------------------------------------------------ */

function CargaComprobante({
  archivo,
  error,
  onArchivo,
}: {
  archivo: File | null
  error?: string
  onArchivo: (f: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (archivo && esImagen(archivo)) {
      const url = URL.createObjectURL(archivo)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreview(null)
  }, [archivo])

  const abrir = () => inputRef.current?.click()
  const tomar = (files: FileList | null) =>
    onArchivo(files && files.length > 0 ? files[0] : null)

  return (
    <div
      className={`mt-1.5 border-2 border-dashed transition-colors ${
        drag
          ? 'border-river bg-river/5'
          : error
            ? 'border-red-400 bg-red-50/40'
            : archivo
              ? 'border-river/30 bg-cloud'
              : 'border-river/30 bg-cloud hover:border-river/60 hover:bg-river/[0.03]'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        tomar(e.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACEPTA}
        className="hidden"
        onChange={(e) => tomar(e.target.files)}
      />

      {!archivo ? (
        /* ---- Sin archivo: invitación a soltar/elegir ---- */
        <button
          type="button"
          onClick={abrir}
          className="w-full flex flex-col items-center justify-center gap-3 px-6 py-10 sm:py-12 text-center"
        >
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-river/10 text-river">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
              />
            </svg>
          </span>
          <span className="text-sm font-medium text-ink">
            Arrastra el comprobante aquí o{' '}
            <span className="text-river underline underline-offset-2">búscalo en tu dispositivo</span>
          </span>
          <span className="flex gap-1.5">
            {['JPG', 'PNG', 'PDF'].map((f) => (
              <span
                key={f}
                className="px-2 py-0.5 text-[10px] font-poster font-bold tracking-widest uppercase text-slate border border-river/25 bg-paper"
              >
                {f}
              </span>
            ))}
          </span>
          <span className="text-xs text-slate/60">
            Las imágenes se comprimen automáticamente antes de subir.
          </span>
        </button>
      ) : (
        /* ---- Con archivo: vista previa + acciones ---- */
        <div className="flex items-center gap-4 p-3 sm:p-4">
          <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 border border-river/20 bg-paper overflow-hidden flex items-center justify-center">
            {preview ? (
              <img
                src={preview}
                alt="Vista previa del comprobante"
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-9 h-9 text-river" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zm7 0v5h5"
                />
              </svg>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink truncate">{archivo.name}</p>
            <p className="text-xs text-slate/70 mt-0.5">
              {esPdf(archivo) ? 'PDF' : 'Imagen'} · {pesoLegible(archivo.size)}
            </p>
            <div className="mt-2 flex gap-4">
              <button
                type="button"
                onClick={abrir}
                className="text-xs font-poster font-bold tracking-[0.14em] uppercase text-river hover:text-sky transition-colors"
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={() => onArchivo(null)}
                className="text-xs font-poster font-bold tracking-[0.14em] uppercase text-slate hover:text-red-600 transition-colors"
              >
                Quitar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
