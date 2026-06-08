import { db } from '@/lib/db'
import {
  ticketAssignmentHistory,
  ticketComments,
  tickets,
  ticketStatusHistory,
  users,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/db/schema'
import { and, asc, count, desc, eq, ilike, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import 'server-only'

export interface TicketFilters {
  status?: TicketStatus
  q?: string
  priority?: TicketPriority
  category?: TicketCategory
  sort?: 'asc' | 'desc'
  assignedToId?: string
  createdById?: string
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
  return conditions
}

export async function getTickets(filters: TicketFilters) {
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

export async function getTicketById(id: string) {
  const creator = alias(users, 'creator')
  const assignee = alias(users, 'assignee')
  const changedByUser = alias(users, 'changed_by')
  const fromUser = alias(users, 'from_user')
  const toUser = alias(users, 'to_user')

  const [ticketRow, comments, statusHistory, assignmentHistory] =
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
    ])

  if (!ticketRow) return null

  return {
    ...ticketRow,
    comments,
    statusHistory,
    assignmentHistory,
  }
}

export async function getITUsers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.role, 'it'))
    .orderBy(asc(users.name))
}

export type ITUser = Awaited<ReturnType<typeof getITUsers>>[number]
export type TicketDetails = NonNullable<
  Awaited<ReturnType<typeof getTicketById>>
>
export type TicketComment = TicketDetails['comments'][number]
export type TicketStatusHistoryItem = TicketDetails['statusHistory'][number]
export type TicketAssignmentHistoryItem =
  TicketDetails['assignmentHistory'][number]
export type TicketWithUsers = Awaited<ReturnType<typeof getTickets>>[number]