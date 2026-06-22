import 'server-only'
import type { ReactElement } from 'react'

import { resend, EMAIL_FROM } from './client'

interface SendArgs {
  to: string | string[]
  subject: string
  react: ReactElement
}

export async function sendEmail({ to, subject, react }: SendArgs) {
  if (!resend) {
    return
  }

  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean)
  if (recipients.length === 0) {
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
      console.log('[email] Enviado OK, id:', data?.id)
    }
  } catch (err) {
    console.error('[email] Falló el envío:', err)
  }
}