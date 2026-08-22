export interface Inscripcion {
  id: string
  nombre_completo: string
  telefono: string
  correo_electronico: string
  comprobante_path: string | null
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  created_at: string
}
