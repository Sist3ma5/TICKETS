import { db } from '@/lib/db'
import {
  categoryAssignments,
  ticketAssignmentHistory,
  ticketAttachments,
  ticketComments,
  tickets,
  ticketStatusHistory,
  users,
  type Ticket,
  type TicketAssignmentHistory as TicketAssignmentHistoryRow,
  type TicketCategory,
  type TicketComment as TicketCommentRow,
  type TicketPriority,
  type TicketStatus,
  type TicketStatusHistory as TicketStatusHistoryRow,
  type User,
} from '@/lib/db/schema'
import { emptyCategoryCounts } from '@/lib/constants'
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  max,
  sql,
  type SQL,
} from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import {
  DEV_BYPASS_AUTH,
  getMockAdminUsers,
  getMockCategoryCounts,
  getMockITUsers,
  getMockNextTicketNumber,
  getMockStatusCounts,
  getMockTicketById,
  getMockTickets,
  type AdminUser,
} from '@/lib/dev-mock'
import 'server-only'

export interface TicketFilters {
  status?: TicketStatus
  q?: string
  priority?: TicketPriority
  category?: TicketCategory
  sort?: 'asc' | 'desc'
  assignedToId?: string
  createdById?: string
  /**
   * Mes de creación en formato 'YYYY-MM'.
   *
   * Se compara con to_char sobre created_at, el mismo criterio con el que
   * getTicketMonths agrupa. Es deliberado: con rangos de Date el driver
   * convierte a la zona del servidor y el corte de medianoche se desplaza,
   * así que los totales del selector no cuadrarían con los de la vista.
   */
  month?: string
}

function buildBaseConditions(
  filters: Omit<TicketFilters, 'status' | 'sort'>,
): SQL[] {
  const conditions: SQL[] = []
  if (filters.q) {
    conditions.push(ilike(tickets.title, `%${filters.q}%`))
  }
  if (filters.priority) {
    conditions.push(eq(tickets.priority, filters.priority))
  }
  if (filters.category) {
    conditions.push(eq(tickets.category, filters.category))
  }
  if (filters.assignedToId) {
    conditions.push(eq(tickets.assignedToId, filters.assignedToId))
  }
  if (filters.createdById) {
    conditions.push(eq(tickets.createdById, filters.createdById))
  }
  if (filters.month) {
    conditions.push(
      sql`to_char(${tickets.createdAt}, 'YYYY-MM') = ${filters.month}`,
    )
  }
  return conditions
}

export async function getTickets(filters: TicketFilters) {
  // ⚠️ Solo desarrollo/visual: datos de ejemplo sin BD.
  if (DEV_BYPASS_AUTH) return getMockTickets(filters)

  const conditions = buildBaseConditions(filters)
  if (filters.status) {
    conditions.push(eq(tickets.status, filters.status))
  }

  return db.query.tickets.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    with: {
      createdBy: true,
      assignedTo: true,
    },
    orderBy:
      filters.sort === 'asc'
        ? [asc(tickets.createdAt)]
        : [desc(tickets.createdAt)],
  })
}

export async function getStatusCounts(
  filters: Omit<TicketFilters, 'status' | 'sort'>,
) {
  // ⚠️ Solo desarrollo/visual: conteos de ejemplo sin BD.
  if (DEV_BYPASS_AUTH) return getMockStatusCounts(filters)

  const conditions = buildBaseConditions(filters)

  const result = await db
    .select({
      status: tickets.status,
      count: count(),
    })
    .from(tickets)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(tickets.status)

  const counts: Record<TicketStatus | 'all', number> = {
    all: 0,
    open: 0,
    in_progress: 0,
    waiting_user: 0,
    resolved: 0,
    closed: 0,
  }

  for (const row of result) {
    counts[row.status] = Number(row.count)
    counts.all += Number(row.count)
  }

  return counts
}

