/*
 * Indicador de 3 pasos con círculos numerados y conectores.
 * Estados por paso: activo (bg-river text-white) · completado (bg-river/15 text-river + check)
 * · bloqueado (bg-paper border-river/25 text-slate/50).
 * Fuente: desing/docs/05-components.md → "Patrón stepper"
 */
const STEPS = ['Responsable', 'Participantes', 'Pago'] as const

interface Props {
  step: number
  maxStep: number
  onGoTo: (n: number) => void
}

export default function Stepper({ step, maxStep, onGoTo }: Props) {
  return (
    <div className="mb-8 sm:mb-10">
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {STEPS.map((label, idx) => {
          const n = idx + 1
          const estado = n === step ? 'activo' : n < step ? 'completado' : 'bloqueado'
          const circulo =
            estado === 'activo'
              ? 'bg-river text-white'
              : estado === 'completado'
                ? 'bg-river/15 text-river'
                : 'bg-paper border border-river/25 text-slate/50'
          return (
            <div key={label} className="flex items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => n <= maxStep && onGoTo(n)}
                disabled={n > maxStep}
                className="flex items-center gap-2 sm:gap-2.5 disabled:cursor-not-allowed"
              >
                <span
                  className={`flex items-center justify-center w-8 h-8 shrink-0 rounded-full font-poster font-bold text-xs sm:text-sm transition-colors ${circulo}`}
                >
                  {estado === 'completado' ? '✓' : n}
                </span>
                <span
                  className={`hidden sm:inline text-xs font-semibold tracking-widest uppercase ${
                    estado === 'bloqueado' ? 'text-slate/50' : 'text-river'
                  }`}
                >
                  {label}
                </span>
              </button>
              {idx < STEPS.length - 1 && <span className="w-8 sm:w-10 h-px bg-river/20" />}
            </div>
          )
        })}
      </div>
      <p className="sm:hidden text-center text-xs font-semibold tracking-[0.2em] uppercase text-river mt-3">
        Paso {step} de 3 · {STEPS[step - 1]}
      </p>
    </div>
  )
}
