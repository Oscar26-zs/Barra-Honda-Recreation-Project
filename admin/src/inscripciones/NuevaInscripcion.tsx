import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabase'
import { useInscripciones } from '../hooks/useInscripciones'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

const TALLAS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']
const GENEROS = ['Hombre', 'Mujer'] as const

interface ParticipanteForm {
  cedula: string
  nombre: string
  apellidos: string
  talla_camisa: string
  genero: '' | (typeof GENEROS)[number]
}

function participanteVacio(): ParticipanteForm {
  return { cedula: '', nombre: '', apellidos: '', talla_camisa: 'M', genero: '' }
}

export default function NuevaInscripcion() {
  const navigate = useNavigate()
  const { crearInscripcionManual } = useInscripciones()

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [participantes, setParticipantes] = useState<ParticipanteForm[]>([participanteVacio()])
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function actualizarParticipante(index: number, campo: keyof ParticipanteForm, valor: string) {
    setParticipantes((prev) => prev.map((p, i) => i === index ? { ...p, [campo]: valor } : p))
  }

  function agregarParticipante() {
    setParticipantes((prev) => [...prev, participanteVacio()])
  }

  function quitarParticipante(index: number) {
    if (participantes.length <= 1) return
    setParticipantes((prev) => prev.filter((_, i) => i !== index))
  }

  const formularioValido =
    nombre.trim() !== '' &&
    telefono.trim() !== '' &&
    correo.trim() !== '' &&
    participantes.every((p) => p.cedula.trim() && p.nombre.trim() && p.apellidos.trim() && p.talla_camisa && p.genero)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!formularioValido) return
    setError(null)
    setEnviando(true)

    let urlComprobante: string | null = null

    if (comprobanteFile) {
      try {
        const comprimido = await imageCompression(comprobanteFile, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        })
        const nombreArchivo = `comprobante-admin-${Date.now()}.${comprimido.name.split('.').pop()}`
        const { error: upErr } = await supabase.storage
          .from('comprobantes')
          .upload(nombreArchivo, comprimido)
        if (!upErr) urlComprobante = nombreArchivo
      } catch {
        // Comprobante opcional: si falla la subida, continúa sin él
      }
    }

    const result = await crearInscripcionManual({
      nombre_contacto: nombre.trim(),
      telefono_contacto: telefono.trim(),
      correo_contacto: correo.trim(),
      cantidad_personas: participantes.length,
      participantes: participantes.map((p) => ({
        cedula: p.cedula.trim(),
        nombre: p.nombre.trim(),
        apellidos: p.apellidos.trim(),
        talla_camisa: p.talla_camisa,
        genero: p.genero as 'Hombre' | 'Mujer',
      })),
      urlComprobante,
    })

    setEnviando(false)

    if (result.error) {
      setError(result.error)
    } else {
      navigate('/inscripciones')
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <button
          onClick={() => navigate('/inscripciones')}
          className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] mb-3 hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={15} /> Volver al listado
        </button>
        <h1 className="text-xl font-extrabold text-[var(--color-foreground)]">Registrar inscripción</h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
          Registro manual para inscripciones con pago verificado fuera del sistema.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Datos del responsable */}
        <Card>
          <CardHeader>
            <CardTitle>Datos del responsable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-foreground)]">Nombre completo</label>
                <Input
                  placeholder="Nombre completo del responsable"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={enviando}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--color-foreground)]">Teléfono</label>
                  <Input
                    placeholder="8888-8888"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    disabled={enviando}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--color-foreground)]">Correo electrónico</label>
                  <Input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    disabled={enviando}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Participantes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Participantes ({participantes.length})</CardTitle>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={agregarParticipante}
                disabled={enviando}
              >
                <Plus size={14} />
                Agregar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {participantes.map((p, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 pb-4 border-b border-[var(--color-border)] last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide">
                      Participante {i + 1}
                    </p>
                    {participantes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitarParticipante(i)}
                        disabled={enviando}
                        className="text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--color-foreground)]">Cédula</label>
                      <Input
                        placeholder="1-2345-6789"
                        value={p.cedula}
                        onChange={(e) => actualizarParticipante(i, 'cedula', e.target.value)}
                        disabled={enviando}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--color-foreground)]">Nombre</label>
                      <Input
                        placeholder="Nombre"
                        value={p.nombre}
                        onChange={(e) => actualizarParticipante(i, 'nombre', e.target.value)}
                        disabled={enviando}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--color-foreground)]">Apellidos</label>
                      <Input
                        placeholder="Apellidos"
                        value={p.apellidos}
                        onChange={(e) => actualizarParticipante(i, 'apellidos', e.target.value)}
                        disabled={enviando}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--color-foreground)]">Talla de camisa</label>
                      <select
                        value={p.talla_camisa}
                        onChange={(e) => actualizarParticipante(i, 'talla_camisa', e.target.value)}
                        disabled={enviando}
                        className="h-9 rounded-xl border border-[var(--color-input)] bg-white px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:outline-none"
                      >
                        {TALLAS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--color-foreground)]">Género</label>
                      <select
                        value={p.genero}
                        onChange={(e) => actualizarParticipante(i, 'genero', e.target.value)}
                        disabled={enviando}
                        className="h-9 rounded-xl border border-[var(--color-input)] bg-white px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:outline-none"
                      >
                        <option value="">Seleccione…</option>
                        {GENEROS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comprobante opcional */}
        <Card>
          <CardHeader>
            <CardTitle>Comprobante de pago <span className="text-[var(--color-muted-foreground)] font-normal text-sm">(opcional)</span></CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="file"
              accept="image/*"
              disabled={enviando}
              onChange={(e) => setComprobanteFile(e.target.files?.[0] ?? null)}
              className="text-sm text-[var(--color-foreground)] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[var(--color-secondary)] file:text-[var(--color-primary)] hover:file:opacity-80"
            />
            {comprobanteFile && (
              <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                Archivo seleccionado: {comprobanteFile.name}
              </p>
            )}
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-[var(--color-destructive)] px-1">{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/inscripciones')} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!formularioValido || enviando}>
            {enviando ? 'Registrando...' : 'Registrar inscripción'}
          </Button>
        </div>
      </form>
    </div>
  )
}
