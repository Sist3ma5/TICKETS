import { db } from '@/lib/db'
import {
  tickets,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/db/schema'
import { and, asc, count, desc, eq, ilike, type SQL } from 'drizzle-orm'
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

export type TicketWithUsers = Awaited<ReturnType<typeof getTickets>>[number]
