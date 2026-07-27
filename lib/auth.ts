import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'

import { db } from '@/lib/db'
import { accounts, sessions, users, verifications } from '@/lib/db/schema'
import { DEV_BYPASS_AUTH, MOCK_USER } from '@/lib/dev-mock'

import type { UserRole } from '@/lib/db/schema'

const ALLOWED_DOMAIN = '@bailmex.com.mx'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
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
