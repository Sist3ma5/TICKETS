import { z } from 'zod'

const envSchema = z.object({
  // Base de datos
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_UNPOOLED: z.string().min(1),

  // Better Auth
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().min(1).optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // Email — placeholder, no requerido aún
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Storage — diferido
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
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