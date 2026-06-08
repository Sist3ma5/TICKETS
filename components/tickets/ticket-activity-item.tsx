import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'

import { STATUS_LABELS } from '@/lib/constants'
import type {
  TicketAssignmentHistoryItem,
  TicketStatusHistoryItem,
} from '@/lib/db/queries/tickets'

export type ActivityItem =
  | ({ type: 'status' } & TicketStatusHistoryItem)
  | ({ type: 'assignment' } & TicketAssignmentHistoryItem)

interface TicketActivityItemProps {
  item: ActivityItem
  createdAt: Date
}

export function TicketActivityItem({
  item,
  createdAt,
}: TicketActivityItemProps) {
  const actorName = item.changedBy.name ?? item.changedBy.email

  return (
    <div className="text-muted-foreground flex items-start gap-3 text-sm">
      <div className="bg-gray-700 mt-1.75 size-1.5 shrink-0 rounded-full" />
      <p className="min-w-0 flex-1 leading-snug">
        <span className="text-foreground font-medium">{actorName}</span>{' '}
        {item.type === 'status' ? (
          <StatusText item={item} />
        ) : (
          <AssignmentText item={item} />
        )}
        <span className="ml-1.5 text-xs" suppressHydrationWarning>
          ·{' '}
          {formatDistanceToNowStrict(createdAt, {
            addSuffix: true,
            locale: es,
          })}
        </span>
      </p>
    </div>
  )
}

function StatusText({
  item,
}: {
  item: TicketStatusHistoryItem & { type: 'status' }
}) {
  const { fromStatus, toStatus } = item.entry

  if (!fromStatus) {
    return (
      <>
        creó el ticket en estado{' '}
        <span className="text-foreground font-medium">
          {STATUS_LABELS[toStatus]}
        </span>
      </>
    )
  }

  return (
    <>
      cambió el estado a{' '}
      <span className="text-foreground font-medium">
        {STATUS_LABELS[toStatus]}
      </span>
    </>
  )
}

function AssignmentText({
  item,
}: {
  item: TicketAssignmentHistoryItem & { type: 'assignment' }
}) {
  const fromName = item.fromUser?.name ?? item.fromUser?.email ?? null

  const toName = item.toUser?.name ?? item.toUser?.email ?? null

  if (!fromName && toName) {
    return (
      <>
        asignó el ticket a{' '}
        <span className="text-foreground font-medium">{toName}</span>
      </>
    )
  }

  if (fromName && toName) {
    return (
      <>
        reasignó de{' '}
        <span className="text-foreground font-medium">{fromName}</span> a{' '}
        <span className="text-foreground font-medium">{toName}</span>
      </>
    )
  }

  if (fromName && !toName) {
    return (
      <>
        desasignó a{' '}
        <span className="text-foreground font-medium">{fromName}</span>
      </>
    )
  }

  return null
}
