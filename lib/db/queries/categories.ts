import 'server-only'

import { db } from '@/lib/db'
import { categoriesMeta } from '@/lib/db/schema'
import type { TicketCategory } from '@/lib/db/schema'
import { DEV_BYPASS_AUTH } from '@/lib/dev-mock'
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_PREFIXES,
  TICKET_CATEGORIES,
} from '@/lib/constants'
import { asc, eq } from 'drizzle-orm'

export interface CategoriaMeta {
  key: TicketCategory
  label: string
  color: string
  prefix: string
  active: boolean
  sortOrder: number
}

/** Respaldo con la lista fija del código, para desarrollo sin BD. */
function desdeConstantes(): CategoriaMeta[] {
  return TICKET_CATEGORIES.map((key, i) => ({
    key,
    label: CATEGORY_LABELS[key],
    color: CATEGORY_COLORS[key],
    prefix: CATEGORY_PREFIXES[key],
    active: true,
    sortOrder: i,
  }))
}

/**
 * Todas las categorías, activas e inactivas. Es lo que ve el panel de
 * administración, que necesita poder reactivar una que se quitó.
 */
export async function getCategoriesMeta(): Promise<CategoriaMeta[]> {
  if (DEV_BYPASS_AUTH) return desdeConstantes()

  const filas = await db
    .select()
    .from(categoriesMeta)
    .orderBy(asc(categoriesMeta.sortOrder))

  // Si la tabla estuviera vacía (instalación nueva), se cae a las constantes
  // en vez de dejar la aplicación sin categorías.
  if (filas.length === 0) return desdeConstantes()

  return filas.map((f) => ({
    key: f.key,
    label: f.label,
    color: f.color,
    prefix: f.prefix,
    active: f.active,
    sortOrder: f.sortOrder,
  }))
}

/**
 * Solo las categorías que se pueden elegir hoy.
 *
 * Es la lista que alimenta el formulario de nuevo ticket, los filtros y el
 * selector de categoría del ticket. Una categoría retirada desaparece de
 * ahí, pero su valor sigue existiendo en el enum de Postgres: los enums no
 * permiten quitar valores, y la columna `tickets.category` depende de él.
 */
export async function getActiveCategories(): Promise<CategoriaMeta[]> {
  if (DEV_BYPASS_AUTH) return desdeConstantes()

  const filas = await db
    .select()
    .from(categoriesMeta)
    .where(eq(categoriesMeta.active, true))
    .orderBy(asc(categoriesMeta.sortOrder))

  if (filas.length === 0) return desdeConstantes()

  return filas.map((f) => ({
    key: f.key,
    label: f.label,
    color: f.color,
    prefix: f.prefix,
    active: f.active,
    sortOrder: f.sortOrder,
  }))
}
