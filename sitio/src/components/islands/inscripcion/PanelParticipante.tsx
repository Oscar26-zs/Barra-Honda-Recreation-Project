/*
 * Panel de un participante (contenido de una pestaña del paso 2).
 * Campos: Cédula, Género, Nombre, Apellidos, Talla de camisa (FR-003 + decisión del
 * propietario 2026-09-03: se agrega Género Hombre/Mujer).
 * Layout: 2 columnas parejas en sm+ (sin huecos intermedios), 1 columna en mobile.
 *   Cédula | Género
 *   Nombre | Apellidos
 *   Talla  |
 */
import type { Genero, Participante } from '../../../lib/tipos'
import { GENEROS, TALLAS_CAMISA } from '../../../lib/tipos'
import { Campo, CampoSelect, MensajeError, claseLabel } from './campos'

export interface ErroresParticipante {
  cedula?: string
  nombre?: string
  apellidos?: string
  genero?: string
  talla_camisa?: string
}

interface Props {
  indice: number
  participante: Participante
  errores: ErroresParticipante
  onChange: (p: Participante) => void
}

export default function PanelParticipante({ indice, participante, errores, onChange }: Props) {
  const set = (campo: keyof Participante) => (valor: string) =>
    onChange({ ...participante, [campo]: valor })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-5 sm:gap-y-5">
      <Campo
        id={`cedula-${indice}`}
        label="Cédula *"
        value={participante.cedula}
        onChange={set('cedula')}
        inputMode="numeric"
        error={errores.cedula}
      />

      <ToggleGenero
        value={participante.genero}
        error={errores.genero}
        onChange={(g) => onChange({ ...participante, genero: g })}
      />

      <Campo
        id={`nombre-${indice}`}
        label="Nombre *"
        value={participante.nombre}
        onChange={set('nombre')}
        error={errores.nombre}
      />
      <Campo
        id={`apellidos-${indice}`}
        label="Apellidos *"
        value={participante.apellidos}
        onChange={set('apellidos')}
        error={errores.apellidos}
      />

      <CampoSelect
        id={`talla-${indice}`}
        label="Talla de camisa *"
        value={participante.talla_camisa}
        options={TALLAS_CAMISA}
        onChange={set('talla_camisa')}
        error={errores.talla_camisa}
      />
    </div>
  )
}

function ToggleGenero({
  value,
  error,
  onChange,
}: {
  value: Genero | ''
  error?: string
  onChange: (g: Genero) => void
}) {
  return (
    <div>
      <span className={claseLabel}>Género *</span>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Género">
        {GENEROS.map((g) => {
          const activo = value === g
          return (
            <button
              key={g}
              type="button"
              aria-pressed={activo}
              onClick={() => onChange(g)}
              className={`py-2.5 text-sm font-medium border transition-colors ${
                activo
                  ? 'bg-river border-river text-white'
                  : error
                    ? 'bg-paper border-red-500/60 text-slate hover:border-river/50'
                    : 'bg-paper border-river/25 text-slate hover:border-river/50'
              }`}
            >
              {g}
            </button>
          )
        })}
      </div>
      <MensajeError>{error ? 'Seleccione una opción.' : undefined}</MensajeError>
    </div>
  )
}
