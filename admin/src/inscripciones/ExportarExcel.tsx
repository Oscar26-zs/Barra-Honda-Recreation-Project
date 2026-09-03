import { Download } from 'lucide-react'
import { Button } from '../components/ui/button'
import type { Inscripcion } from '../types'
import { useBreakpoint } from '../hooks/useBreakpoint'

// Known Gap #1: pendiente confirmar con propietario si estilo es sólido (primary)
// o tint (secondary) en desktop. Mobile muestra "Exportar" abreviado.
// Por ahora se usa 'default' (sólido azul) alineado con las capturas mobile.

interface ExportarExcelProps {
  inscripciones: Inscripcion[]
}

function escaparCsv(valor: unknown): string {
  const s = String(valor ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export default function ExportarExcel({ inscripciones }: ExportarExcelProps) {
  const { isMobile } = useBreakpoint()

  function exportar() {
    const cabecera = ['Folio', 'Contacto', 'Teléfono', 'Correo', 'Personas', 'Modalidad', 'Monto', 'Estado', 'Fecha']
    const filas = inscripciones.map((i) => [
      i.folio ?? '',
      i.nombre_contacto,
      i.telefono_contacto,
      i.correo_contacto,
      i.cantidad_personas,
      i.modalidad_tarifa,
      i.monto_esperado,
      i.estado,
      new Date(i.fecha_creacion).toLocaleDateString('es-CR'),
    ])

    const csv = [cabecera, ...filas].map((r) => r.map(escaparCsv).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inscripciones-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="default" size="sm" onClick={exportar}>
      <Download size={14} />
      {isMobile ? 'Exportar' : 'Exportar a Excel'}
    </Button>
  )
}
