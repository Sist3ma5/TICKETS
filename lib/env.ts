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
})

type Env = z.infer<typeof envSchema>

let cached: Env | null = null

/**
 * Valida las variables la PRIMERA VEZ que alguien lee una, no al importar
 * el módulo.
 *
 * Antes la validación corría al importarse. Como `lib/db` importa este
 * archivo y las rutas de la API importan `lib/db`, `next build` tronaba al
 * recoger los datos de la ruta con "Failed to collect page data for
 * /api/auth/[...all]" — un mensaje que no dice qué variable falta y manda a
 * buscar el problema al lugar equivocado.
 *
 * Difiriéndola, el build pasa y el error sale hasta que de verdad se ocupa
 * una variable, ya diciendo cuál falta.
 */
function load(): Env {
  if (cached) return cached

  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const faltantes = Object.keys(parsed.error.flatten().fieldErrors)
    throw new Error(
      `Faltan o son inválidas estas variables de entorno: ${faltantes.join(', ')}. ` +
        'En local van en .env.local; en Render, en la pestaña Environment del servicio.',
    )
  }

  cached = parsed.data
  return cached
}

export const env = new Proxy({} as Env, {
  get(_target, prop, receiver) {
    return Reflect.get(load(), prop, receiver)
  },
}) as Env
