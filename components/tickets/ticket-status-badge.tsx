import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'
import type { TicketStatus } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

interface TicketStatusBadgeProps {
  status: TicketStatus
  className?: string
}

export function TicketStatusBadge({
  status,
  className,
}: TicketStatusBadgeProps) {
  const color = STATUS_COLORS[status]

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        className,
      )}
      style={{
        color,
        backgroundColor: `${color}1f`,
        borderColor: `${color}40`,
      }}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {STATUS_LABELS[status]}
    </span>
  )
}
