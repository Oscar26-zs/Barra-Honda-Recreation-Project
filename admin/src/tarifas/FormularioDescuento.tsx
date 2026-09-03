import { type FormEvent, useEffect, useState } from 'react'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import VistaPreviaDescuento from './VistaPreviaDescuento'
import type { Descuento } from '../types'
import { supabase } from '../lib/supabase'

interface FormularioDescuentoProps {
  descuentoEditando?: Descuento | null
  onGuardar: (datos: {
    nombre: string
    fecha_inicio: string
    fecha_fin: string
    porcentaje: number
  }) => Promise<{ error: string | null }>
  onCancelar: () => void
  guardando?: boolean
}

export default function FormularioDescuento({
  descuentoEditando,
  onGuardar,
  onCancelar,
  guardando = false,
}: FormularioDescuentoProps) {
  const [nombre, setNombre] = useState(descuentoEditando?.nombre ?? '')
  const [fechaInicio, setFechaInicio] = useState(descuentoEditando?.fecha_inicio ?? '')
  const [fechaFin, setFechaFin] = useState(descuentoEditando?.fecha_fin ?? '')
  const [porcentaje, setPorcentaje] = useState(
    descuentoEditando ? String(descuentoEditando.porcentaje) : ''
  )
  const [error, setError] = useState<string | null>(null)
  const [montoPorPersona, setMontoPorPersona] = useState<number | null>(null)

  useEffect(() => {
    supabase
      .from('tarifas')
      .select('monto_por_persona')
      .eq('activa', true)
      .single()
      .then(({ data }) => {
        if (data) setMontoPorPersona(data.monto_por_persona as number)
      })
  }, [])

  const pct = parseFloat(porcentaje)
  const formularioValido =
    nombre.trim() !== '' &&
    fechaInicio !== '' &&
    fechaFin !== '' &&
    !isNaN(pct) &&
    pct > 0 &&
    pct <= 100 &&
    fechaFin >= fechaInicio

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!formularioValido) return
    setError(null)
    const result = await onGuardar({
      nombre: nombre.trim(),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      porcentaje: pct,
    })
    if (result.error) setError(result.error)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--color-foreground)]">Nombre del descuento</label>
        <Input
          placeholder="Ej. Descuento madrugadores"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          disabled={guardando}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--color-foreground)]">Fecha inicio</label>
          <Input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            disabled={guardando}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--color-foreground)]">Fecha fin</label>
          <Input
            type="date"
            value={fechaFin}
            min={fechaInicio || undefined}
            onChange={(e) => setFechaFin(e.target.value)}
            disabled={guardando}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--color-foreground)]">Porcentaje de descuento</label>
        <div className="relative">
          <Input
            type="number"
            placeholder="0"
            min="1"
            max="100"
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
            className="pr-8"
            disabled={guardando}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted-foreground)]">
            %
          </span>
        </div>
      </div>

      {montoPorPersona && formularioValido && !isNaN(pct) && pct > 0 && (
        <VistaPreviaDescuento montoPorPersona={montoPorPersona} porcentaje={pct} />
      )}

      {error && (
        <p className="text-sm text-[var(--color-destructive)]">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!formularioValido || guardando}
          className={!formularioValido ? 'bg-[var(--color-secondary)] text-[var(--color-primary)] opacity-70' : ''}
        >
          {guardando ? 'Guardando...' : 'Guardar descuento'}
        </Button>
      </div>
    </form>
  )
}