/** Siguiente folio disponible — se muestra como "ID automático" al crear. */
export async function getNextTicketNumber(): Promise<number> {
  // ⚠️ Solo desarrollo/visual: siguiente folio de ejemplo sin BD.
  if (DEV_BYPASS_AUTH) return getMockNextTicketNumber()

  const [row] = await db.select({ value: max(tickets.number) }).from(tickets)
  return (row?.value ?? 0) + 1
}

/** Conteo de tickets por categoría — acepta el mismo acotado por mes. */
export async function getCategoryCounts(
  filters: Pick<TicketFilters, 'month'> = {},
): Promise<Record<TicketCategory, number>> {
  // ⚠️ Solo desarrollo/visual: conteos de ejemplo sin BD.
  if (DEV_BYPASS_AUTH) return getMockCategoryCounts()

  const conditions = buildBaseConditions(filters)

  const result = await db
    .select({ category: tickets.category, count: count() })
    .from(tickets)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(tickets.category)

  const counts = emptyCategoryCounts()

  for (const row of result) {
    counts[row.category] = Number(row.count)
  }

  return counts
}

export async function getTicketById(id: string) {
  // ⚠️ Solo desarrollo/visual: detalle de ejemplo sin BD.
  if (DEV_BYPASS_AUTH) return getMockTicketById(id)

  const creator = alias(users, 'creator')
  const assignee = alias(users, 'assignee')
  const changedByUser = alias(users, 'changed_by')
  const fromUser = alias(users, 'from_user')
  const toUser = alias(users, 'to_user')

  const [ticketRow, comments, statusHistory, assignmentHistory, attachments] =
    await Promise.all([
      // Ticket + personas
      db
        .select({
          ticket: tickets,
          creator: {
            id: creator.id,
            name: creator.name,
            email: creator.email,
          },
          assignee: {
            id: assignee.id,
            name: assignee.name,
            email: assignee.email,
          },
        })
        .from(tickets)
        .innerJoin(creator, eq(tickets.createdById, creator.id))
        .leftJoin(assignee, eq(tickets.assignedToId, assignee.id))
        .where(eq(tickets.id, id))
        .limit(1)
        .then((rows) => rows[0] ?? null),

      // Comentarios
      db
        .select({
          comment: ticketComments,
          author: {
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
          },
        })
        .from(ticketComments)
        .innerJoin(users, eq(ticketComments.authorId, users.id))
        .where(eq(ticketComments.ticketId, id))
        .orderBy(asc(ticketComments.createdAt)),

      // Historial de estado
      db
        .select({
          entry: ticketStatusHistory,
          changedBy: {
            id: changedByUser.id,
            name: changedByUser.name,
            email: changedByUser.email,
          },
        })
        .from(ticketStatusHistory)
        .innerJoin(
          changedByUser,
          eq(ticketStatusHistory.changedById, changedByUser.id),
        )
        .where(eq(ticketStatusHistory.ticketId, id))
        .orderBy(asc(ticketStatusHistory.changedAt)),

      // Historial de asignación
      db
        .select({
          entry: ticketAssignmentHistory,
          changedBy: {
            id: changedByUser.id,
            name: changedByUser.name,
            email: changedByUser.email,
          },
          fromUser: {
            id: fromUser.id,
            name: fromUser.name,
            email: fromUser.email,
          },
          toUser: {
            id: toUser.id,
            name: toUser.name,
            email: toUser.email,
          },
        })
        .from(ticketAssignmentHistory)
        .innerJoin(
          changedByUser,
          eq(ticketAssignmentHistory.changedById, changedByUser.id),
        )
        .leftJoin(fromUser, eq(ticketAssignmentHistory.fromUserId, fromUser.id))
        .leftJoin(toUser, eq(ticketAssignmentHistory.toUserId, toUser.id))
        .where(eq(ticketAssignmentHistory.ticketId, id))
        .orderBy(asc(ticketAssignmentHistory.createdAt)),

      // Archivos adjuntos
      db
        .select({
          id: ticketAttachments.id,
          fileName: ticketAttachments.fileName,
          fileSize: ticketAttachments.fileSize,
          mimeType: ticketAttachments.mimeType,
          commentId: ticketAttachments.commentId,
        })
        .from(ticketAttachments)
        .where(eq(ticketAttachments.ticketId, id))
        .orderBy(asc(ticketAttachments.createdAt)),
    ])

  if (!ticketRow) return null

  return {
    ...ticketRow,
    comments,
    statusHistory,
    assignmentHistory,
    // La URL apunta a nuestra ruta que sirve el archivo desde la BD.
    attachments: attachments.map((a) => ({
      ...a,
      url: `/api/attachments/${a.id}`,
    })),
  }
}

