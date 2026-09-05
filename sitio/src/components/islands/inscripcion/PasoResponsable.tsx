/*
 * Paso 1 — datos de contacto del responsable del grupo (FR-003) + input
 * "Cantidad de personas a inscribir" (mín. 1, incluye al responsable; de este valor
 * se derivan las pestañas del paso 2 — no hay botón "Agregar").
 * Fuente: desing/docs/07 → "Stepper de Inscríbete"
 */
import type { Responsable } from '../../../lib/tipos'
import { Campo, claseLabel, MensajeError } from './campos'

export const MAX_PARTICIPANTES = 20

export interface ErroresResponsable {
  nombre_contacto?: string
  telefono_contacto?: string
  correo_contacto?: string
  cantidad?: string
}

interface Props {
  responsable: Responsable
  onResponsable: (r: Responsable) => void
  cantidadTexto: string
  onCantidadTexto: (v: string) => void
  errores: ErroresResponsable
  onSiguiente: () => void
}

export default function PasoResponsable({
  responsable,
  onResponsable,
  cantidadTexto,
  onCantidadTexto,
  errores,
  onSiguiente,
}: Props) {
  const set = (campo: keyof Responsable) => (valor: string) =>
    onResponsable({ ...responsable, [campo]: valor })

  return (
    <div className="bg-paper border border-river/20 p-5 sm:p-6 md:p-8">
      <h2 className="text-lg sm:text-xl font-poster font-black uppercase text-ink">
        Responsable del grupo
      </h2>
      <p className="mt-1 text-sm text-slate">
        Estos datos de contacto son únicos por inscripción. A este correo llegan las
        notificaciones.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <div className="sm:col-span-2">
          <Campo
            id="nombre_contacto"
            label="Nombre completo *"
            value={responsable.nombre_contacto}
            onChange={set('nombre_contacto')}
            autoComplete="name"
            error={errores.nombre_contacto}
          />
        </div>
        <Campo
          id="telefono_contacto"
          label="Teléfono *"
          value={responsable.telefono_contacto}
          onChange={set('telefono_contacto')}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          error={errores.telefono_contacto}
        />
        <Campo
          id="correo_contacto"
          label="Correo electrónico *"
          value={responsable.correo_contacto}
          onChange={set('correo_contacto')}
          type="email"
          inputMode="email"
          autoComplete="email"
          error={errores.correo_contacto}
        />

        <div className="sm:col-span-2">
          <label htmlFor="cantidad" className={claseLabel}>
            Cantidad de personas a inscribir *
          </label>
          <input
            id="cantidad"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_PARTICIPANTES}
            value={cantidadTexto}
            onChange={(e) => onCantidadTexto(e.target.value)}
            onBlur={(e) => {
              const n = Math.floor(Number(e.target.value))
              if (e.target.value.trim() && Number.isFinite(n) && n >= 1) {
                onCantidadTexto(String(Math.min(MAX_PARTICIPANTES, n)))
              }
            }}
            className={`w-32 bg-paper border text-ink text-sm px-4 py-2.5 focus:outline-none focus:border-river transition-colors ${
              errores.cantidad
                ? 'border-red-500/60'
                : 'border-river/25 hover:border-river/50'
            }`}
          />
          <MensajeError>{errores.cantidad}</MensajeError>
          <p className="text-xs text-slate/60 mt-1">
            Incluye al responsable si también participa. Mínimo 1, máximo {MAX_PARTICIPANTES}.
          </p>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onSiguiente}
          className="px-8 py-3 bg-river hover:bg-sky text-white font-poster font-bold text-sm tracking-[0.2em] uppercase transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
