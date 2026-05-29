import { Badge } from '@/components/ui/badge'
import { PRIORITY_LABELS } from '@/lib/constants'
import type { TicketPriority } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

const filledStyles: Record<TicketPriority, string> = {
  low: 'bg-gray-100 text-gray-800 border-transparent dark:bg-gray-950 dark:text-gray-200',
  medium:
    'bg-amber-100 text-amber-800 border-transparent dark:bg-amber-950 dark:text-amber-200',
  high: 'bg-red-100 text-red-800 border-transparent dark:bg-red-950 dark:text-red-200',
}

interface TicketPriorityBadgeProps {
  priority: TicketPriority
}

export function TicketPriorityBadge({ priority }: TicketPriorityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('font-bold', filledStyles[priority])}
    >
      {PRIORITY_LABELS[priority]}
    </Badge>
  )
}
