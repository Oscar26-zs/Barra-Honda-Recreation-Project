/*
 * Paso 2 — pestañas de participante (una por persona, derivadas de "Cantidad de
 * personas"). Al validar, salto automático a la primera pestaña con error.
 * Fuente: desing/docs/05 ("Pestañas de Participante") · 07 ("Stepper de Inscríbete")
 */
import type { Participante } from '../../../lib/tipos'
import PanelParticipante, { type ErroresParticipante } from './PanelParticipante'

interface Props {
  participantes: Participante[]
  errores: Record<number, ErroresParticipante>
  activo: number
  onActivo: (i: number) => void
  onParticipante: (i: number, p: Participante) => void
  onAtras: () => void
  onSiguiente: () => void
}

export default function PasoParticipantes({
  participantes,
  errores,
  activo,
  onActivo,
  onParticipante,
  onAtras,
  onSiguiente,
}: Props) {
  return (
    <div className="bg-paper border border-river/20 p-5 sm:p-6 md:p-8">
      <h2 className="text-lg sm:text-xl font-poster font-black uppercase text-ink">
        Participantes
      </h2>
      <p className="mt-1 text-sm text-slate">
        Completa los datos de cada integrante del grupo.
      </p>

      <div className="mt-6 flex items-stretch gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {participantes.map((_, i) => {
          const conError = Object.keys(errores[i] ?? {}).length > 0
          const esActivo = i === activo
          return (
            <button
              key={i}
              type="button"
              onClick={() => onActivo(i)}
              className={`relative shrink-0 px-3.5 sm:px-4 py-2 text-xs font-poster font-bold uppercase tracking-widest transition-colors ${
                esActivo
                  ? 'bg-river text-white'
                  : 'bg-paper border border-river/25 text-slate hover:border-river/50'
              }`}
            >
              Participante {i + 1}
              {conError && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border border-cloud" />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        <PanelParticipante
          indice={activo}
          participante={participantes[activo]}
          errores={errores[activo] ?? {}}
          onChange={(p) => onParticipante(activo, p)}
        />
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={onAtras}
          className="px-6 py-3 text-slate hover:text-ink font-poster font-bold text-sm tracking-[0.2em] uppercase transition-colors"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={onSiguiente}
          className="px-8 py-3 bg-river hover:bg-sky text-white font-poster font-bold text-sm tracking-[0.2em] uppercase transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