/**
 * Técnico responsable de una categoría — a quien se auto-asigna y notifica
 * un ticket nuevo de esa categoría.
 *
 * TODO(BD): resolver desde la tabla `user_categories` (categoría ↔ técnico).
 * Por ahora devuelve null (no hay tabla), así el flujo queda cableado sin
 * enviar correos hasta que exista la asignación en base de datos.
 */
export async function getTechnicianForCategory(
  category: TicketCategory,
): Promise<{ id: string; name: string | null; email: string } | null> {
  if (DEV_BYPASS_AUTH) return null

  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(categoryAssignments)
    .innerJoin(users, eq(categoryAssignments.userId, users.id))
    .where(eq(categoryAssignments.category, category))
    .limit(1)

  return row ?? null
}

/** Todos los usuarios con su rol — para el panel de administración. */
export async function getAllUsersForAdmin(): Promise<AdminUser[]> {
  // ⚠️ Solo desarrollo/visual: usuarios de ejemplo sin BD.
  if (DEV_BYPASS_AUTH) return getMockAdminUsers()

  const [rows, assigns] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .orderBy(asc(users.name)),
    db
      .select({
        category: categoryAssignments.category,
        userId: categoryAssignments.userId,
      })
      .from(categoryAssignments),
  ])

  // Categorías que atiende cada técnico (una categoría → un responsable).
  const byUser = new Map<string, TicketCategory[]>()
  for (const a of assigns) {
    const arr = byUser.get(a.userId) ?? []
    arr.push(a.category)
    byUser.set(a.userId, arr)
  }

  return rows.map((u) => ({ ...u, categories: byUser.get(u.id) ?? [] }))
}

/**
 * Personas a las que se les puede asignar un ticket: IT y administradores.
 * Los admins también atienden tickets, así que aparecen en el selector
 * "Atiende" y en el enrutamiento por categoría.
 */
export async function getITUsers() {
  // ⚠️ Solo desarrollo/visual: ingenieros de ejemplo sin BD.
  if (DEV_BYPASS_AUTH) return getMockITUsers()

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(inArray(users.role, ['it', 'admin']))
    .orderBy(asc(users.name))
}

// Tipos definidos explícitamente a partir del esquema (no del retorno de las
// funciones) para evitar ciclos de tipos con los datos de ejemplo de desarrollo.

/** Referencia mínima a un usuario, tal como la seleccionan los joins. */
type UserRef = Pick<User, 'id' | 'name' | 'email'>

export type ITUser = UserRef

export type TicketWithUsers = Ticket & {
  createdBy: User
  assignedTo: User | null
}

export type TicketComment = {
  comment: TicketCommentRow
  author: Pick<User, 'id' | 'name' | 'email' | 'role'>
}

export type TicketStatusHistoryItem = {
  entry: TicketStatusHistoryRow
  changedBy: UserRef
}

export type TicketAssignmentHistoryItem = {
  entry: TicketAssignmentHistoryRow
  changedBy: UserRef
  fromUser: UserRef | null
  toUser: UserRef | null
}

export type TicketAttachmentItem = {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  commentId: string | null
}

export type TicketDetails = {
  ticket: Ticket
  creator: UserRef
  assignee: UserRef | null
  comments: TicketComment[]
  statusHistory: TicketStatusHistoryItem[]
  assignmentHistory: TicketAssignmentHistoryItem[]
  attachments: TicketAttachmentItem[]
}