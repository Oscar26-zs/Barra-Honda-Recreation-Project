// Edge Function: notificar-inscripcion
// ----------------------------------------------------------------------------
// Envía el correo al responsable del grupo cuando una inscripción cambia de
// estado (pendiente → aprobada | rechazada). Constitución, Principio VI.
//
// La invoca el PANEL ADMINISTRATIVO (spec 002) tras aprobar/rechazar, con:
//   POST { "inscripcion_id": "<uuid>", "nuevo_estado": "aprobada" | "rechazada" }
//
// Secretos (Dashboard → Edge Functions → Manage secrets, o `supabase secrets set`):
//   RESEND_API_KEY   (obligatorio)  — clave de Resend. NUNCA en código ni en el repo.
//   MAIL_FROM        (opcional)     — remitente. Ej: "MTB El Valle <no-reply@tu-dominio.com>".
//                                     Debe ser un dominio verificado en Resend.
//                                     Por defecto usa el remitente de prueba de Resend
//                                     (onboarding@resend.dev), que SOLO entrega al correo
//                                     con el que se creó la cuenta de Resend.
//   SITE_URL         (opcional)     — URL pública del sitio, para el enlace "Consultar".
//
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.
// ----------------------------------------------------------------------------

interface Payload {
  inscripcion_id?: string
  nuevo_estado?: 'aprobada' | 'rechazada'
}

interface Inscripcion {
  folio: string
  estado: string
  nombre_contacto: string
  correo_contacto: string
  cantidad_personas: number
  monto_esperado: number
  modalidad_tarifa: string
  motivo_rechazo: string | null
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

const colones = (n: number) => `₡${Math.round(n).toLocaleString('es-CR')}`

function plantilla(ins: Inscripcion, estado: 'aprobada' | 'rechazada', siteUrl: string) {
  const consultar = `${siteUrl.replace(/\/$/, '')}/consultar`
  if (estado === 'aprobada') {
    return {
      subject: `Tu inscripción ${ins.folio} fue aprobada — MTB El Valle del Nacaome`,
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0a1022;line-height:1.6">
          <h2 style="color:#2575b2;margin:0 0 8px">¡Inscripción aprobada!</h2>
          <p>Hola ${ins.nombre_contacto},</p>
          <p>Tu inscripción para el <strong>MTB El Valle del Nacaome</strong> quedó
             <strong>aprobada</strong>.</p>
          <table style="border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:4px 12px 4px 0;color:#4d6478">Folio</td><td style="padding:4px 0"><strong>${ins.folio}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#4d6478">Modalidad</td><td style="padding:4px 0">${ins.modalidad_tarifa}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#4d6478">Personas</td><td style="padding:4px 0">${ins.cantidad_personas}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#4d6478">Monto</td><td style="padding:4px 0">${colones(ins.monto_esperado)}</td></tr>
          </table>
          <p>Nos vemos el <strong>domingo 6 de diciembre de 2026</strong>, 7:00 a.m., en el
             Gimnasio de la Escuela de Barra Honda.</p>
          <p style="color:#4d6478;font-size:14px">Podés consultar el estado cuando quieras en
             <a href="${consultar}" style="color:#2575b2">${consultar}</a> con tu folio y cédula.</p>
        </div>`,
    }
  }
  return {
    subject: `Tu inscripción ${ins.folio} no pudo ser aprobada — MTB El Valle del Nacaome`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0a1022;line-height:1.6">
        <h2 style="color:#b3261e;margin:0 0 8px">Inscripción rechazada</h2>
        <p>Hola ${ins.nombre_contacto},</p>
        <p>Tu inscripción <strong>${ins.folio}</strong> para el
           <strong>MTB El Valle del Nacaome</strong> no pudo ser aprobada.</p>
        ${
          ins.motivo_rechazo
            ? `<p style="background:#fdecec;border:1px solid #f3b4b4;padding:12px 16px;border-radius:4px">
                 <strong>Motivo:</strong> ${ins.motivo_rechazo}</p>`
            : ''
        }
        <p>Si creés que es un error o querés volver a intentarlo, escribinos por redes sociales
           como <strong>MTB El Valle del Nacaome</strong> (Facebook / Instagram).</p>
        <p style="color:#4d6478;font-size:14px">Podés consultar el estado en
           <a href="${consultar}" style="color:#2575b2">${consultar}</a>.</p>
      </div>`,
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const MAIL_FROM = Deno.env.get('MAIL_FROM') ?? 'MTB El Valle <onboarding@resend.dev>'
  const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://mtbelvalle.example'
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!RESEND_API_KEY) return json({ error: 'Falta el secreto RESEND_API_KEY' }, 500)

  let body: Payload
  try {
    body = await req.json()
  } catch {
    return json({ error: 'JSON inválido' }, 400)
  }

  const { inscripcion_id, nuevo_estado } = body
  if (!inscripcion_id || (nuevo_estado !== 'aprobada' && nuevo_estado !== 'rechazada')) {
    return json({ error: 'inscripcion_id y nuevo_estado (aprobada|rechazada) son obligatorios' }, 400)
  }

  // 1. Traer la inscripción con la service_role key (solo servidor).
  const cols =
    'folio,estado,nombre_contacto,correo_contacto,cantidad_personas,monto_esperado,modalidad_tarifa,motivo_rechazo'
  const resSel = await fetch(
    `${SUPABASE_URL}/rest/v1/inscripciones?id=eq.${inscripcion_id}&select=${cols}`,
    { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
  )
  if (!resSel.ok) return json({ error: 'No se pudo leer la inscripción' }, 502)
  const filas = (await resSel.json()) as Inscripcion[]
  const ins = filas[0]
  if (!ins) return json({ error: 'Inscripción no encontrada' }, 404)

  // 2. Enviar el correo con Resend.
  const { subject, html } = plantilla(ins, nuevo_estado, SITE_URL)
  const resend = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: [ins.correo_contacto],
      subject,
      html,
    }),
  })

  const data = await resend.json().catch(() => ({}))
  if (!resend.ok) {
    // El fallo de correo NO revierte el cambio de estado (spec 002, HU4).
    return json({ ok: false, email_error: data, status: resend.status }, 502)
  }

  return json({ ok: true, id: (data as { id?: string }).id, folio: ins.folio })
})
