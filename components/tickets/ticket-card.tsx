import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  formatTicketCode,
} from '@/lib/constants'
import type { TicketWithUsers } from '@/lib/db/queries/tickets'
import { UserChatLink } from '@/components/shared/user-chat-link'
import { TicketPriorityBadge } from './ticket-priority-badge'
import { TicketStatusBadge } from './ticket-status-badge'

interface TicketCardProps {
  ticket: TicketWithUsers
}

export function TicketCard({ ticket }: TicketCardProps) {
  const color = CATEGORY_COLORS[ticket.category]
  const Icon = CATEGORY_ICONS[ticket.category]

  return (
    <article className="group bg-card border-border hover:border-muted-foreground/40 relative flex min-h-[300px] flex-col rounded-[13px] border p-5 shadow-sm transition-colors dark:bg-gradient-to-br dark:from-[#111720] dark:to-[#0d121a]">
      <Link
        href={`/ticket/${ticket.id}`}
        className="absolute inset-0 z-10 rounded-[inherit]"
        aria-label={ticket.title}
      >
        <span className="sr-only">Ver ticket</span>
      </Link>

      {/* Folio con el color de su categoría */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] font-semibold tracking-wider"
          style={{
            color,
            backgroundColor: `${color}18`,
            borderColor: `${color}33`,
          }}
        >
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {formatTicketCode(ticket.category, ticket.number)}
        </span>
      </div>

      <h3 className="mb-2 line-clamp-2 text-lg leading-snug font-semibold">
        {ticket.title}
      </h3>

      <p className="text-muted-foreground mb-4 line-clamp-2 text-sm leading-relaxed">
        {ticket.description}
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <TicketStatusBadge status={ticket.status} />
        <TicketPriorityBadge priority={ticket.priority} />
      </div>

      {/* Empuja el bloque inferior al fondo de la tarjeta */}
      <div className="mt-auto space-y-4">
        <div className="border-border grid grid-cols-2 gap-4 border-t pt-4">
          <div className="min-w-0">
            <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
              Reporta
            </p>
            <p className="truncate text-sm">
              <UserChatLink
                name={ticket.createdBy.name}
                email={ticket.createdBy.email}
              />
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
              Atiende
            </p>
            <p className="truncate text-sm">
              {ticket.assignedTo ? (
                <UserChatLink
                  name={ticket.assignedTo.name}
                  email={ticket.assignedTo.email}
                />
              ) : (
                <span className="text-muted-foreground italic">
                  Sin asignar
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            {CATEGORY_LABELS[ticket.category]}
          </span>
          <span className="text-muted-foreground" suppressHydrationWarning>
            {formatDistanceToNow(ticket.createdAt, {
              addSuffix: true,
              locale: es,
            })}
          </span>
        </div>
      </div>
    </article>
  )
}
