import { Badge } from '@/components/ui/badge'
import { STATUS_LABELS } from '@/lib/constants'
import type { TicketStatus } from '@/lib/db/schema'

const dotColors: Record<TicketStatus, string> = {
  open: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  waiting_user: 'bg-red-500',
  resolved: 'bg-emerald-500',
  closed: 'bg-zinc-400',
}

interface TicketStatusBadgeProps {
  status: TicketStatus
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  return (
    <Badge variant="outline" className="gap-1.5 font-semibold">
      <span className={`size-1.5 rounded-full ${dotColors[status]}`} />
      {STATUS_LABELS[status]}
    </Badge>
  )
}