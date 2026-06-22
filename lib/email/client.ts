import 'server-only'
import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY

export const resend = apiKey ? new Resend(apiKey) : null

const fromEmail = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
export const EMAIL_FROM = `Bailmex IT Tickets <${fromEmail}>`

export const APP_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'