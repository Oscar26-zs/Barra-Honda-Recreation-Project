import { useState } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useDescuentos } from '../hooks/useDescuentos'
import type { Descuento } from '../types'
import TarifaCard from './TarifaCard'
import ListaDescuentos from './ListaDescuentos'
import FormularioDescuentoDesktop from './FormularioDescuentoDesktop'
import FormularioDescuentoMobile from './FormularioDescuentoMobile'

export default function TarifasPage() {
  const { isMobile } = useBreakpoint()
  const {
    descuentos,
    cargando,
    crearDescuento,
    editarDescuento,
    eliminarDescuento,
    desactivarDescuento,
  } = useDescuentos()

  const [formOpen, setFormOpen] = useState(false)
  const [descuentoEditando, setDescuentoEditando] = useState<Descuento | null>(null)
  const [guardando, setGuardando] = useState(false)

  function abrirNuevo() {
    setDescuentoEditando(null)
    setFormOpen(true)
  }

  function abrirEditar(d: Descuento) {
    setDescuentoEditando(d)
    setFormOpen(true)
  }

  function cerrarForm() {
    if (guardando) return
    setFormOpen(false)
    setDescuentoEditando(null)
  }

  async function handleGuardar(datos: {
    nombre: string
    fecha_inicio: string
    fecha_fin: string
    porcentaje: number
  }) {
    setGuardando(true)
    const result = descuentoEditando
      ? await editarDescuento({ ...datos, id: descuentoEditando.id })
      : await crearDescuento(datos)
    setGuardando(false)
    if (!result.error) cerrarForm()
    return result
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-extrabold text-[var(--color-foreground)] mb-5">Tarifas</h1>

      <div className="flex flex-col gap-4">
        <TarifaCard />
        <ListaDescuentos
          descuentos={descuentos}
          cargando={cargando}
          onNuevo={abrirNuevo}
          onEditar={abrirEditar}
          onEliminar={eliminarDescuento}
          onDesactivar={desactivarDescuento}
        />
      </div>

      {isMobile ? (
        <FormularioDescuentoMobile
          open={formOpen}
          onClose={cerrarForm}
          descuentoEditando={descuentoEditando}
          onGuardar={handleGuardar}
          guardando={guardando}
        />
      ) : (
        <FormularioDescuentoDesktop
          open={formOpen}
          onClose={cerrarForm}
          descuentoEditando={descuentoEditando}
          onGuardar={handleGuardar}
          guardando={guardando}
        />
      )}
    </div>
  )
}
