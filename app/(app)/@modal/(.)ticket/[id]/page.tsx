import { notFound } from 'next/navigation'

import { TicketDetail } from '@/components/tickets/ticket-detail'
import { TicketDetailSheet } from '@/components/tickets/ticket-detail-sheet'
import { getCurrentUser } from '@/lib/auth'
import { getTicketById } from '@/lib/db/queries/tickets'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function InterceptedTicketDetail({ params }: PageProps) {
  const { id } = await params

  const user = await getCurrentUser()
  if (!user) notFound()

  const ticket = await getTicketById(id)
  if (!ticket) notFound()

  const canView =
    user.role === 'it' ||
    ticket.creator.id === user.id ||
    ticket.assignee?.id === user.id
  if (!canView) notFound()

  return (
    <TicketDetailSheet>
      <TicketDetail ticket={ticket} currentUserRole={user.role} />
    </TicketDetailSheet>
  )
}
