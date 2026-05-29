import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CATEGORY_LABELS } from '@/lib/constants'
import type { TicketWithUsers } from '@/lib/db/queries/tickets'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { TicketPriorityBadge } from './ticket-priority-badge'
import { TicketStatusBadge } from './ticket-status-badge'

interface TicketCardProps {
  ticket: TicketWithUsers
}

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <Card className="hover:bg-muted/30 cursor-pointer transition-colors">
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
          <div className="text-muted-foreground flex items-center gap-2">
            <span className="w-14 shrink-0 text-[10px] font-medium tracking-wider uppercase opacity-60">
              Reporta
            </span>
            <span className="truncate">{ticket.createdBy.name}</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-2">
            <span className="w-14 shrink-0 text-[10px] font-medium tracking-wider uppercase opacity-60">
              Atiende
            </span>
            <span className="truncate">
              {ticket.assignedTo ? (
                ticket.assignedTo.name
              ) : (
                <span className="italic">Sin asignar</span>
              )}
            </span>
          </div>
          <div className="text-muted-foreground flex items-center justify-between mt-3">
            <Badge>{CATEGORY_LABELS[ticket.category]}</Badge>
            <span>
              {formatDistanceToNow(ticket.createdAt, {
                addSuffix: true,
                locale: es,
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
