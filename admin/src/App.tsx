import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DetalleInscripcion from './components/DetalleInscripcion'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setCargando(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (cargando) return <p style={{ padding: '2rem' }}>Cargando...</p>

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/dashboard"
          element={session ? <Dashboard /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/inscripcion/:id"
          element={session ? <DetalleInscripcion /> : <Navigate to="/login" replace />}
        />
        <Route
          path="*"
          element={<Navigate to={session ? '/dashboard' : '/login'} replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}
