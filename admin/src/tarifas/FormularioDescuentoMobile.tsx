import { ArrowLeft } from 'lucide-react'
import FormularioDescuento from './FormularioDescuento'
import type { Descuento } from '../types'

interface OnGuardarParams {
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  porcentaje: number
}

interface FormularioDescuentoMobileProps {
  open: boolean
  onClose: () => void
  descuentoEditando?: Descuento | null
  onGuardar: (datos: OnGuardarParams) => Promise<{ error: string | null }>
  guardando?: boolean
}

export default function FormularioDescuentoMobile({
  open,
  onClose,
  descuentoEditando,
  onGuardar,
  guardando = false,
}: FormularioDescuentoMobileProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--color-border)]">
        <button onClick={onClose} disabled={guardando} className="text-[var(--color-muted-foreground)]">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-base font-extrabold text-[var(--color-foreground)]">
          {descuentoEditando ? 'Editar descuento' : 'Nuevo descuento'}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <FormularioDescuento
          descuentoEditando={descuentoEditando}
          onGuardar={onGuardar}
          onCancelar={onClose}
          guardando={guardando}
        />
      </div>
    </div>
  )
}
