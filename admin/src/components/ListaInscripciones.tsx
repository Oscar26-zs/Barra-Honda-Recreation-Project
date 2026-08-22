import { useNavigate } from 'react-router-dom'
import type { Inscripcion } from '../types'

const BADGE: Record<Inscripcion['estado'], { bg: string; color: string }> = {
  pendiente: { bg: '#fef3c7', color: '#92400e' },
  aprobada:  { bg: '#d1fae5', color: '#065f46' },
  rechazada: { bg: '#fee2e2', color: '#991b1b' },
}

export default function ListaInscripciones({ inscripciones }: { inscripciones: Inscripcion[] }) {
  const navigate = useNavigate()

  if (inscripciones.length === 0) {
    return <p style={{ color: '#6b7280' }}>No hay inscripciones para mostrar.</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={s.tabla}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={s.th}>Nombre</th>
            <th style={s.th}>Correo</th>
            <th style={s.th}>Teléfono</th>
            <th style={s.th}>Estado</th>
            <th style={s.th}>Fecha</th>
            <th style={s.th}></th>
          </tr>
        </thead>
        <tbody>
          {inscripciones.map((ins) => {
            const badge = BADGE[ins.estado]
            return (
              <tr key={ins.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={s.td}>{ins.nombre_completo}</td>
                <td style={s.td}>{ins.correo_electronico}</td>
                <td style={s.td}>{ins.telefono}</td>
                <td style={s.td}>
                  <span style={{ ...s.badge, background: badge.bg, color: badge.color }}>
                    {ins.estado}
                  </span>
                </td>
                <td style={s.td}>
                  {new Date(ins.created_at).toLocaleDateString('es-CR')}
                </td>
                <td style={s.td}>
                  <button onClick={() => navigate(`/inscripcion/${ins.id}`)}>
                    Ver detalle
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const s = {
  tabla: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    background: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  th: {
    padding: '0.75rem 1rem',
    textAlign: 'left' as const,
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#374151',
  },
  td: {
    padding: '0.75rem 1rem',
    fontSize: '0.9rem',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: 500,
    textTransform: 'capitalize' as const,
  },
}
