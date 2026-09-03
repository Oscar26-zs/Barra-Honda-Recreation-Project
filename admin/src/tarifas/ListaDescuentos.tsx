import { useState } from 'react'
import { MoreVertical, Plus } from 'lucide-react'
import type { Descuento } from '../types'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'

type AccionPendiente = { tipo: 'eliminar' | 'desactivar'; id: string; nombre: string } | null

interface ListaDescuentosProps {
  descuentos: Descuento[]
  cargando: boolean
  onNuevo: () => void
  onEditar: (d: Descuento) => void
  onEliminar: (id: string) => Promise<{ error: string | null }>
  onDesactivar: (id: string) => Promise<{ error: string | null }>
}

const LABELS: Record<string, string> = {
  Programado: 'Programado',
  Activo: 'Activo',
  Vencido: 'Vencido',
}

export default function ListaDescuentos({
  descuentos,
  cargando,
  onNuevo,
  onEditar,
  onEliminar,
  onDesactivar,
}: ListaDescuentosProps) {
  const [accionPendiente, setAccionPendiente] = useState<AccionPendiente>(null)
  const [procesando, setProcesando] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  async function confirmarAccion() {
    if (!accionPendiente) return
    setProcesando(true)
    setErrorAccion(null)
    const result =
      accionPendiente.tipo === 'eliminar'
        ? await onEliminar(accionPendiente.id)
        : await onDesactivar(accionPendiente.id)
    setProcesando(false)
    if (result.error) {
      setErrorAccion(result.error)
    } else {
      setAccionPendiente(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Descuentos</CardTitle>
          <Button size="sm" onClick={onNuevo}>
            <Plus size={14} />
            Nuevo descuento
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cargando ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">Cargando descuentos...</p>
        ) : descuentos.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">No hay descuentos configurados.</p>
        ) : (
          <div className="flex flex-col">
            {descuentos.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--color-foreground)]">{d.nombre}</span>
                    <Badge variant={d.estado_descuento as 'Programado' | 'Activo' | 'Vencido'}>
                      {LABELS[d.estado_descuento] ?? d.estado_descuento}
                    </Badge>
                  </div>
                  <div className="flex gap-3 text-xs text-[var(--color-muted-foreground)]">
                    <span>
                      {new Date(d.fecha_inicio).toLocaleDateString('es-CR')} –{' '}
                      {new Date(d.fecha_fin).toLocaleDateString('es-CR')}
                    </span>
                    <span className="font-semibold text-[var(--color-foreground)]">-{d.porcentaje}%</span>
                  </div>
                </div>

                <DropdownMenu
                  trigger={
                    <button className="p-1.5 rounded-lg hover:bg-[var(--color-fondo-app)] transition-colors ml-2 shrink-0">
                      <MoreVertical size={16} className="text-[var(--color-muted-foreground)]" />
                    </button>
                  }
                >
                  <DropdownMenuItem onClick={() => onEditar(d)}>Editar</DropdownMenuItem>
                  {(d.estado_descuento === 'Programado' || d.estado_descuento === 'Activo') && (
                    <DropdownMenuItem
                      onClick={() => setAccionPendiente({ tipo: 'desactivar', id: d.id, nombre: d.nombre })}
                      className="text-[var(--color-status-pending-text)]"
                    >
                      Desactivar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setAccionPendiente({ tipo: 'eliminar', id: d.id, nombre: d.nombre })}
                    className="text-[var(--color-destructive)]"
                  >
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Modal confirmación eliminar / desactivar */}
      <Dialog open={accionPendiente !== null} onOpenChange={(v) => !v && !procesando && setAccionPendiente(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accionPendiente?.tipo === 'eliminar' ? 'Eliminar descuento' : 'Desactivar descuento'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {accionPendiente?.tipo === 'eliminar'
              ? `¿Deseas eliminar el descuento "${accionPendiente?.nombre}"? Esta acción no puede revertirse.`
              : `¿Deseas desactivar el descuento "${accionPendiente?.nombre}"? Esta acción es irreversible.`}
          </p>
          {errorAccion && (
            <p className="text-sm text-[var(--color-destructive)]">{errorAccion}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccionPendiente(null)} disabled={procesando}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarAccion} disabled={procesando}>
              {procesando ? 'Procesando...' : accionPendiente?.tipo === 'eliminar' ? 'Eliminar' : 'Desactivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
