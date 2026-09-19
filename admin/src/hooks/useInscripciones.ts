import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Inscripcion, Participante } from '../types'

export type FiltroEstado = 'todas' | 'pendiente' | 'aprobada' | 'rechazada'

interface CrearInscripcionManualParams {
  nombre_contacto: string
  telefono_contacto: string
  correo_contacto: string
  cantidad_personas: number
  participantes: Omit<Participante, 'id' | 'inscripcion_id'>[]
  urlComprobante?: string | null
}

export const PAGINAS_DISPONIBLES = [10, 15, 20, 25] as const

export function useInscripciones() {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState<FiltroEstado>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState<number>(PAGINAS_DISPONIBLES[1])
  const [total, setTotal] = useState(0)

  const cargar = useCallback(async () => {
    setCargando(true)
    let query = supabase
      .from('inscripciones')
      .select('*', { count: 'exact' })
      .order('fecha_creacion', { ascending: false })

    if (filtro !== 'todas') {
      query = query.eq('estado', filtro)
    }

    if (busqueda.trim()) {
      const q = busqueda.trim()
      query = query.or(`folio.ilike.%${q}%,nombre_contacto.ilike.%${q}%`)
    }

    const desde = (pagina - 1) * porPagina
    const hasta = desde + porPagina - 1
    query = query.range(desde, hasta)

    const { data, count } = await query
    setInscripciones((data ?? []) as Inscripcion[])
    setTotal(count ?? 0)
    setCargando(false)
  }, [filtro, busqueda, pagina, porPagina])

  useEffect(() => { cargar() }, [cargar])

  // Volver a la primera página cuando cambian filtro, búsqueda o tamaño de página
  useEffect(() => { setPagina(1) }, [filtro, busqueda, porPagina])

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))

  async function cambiarEstado(
    id: string,
    nuevoEstado: 'aprobada' | 'rechazada',
    motivo?: string
  ): Promise<{ error: string | null; emailEnviado: boolean }> {
    const update: Record<string, unknown> = { estado: nuevoEstado }
    if (nuevoEstado === 'rechazada' && motivo) {
      update.motivo_rechazo = motivo
    }

    const { error } = await supabase
      .from('inscripciones')
      .update(update)
      .eq('id', id)
      .eq('estado', 'pendiente')

    if (error) return { error: 'Error al actualizar el estado.', emailEnviado: false }

    // Invocar Edge Function para notificar por correo
    let emailEnviado = false
    try {
      const { data: fnData } = await supabase.functions.invoke('notificar-inscripcion', {
        body: { inscripcion_id: id, nuevo_estado: nuevoEstado, motivo: motivo ?? null },
      })
      emailEnviado = fnData?.email_enviado !== false
    } catch {
      // Fallo de correo no revierte el cambio de estado (Caso Límite)
    }

    await cargar()
    return { error: null, emailEnviado }
  }

  async function crearInscripcionManual(
    params: CrearInscripcionManualParams
  ): Promise<{ error: string | null }> {
    // INSERT atómico: inscripción + participantes
    // El trigger calcular_inscripcion() asigna folio, modalidad_tarifa, monto_esperado
    const { data: inscData, error: inscError } = await supabase
      .from('inscripciones')
      .insert({
        nombre_contacto: params.nombre_contacto,
        telefono_contacto: params.telefono_contacto,
        correo_contacto: params.correo_contacto,
        cantidad_personas: params.cantidad_personas,
        url_comprobante: params.urlComprobante ?? null,
        estado: 'pendiente',
      })
      .select('id')
      .single()

    if (inscError) {
      // El trigger lanza excepción cuando no hay tarifa activa (FR-036)
      const msg = inscError.message?.includes('tarifa activa')
        ? 'No existe ninguna tarifa activa. No se puede registrar la inscripción.'
        : 'Error al crear la inscripción.'
      return { error: msg }
    }

    const { error: partError } = await supabase
      .from('participantes')
      .insert(
        params.participantes.map((p) => ({ ...p, inscripcion_id: inscData.id }))
      )

    if (partError) {
      // Compensar borrando la inscripción para no dejar fila parcial
      await supabase.from('inscripciones').delete().eq('id', inscData.id)
      return { error: 'Error al registrar los participantes.' }
    }

    await cargar()
    return { error: null }
  }

  return {
    inscripciones,
    cargando,
    filtro,
    setFiltro,
    busqueda,
    setBusqueda,
    pagina,
    setPagina,
    porPagina,
    setPorPagina,
    total,
    totalPaginas,
    cambiarEstado,
    crearInscripcionManual,
    recargar: cargar,
  }
}
