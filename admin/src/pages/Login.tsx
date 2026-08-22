import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password,
    })
    if (error) setError('Credenciales incorrectas. Intenta de nuevo.')
    setCargando(false)
  }

  return (
    <div style={s.centrado}>
      <form onSubmit={handleSubmit} style={s.form}>
        <h1 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.3rem' }}>
          Panel Administrativo
        </h1>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Recreativa Barra Honda
        </p>

        <label style={s.label}>
          Correo electrónico
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            autoComplete="email"
            style={{ marginTop: '0.25rem' }}
          />
        </label>

        <label style={s.label}>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{ marginTop: '0.25rem' }}
          />
        </label>

        {error && <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          style={s.boton}
        >
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}

const s = {
  centrado: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
  },
  form: {
    width: '340px',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  label: {
    display: 'flex',
    flexDirection: 'column' as const,
    fontWeight: 500,
    fontSize: '0.9rem',
  },
  boton: {
    padding: '0.7rem',
    background: '#1e3a8a',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: 600,
    marginTop: '0.25rem',
  },
}
