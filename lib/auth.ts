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

/**
 * URL pública de la app. De aquí sale el redirect_uri que se le manda a Google
 * y la lista de orígenes de confianza.
 *
 * Si `BETTER_AUTH_URL` falta, Better Auth intenta deducir la URL a partir del
 * propio servidor y termina usando algo como `https://localhost:10000` (el
 * puerto interno del contenedor). Google rechaza eso con
 * `redirect_uri_mismatch` y el login queda muerto sin dar pistas.
 *
 * Por eso: se limpia la diagonal final (una sobrante produce `//api/auth/...`,
 * que para Google es otra URL distinta) y se cae a la variable que Render
 * publica sola con la URL real del servicio.
 */
const PUBLIC_URL =
  normalizeUrl(process.env.BETTER_AUTH_URL) ??
  normalizeUrl(process.env.RENDER_EXTERNAL_URL)

function normalizeUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/\/+$/, '')
  return trimmed ? trimmed : undefined
}

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
