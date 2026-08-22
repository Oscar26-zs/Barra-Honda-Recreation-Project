// Invocada cuando una inscripción cambia de estado (pendiente → aprobada/rechazada).
// Enviará correo al solicitante usando Resend. Implementación completa en fase siguiente.
// La clave RESEND_API_KEY debe existir SOLO como variable de entorno de esta función.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
  const { inscripcion_id, nuevo_estado } = await req.json()

  // TODO: implementar envío de correo con Resend
  console.log(`Notificación pendiente: inscripcion=${inscripcion_id} estado=${nuevo_estado}`)

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
