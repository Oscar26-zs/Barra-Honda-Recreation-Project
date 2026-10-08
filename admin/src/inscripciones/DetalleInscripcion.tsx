import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, ZoomIn } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabase'
import type { Participante, Inscripcion } from '../types/index'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import {
  LABEL_ESTADO_PAGO,
  LABEL_TIPO_PAGO,
  colones,
  montoPagado,
  montoReserva,
  saldoPendiente,
} from '../lib/pago'

type ModalEstado =
  | 'none'
  | 'aprobar'
  | 'rechazar'
  | 'confirmar_saldo'
  | 'rechazar_saldo'
  | 'registrar_saldo'

const LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
}

const claseTextarea =
  'w-full min-h-[100px] rounded-xl border border-[var(--color-input)] px-3 py-2.5 text-sm resize-none bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]'

async function urlFirmada(ruta: string | null): Promise<string | null> {
  if (!ruta) return null
  const { data } = await supabase.storage.from('comprobantes').createSignedUrl(ruta, 3600)
  return data?.signedUrl ?? null
}

async function notificar(inscripcionId: string, evento: 'aprobada' | 'rechazada' | 'pago_completo', motivo?: string) {
  try {
    const { data } = await supabase.functions.invoke('notificar-inscripcion', {
      body: { inscripcion_id: inscripcionId, nuevo_estado: evento, motivo: motivo ?? null },
    })
    return data?.email_enviado !== false
  } catch {
    // Fallo de correo no revierte el cambio (Caso Límite de 002 / 003)
    return false
  }
}

