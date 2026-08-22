import { useState } from 'react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabase'

type EstadoEnvio = 'idle' | 'enviando' | 'exito' | 'error'

interface CamposForm {
  nombre_completo: string
  telefono: string
  correo_electronico: string
}

type ErroresForm = Partial<CamposForm & { archivo: string }>

export default function FormularioInscripcion() {
  const [form, setForm] = useState<CamposForm>({
    nombre_completo: '',
    telefono: '',
    correo_electronico: '',
  })
  const [archivo, setArchivo] = useState<File | null>(null)
  const [errores, setErrores] = useState<ErroresForm>({})
  const [estado, setEstado] = useState<EstadoEnvio>('idle')

  function actualizar(campo: keyof CamposForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [campo]: e.target.value }))
  }

  function validar(): boolean {
    const e: ErroresForm = {}
    if (!form.nombre_completo.trim()) e.nombre_completo = 'El nombre es obligatorio.'
    if (!form.telefono.trim()) e.telefono = 'El teléfono es obligatorio.'
    if (!form.correo_electronico.trim()) {
      e.correo_electronico = 'El correo es obligatorio.'
    } else if (!/\S+@\S+\.\S+/.test(form.correo_electronico)) {
      e.correo_electronico = 'El correo no tiene un formato válido.'
    }
    if (!archivo) e.archivo = 'Debe adjuntar el comprobante de pago.'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return

    setEstado('enviando')

    try {
      const comprimida = await imageCompression(archivo!, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      })

      const id = crypto.randomUUID()
      const extension = archivo!.name.split('.').pop() ?? 'jpg'
      const comprobante_path = `${id}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(comprobante_path, comprimida)

      if (uploadError) throw uploadError

      const { error: insertError } = await supabase
        .from('inscripciones')
        .insert({ id, ...form, comprobante_path, estado: 'pendiente' })

      if (insertError) throw insertError

      setEstado('exito')
    } catch {
      setEstado('error')
    }
  }

  if (estado === 'exito') {
    return (
      <div style={estilos.exito}>
        <h3 style={{ color: '#065f46', marginBottom: '0.5rem' }}>
          ¡Inscripción enviada con éxito!
        </h3>
        <p>
          Tu solicitud fue registrada y está pendiente de revisión. Recibirás un correo
          electrónico con el resultado.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={estilos.form} noValidate>
      <Campo
        id="nombre_completo"
        label="Nombre completo"
        type="text"
        value={form.nombre_completo}
        onChange={actualizar('nombre_completo')}
        error={errores.nombre_completo}
      />
      <Campo
        id="telefono"
        label="Teléfono"
        type="tel"
        value={form.telefono}
        onChange={actualizar('telefono')}
        error={errores.telefono}
      />
      <Campo
        id="correo_electronico"
        label="Correo electrónico"
        type="email"
        value={form.correo_electronico}
        onChange={actualizar('correo_electronico')}
        error={errores.correo_electronico}
      />

      <div>
        <label htmlFor="comprobante" style={estilos.label}>
          Comprobante de pago <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          id="comprobante"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          style={{ marginTop: '0.25rem' }}
        />
        <p style={estilos.hint}>Formatos aceptados: JPG, PNG, WEBP. La imagen se comprimirá automáticamente.</p>
        {errores.archivo && <p style={estilos.error}>{errores.archivo}</p>}
      </div>

      {estado === 'error' && (
        <p style={estilos.errorBox}>
          Ocurrió un error al enviar tu inscripción. Por favor, intenta de nuevo.
        </p>
      )}

      <button type="submit" disabled={estado === 'enviando'} style={estilos.boton}>
        {estado === 'enviando' ? 'Enviando...' : 'Enviar inscripción'}
      </button>
    </form>
  )
}

function Campo({
  id,
  label,
  type,
  value,
  onChange,
  error,
}: {
  id: string
  label: string
  type: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
}) {
  return (
    <div>
      <label htmlFor={id} style={estilos.label}>
        {label} <span style={{ color: 'red' }}>*</span>
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        style={{ ...estilos.input, borderColor: error ? '#ef4444' : '#d1d5db' }}
      />
      {error && <p style={estilos.error}>{error}</p>}
    </div>
  )
}

const estilos = {
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.25rem',
  },
  label: {
    display: 'block',
    fontWeight: 500,
    marginBottom: '0.25rem',
    fontSize: '0.95rem',
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  error: {
    color: '#dc2626',
    fontSize: '0.82rem',
    marginTop: '0.25rem',
  },
  hint: {
    color: '#6b7280',
    fontSize: '0.82rem',
    marginTop: '0.25rem',
  },
  errorBox: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '0.75rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
  },
  boton: {
    padding: '0.75rem',
    background: '#1e3a8a',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 600,
  },
  exito: {
    background: '#d1fae5',
    border: '1px solid #6ee7b7',
    borderRadius: '8px',
    padding: '1.5rem',
  },
}
