/*
 * Helpers de formulario compartidos por FormularioInscripcion y ConsultaEstado.
 * Traducción de los helpers Label / Input / FieldError del diseño.
 * Fuente: desing/docs/05-components.md → "FormField.astro" · 03 (labels)
 */
import type { ChangeEvent, ReactNode } from 'react'

export const claseLabel =
  'block text-xs font-semibold tracking-[0.14em] uppercase text-slate mb-1.5'

export function claseInput(error?: string): string {
  return [
    'w-full bg-paper border text-ink text-sm px-4 py-2.5 placeholder-slate/40 focus:outline-none focus:border-river transition-colors',
    error ? 'border-red-500/60' : 'border-river/25 hover:border-river/50',
  ].join(' ')
}

export function MensajeError({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <p className="text-xs text-red-600 mt-1">{children}</p>
}

interface CampoProps {
  id: string
  label: string
  value: string
  onChange: (valor: string) => void
  type?: string
  placeholder?: string
  error?: string
  inputMode?: 'text' | 'email' | 'tel' | 'numeric'
  autoComplete?: string
}

export function Campo({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  error,
  inputMode,
  autoComplete,
}: CampoProps) {
  return (
    <div>
      <label htmlFor={id} className={claseLabel}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className={claseInput(error)}
      />
      <MensajeError>{error}</MensajeError>
    </div>
  )
}

interface SelectProps {
  id: string
  label: string
  value: string
  options: readonly string[]
  onChange: (valor: string) => void
  error?: string
  placeholder?: string
}

export function CampoSelect({
  id,
  label,
  value,
  options,
  onChange,
  error,
  placeholder = 'Seleccione…',
}: SelectProps) {
  return (
    <div>
      <label htmlFor={id} className={claseLabel}>
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={claseInput(error)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <MensajeError>{error}</MensajeError>
    </div>
  )
}
