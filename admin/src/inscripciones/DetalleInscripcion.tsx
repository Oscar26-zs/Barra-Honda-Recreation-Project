import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ZoomIn } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Participante, Inscripcion } from '../types/index'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'

type ModalEstado = 'none' | 'aprobar' | 'rechazar'

const LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
}

export default function DetalleInscripcion() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [inscripcion, setInscripcion] = useState<Inscripcion | null>(null)
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [modal, setModal] = useState<ModalEstado>('none')
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [avisoEmail, setAvisoEmail] = useState<string | null>(null)

  useEffect(() => { cargar() }, [id])

  async function cargar() {
    setCargando(true)
    const { data, error } = await supabase
      .from('inscripciones')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      setErrorCarga('Inscripción no encontrada.')
      setCargando(false)
      return
    }

    setInscripcion(data as Inscripcion)

    const { data: parts } = await supabase
      .from('participantes')
      .select('*')
      .eq('inscripcion_id', id)
    setParticipantes((parts ?? []) as Participante[])

    if (data.url_comprobante) {
      const { data: signed } = await supabase.storage
        .from('comprobantes')
        .createSignedUrl(data.url_comprobante as string, 3600)
      if (signed) setComprobanteUrl(signed.signedUrl)
    }

    setCargando(false)
  }

  async function confirmarCambio(nuevoEstado: 'aprobada' | 'rechazada') {
    if (!inscripcion) return
    setProcesando(true)

    const update: Record<string, unknown> = { estado: nuevoEstado }
    if (nuevoEstado === 'rechazada' && motivo.trim()) {
      update.motivo_rechazo = motivo.trim()
    }

    const { error } = await supabase
      .from('inscripciones')
      .update(update)
      .eq('id', inscripcion.id)
      .eq('estado', 'pendiente')

    if (error) {
      setProcesando(false)
      return
    }

    let emailEnviado = false
    try {
      const { data: fnData } = await supabase.functions.invoke('notificar-inscripcion', {
        body: { inscripcion_id: inscripcion.id, nuevo_estado: nuevoEstado, motivo: motivo.trim() || null },
      })
      emailEnviado = fnData?.email_enviado !== false
    } catch { /* fallo de correo no revierte el cambio */ }

    setModal('none')
    setMotivo('')
    setProcesando(false)

    if (!emailEnviado) {
      setAvisoEmail('Estado actualizado. El correo de notificación no pudo enviarse.')
      await cargar()
    } else {
      navigate('/inscripciones')
    }
  }

  function cerrarModal() {
    if (procesando) return
    setModal('none')
    setMotivo('')
  }

  if (cargando) {
    return <p className="p-6 text-sm text-[var(--color-muted-foreground)]">Cargando...</p>
  }

  if (!inscripcion) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/inscripciones')}
          className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] mb-4"
        >
          <ArrowLeft size={15} /> Volver al listado
        </button>
        <p className="text-sm text-[var(--color-destructive)]">{errorCarga}</p>
      </div>
    )
  }

  const esPendiente = inscripcion.estado === 'pendiente'

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Encabezado */}
      <div className="mb-5">
        <button
          onClick={() => navigate('/inscripciones')}
          className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] mb-3 hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={15} /> Volver al listado
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-extrabold text-[var(--color-foreground)]">
            Detalle de inscripción
          </h1>
          <Badge variant={inscripcion.estado}>{LABELS[inscripcion.estado]}</Badge>
        </div>
        <p className="text-sm font-semibold text-[var(--color-primary)] mt-0.5">{inscripcion.folio}</p>
      </div>

      {avisoEmail && (
        <div className="mb-4 p-3 rounded-xl bg-[var(--color-status-pending-bg)] text-[var(--color-status-pending-text)] text-sm">
          {avisoEmail}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Datos del responsable */}
        <Card>
          <CardHeader>
            <CardTitle>Datos del responsable</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['Nombre', inscripcion.nombre_contacto],
                ['Teléfono', inscripcion.telefono_contacto],
                ['Correo', inscripcion.correo_contacto],
                ['Modalidad', inscripcion.modalidad_tarifa],
                ['Personas', String(inscripcion.cantidad_personas)],
                ['Monto esperado', `₡${inscripcion.monto_esperado?.toLocaleString('es-CR')}`],
                ['Fecha de registro', new Date(inscripcion.fecha_creacion).toLocaleString('es-CR')],
              ].map(([label, val]) => (
                <div key={label}>
                  <dt className="text-[var(--color-muted-foreground)] text-xs font-semibold uppercase tracking-wide mb-0.5">
                    {label}
                  </dt>
                  <dd className="text-[var(--color-foreground)]">{val}</dd>
                </div>
              ))}
            </dl>

            {inscripcion.motivo_rechazo && (
              <div className="mt-4 p-3 rounded-xl bg-[var(--color-status-rejected-bg)]">
                <p className="text-xs font-semibold text-[var(--color-status-rejected-text)] mb-1 uppercase tracking-wide">
                  Motivo de rechazo
                </p>
                <p className="text-sm text-[var(--color-foreground)]">{inscripcion.motivo_rechazo}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participantes */}
        <Card>
          <CardHeader>
            <CardTitle>Participantes ({participantes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {participantes.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">Sin participantes registrados.</p>
            ) : (
              <div className="flex flex-col">
                {participantes.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-0.5 py-3 border-b border-[var(--color-border)] last:border-0"
                  >
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">
                      {i + 1}. {p.nombre} {p.apellidos}
                    </p>
                    <div className="flex gap-4 text-xs text-[var(--color-muted-foreground)]">
                      <span>Cédula: {p.cedula}</span>
                      <span>Talla: {p.talla_camisa}</span>
                      {p.genero && <span>Género: {p.genero}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comprobante */}
        <Card>
          <CardHeader>
            <CardTitle>Comprobante de pago</CardTitle>
          </CardHeader>
          <CardContent>
            {comprobanteUrl ? (
              <div className="flex flex-col gap-2">
                <img
                  src={comprobanteUrl}
                  alt="Comprobante de pago"
                  className="max-w-full max-h-72 object-contain rounded-xl border border-[var(--color-border)]"
                />
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(comprobanteUrl, '_blank')}
                  >
                    <ZoomIn size={14} />
                    Ampliar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">No hay comprobante adjunto.</p>
            )}
          </CardContent>
        </Card>

        {/* Acciones */}
        {esPendiente ? (
          <div className="flex gap-3">
            <Button onClick={() => setModal('aprobar')}>Aprobar</Button>
            <Button variant="outline" onClick={() => setModal('rechazar')}>Rechazar</Button>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Esta inscripción ya fue procesada. El estado no puede modificarse.
          </p>
        )}
      </div>

      {/* Modal: Confirmar aprobación */}
      <Dialog open={modal === 'aprobar'} onOpenChange={(v) => !v && cerrarModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar aprobación</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            ¿Deseas aprobar la inscripción <strong>{inscripcion.folio}</strong>?
            Esta acción no puede revertirse y se enviará notificación por correo.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={cerrarModal} disabled={procesando}>
              Cancelar
            </Button>
            <Button onClick={() => confirmarCambio('aprobada')} disabled={procesando}>
              {procesando ? 'Procesando...' : 'Sí, aprobar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar rechazo (motivo obligatorio) */}
      <Dialog open={modal === 'rechazar'} onOpenChange={(v) => !v && cerrarModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar rechazo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Indica el motivo del rechazo para <strong>{inscripcion.folio}</strong>.
              Se incluirá en el correo al solicitante.
            </p>
            <textarea
              className="w-full min-h-[100px] rounded-xl border border-[var(--color-input)] px-3 py-2.5 text-sm resize-none bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              placeholder="Motivo del rechazo (obligatorio)..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrarModal} disabled={procesando}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmarCambio('rechazada')}
              disabled={procesando || !motivo.trim()}
            >
              {procesando ? 'Procesando...' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
