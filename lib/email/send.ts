import 'server-only'
import type { ReactElement } from 'react'

import { render } from '@react-email/render'
import nodemailer from 'nodemailer'

import { resend, EMAIL_FROM, GMAIL_USER, GMAIL_APP_PASSWORD } from './client'

interface SendArgs {
  to: string | string[]
  subject: string
  react: ReactElement
}

/**
 * Envío de correo con dos caminos posibles.
 *
 * 1. Gmail (Google Workspace) — el que se usa hoy.
 * 2. Resend — queda listo por si algún día se verifica el dominio ahí.
 *
 * Por qué Gmail: Resend exige verificar el dominio publicando un registro
 * DKIM en el DNS de bailmex.com.mx, y no tenemos acceso a esa zona. Sin
 * verificar, Resend solo permite enviar al correo dueño de la cuenta, así
 * que los avisos nunca llegarían a los usuarios.
 *
 * Google, en cambio, YA está autorizado para este dominio: el MX apunta a
 * SMTP.GOOGLE.COM y existe google._domainkey con la llave DKIM. O sea que
 * los correos salen firmados y autenticados sin tocar el DNS.
 */

let transporte: nodemailer.Transporter | null = null

function obtenerTransporte() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null
  // Se crea una sola vez: nodemailer reutiliza la conexión al servidor.
  transporte ??= nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  })
  return transporte
}

export async function sendEmail({ to, subject, react }: SendArgs) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean)
  if (recipients.length === 0) return

  const gmail = obtenerTransporte()

  // ── Camino 1: Gmail ──────────────────────────────────────────────────
  if (gmail) {
    try {
      // Las plantillas son componentes de React Email; aquí se convierten a
      // HTML porque nodemailer manda texto, no JSX.
      const html = await render(react)
      const texto = await render(react, { plainText: true })

      const info = await gmail.sendMail({
        from: EMAIL_FROM,
        to: recipients,
        subject,
        html,
        text: texto,
      })
      console.log('[email] Enviado por Gmail, id:', info.messageId)
    } catch (err) {
      console.error('[email] Falló el envío por Gmail:', err)
    }
    return
  }

  // ── Camino 2: Resend ─────────────────────────────────────────────────
  if (!resend) {
    console.warn(
      '[email] Sin remitente configurado: falta GMAIL_APP_PASSWORD o RESEND_API_KEY.',
    )
    return
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: recipients,
      subject,
      react,
    })
    if (error) {
      console.error('[email] Resend devolvió error:', error)
    } else {
      console.log('[email] Enviado por Resend, id:', data?.id)
    }
  } catch (err) {
    console.error('[email] Falló el envío:', err)
  }
}
