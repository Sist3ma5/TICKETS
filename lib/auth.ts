import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { accounts, sessions, users, verifications } from '@/lib/db/schema'
import { DEV_BYPASS_AUTH, MOCK_USER } from '@/lib/dev-mock'
import { PUBLIC_URL } from '@/lib/public-url'

import type { UserRole } from '@/lib/db/schema'

const ALLOWED_DOMAIN = '@bailmex.com.mx'

/**
 * Cuentas que entran con rol de IT desde la primera vez.
 *
 * Todo el mundo se da de alta como `user`, y el rol se cambia después desde
 * Administración. Pero eso solo funciona con gente que YA entró alguna vez:
 * hasta entonces no existe la fila que editar. Esta lista cubre ese hueco
 * para quien se incorpora al equipo de sistemas.
 *
 * Una vez que la persona entró, su rol se administra desde el panel como
 * el de cualquier otro; sacarla de aquí no le quita nada.
 */
const CORREOS_CON_ROL_IT = new Set(['linorangel@bailmex.com.mx'])

export const auth = betterAuth({
  baseURL: PUBLIC_URL,
  // Explícito: si algún día se agrega un dominio propio, se suma aquí y el
  // login sigue funcionando durante la transición.
  ...(PUBLIC_URL ? { trustedOrigins: [PUBLIC_URL] } : {}),
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: 'select_account',
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 días — sesión persistente ("recordar sesión")
    updateAge: 60 * 60 * 24, // refresca el expiry máximo 1 vez al día si hay actividad
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false, // el cliente no puede setear el rol al registrarse
      },
    },
  },
  advanced: {
    database: {
      // Generamos UUIDs en lugar de los IDs de texto default de Better Auth,
      // para que matcheen el tipo uuid de nuestras columnas y los FKs de dominio
      generateId: () => crypto.randomUUID(),
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email?.toLowerCase() ?? ''
          if (!email.endsWith(ALLOWED_DOMAIN)) {
            throw new APIError('FORBIDDEN', {
              message: `Solo cuentas ${ALLOWED_DOMAIN} pueden acceder.`,
            })
          }
          return { data: user }
        },
        after: async (user) => {
          const email = user.email?.toLowerCase() ?? ''
          if (!CORREOS_CON_ROL_IT.has(email)) return

          // Se hace aquí y no en `before` porque el campo `role` está
          // declarado con `input: false`: Better Auth lo ignora al crear,
          // justo para que nadie pueda mandarse un rol al registrarse. Se
          // corrige con un UPDATE en cuanto la fila existe.
          try {
            await db
              .update(users)
              .set({ role: 'it', updatedAt: new Date() })
              .where(eq(users.id, user.id))
          } catch (err) {
            console.error(
              `[auth] No se pudo asignar el rol de IT a ${email}:`,
              err,
            )
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
})

// ─── Helpers de sesión ───────────────────────────────────────────

export const getCurrentUser = cache(async () => {
  // ⚠️ Solo desarrollo/visual: finge un usuario logueado sin BD ni Google.
  if (DEV_BYPASS_AUTH) {
    return MOCK_USER
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user) {
    return null
  }
  return {
    ...session.user,
    role: (session.user.role ?? 'user') as UserRole,
    image: session.user.image ?? null,
  }
})

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

// El rol 'admin' es superconjunto de 'it': puede entrar a todo lo de IT.
export async function requireITUser() {
  const user = await requireUser()
  if (user.role !== 'it' && user.role !== 'admin') {
    redirect('/tickets')
  }
  return user
}

export async function requireAdminUser() {
  const user = await requireUser()
  if (user.role !== 'admin') {
    redirect('/tickets')
  }
  return user
}
