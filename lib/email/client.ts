import 'server-only'
import { Resend } from 'resend'

import { PUBLIC_URL } from '@/lib/public-url'

const apiKey = process.env.RESEND_API_KEY

export const resend = apiKey ? new Resend(apiKey) : null

const fromEmail = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
export const EMAIL_FROM = `Bailmex IT Tickets <${fromEmail}>`

// Misma resolución que usa el login: si no, los enlaces de los correos
// saldrían apuntando a localhost cuando la variable se copia tal cual del
// archivo de desarrollo al servidor.
export const APP_URL = PUBLIC_URL ?? 'http://localhost:3000'