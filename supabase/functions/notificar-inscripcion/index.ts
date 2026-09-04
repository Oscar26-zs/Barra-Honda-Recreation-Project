// Invocada cuando una inscripción cambia de estado (pendiente → aprobada/rechazada).
// Envía correo al responsable usando Resend. RESEND_API_KEY SOLO como variable de entorno
// de esta función (Principio IV). Si Resend falla, devuelve { email_enviado: false }
// sin revertir el cambio de estado (caso límite documentado en spec).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { inscripcion_id, nuevo_estado, motivo } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: ins, error: dbErr } = await supabase
    .from('inscripciones')
    .select('nombre_contacto, correo_contacto, folio')
    .eq('id', inscripcion_id)
    .single()

  if (dbErr || !ins) {
    console.error('notificar-inscripcion: inscripción no encontrada', dbErr)
    return new Response(JSON.stringify({ ok: false, email_enviado: false }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.error('notificar-inscripcion: RESEND_API_KEY no configurada')
    return new Response(JSON.stringify({ ok: true, email_enviado: false }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const esAprobada = nuevo_estado === 'aprobada'
  const asunto = esAprobada
    ? `Tu inscripción ${ins.folio} fue aprobada — Recreativa Barra Honda`
    : `Tu inscripción ${ins.folio} fue rechazada — Recreativa Barra Honda`

  const motivoHtml = motivo
    ? `<p style="margin:12px 0"><strong>Motivo:</strong> ${motivo}</p>`
    : ''

  const html = esAprobada
    ? `<p>Hola <strong>${ins.nombre_contacto}</strong>,</p>
       <p>Tu inscripción <strong>${ins.folio}</strong> ha sido <strong style="color:#1C7A34">aprobada</strong>.
       ¡Nos vemos en la Recreativa Barra Honda!</p>
       <p style="margin-top:24px;color:#6B7080;font-size:13px">Recreativa Barra Honda — MTB Valle del Nacaome</p>`
    : `<p>Hola <strong>${ins.nombre_contacto}</strong>,</p>
       <p>Lamentamos informarte que tu inscripción <strong>${ins.folio}</strong> ha sido
       <strong style="color:#B3261E">rechazada</strong>.</p>
       ${motivoHtml}
       <p>Si tienes alguna duda, contáctanos directamente.</p>
       <p style="margin-top:24px;color:#6B7080;font-size:13px">Recreativa Barra Honda — MTB Valle del Nacaome</p>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Recreativa Barra Honda <noreply@barrahonda.com>',
        to: [ins.correo_contacto],
        subject: asunto,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('notificar-inscripcion: Resend error', res.status, body)
      return new Response(JSON.stringify({ ok: true, email_enviado: false }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, email_enviado: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notificar-inscripcion: excepción al llamar Resend', err)
    return new Response(JSON.stringify({ ok: true, email_enviado: false }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
