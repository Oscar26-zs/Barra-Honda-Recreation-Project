import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Descuento } from '../types'

interface CrearDescuentoParams {
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  porcentaje: number
}

interface EditarDescuentoParams extends CrearDescuentoParams {
  id: string
}

export function useDescuentos() {
  const [descuentos, setDescuentos] = useState<Descuento[]>([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    const { data } = await supabase
      .from('descuentos_estado')
      .select('*')
      .order('fecha_inicio', { ascending: true })
    setDescuentos((data ?? []) as Descuento[])
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function verificarSolapamiento(
    fechaInicio: string,
    fechaFin: string,
    excluirId?: string
  ): boolean {
    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    return descuentos.some((d) => {
      if (excluirId && d.id === excluirId) return false
      if (d.desactivado) return false
      if (d.estado_descuento === 'Vencido') return false
      const dInicio = new Date(d.fecha_inicio)
      const dFin = new Date(d.fecha_fin)
      return inicio <= dFin && fin >= dInicio
    })
  }

  async function crearDescuento(
    params: CrearDescuentoParams
  ): Promise<{ error: string | null }> {
    if (verificarSolapamiento(params.fecha_inicio, params.fecha_fin)) {
      return { error: 'Ya existe un descuento activo o programado en ese rango de fechas.' }
    }

    const { error } = await supabase.from('descuentos').insert({
      nombre: params.nombre,
      fecha_inicio: params.fecha_inicio,
      fecha_fin: params.fecha_fin,
      porcentaje: params.porcentaje,
      aplica_a: null,
      desactivado: false,
    })

    if (error) {
      const msg = error.message?.includes('solapamiento') || error.message?.includes('overlap')
        ? 'Ya existe un descuento activo o programado en ese rango de fechas.'
        : 'Error al crear el descuento.'
      return { error: msg }
    }

    await cargar()
    return { error: null }
  }

  async function editarDescuento(
    params: EditarDescuentoParams
  ): Promise<{ error: string | null }> {
    if (verificarSolapamiento(params.fecha_inicio, params.fecha_fin, params.id)) {
      return { error: 'Ya existe un descuento activo o programado en ese rango de fechas.' }
    }

    const { error } = await supabase
      .from('descuentos')
      .update({
        nombre: params.nombre,
        fecha_inicio: params.fecha_inicio,
        fecha_fin: params.fecha_fin,
        porcentaje: params.porcentaje,
      })
      .eq('id', params.id)

    if (error) {
      const msg = error.message?.includes('solapamiento') || error.message?.includes('overlap')
        ? 'Ya existe un descuento activo o programado en ese rango de fechas.'
        : 'Error al editar el descuento.'
      return { error: msg }
    }

    await cargar()
    return { error: null }
  }

  async function eliminarDescuento(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase.from('descuentos').delete().eq('id', id)
    if (error) return { error: 'Error al eliminar el descuento.' }
    await cargar()
    return { error: null }
  }

  async function desactivarDescuento(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('descuentos')
      .update({ desactivado: true })
      .eq('id', id)
    if (error) return { error: 'Error al desactivar el descuento.' }
    await cargar()
    return { error: null }
  }

  return {
    descuentos,
    cargando,
    recargar: cargar,
    crearDescuento,
    editarDescuento,
    eliminarDescuento,
    desactivarDescuento,
    verificarSolapamiento,
  }
}
