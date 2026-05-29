import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url(),

  // Auth
  AUTH_SECRET: z.string().min(32),
  AUTH_GOOGLE_ID: z.string().min(0).optional(),
  AUTH_GOOGLE_SECRET: z.string().min(0).optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  GOOGLE_WORKSPACE_DOMAIN: z.string().min(1),

  // Roles
  IT_EMAILS: z.string().min(1),

  // Email
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().email(),

  // Storage
  BLOB_READ_WRITE_TOKEN: z.string().min(0).optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error(
    'Variables de entorno inválidas:',
    parsed.error.flatten().fieldErrors,
  )
  throw new Error('Variables de entorno inválidas. Revisa .env.local')
}

export const env = parsed.data

export const IT_EMAIL_SET = new Set(
  env.IT_EMAILS.split(',').map((e) => e.trim().toLowerCase()),
)

export const isOAuthConfigured = Boolean(
  env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET,
)
