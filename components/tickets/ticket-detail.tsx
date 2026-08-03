import {
  TicketInteractiveSection,
  type TimelineItem,
} from '@/components/tickets/ticket-interactive-section'
import { Separator } from '@/components/ui/separator'

import { formatTicketCode } from '@/lib/constants'
import type { TicketDetails } from '@/lib/db/queries/tickets'
import { getITUsers } from '@/lib/db/queries/tickets'
import type { UserRole } from '@/lib/db/schema'

interface TicketDetailProps {
  ticket: TicketDetails
  currentUserRole: UserRole
  /** Hace falta para saber si un técnico de IT trae este ticket asignado. */
  currentUserId: string
}

export async function TicketDetail({
  ticket,
  currentUserRole,
  currentUserId,
}: TicketDetailProps) {
  // Los admins también atienden tickets: cargan la lista de asignables igual
  // que IT, para poder asignarse un ticket a sí mismos.
  const isIT = currentUserRole === 'it' || currentUserRole === 'admin'
  const itUsers = isIT ? await getITUsers() : []

  const timeline: TimelineItem[] = [
    ...ticket.comments.map((c) => ({
      kind: 'comment' as const,
      data: c,
      createdAt: c.comment.createdAt,
    })),
    ...ticket.statusHistory.map((h) => ({
      kind: 'activity' as const,
      data: { type: 'status' as const, ...h },
      createdAt: h.entry.changedAt,
    })),
    ...ticket.assignmentHistory.map((h) => ({
      kind: 'activity' as const,
      data: { type: 'assignment' as const, ...h },
      createdAt: h.entry.createdAt,
    })),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  return (
    <div className="space-y-8">
      {/* Header — siempre estático */}
      <header className="space-y-1.5">
        <span className="text-muted-foreground font-mono text-xs font-medium tracking-wider">
          {formatTicketCode(ticket.ticket.category, ticket.ticket.number)}
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-balance">
          {ticket.ticket.title}
        </h1>
      </header>

      {/* Descripción — siempre estática */}
      <Separator />
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Descripción
        </h2>
        <p className="whitespace-pre-wrap wrap-break-words text-sm leading-relaxed">
          {ticket.ticket.description}
        </p>
      </section>

      {/* Todo lo interactivo */}
      <TicketInteractiveSection
        ticket={ticket.ticket}
        creator={ticket.creator}
        assignee={ticket.assignee}
        attachments={ticket.attachments}
        itUsers={itUsers}
        currentUserRole={currentUserRole}
        currentUserId={currentUserId}
        timeline={timeline}
      />
    </div>
  )
}
