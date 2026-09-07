// Edge Function: notificar-inscripcion
// ----------------------------------------------------------------------------
// Envía el correo al responsable del grupo cuando una inscripción cambia de
// estado (pendiente → aprobada | rechazada). Constitución, Principio VI.
//
// La invoca el PANEL ADMINISTRATIVO (spec 002) tras aprobar/rechazar, con:
//   POST { "inscripcion_id": "<uuid>", "nuevo_estado": "aprobada" | "rechazada" }
//
// Proveedor de correo: Brevo (https://www.brevo.com) — API transaccional.
// No requiere dominio propio: basta verificar UNA dirección remitente
// (un solo clic en el correo de confirmación de Brevo).
//
// Secretos (Dashboard → Project Settings → Edge Functions → Add new secret,
// o `supabase secrets set`):
//   BREVO_API_KEY     (obligatorio)  — clave "SMTP & API" de Brevo (empieza con "xkeysib-").
//                                      NUNCA en el código ni en el repo.
//   MAIL_FROM_EMAIL   (obligatorio)  — dirección remitente YA VERIFICADA en Brevo.
//                                      Ej: recreativabarrahonda@gmail.com
//   MAIL_FROM_NAME    (opcional)     — nombre visible del remitente.
//                                      Por defecto: "MTB El Valle del Nacaome".
//   SITE_URL          (opcional)     — URL pública del sitio, para el enlace "Consultar".
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

  const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
  const MAIL_FROM_EMAIL = Deno.env.get('MAIL_FROM_EMAIL')
  const MAIL_FROM_NAME = Deno.env.get('MAIL_FROM_NAME') ?? 'MTB El Valle del Nacaome'
  const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://mtbelvalle.example'
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!BREVO_API_KEY) return json({ error: 'Falta el secreto BREVO_API_KEY' }, 500)
  if (!MAIL_FROM_EMAIL) return json({ error: 'Falta el secreto MAIL_FROM_EMAIL' }, 500)

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

  // 2. Enviar el correo con Brevo (API transaccional).
  const { subject, html } = plantilla(ins, nuevo_estado, SITE_URL)
  const brevo = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: MAIL_FROM_NAME, email: MAIL_FROM_EMAIL },
      to: [{ email: ins.correo_contacto, name: ins.nombre_contacto }],
      subject,
      htmlContent: html,
    }),
  })

  const data = await brevo.json().catch(() => ({}))
  if (!brevo.ok) {
    // El fallo de correo NO revierte el cambio de estado (spec 002, HU4).
    return json({ ok: false, email_enviado: false, email_error: data, status: brevo.status }, 502)
  }

  return json({
    ok: true,
    email_enviado: true,
    id: (data as { messageId?: string }).messageId,
    folio: ins.folio,
  })
})
