import 'server-only'
import { Resend } from 'resend'

import { PUBLIC_URL } from '@/lib/public-url'

// ── Gmail (Google Workspace) — camino principal ─────────────────────────
//
// GMAIL_USER es la cuenta que envía (por ejemplo sistemas@bailmex.com.mx) y
// GMAIL_APP_PASSWORD es una "contraseña de aplicación" de Google, NO la
// contraseña normal de la cuenta. Se genera en la configuración de seguridad
// de Google y requiere tener la verificación en dos pasos activada.

export const GMAIL_USER = process.env.GMAIL_USER?.trim()
// Google muestra la contraseña en bloques de cuatro separados por espacios;
// se quitan para que funcione igual si se pega tal cual.
export const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD?.replace(
  /\s/g,
  '',
)

// ── Resend — respaldo, si algún día se verifica el dominio ──────────────

const apiKey = process.env.RESEND_API_KEY
export const resend = apiKey ? new Resend(apiKey) : null

/**
 * Remitente. Si se está enviando por Gmail tiene que ser la misma cuenta
 * autenticada: Google rechaza mandar a nombre de otra dirección salvo que
 * esté dada de alta como alias.
 */
const fromEmail =
  GMAIL_USER ?? process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
export const EMAIL_FROM = `Bailmex IT Tickets <${fromEmail}>`

// Misma resolución que usa el login: si no, los enlaces de los correos
// saldrían apuntando a localhost cuando la variable se copia tal cual del
// archivo de desarrollo al servidor.
export const APP_URL = PUBLIC_URL ?? 'http://localhost:3000'
