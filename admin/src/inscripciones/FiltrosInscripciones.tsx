import { SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import type { FiltroEstado } from '../hooks/useInscripciones'
import { Button } from '../components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { cn } from '../lib/utils'

const OPCIONES: { value: FiltroEstado; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'rechazada', label: 'Rechazada' },
]

interface FiltrosInscripcionesProps {
  filtro: FiltroEstado
  onChange: (f: FiltroEstado) => void
}

export default function FiltrosInscripciones({ filtro, onChange }: FiltrosInscripcionesProps) {
  const { isMobile } = useBreakpoint()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [tempFiltro, setTempFiltro] = useState<FiltroEstado>(filtro)

  if (isMobile) {
    return (
      <>
        <Button variant="secondary" size="sm" onClick={() => { setTempFiltro(filtro); setSheetOpen(true) }}>
          <SlidersHorizontal size={14} />
          Filtros
        </Button>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filtrar por estado</SheetTitle>
              <button onClick={() => setSheetOpen(false)} className="text-[var(--color-muted-foreground)]">
                <X size={18} />
              </button>
            </SheetHeader>

            <div className="flex flex-col divide-y divide-[var(--color-border)]">
              {OPCIONES.map((op) => (
                <button
                  key={op.value}
                  onClick={() => setTempFiltro(op.value)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3.5 text-sm text-left transition-colors',
                    tempFiltro === op.value
                      ? 'bg-[var(--color-secondary)] border-l-2 border-[var(--color-primary)] text-[var(--color-primary)] font-semibold'
                      : 'bg-white text-[var(--color-foreground)]'
                  )}
                >
                  <span className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                    tempFiltro === op.value ? 'border-[var(--color-primary)]' : 'border-[var(--color-input)]'
                  )}>
                    {tempFiltro === op.value && (
                      <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                    )}
                  </span>
                  {op.label}
                </button>
              ))}
            </div>

            <div className="mt-6 px-4">
              <Button className="w-full" onClick={() => { onChange(tempFiltro); setSheetOpen(false) }}>
                Aplicar
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  // Desktop: chips
  return (
    <div className="flex gap-2 flex-wrap">
      {OPCIONES.map((op) => (
        <button
          key={op.value}
          onClick={() => onChange(op.value)}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-semibold border transition-colors',
            filtro === op.value
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
              : 'bg-white text-[var(--color-muted-foreground)] border-[var(--color-input)] hover:opacity-80'
          )}
        >
          {op.label}
        </button>
      ))}
    </div>
  )
}
