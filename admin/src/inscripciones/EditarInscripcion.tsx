import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Genero, Inscripcion, Participante } from '../types'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

// Edición de una inscripción existente (spec 003, HU7): datos del responsable y de los
// participantes actuales. No se agregan ni quitan personas; folio, monto, estado y pago
// no se tocan. Se guarda con la RPC atómica editar_inscripcion (migración 008).

const TALLAS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']
const GENEROS: Genero[] = ['Hombre', 'Mujer']
const CORREO_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

type ParticipanteForm = Pick<Participante, 'id' | 'cedula' | 'nombre' | 'apellidos' | 'talla_camisa' | 'genero'>

const claseSelect =
  'h-9 rounded-xl border border-[var(--color-input)] bg-white px-3 text-sm focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:outline-none'

export default function EditarInscripcion() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const volver = () => navigate(`/inscripciones/${id}`)

  const [folio, setFolio] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [participantes, setParticipantes] = useState<ParticipanteForm[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [modificado, setModificado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void cargar() }, [id])

  async function cargar() {
    setCargando(true)
    const { data, error } = await supabase.from('inscripciones').select('*').eq('id', id).single()
    if (error || !data) {
      setErrorCarga('Inscripción no encontrada.')
      setCargando(false)
      return
    }
    const ins = data as Inscripcion
    if (ins.estado === 'rechazada') {
      setErrorCarga('Las inscripciones rechazadas no se pueden editar.')
      setCargando(false)
      return
    }
    setFolio(ins.folio)
    setNombre(ins.nombre_contacto)
    setTelefono(ins.telefono_contacto)
    setCorreo(ins.correo_contacto)

    const { data: parts } = await supabase
      .from('participantes')
      .select('id, cedula, nombre, apellidos, talla_camisa, genero')
      .eq('inscripcion_id', id)
    setParticipantes((parts ?? []) as ParticipanteForm[])
    setCargando(false)
  }

  function actualizarParticipante(index: number, campo: keyof ParticipanteForm, valor: string) {
    setModificado(true)
    setParticipantes((prev) => prev.map((p, i) => i === index ? { ...p, [campo]: valor } : p))
  }

  function cambiar(setter: (v: string) => void) {
    return (v: string) => { setModificado(true); setter(v) }
  }

  function cancelar() {
    if (modificado && !window.confirm('¿Descartar los cambios sin guardar?')) return
    volver()
  }

  const correoInvalido = correo.trim() !== '' && !CORREO_VALIDO.test(correo.trim())
  const formularioValido =
    nombre.trim() !== '' &&
    telefono.trim() !== '' &&
    CORREO_VALIDO.test(correo.trim()) &&
    participantes.every((p) => p.cedula.trim() && p.nombre.trim() && p.apellidos.trim() && p.talla_camisa && p.genero)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!formularioValido) return
    setError(null)
    setGuardando(true)

    const { error } = await supabase.rpc('editar_inscripcion', {
      p_id: id,
      p_datos: {
        responsable: {
          nombre_contacto: nombre.trim(),
          telefono_contacto: telefono.trim(),
          correo_contacto: correo.trim(),
        },
        participantes: participantes.map((p) => ({
          id: p.id,
          cedula: p.cedula.trim(),
          nombre: p.nombre.trim(),
          apellidos: p.apellidos.trim(),
          talla_camisa: p.talla_camisa,
          genero: p.genero,
        })),
      },
    })

    setGuardando(false)
    if (error) {
      setError(error.message || 'No se pudieron guardar los cambios.')
      return
    }
    volver()
  }

  if (cargando) {
    return <p className="p-6 text-sm text-[var(--color-muted-foreground)]">Cargando...</p>
  }

  if (errorCarga) {
    return (
      <div className="p-6">
        <button onClick={volver} className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] mb-4">
          <ArrowLeft size={15} /> Volver al detalle
        </button>
        <p className="text-sm text-[var(--color-destructive)]">{errorCarga}</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <button
          onClick={cancelar}
          className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] mb-3 hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={15} /> Volver al detalle
        </button>
        <h1 className="text-xl font-extrabold text-[var(--color-foreground)]">Editar inscripción</h1>
        <p className="text-sm font-semibold text-[var(--color-primary)] mt-0.5">{folio}</p>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
          Para reemplazar a una persona (cupo revendido) o corregir datos. El monto, el estado
          y la cantidad de personas no cambian.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Datos del responsable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-foreground)]">Nombre completo</label>
                <Input value={nombre} onChange={(e) => cambiar(setNombre)(e.target.value)} disabled={guardando} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--color-foreground)]">Teléfono</label>
                  <Input value={telefono} onChange={(e) => cambiar(setTelefono)(e.target.value)} disabled={guardando} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--color-foreground)]">Correo electrónico</label>
                  <Input
                    type="email"
                    value={correo}
                    onChange={(e) => cambiar(setCorreo)(e.target.value)}
                    disabled={guardando}
                  />
                  {correoInvalido && (
                    <p className="text-xs text-[var(--color-destructive)]">Correo inválido.</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participantes ({participantes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {participantes.map((p, i) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 pb-4 border-b border-[var(--color-border)] last:border-0 last:pb-0"
                >
                  <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide">
                    Participante {i + 1}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--color-foreground)]">Cédula</label>
                      <Input
                        value={p.cedula}
                        onChange={(e) => actualizarParticipante(i, 'cedula', e.target.value)}
                        disabled={guardando}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--color-foreground)]">Nombre</label>
                      <Input
                        value={p.nombre}
                        onChange={(e) => actualizarParticipante(i, 'nombre', e.target.value)}
                        disabled={guardando}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--color-foreground)]">Apellidos</label>
                      <Input
                        value={p.apellidos}
                        onChange={(e) => actualizarParticipante(i, 'apellidos', e.target.value)}
                        disabled={guardando}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--color-foreground)]">Talla de camisa</label>
                      <select
                        value={p.talla_camisa}
                        onChange={(e) => actualizarParticipante(i, 'talla_camisa', e.target.value)}
                        disabled={guardando}
                        className={claseSelect}
                      >
                        {!TALLAS.includes(p.talla_camisa) && <option value={p.talla_camisa}>{p.talla_camisa}</option>}
                        {TALLAS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--color-foreground)]">Género</label>
                      <select
                        value={p.genero}
                        onChange={(e) => actualizarParticipante(i, 'genero', e.target.value)}
                        disabled={guardando}
                        className={claseSelect}
                      >
                        {GENEROS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-[var(--color-destructive)] px-1">{error}</p>}

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={cancelar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!formularioValido || !modificado || guardando}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  )
}
