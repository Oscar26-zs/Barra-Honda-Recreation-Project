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

// Se genera un .xlsx real (no CSV) para poder aplicar formato: cabecera con color,
// datos centrados y texto ajustado a la celda. `--color-primary` del panel.
const COLOR_CABECERA = '0861CD'

const BORDE = {
  top: { style: 'thin', color: { rgb: 'D1D5DB' } },
  bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
  left: { style: 'thin', color: { rgb: 'D1D5DB' } },
  right: { style: 'thin', color: { rgb: 'D1D5DB' } },
}

const ESTILO_CABECERA = {
  font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: COLOR_CABECERA } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: BORDE,
}

const ESTILO_DATO = {
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: BORDE,
}

export default function ExportarExcel({ inscripciones }: ExportarExcelProps) {
  const { isMobile } = useBreakpoint()

  async function exportar() {
    // Carga diferida: la librería (~600 kB) solo se descarga al exportar.
    const XLSX = await import('xlsx-js-style')

    const cabecera = ['Folio', 'Contacto', 'Teléfono', 'Correo', 'Personas', 'Modalidad', 'Monto', 'Estado', 'Fecha']
    const COL_MONTO = cabecera.indexOf('Monto')

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

    const ws = XLSX.utils.aoa_to_sheet([cabecera, ...filas])
    const totalFilas = filas.length + 1

    for (let c = 0; c < cabecera.length; c++) {
      for (let r = 0; r < totalFilas; r++) {
        const celda = ws[XLSX.utils.encode_cell({ r, c })]
        if (!celda) continue
        celda.s = r === 0 ? ESTILO_CABECERA : ESTILO_DATO
        if (r > 0 && c === COL_MONTO) celda.z = '#,##0'
      }
    }

    // Ancho de columna ajustado al contenido (con topes mín./máx.).
    ws['!cols'] = cabecera.map((titulo, c) => {
      const largo = Math.max(
        titulo.length,
        ...filas.map((f) => String(f[c] ?? '').length),
      )
      return { wch: Math.min(40, Math.max(10, largo + 2)) }
    })
    ws['!rows'] = [{ hpt: 22 }]
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: totalFilas - 1, c: cabecera.length - 1 },
      }),
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inscripciones')
    XLSX.writeFile(wb, `inscripciones-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <Button variant="default" size="sm" onClick={() => void exportar()}>
      <Download size={14} />
      {isMobile ? 'Exportar' : 'Exportar a Excel'}
    </Button>
  )
}
