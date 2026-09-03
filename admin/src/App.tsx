import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthGuard from './auth/AuthGuard'
import Login from './auth/Login'
import AppLayout from './layout/AppLayout'
import ListaInscripciones from './inscripciones/ListaInscripciones'
import DetalleInscripcion from './inscripciones/DetalleInscripcion'
import NuevaInscripcion from './inscripciones/NuevaInscripcion'
import TarifasPage from './tarifas/TarifasPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/inscripciones" replace />} />
          <Route path="/inscripciones" element={<ListaInscripciones />} />
          <Route path="/inscripciones/nueva" element={<NuevaInscripcion />} />
          <Route path="/inscripciones/:id" element={<DetalleInscripcion />} />
          <Route path="/tarifas" element={<TarifasPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/inscripciones" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
