import { db } from '@/lib/db'
import { users, type User } from '@/lib/db/schema'
import { isOAuthConfigured } from '@/lib/env'
import { eq } from 'drizzle-orm'

const DEV_USER_ID = '26580872-ec6e-40df-b819-65ba085d2966'

/**
 * Devuelve el usuario actualmente autenticado.
 * En desarrollo (sin OAuth), devuelve un usuario hardcodeado.
 * En producción (con OAuth), leerá la sesión real de Auth.js.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!isOAuthConfigured) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, DEV_USER_ID))
      .limit(1)

    return user ?? null
  }

  // TODO: leer sesión real de Auth.js cuando esté configurado
  throw new Error('Auth.js no implementado todavía')
}

/**
 * Garantiza que hay sesión. Lanza error si no.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Sesión no válida')
  }
  return user
}

/**
 * Garantiza que el usuario es IT. Lanza error si no.
 */
export async function requireITUser(): Promise<User> {
  const user = await requireUser()
  if (user.role !== 'it') {
    throw new Error('Acceso restringido a IT')
  }
  return user
}
