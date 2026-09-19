import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../components/ui/button'
import { PAGINAS_DISPONIBLES } from '../hooks/useInscripciones'
import { cn } from '../lib/utils'

interface PaginacionProps {
  pagina: number
  totalPaginas: number
  onCambiarPagina: (p: number) => void
  porPagina: number
  onCambiarPorPagina: (n: number) => void
  total: number
}

// Genera un rango acotado de páginas alrededor de la actual, con "…" cuando hay huecos.
function construirRango(pagina: number, totalPaginas: number): (number | '...')[] {
  const rango: (number | '...')[] = []
  const inicio = Math.max(2, pagina - 1)
  const fin = Math.min(totalPaginas - 1, pagina + 1)

  rango.push(1)
  if (inicio > 2) rango.push('...')
  for (let p = inicio; p <= fin; p++) rango.push(p)
  if (fin < totalPaginas - 1) rango.push('...')
  if (totalPaginas > 1) rango.push(totalPaginas)

  return rango
}

export default function Paginacion({
  pagina,
  totalPaginas,
  onCambiarPagina,
  porPagina,
  onCambiarPorPagina,
  total,
}: PaginacionProps) {
  const rango = construirRango(pagina, totalPaginas)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 text-sm">
      <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
        <span>{total} inscripci{total === 1 ? 'ón' : 'ones'} · Mostrar</span>
        <select
          value={porPagina}
          onChange={(e) => onCambiarPorPagina(Number(e.target.value))}
          className="h-8 rounded-md border border-[var(--color-input)] bg-white px-2 text-sm text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        >
          {PAGINAS_DISPONIBLES.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span>por página</span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          disabled={pagina <= 1}
          onClick={() => onCambiarPagina(pagina - 1)}
        >
          <ChevronLeft size={14} />
        </Button>

        {rango.map((p, idx) =>
          p === '...' ? (
            <span key={`dots-${idx}`} className="px-2 text-[var(--color-muted-foreground)]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onCambiarPagina(p)}
              className={cn(
                'h-8 min-w-8 rounded-md px-2 text-sm font-semibold transition-colors',
                p === pagina
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]'
              )}
            >
              {p}
            </button>
          )
        )}

        <Button
          variant="outline"
          size="icon"
          disabled={pagina >= totalPaginas}
          onClick={() => onCambiarPagina(pagina + 1)}
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  )
}
