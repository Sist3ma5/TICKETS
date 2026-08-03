'use client'

import { useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Check, Filter, UserX, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  TICKET_CATEGORIES,
} from '@/lib/constants'
import type { TicketCategory, TicketPriority } from '@/lib/db/schema'

export function TicketsFiltersDropdown() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentSort = searchParams.get('sort')
  const currentPriority = searchParams.get('priority') as TicketPriority | null
  const currentCategory = searchParams.get('category') as TicketCategory | null
  const onlyUnassigned = searchParams.get('unassigned') === '1'

  const activeCount =
    (currentPriority ? 1 : 0) +
    (currentCategory ? 1 : 0) +
    (onlyUnassigned ? 1 : 0) +
    (currentSort === 'asc' ? 1 : 0)

  function update(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  function clearAll() {
    update({ priority: null, category: null, sort: null, unassigned: null })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="size-4" />
          Filtros
          {activeCount > 0 && (
            <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs font-medium">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="max-h-[70vh] w-64 overflow-y-auto p-0" align="end">
        <div className="p-2">
          <SectionLabel>Ordenar por fecha</SectionLabel>
          <FilterItem
            label="Más recientes primero"
            isActive={currentSort !== 'asc'}
            onClick={() => update({ sort: null })}
          />
          <FilterItem
            label="Más antiguos primero"
            isActive={currentSort === 'asc'}
            onClick={() => update({ sort: 'asc' })}
          />
        </div>

        <Separator />

        {/* ATENCIÓN — mismo criterio que el indicador "Sin asignar" de
            Estadísticas: tickets que todavía no tienen responsable. */}
        <div className="p-2">
          <SectionLabel>Atención</SectionLabel>
          <FilterItem
            label="Todos"
            isActive={!onlyUnassigned}
            onClick={() => update({ unassigned: null })}
          />
          <FilterItem
            label="Sin atender"
            isActive={onlyUnassigned}
            onClick={() => update({ unassigned: '1' })}
            icon={UserX}
          />
        </div>

        <Separator />

        {/* PRIORITY */}
        <div className="p-2">
          <SectionLabel>Prioridad</SectionLabel>
          <FilterItem
            label="Todas"
            isActive={!currentPriority}
            onClick={() => update({ priority: null })}
          />
          {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
            <FilterItem
              key={p}
              label={PRIORITY_LABELS[p]}
              isActive={currentPriority === p}
              onClick={() => update({ priority: p })}
              color={PRIORITY_COLORS[p]}
            />
          ))}
        </div>

        <Separator />

        {/* CATEGORY */}
        <div className="p-2">
          <SectionLabel>Categoría</SectionLabel>
          <FilterItem
            label="Todas"
            isActive={!currentCategory}
            onClick={() => update({ category: null })}
          />
          {TICKET_CATEGORIES.map((c) => (
            <FilterItem
              key={c}
              label={CATEGORY_LABELS[c]}
              isActive={currentCategory === c}
              onClick={() => update({ category: c })}
              icon={CATEGORY_ICONS[c]}
              color={CATEGORY_COLORS[c]}
            />
          ))}
        </div>

        {activeCount > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center"
                onClick={clearAll}
                disabled={isPending}
              >
                Limpiar filtros
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  )
}

interface FilterItemProps {
  label: string
  isActive: boolean
  onClick: () => void
  /** Color (hex) para el punto o para teñir el icono. */
  color?: string
  /** Icono opcional (categorías). */
  icon?: LucideIcon
}

function FilterItem({
  label,
  isActive,
  onClick,
  color,
  icon: Icon,
}: FilterItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent',
        isActive && 'bg-accent/50 font-medium',
      )}
    >
      {Icon ? (
        <Icon className="size-4 shrink-0" style={color ? { color } : undefined} />
      ) : color ? (
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      <span className="flex-1 text-left">{label}</span>
      {isActive && <Check className="size-4 text-muted-foreground" />}
    </button>
  )
}