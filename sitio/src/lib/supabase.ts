import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined

/**
 * `true` cuando ambas variables `PUBLIC_` están presentes y no son el placeholder.
 * Las islas consultan esta bandera para mostrar un aviso en vez de romper la página
 * cuando el sitio se sirve sin configurar (build de CI, primera clonada, etc.).
 * La clave `anon` es la ÚNICA credencial de Supabase permitida en el cliente
 * (constitution.md, Principio IV).
 */
export const supabaseConfigurado =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  !supabaseUrl.includes('TU-PROYECTO') &&
  supabaseAnonKey !== 'TU_CLAVE_ANON'

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
)
