interface VistaPreviaDescuentoProps {
  montoPorPersona: number
  porcentaje: number
}

export default function VistaPreviaDescuento({ montoPorPersona, porcentaje }: VistaPreviaDescuentoProps) {
  const descuento = Math.round(montoPorPersona * (porcentaje / 100))
  const montoFinal = montoPorPersona - descuento

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-fondo-app)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-3">
        Vista previa
      </p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-muted-foreground)] line-through">
            ₡{montoPorPersona.toLocaleString('es-CR')}
          </span>
          <span className="text-xs font-semibold bg-[var(--color-status-active-bg)] text-[var(--color-status-active-text)] rounded-full px-2 py-0.5">
            -{porcentaje}%
          </span>
        </div>
        <span className="text-xl font-extrabold text-[var(--color-status-active-text)]">
          ₡{montoFinal.toLocaleString('es-CR')}
        </span>
        <span className="text-xs text-[var(--color-muted-foreground)]">por persona</span>
      </div>
    </div>
  )
}
