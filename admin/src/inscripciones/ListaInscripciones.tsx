import { useNavigate } from 'react-router-dom'
import { PlusCircle } from 'lucide-react'
import type { Inscripcion, EstadoInscripcion } from '../types'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { useBreakpoint } from '../hooks/useBreakpoint'
import type { FiltroEstado } from '../hooks/useInscripciones'
import { useInscripciones } from '../hooks/useInscripciones'
import BuscadorInscripciones from './BuscadorInscripciones'
import FiltrosInscripciones from './FiltrosInscripciones'
import ExportarExcel from './ExportarExcel'

function EstadoBadge({ estado }: { estado: EstadoInscripcion }) {
  const labels: Record<EstadoInscripcion, string> = {
    pendiente: 'Pendiente',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
  }
  return <Badge variant={estado}>{labels[estado]}</Badge>
}

function TarjetaMobile({ ins }: { ins: Inscripcion }) {
  const navigate = useNavigate()
  return (
    <div
      className="bg-white border border-[var(--color-border)] rounded-xl p-4 flex flex-col gap-2 cursor-pointer active:opacity-70"
      onClick={() => navigate(`/inscripciones/${ins.id}`)}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--color-primary)]">{ins.folio}</span>
        <EstadoBadge estado={ins.estado} />
      </div>
      <p className="text-sm text-[var(--color-foreground)] font-medium">{ins.nombre_contacto}</p>
      <div className="flex gap-4 text-xs text-[var(--color-muted-foreground)]">
        <span>{ins.cantidad_personas} persona{ins.cantidad_personas !== 1 ? 's' : ''}</span>
        <span>₡{ins.monto_esperado?.toLocaleString('es-CR')}</span>
        <span>{new Date(ins.fecha_creacion).toLocaleDateString('es-CR')}</span>
      </div>
    </div>
  )
}

export default function ListaInscripciones() {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const {
    inscripciones,
    cargando,
    filtro,
    setFiltro,
    busqueda,
    setBusqueda,
  } = useInscripciones()

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-extrabold text-[var(--color-foreground)]">Inscripciones</h1>
        <div className="flex gap-2">
          <ExportarExcel inscripciones={inscripciones} />
          <Button size="sm" onClick={() => navigate('/inscripciones/nueva')}>
            <PlusCircle size={14} />
            {isMobile ? '' : 'Registrar inscripción'}
          </Button>
        </div>
      </div>

      {/* Buscador + Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1">
          <BuscadorInscripciones value={busqueda} onChange={setBusqueda} />
        </div>
        <FiltrosInscripciones filtro={filtro} onChange={(f: FiltroEstado) => setFiltro(f)} />
      </div>

      {cargando ? (
        <p className="text-[var(--color-muted-foreground)] text-sm">Cargando inscripciones...</p>
      ) : inscripciones.length === 0 ? (
        <p className="text-[var(--color-muted-foreground)] text-sm">No hay inscripciones para mostrar.</p>
      ) : isMobile ? (
        <div className="flex flex-col gap-3">
          {inscripciones.map((i) => <TarjetaMobile key={i.id} ins={i} />)}
        </div>
      ) : (
        <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--color-fondo-app)] border-b border-[var(--color-border)]">
                {['Folio', 'Contacto', 'Personas', 'Monto', 'Estado', 'Fecha', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-[var(--color-muted-foreground)] px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inscripciones.map((ins) => (
                <tr key={ins.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-fondo-app)] transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--color-primary)]">{ins.folio}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-[var(--color-foreground)]">{ins.nombre_contacto}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{ins.correo_contacto}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-foreground)]">{ins.cantidad_personas}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-foreground)]">
                    ₡{ins.monto_esperado?.toLocaleString('es-CR')}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={ins.estado} />
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                    {new Date(ins.fecha_creacion).toLocaleDateString('es-CR')}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/inscripciones/${ins.id}`)}
                    >
                      Ver detalle
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
