import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Tarifa } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { cn } from '../lib/utils'

export default function TarifaCard() {
  const [tarifa, setTarifa] = useState<Tarifa | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('tarifas')
      .select('*')
      .eq('activa', true)
      .single()
      .then(({ data }) => {
        setTarifa(data as Tarifa | null)
        setCargando(false)
      })
  }, [])

  // Interruptor de la reserva 50 % (spec 003, FR-059): no es un descuento, solo
  // habilita la opción "Reserva 50 %" en el formulario público.
  async function cambiarReserva() {
    if (!tarifa) return
    setGuardando(true)
    setError(null)
    const nuevo = !tarifa.permite_reserva
    const { error } = await supabase
      .from('tarifas')
      .update({ permite_reserva: nuevo })
      .eq('id', tarifa.id)
    setGuardando(false)
    if (error) {
      setError('No se pudo guardar el cambio.')
      return
    }
    setTarifa({ ...tarifa, permite_reserva: nuevo })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarifa vigente</CardTitle>
      </CardHeader>
      <CardContent>
        {cargando ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">Cargando tarifa...</p>
        ) : !tarifa ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No hay una tarifa activa configurada.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[var(--color-primary)]">
                ₡{tarifa.monto_por_persona.toLocaleString('es-CR')}
              </span>
              <span className="text-sm text-[var(--color-muted-foreground)]">por persona</span>
            </div>
            <div className="flex gap-3 text-xs text-[var(--color-muted-foreground)] flex-wrap">
              <span className="font-semibold text-[var(--color-foreground)]">{tarifa.modalidad}</span>
              <span>
                {new Date(tarifa.fecha_inicio).toLocaleDateString('es-CR')} –{' '}
                {new Date(tarifa.fecha_fin).toLocaleDateString('es-CR')}
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--color-foreground)]">Reserva con 50 %</p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  {tarifa.permite_reserva
                    ? 'Activa: el formulario público ofrece pagar el 50 % y el saldo después.'
                    : 'Inactiva: en el formulario público solo se puede pagar el total.'}
                </p>
                {error && <p className="text-xs text-[var(--color-destructive)] mt-1">{error}</p>}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={tarifa.permite_reserva}
                aria-label="Permitir reserva con 50 %"
                onClick={() => void cambiarReserva()}
                disabled={guardando}
                className={cn(
                  'relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50',
                  tarifa.permite_reserva ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-input)]'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                    tarifa.permite_reserva && 'translate-x-5'
                  )}
                />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
