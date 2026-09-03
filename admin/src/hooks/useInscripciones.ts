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

export function useInscripciones() {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState<FiltroEstado>('todas')
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    let query = supabase
      .from('inscripciones')
      .select('*')
      .order('fecha_creacion', { ascending: false })

    if (filtro !== 'todas') {
      query = query.eq('estado', filtro)
    }

    const { data } = await query
    const lista = (data ?? []) as Inscripcion[]

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      setInscripciones(lista.filter(
        (i) =>
          i.folio?.toLowerCase().includes(q) ||
          i.nombre_contacto?.toLowerCase().includes(q)
      ))
    } else {
      setInscripciones(lista)
    }
    setCargando(false)
  }, [filtro, busqueda])

  useEffect(() => { cargar() }, [cargar])

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

  // Búsqueda client-side por folio/cédula/nombre sobre los datos ya cargados
  const inscripcionesFiltradas = busqueda.trim()
    ? inscripciones.filter((i) => {
        const q = busqueda.toLowerCase()
        return (
          i.folio?.toLowerCase().includes(q) ||
          i.nombre_contacto?.toLowerCase().includes(q)
        )
      })
    : inscripciones

  return {
    inscripciones: inscripcionesFiltradas,
    cargando,
    filtro,
    setFiltro,
    busqueda,
    setBusqueda,
    cambiarEstado,
    crearInscripcionManual,
    recargar: cargar,
  }
}
