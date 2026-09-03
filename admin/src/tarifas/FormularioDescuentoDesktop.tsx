import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import FormularioDescuento from './FormularioDescuento'
import type { Descuento } from '../types'

interface OnGuardarParams {
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  porcentaje: number
}

interface FormularioDescuentoDesktopProps {
  open: boolean
  onClose: () => void
  descuentoEditando?: Descuento | null
  onGuardar: (datos: OnGuardarParams) => Promise<{ error: string | null }>
  guardando?: boolean
}

export default function FormularioDescuentoDesktop({
  open,
  onClose,
  descuentoEditando,
  onGuardar,
  guardando = false,
}: FormularioDescuentoDesktopProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !guardando && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {descuentoEditando ? 'Editar descuento' : 'Nuevo descuento'}
          </DialogTitle>
        </DialogHeader>
        <FormularioDescuento
          descuentoEditando={descuentoEditando}
          onGuardar={onGuardar}
          onCancelar={onClose}
          guardando={guardando}
        />
      </DialogContent>
    </Dialog>
  )
}
