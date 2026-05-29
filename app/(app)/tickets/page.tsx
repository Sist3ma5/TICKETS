import { TicketCard } from '@/components/tickets/ticket-card'
import { TicketStatusTabs } from '@/components/tickets/ticket-status-tabs'
import { TicketsEmptyState } from '@/components/tickets/tickets-empty-state'
import { TicketsFiltersDropdown } from '@/components/tickets/tickets-filters-dropdown'
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

interface PageProps {
  searchParams: Promise<{
    status?: TicketStatus
    q?: string
    priority?: TicketPriority
    category?: TicketCategory
    sort?: 'asc' | 'desc'
  }>
}

export default async function MyTicketsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const baseFilter =
    user.role === 'it' ? { assignedToId: user.id } : { createdById: user.id }

  const [visibleTickets, statusCounts] = await Promise.all([
    getTickets({
      ...baseFilter,
      status: params.status,
      q: params.q,
      priority: params.priority,
      category: params.category,
      sort: params.sort,
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

      <div className="flex items-center justify-between">
        <TicketsSearch />
        <TicketsFiltersDropdown />
      </div>

      {visibleTickets.length === 0 ? (
        <TicketsEmptyState hasFilters={hasFilters} pathname="/tickets" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  )
}
