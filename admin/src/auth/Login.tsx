import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export default function Login() {
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password })
    if (error) {
      setError('Credenciales incorrectas. Intenta de nuevo.')
      setCargando(false)
    } else {
      navigate('/inscripciones', { replace: true })
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-fondo-app)]">
      <form
        onSubmit={handleSubmit}
        className="w-[340px] bg-white border border-[var(--color-border)] rounded-xl p-8 flex flex-col gap-5"
      >
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1">
            PANEL ADMINISTRATIVO
          </p>
          <h1 className="text-xl font-extrabold text-[var(--color-primary)] leading-tight">
            Recreativa<br />Barra Honda
          </h1>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">MTB Valle del Nacaome</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-[var(--color-foreground)]">
            Correo electrónico
          </label>
          <Input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            autoComplete="email"
            placeholder="admin@ejemplo.com"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-[var(--color-foreground)]">
            Contraseña
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-sm text-[var(--color-status-rejected-text)]">{error}</p>
        )}

        <Button type="submit" disabled={cargando} className="w-full">
          {cargando ? 'Ingresando...' : 'Iniciar sesión'}
        </Button>
      </form>
    </div>
  )
}
