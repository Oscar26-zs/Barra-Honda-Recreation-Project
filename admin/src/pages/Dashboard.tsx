import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Inscripcion } from '../types'
import ListaInscripciones from '../components/ListaInscripciones'

type Filtro = 'todas' | 'pendiente' | 'aprobada' | 'rechazada'

const FILTROS: Filtro[] = ['todas', 'pendiente', 'aprobada', 'rechazada']

export default function Dashboard() {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargar()
  }, [filtro])

  async function cargar() {
    setCargando(true)
    let query = supabase
      .from('inscripciones')
      .select('*')
      .order('created_at', { ascending: false })

    if (filtro !== 'todas') {
      query = query.eq('estado', filtro)
    }

    const { data } = await query
    setInscripciones(data ?? [])
    setCargando(false)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  const pendientes = inscripciones.filter((i) => i.estado === 'pendiente').length

  return (
    <div style={s.contenedor}>
      <div style={s.cabecera}>
        <div>
          <h1 style={{ fontSize: '1.3rem' }}>Recreativa Barra Honda</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Panel de inscripciones</p>
        </div>
        <button onClick={cerrarSesion}>Cerrar sesión</button>
      </div>

      {pendientes > 0 && (
        <div style={s.alertaPendientes}>
          {pendientes} inscripción{pendientes > 1 ? 'es' : ''} pendiente{pendientes > 1 ? 's' : ''} de revisión
        </div>
      )}

      <div style={s.filtros}>
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              ...s.botonFiltro,
              background: filtro === f ? '#1e3a8a' : 'white',
              color: filtro === f ? 'white' : '#374151',
              borderColor: filtro === f ? '#1e3a8a' : '#d1d5db',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {cargando ? (
        <p>Cargando inscripciones...</p>
      ) : (
        <ListaInscripciones inscripciones={inscripciones} />
      )}
    </div>
  )
}

const s = {
  contenedor: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '2rem 1.25rem',
  },
  cabecera: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  alertaPendientes: {
    background: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '6px',
    padding: '0.75rem 1rem',
    color: '#92400e',
    fontSize: '0.9rem',
    marginBottom: '1rem',
  },
  filtros: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap' as const,
  },
  botonFiltro: {
    padding: '0.4rem 1rem',
    borderRadius: '20px',
    border: '1px solid',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
}
