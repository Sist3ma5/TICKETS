'use server'

import { requireAdminUser } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  categoriesMeta,
  categoryAssignments,
  tickets,
  users,
} from '@/lib/db/schema'
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

  // Crear una categoría exige un ALTER TYPE ADD VALUE sobre el enum
  // ticket_category, porque tickets.category depende de él. Es una operación
  // de esquema, irreversible (los enums no permiten quitar valores) y que no
  // conviene disparar desde un botón.
  //
  // Se devuelve un error honesto en vez de fingir éxito: antes esta función
  // respondía { ok: true } sin hacer nada, y la categoría "creada"
  // desaparecía al recargar.
  return {
    ok: false,
    message:
      'Crear categorías nuevas todavía no está disponible: requiere un cambio de esquema en la base.',
  }
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

  const prefix = input.prefix.trim().toUpperCase()
  if (!/^[A-Z]{2,4}$/.test(prefix)) {
    return { ok: false, message: 'El prefijo debe ser de 2 a 4 letras.' }
  }

  if (DEV_BYPASS_AUTH) {
    return { ok: true }
  }

  try {
    await db
      .update(categoriesMeta)
      .set({
        label: input.label.trim(),
        prefix,
        color: input.color,
      })
      .where(eq(categoriesMeta.key, input.key as TicketCategory))

    revalidatePath('/admin')
    revalidatePath('/tickets/all')
    return { ok: true }
  } catch (err) {
    console.error('Error al editar la categoría:', err)
    return { ok: false, message: 'No se pudo editar la categoría.' }
  }
}

/**
 * Retira una categoría del catálogo y manda sus tickets a "Otro".
 *
 * No se borra de verdad: `tickets.category` es un enum de Postgres, y los
 * enums no permiten quitar valores mientras una columna dependa de ellos.
 * Lo que se hace es marcarla inactiva —desaparece de los formularios y
 * filtros— y reasignar sus tickets, para que ninguno quede apuntando a una
 * categoría que ya no se puede elegir.
 *
 * El orden importa: primero se mueven los tickets y hasta el final se
 * desactiva. Si se hiciera al revés y algo fallara a medias, quedarían
 * tickets huérfanos en una categoría invisible.
 */
export async function deleteCategory(input: {
  key: string
}): Promise<Result & { moved?: number }> {
  await requireAdminUser()

  const key = input.key as TicketCategory

  // "Otro" es el destino de las demás: si se retira, no habría a dónde
  // mandar los tickets.
  if (key === 'other') {
    return {
      ok: false,
      message: 'La categoría "Otro" no se puede quitar: es el destino de las demás.',
    }
  }

  if (DEV_BYPASS_AUTH) {
    return { ok: true, moved: 0 }
  }

  try {
    // 1. Los tickets pasan a "Otro".
    const movidos = await db
      .update(tickets)
      .set({ category: 'other' })
      .where(eq(tickets.category, key))
      .returning({ id: tickets.id })

    // 2. Se suelta al técnico responsable: esa categoría ya no recibe nada.
    await db
      .delete(categoryAssignments)
      .where(eq(categoryAssignments.category, key))

    // 3. Se retira del catálogo.
    await db
      .update(categoriesMeta)
      .set({ active: false })
      .where(eq(categoriesMeta.key, key))

    revalidatePath('/admin')
    revalidatePath('/tickets')
    revalidatePath('/tickets/all')
    revalidatePath('/stats')

    return { ok: true, moved: movidos.length }
  } catch (err) {
    console.error('Error al quitar la categoría:', err)
    return { ok: false, message: 'No se pudo quitar la categoría.' }
  }
}

/** Vuelve a poner en el catálogo una categoría retirada. */
export async function restoreCategory(input: {
  key: string
}): Promise<Result> {
  await requireAdminUser()

  if (DEV_BYPASS_AUTH) return { ok: true }

  try {
    await db
      .update(categoriesMeta)
      .set({ active: true })
      .where(eq(categoriesMeta.key, input.key as TicketCategory))

    revalidatePath('/admin')
    return { ok: true }
  } catch (err) {
    console.error('Error al restaurar la categoría:', err)
    return { ok: false, message: 'No se pudo restaurar la categoría.' }
  }
}
