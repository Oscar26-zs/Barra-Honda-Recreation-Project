import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Tarifa } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

export default function TarifaCard() {
  const [tarifa, setTarifa] = useState<Tarifa | null>(null)
  const [cargando, setCargando] = useState(true)

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
          </div>
        )}
      </CardContent>
    </Card>
  )
}
