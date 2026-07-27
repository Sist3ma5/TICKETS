import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
} from '@/lib/constants'
import type { TicketCategory } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

interface TicketCategoryBadgeProps {
  category: TicketCategory
  className?: string
}

/**
 * Chip de categoría con icono y color propio, sobre fondo translúcido
 * del mismo tono (igual que el prototipo).
 */
export function TicketCategoryBadge({
  category,
  className,
}: TicketCategoryBadgeProps) {
  const Icon = CATEGORY_ICONS[category]
  const color = CATEGORY_COLORS[category]

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
        className,
      )}
      style={{
        color,
        backgroundColor: `${color}18`,
        borderColor: `${color}33`,
      }}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {CATEGORY_LABELS[category]}
    </span>
  )
}
