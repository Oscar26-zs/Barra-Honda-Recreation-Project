import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Inscripcion } from '../types'

export default function DetalleInscripcion() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [inscripcion, setInscripcion] = useState<Inscripcion | null>(null)
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    cargar()
  }, [id])

  async function cargar() {
    const { data, error } = await supabase
      .from('inscripciones')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      setError('Inscripción no encontrada.')
      setCargando(false)
      return
    }

    setInscripcion(data as Inscripcion)

    if (data.comprobante_path) {
      const { data: signed } = await supabase.storage
        .from('comprobantes')
        .createSignedUrl(data.comprobante_path as string, 3600)
      if (signed) setComprobanteUrl(signed.signedUrl)
    }

    setCargando(false)
  }

  async function cambiarEstado(nuevoEstado: 'aprobada' | 'rechazada') {
    if (!inscripcion) return
    setProcesando(true)
    setError('')

    const { error } = await supabase
      .from('inscripciones')
      .update({ estado: nuevoEstado })
      .eq('id', inscripcion.id)
      .eq('estado', 'pendiente')

    if (error) {
      setError('Error al actualizar el estado. Intenta de nuevo.')
      setProcesando(false)
    } else {
      navigate('/dashboard')
    }
  }

  if (cargando) return <p style={{ padding: '2rem' }}>Cargando...</p>

  if (!inscripcion) {
    return (
      <div style={{ padding: '2rem' }}>
        <button onClick={() => navigate('/dashboard')}>← Volver</button>
        <p style={{ marginTop: '1rem', color: '#dc2626' }}>{error}</p>
      </div>
    )
  }

  const esPendiente = inscripcion.estado === 'pendiente'

  return (
    <div style={s.contenedor}>
      <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '1.25rem' }}>
        ← Volver al listado
      </button>

      <h1 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>
        Detalle de inscripción
      </h1>

      <table style={s.tabla}>
        <tbody>
          {[
            ['Nombre completo', inscripcion.nombre_completo],
            ['Correo electrónico', inscripcion.correo_electronico],
            ['Teléfono', inscripcion.telefono],
            ['Estado', inscripcion.estado],
            ['Fecha de envío', new Date(inscripcion.created_at).toLocaleString('es-CR')],
          ].map(([campo, valor], i) => (
            <tr key={campo} style={{ background: i % 2 === 0 ? '#f9fafb' : 'white' }}>
              <th style={s.th}>{campo}</th>
              <td style={s.td}>{valor}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Comprobante de pago</h2>
        {comprobanteUrl ? (
          <img
            src={comprobanteUrl}
            alt="Comprobante de pago"
            style={{ maxWidth: '100%', maxHeight: '500px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
          />
        ) : (
          <p style={{ color: '#6b7280' }}>No hay comprobante adjunto.</p>
        )}
      </div>

      {esPendiente && (
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => cambiarEstado('aprobada')}
            disabled={procesando}
            style={s.botonAprobar}
          >
            {procesando ? 'Procesando...' : '✓ Aprobar inscripción'}
          </button>
          <button
            onClick={() => cambiarEstado('rechazada')}
            disabled={procesando}
            style={s.botonRechazar}
          >
            {procesando ? 'Procesando...' : '✕ Rechazar inscripción'}
          </button>
        </div>
      )}

      {!esPendiente && (
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Esta inscripción ya fue {inscripcion.estado}. El estado no puede modificarse.
        </p>
      )}

      {error && (
        <p style={{ color: '#dc2626', marginTop: '1rem', fontSize: '0.875rem' }}>{error}</p>
      )}
    </div>
  )
}

const s = {
  contenedor: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '2rem 1.25rem',
  },
  tabla: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  th: {
    textAlign: 'left' as const,
    padding: '0.65rem 1rem',
    fontWeight: 600,
    fontSize: '0.875rem',
    width: '180px',
    color: '#374151',
  },
  td: {
    padding: '0.65rem 1rem',
    fontSize: '0.9rem',
  },
  botonAprobar: {
    padding: '0.7rem 1.5rem',
    background: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  botonRechazar: {
    padding: '0.7rem 1.5rem',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
