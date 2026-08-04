import { TicketCard } from '@/components/tickets/ticket-card'
import { TicketStatusTabs } from '@/components/tickets/ticket-status-tabs'
import { TicketsEmptyState } from '@/components/tickets/tickets-empty-state'
import { TicketsFiltersDropdown } from '@/components/tickets/tickets-filters-dropdown'
import {
  TicketsLoadMore,
  TAMANO_PAGINA,
} from '@/components/tickets/tickets-load-more'
import { TicketsSearch } from '@/components/tickets/tickets-search'
import { getCurrentUser } from '@/lib/auth'
import { getStatusCounts, getTickets } from '@/lib/db/queries/tickets'
import { redirect } from 'next/navigation'
import { TicketsPageHeader } from '@/components/tickets/tickets-page-header'
import { NewTicketButton } from '@/components/tickets/new-ticket-button'

import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/lib/db/schema'
import type { TicketWithUsers } from '@/lib/db/queries/tickets'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    status?: TicketStatus
    q?: string
    priority?: TicketPriority
    category?: TicketCategory
    sort?: 'asc' | 'desc'
    ver?: string
  }>
}

export default async function MyTicketsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Para quien atiende tickets (IT y admins), "Mis tickets" son los que tiene
  // asignados. Para todos los demás, los que ellos levantaron.
  const baseFilter =
    user.role === 'it' || user.role === 'admin'
      ? { assignedToId: user.id }
      : { createdById: user.id }

  // Se acota para que una URL a mano no pueda pedir la tabla entera.
  const ver = Math.min(
    Math.max(Number(params.ver) || TAMANO_PAGINA, TAMANO_PAGINA),
    500,
  )

  const [visibleTickets, statusCounts]: [TicketWithUsers[], typeof Promise.all extends never ? never : Record<string, number>] = await Promise.all([
    getTickets({
      ...baseFilter,
      status: params.status,
      q: params.q,
      priority: params.priority,
      category: params.category,
      sort: params.sort,
      limit: ver,
    }),
    getStatusCounts({
      ...baseFilter,
      q: params.q,
      priority: params.priority,
      category: params.category,
    }),
  ])

  const hasFilters = Boolean(
    params.status || params.q || params.priority || params.category,
  )

  return (
    <div className="space-y-6">
      <TicketsPageHeader title="Mis tickets" action={<NewTicketButton />} />


      <TicketStatusTabs counts={statusCounts} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TicketsSearch />
        <TicketsFiltersDropdown />
      </div>

      {visibleTickets.length === 0 ? (
        <TicketsEmptyState hasFilters={hasFilters} pathname="/tickets" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleTickets.map((ticket: TicketWithUsers) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>

          <TicketsLoadMore
            mostrando={visibleTickets.length}
            total={
              params.status ? (statusCounts[params.status] ?? 0) : statusCounts.all
            }
            params={params}
            pathname="/tickets"
          />
        </>
      )}
    </div>
  )
}
