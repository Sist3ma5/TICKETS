import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CATEGORY_LABELS } from '@/lib/constants'
import type { TicketWithUsers } from '@/lib/db/queries/tickets'
import { TicketPriorityBadge } from './ticket-priority-badge'
import { TicketStatusBadge } from './ticket-status-badge'

interface TicketCardProps {
  ticket: TicketWithUsers
}

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <Card className="hover:bg-muted/30 focus-within:ring-ring relative transition-colors focus-within:ring-2">
      <Link
        href={`/ticket/${ticket.id}`}
        className="absolute inset-0 z-10 rounded-[inherit]"
        aria-label={ticket.title}
      >
        <span className="sr-only">Ver ticket</span>
      </Link>

      <CardContent className="space-y-3 p-5">
        <h3 className="line-clamp-2 min-h-[2lh] text-base leading-tight font-bold">
          {ticket.title}
        </h3>

        <div className="flex items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
        </div>

        <p className="text-muted-foreground line-clamp-3 min-h-[3lh] text-sm">
          {ticket.description}
        </p>

        <Separator />

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[10px] tracking-wider uppercase opacity-60">
              Reporta
            </span>
            <span className="text-muted-foreground truncate">
              {ticket.createdBy.name ?? ticket.createdBy.email}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[10px] tracking-wider uppercase opacity-60">
              Atiende
            </span>
            <span className="text-muted-foreground truncate">
              {ticket.assignedTo ? (
                (ticket.assignedTo.name ?? ticket.assignedTo.email)
              ) : (
                <span className="italic">Sin asignar</span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <Badge>{CATEGORY_LABELS[ticket.category]}</Badge>
          <span className="text-muted-foreground" suppressHydrationWarning>
            {formatDistanceToNow(ticket.createdAt, {
              addSuffix: true,
              locale: es,
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
