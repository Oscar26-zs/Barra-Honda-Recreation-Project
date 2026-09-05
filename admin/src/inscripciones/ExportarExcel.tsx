import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import type { Inscripcion, Participante } from '../types'
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

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-CR')

// Construye una hoja con estilo a partir de una matriz de valores (fila 0 = cabecera).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function construirHoja(XLSX: any, cabecera: string[], filas: (string | number)[][], columnasMonto: number[] = []) {
  const ws = XLSX.utils.aoa_to_sheet([cabecera, ...filas])
  const totalFilas = filas.length + 1

  for (let c = 0; c < cabecera.length; c++) {
    for (let r = 0; r < totalFilas; r++) {
      const celda = ws[XLSX.utils.encode_cell({ r, c })]
      if (!celda) continue
      celda.s = r === 0 ? ESTILO_CABECERA : ESTILO_DATO
      if (r > 0 && columnasMonto.includes(c)) celda.z = '#,##0'
    }
  }

  ws['!cols'] = cabecera.map((titulo, c) => {
    const largo = Math.max(titulo.length, ...filas.map((f) => String(f[c] ?? '').length))
    return { wch: Math.min(40, Math.max(10, largo + 2)) }
  })
  ws['!rows'] = [{ hpt: 22 }]
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: totalFilas - 1, c: cabecera.length - 1 },
    }),
  }
  return ws
}

export default function ExportarExcel({ inscripciones }: ExportarExcelProps) {
  const { isMobile } = useBreakpoint()
  const [ocupado, setOcupado] = useState(false)

  async function exportar() {
    setOcupado(true)
    try {
      // Carga diferida: la librería (~600 kB) solo se descarga al exportar.
      const XLSX = await import('xlsx-js-style')

      // ── Hoja 1: Inscripciones (una fila por inscripción) ──────────────────
      const cabInsc = ['Folio', 'Contacto', 'Teléfono', 'Correo', 'Personas', 'Modalidad', 'Monto', 'Estado', 'Fecha']
      const filasInsc = inscripciones.map((i) => [
        i.folio ?? '',
        i.nombre_contacto,
        i.telefono_contacto,
        i.correo_contacto,
        i.cantidad_personas,
        i.modalidad_tarifa,
        i.monto_esperado,
        i.estado,
        fecha(i.fecha_creacion),
      ])

      // ── Hoja 2: Participantes (una fila por persona + datos de su inscripción) ──
      const ids = inscripciones.map((i) => i.id)
      let participantes: Participante[] = []
      if (ids.length > 0) {
        const { data } = await supabase
          .from('participantes')
          .select('*')
          .in('inscripcion_id', ids)
        participantes = (data ?? []) as Participante[]
      }

      const porInscripcion = new Map(inscripciones.map((i) => [i.id, i]))
      const filasPart = participantes
        .map((p) => {
          const insc = porInscripcion.get(p.inscripcion_id)
          return {
            folio: insc?.folio ?? '',
            fila: [
              insc?.folio ?? '',
              p.cedula,
              p.nombre,
              p.apellidos,
              p.talla_camisa,
              p.genero ?? '',
              insc?.nombre_contacto ?? '',
              insc?.telefono_contacto ?? '',
              insc?.correo_contacto ?? '',
              insc?.modalidad_tarifa ?? '',
              insc?.monto_esperado ?? '',
              insc?.estado ?? '',
              insc ? fecha(insc.fecha_creacion) : '',
            ] as (string | number)[],
          }
        })
        .sort((a, b) => a.folio.localeCompare(b.folio))
        .map((x) => x.fila)

      const cabPart = [
        'Folio', 'Cédula', 'Nombre', 'Apellidos', 'Talla', 'Género',
        'Responsable', 'Teléfono', 'Correo', 'Modalidad', 'Monto inscripción', 'Estado', 'Fecha',
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(
        wb,
        construirHoja(XLSX, cabInsc, filasInsc, [cabInsc.indexOf('Monto')]),
        'Inscripciones',
      )
      XLSX.utils.book_append_sheet(
        wb,
        construirHoja(XLSX, cabPart, filasPart, [cabPart.indexOf('Monto inscripción')]),
        'Participantes',
      )
      XLSX.writeFile(wb, `inscripciones-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Button variant="default" size="sm" onClick={() => void exportar()} disabled={ocupado}>
      <Download size={14} />
      {ocupado ? 'Generando…' : isMobile ? 'Exportar' : 'Exportar a Excel'}
    </Button>
  )
}
