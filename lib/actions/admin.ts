'use server'

import { requireAdminUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { categoryAssignments, users } from '@/lib/db/schema'
import type { TicketCategory, UserRole } from '@/lib/db/schema'
import { DEV_BYPASS_AUTH } from '@/lib/dev-mock'
import { and, eq, notInArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

/**
 * Acciones del panel de administración.
 *
 * Ya persistiendo en Neon:
 *   - updateUserRole        → UPDATE users SET role = ...  ✅
 * Aún requieren tablas nuevas (pendiente):
 *   - updateUserCategories / assignCategoryResponsible → tabla user_categories
 *   - create/update/delete Category → tabla categories
 */

type Result = { ok: true } | { ok: false; message: string }

export async function updateUserRole(input: {
  userId: string
  role: UserRole
}): Promise<Result> {
  await requireAdminUser()

  if (DEV_BYPASS_AUTH) {
    // Modo local sin BD: no persiste.
    return { ok: true }
  }

  try {
    await db
      .update(users)
      .set({ role: input.role, updatedAt: new Date() })
      .where(eq(users.id, input.userId))
    revalidatePath('/admin')
    return { ok: true }
  } catch (err) {
    console.error('Error al actualizar el rol:', err)
    return { ok: false, message: 'No se pudo actualizar el rol.' }
  }
}

export async function updateUserCategories(input: {
  userId: string
  categories: TicketCategory[]
}): Promise<Result> {
  await requireAdminUser()

  if (DEV_BYPASS_AUTH) {
    return { ok: true }
  }

  const { userId, categories } = input

  try {
    // Este técnico queda como responsable de cada categoría seleccionada
    // (una categoría → un responsable, así que sobrescribe si estaba en otro).
    for (const category of categories) {
      await db
        .insert(categoryAssignments)
        .values({ category, userId, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: categoryAssignments.category,
          set: { userId, updatedAt: new Date() },
        })
    }

    // Quitarle las categorías que ya no tenga seleccionadas.
    if (categories.length === 0) {
      await db
        .delete(categoryAssignments)
        .where(eq(categoryAssignments.userId, userId))
    } else {
      await db
        .delete(categoryAssignments)
        .where(
          and(
            eq(categoryAssignments.userId, userId),
            notInArray(categoryAssignments.category, categories),
          ),
        )
    }

    revalidatePath('/admin')
    return { ok: true }
  } catch (err) {
    console.error('Error al actualizar categorías del técnico:', err)
    return { ok: false, message: 'No se pudieron guardar las categorías.' }
  }
}

/**
 * Define quién es el técnico responsable de una categoría. Los tickets nuevos
 * de esa categoría se le asignan automáticamente y se le avisa por correo.
 */
export async function assignCategoryResponsible(input: {
  category: TicketCategory
  userId: string | null
}): Promise<Result> {
  await requireAdminUser()

  if (DEV_BYPASS_AUTH) {
    return { ok: true }
  }

  const { category, userId } = input

  try {
    if (userId === null) {
      await db
        .delete(categoryAssignments)
        .where(eq(categoryAssignments.category, category))
    } else {
      await db
        .insert(categoryAssignments)
        .values({ category, userId, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: categoryAssignments.category,
          set: { userId, updatedAt: new Date() },
        })
    }

    revalidatePath('/admin')
    return { ok: true }
  } catch (err) {
    console.error('Error al asignar responsable de categoría:', err)
    return { ok: false, message: 'No se pudo asignar el responsable.' }
  }
}

export async function createCategory(input: {
  label: string
  prefix: string
  color: string
}): Promise<Result> {
  await requireAdminUser()

  const label = input.label.trim()
  const prefix = input.prefix.trim().toUpperCase()
  if (label.length < 2) {
    return { ok: false, message: 'El nombre es muy corto.' }
  }
  if (!/^[A-Z]{2,4}$/.test(prefix)) {
    return { ok: false, message: 'El prefijo debe ser de 2 a 4 letras.' }
  }

  if (DEV_BYPASS_AUTH) {
    return { ok: true }
  }

  // TODO(BD): INSERT INTO categories (...)
  return { ok: true }
}

export async function updateCategory(input: {
  key: string
  label: string
  prefix: string
  color: string
}): Promise<Result> {
  await requireAdminUser()

  if (input.label.trim().length < 2) {
    return { ok: false, message: 'El nombre es muy corto.' }
  }

  if (DEV_BYPASS_AUTH) {
    return { ok: true }
  }

  // TODO(BD): UPDATE categories SET ... WHERE key = ...
  return { ok: true }
}

export async function deleteCategory(input: { key: string }): Promise<Result> {
  await requireAdminUser()

  if (DEV_BYPASS_AUTH) {
    return { ok: true }
  }

  // TODO(BD): borrar/inactivar la categoría (validando que no tenga tickets).
  return { ok: true }
}
