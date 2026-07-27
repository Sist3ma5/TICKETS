import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/constants'
import type { TicketPriority } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

interface TicketPriorityBadgeProps {
  priority: TicketPriority
  className?: string
}

export function TicketPriorityBadge({
  priority,
  className,
}: TicketPriorityBadgeProps) {
  const color = PRIORITY_COLORS[priority]

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
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
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