export default function DetalleInscripcion() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [inscripcion, setInscripcion] = useState<Inscripcion | null>(null)
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null)
  const [comprobanteSaldoUrl, setComprobanteSaldoUrl] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [modal, setModal] = useState<ModalEstado>('none')
  const [motivo, setMotivo] = useState('')
  const [archivoSaldo, setArchivoSaldo] = useState<File | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

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

    const ins = data as Inscripcion
    setInscripcion(ins)

    const { data: parts } = await supabase
      .from('participantes')
      .select('*')
      .eq('inscripcion_id', id)
    setParticipantes((parts ?? []) as Participante[])

    setComprobanteUrl(await urlFirmada(ins.url_comprobante))
    setComprobanteSaldoUrl(await urlFirmada(ins.url_comprobante_saldo))

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

    const emailEnviado = await notificar(inscripcion.id, nuevoEstado, motivo.trim() || undefined)

    setModal('none')
    setMotivo('')
    setProcesando(false)

    if (!emailEnviado) {
      setAviso('Estado actualizado. El correo de notificación no pudo enviarse.')
      await cargar()
    } else {
      navigate('/inscripciones')
    }
  }

  // Acciones sobre el saldo de una reserva aprobada (spec 003, FR-053/FR-054).
  // UPDATE directo con guardas sobre estado_pago, mismo patrón que confirmarCambio.
  async function accionSaldo(accion: 'confirmar_saldo' | 'rechazar_saldo' | 'registrar_saldo') {
    if (!inscripcion) return
    setProcesando(true)
    setAviso(null)

    let update: Record<string, unknown>
    let estadoPrevio: 'saldo_pendiente' | 'saldo_en_revision'

    if (accion === 'rechazar_saldo') {
      update = { estado_pago: 'saldo_pendiente', motivo_rechazo_saldo: motivo.trim(), url_comprobante_saldo: null }
      estadoPrevio = 'saldo_en_revision'
    } else {
      update = { estado_pago: 'completo', fecha_pago_saldo: new Date().toISOString(), motivo_rechazo_saldo: null }
      estadoPrevio = accion === 'confirmar_saldo' ? 'saldo_en_revision' : 'saldo_pendiente'

      if (accion === 'registrar_saldo' && archivoSaldo) {
        try {
          const comprimido = await imageCompression(archivoSaldo, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          })
          const nombreArchivo = `comprobante-saldo-admin-${Date.now()}.${comprimido.name.split('.').pop()}`
          const { error: upErr } = await supabase.storage.from('comprobantes').upload(nombreArchivo, comprimido)
          if (upErr) throw upErr
          update.url_comprobante_saldo = nombreArchivo
        } catch {
          setAviso('No se pudo subir el comprobante del saldo. Intenta de nuevo o regístralo sin comprobante.')
          setProcesando(false)
          return
        }
      }
    }

    const { data, error } = await supabase
      .from('inscripciones')
      .update(update)
      .eq('id', inscripcion.id)
      .eq('estado', 'aprobada')
      .eq('estado_pago', estadoPrevio)
      .select('id')

    if (error || !data?.length) {
      setAviso('No se pudo actualizar el pago. Recarga la página: es posible que ya haya cambiado.')
      setProcesando(false)
      return
    }

    if (accion !== 'rechazar_saldo') {
      const emailEnviado = await notificar(inscripcion.id, 'pago_completo')
      setAviso(emailEnviado
        ? 'Pago completo registrado. Se envió el correo al responsable.'
        : 'Pago completo registrado. El correo de notificación no pudo enviarse.')
    } else {
      setAviso('Comprobante del saldo rechazado. El responsable verá el motivo al consultar su inscripción.')
    }

    setModal('none')
    setMotivo('')
    setArchivoSaldo(null)
    setProcesando(false)
    await cargar()
  }

  function cerrarModal() {
    if (procesando) return
    setModal('none')
    setMotivo('')
    setArchivoSaldo(null)
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
  const esReserva = inscripcion.tipo_pago === 'reserva'
  const saldo = saldoPendiente(inscripcion)
  const saldoReserva = inscripcion.monto_esperado - montoReserva(inscripcion.monto_esperado)

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
          {inscripcion.estado_pago !== 'completo' && (
            <Badge variant={inscripcion.estado_pago}>{LABEL_ESTADO_PAGO[inscripcion.estado_pago]}</Badge>
          )}
          {inscripcion.estado !== 'rechazada' && (
            <Button
              variant="secondary"
              size="sm"
              className="ml-auto"
              onClick={() => navigate(`/inscripciones/${inscripcion.id}/editar`)}
            >
              <Pencil size={14} />
              Editar
            </Button>
          )}
        </div>
        <p className="text-sm font-semibold text-[var(--color-primary)] mt-0.5">{inscripcion.folio}</p>
        {inscripcion.fecha_edicion && (
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            Editada el {new Date(inscripcion.fecha_edicion).toLocaleString('es-CR')}
          </p>
        )}
      </div>

      {aviso && (
        <div className="mb-4 p-3 rounded-xl bg-[var(--color-status-pending-bg)] text-[var(--color-status-pending-text)] text-sm">
          {aviso}
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
                ['Monto esperado', colones(inscripcion.monto_esperado)],
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

        {/* Pago (spec 003, FR-048) */}
        <Card>
          <CardHeader>
            <CardTitle>Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
              {[
                ['Tipo', LABEL_TIPO_PAGO[inscripcion.tipo_pago]],
                ['Total', colones(inscripcion.monto_esperado)],
                ['Pagado', colones(montoPagado(inscripcion))],
                ['Saldo', colones(saldo)],
              ].map(([label, val]) => (
                <div key={label}>
                  <dt className="text-[var(--color-muted-foreground)] text-xs font-semibold uppercase tracking-wide mb-0.5">
                    {label}
                  </dt>
                  <dd className="text-[var(--color-foreground)]">{val}</dd>
                </div>
              ))}
            </dl>

            {esReserva && inscripcion.fecha_pago_saldo && (
              <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
                Saldo pagado el {new Date(inscripcion.fecha_pago_saldo).toLocaleString('es-CR')}
              </p>
            )}

            {inscripcion.motivo_rechazo_saldo && inscripcion.estado_pago === 'saldo_pendiente' && (
              <div className="mt-4 p-3 rounded-xl bg-[var(--color-status-rejected-bg)]">
                <p className="text-xs font-semibold text-[var(--color-status-rejected-text)] mb-1 uppercase tracking-wide">
                  Último comprobante del saldo rechazado
                </p>
                <p className="text-sm text-[var(--color-foreground)]">{inscripcion.motivo_rechazo_saldo}</p>
              </div>
            )}

            {esReserva && inscripcion.estado === 'pendiente' && (
              <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
                Reserva del 50 %: al aprobarla, el responsable recibe un correo con el saldo pendiente.
              </p>
            )}

            {inscripcion.estado === 'aprobada' && inscripcion.estado_pago === 'saldo_en_revision' && (
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={() => setModal('confirmar_saldo')}>Confirmar saldo</Button>
                <Button variant="outline" onClick={() => setModal('rechazar_saldo')}>
                  Rechazar comprobante del saldo
                </Button>
              </div>
            )}

            {inscripcion.estado === 'aprobada' && inscripcion.estado_pago === 'saldo_pendiente' && (
              <div className="mt-4">
                <Button variant="secondary" onClick={() => setModal('registrar_saldo')}>
                  Registrar pago del saldo
                </Button>
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

        {/* Comprobantes */}
        <Card>
          <CardHeader>
            <CardTitle>{esReserva ? 'Comprobante de la reserva (50 %)' : 'Comprobante de pago'}</CardTitle>
          </CardHeader>
          <CardContent>
            <VistaComprobante url={comprobanteUrl} ruta={inscripcion.url_comprobante} />
          </CardContent>
        </Card>

        {esReserva && (inscripcion.url_comprobante_saldo || inscripcion.estado_pago !== 'saldo_pendiente') && (
          <Card>
            <CardHeader>
              <CardTitle>Comprobante del saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <VistaComprobante url={comprobanteSaldoUrl} ruta={inscripcion.url_comprobante_saldo} />
            </CardContent>
          </Card>
        )}

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
            {esReserva && (
              <> Es una <strong>reserva del 50 %</strong>: el correo indicará un saldo pendiente
              de <strong>{colones(saldoReserva)}</strong>.</>
            )}
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
              className={claseTextarea}
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

      {/* Modal: Confirmar saldo */}
      <Dialog open={modal === 'confirmar_saldo'} onOpenChange={(v) => !v && cerrarModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pago del saldo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            ¿Confirmas que recibiste el saldo de <strong>{colones(saldo)}</strong> para{' '}
            <strong>{inscripcion.folio}</strong>? La inscripción quedará con pago completo y se
            enviará el correo de confirmación.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={cerrarModal} disabled={procesando}>
              Cancelar
            </Button>
            <Button onClick={() => accionSaldo('confirmar_saldo')} disabled={procesando}>
              {procesando ? 'Procesando...' : 'Sí, confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Rechazar comprobante del saldo (motivo obligatorio) */}
      <Dialog open={modal === 'rechazar_saldo'} onOpenChange={(v) => !v && cerrarModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar comprobante del saldo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              La inscripción sigue aprobada y vuelve a <strong>saldo pendiente</strong>. El
              responsable verá este motivo al consultar y podrá subir otro comprobante.
            </p>
            <textarea
              className={claseTextarea}
              placeholder="Motivo (obligatorio)..."
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
              onClick={() => accionSaldo('rechazar_saldo')}
              disabled={procesando || !motivo.trim()}
            >
              {procesando ? 'Procesando...' : 'Rechazar comprobante'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Registrar saldo directamente (comprobante opcional) */}
      <Dialog open={modal === 'registrar_saldo'} onOpenChange={(v) => !v && cerrarModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago del saldo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Registra el saldo de <strong>{colones(saldo)}</strong> recibido por fuera del sistema
              (WhatsApp, en persona…). La inscripción quedará con pago completo y se enviará el
              correo de confirmación.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--color-foreground)]">
                Comprobante <span className="font-normal text-[var(--color-muted-foreground)]">(opcional)</span>
              </label>
              <input
                type="file"
                accept="image/*"
                disabled={procesando}
                onChange={(e) => setArchivoSaldo(e.target.files?.[0] ?? null)}
                className="text-sm text-[var(--color-foreground)] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[var(--color-secondary)] file:text-[var(--color-primary)] hover:file:opacity-80"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrarModal} disabled={procesando}>
              Cancelar
            </Button>
            <Button onClick={() => accionSaldo('registrar_saldo')} disabled={procesando}>
              {procesando ? 'Procesando...' : 'Registrar pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function VistaComprobante({ url, ruta }: { url: string | null; ruta: string | null }) {
  if (!url) {
    return <p className="text-sm text-[var(--color-muted-foreground)]">No hay comprobante adjunto.</p>
  }
  const esPdf = ruta?.toLowerCase().endsWith('.pdf')
  return (
    <div className="flex flex-col gap-2">
      {!esPdf && (
        <img
          src={url}
          alt="Comprobante de pago"
          className="max-w-full max-h-72 object-contain rounded-xl border border-[var(--color-border)]"
        />
      )}
      <div>
        <Button variant="secondary" size="sm" onClick={() => window.open(url, '_blank')}>
          <ZoomIn size={14} />
          {esPdf ? 'Abrir PDF' : 'Ampliar'}
        </Button>
      </div>
    </div>
  )
}
