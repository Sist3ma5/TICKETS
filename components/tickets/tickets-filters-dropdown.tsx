'use client'

import { useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Check, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { CATEGORY_LABELS, PRIORITY_LABELS } from '@/lib/constants'
import type { TicketCategory, TicketPriority } from '@/lib/db/schema'

const priorityDots: Record<TicketPriority, string> = {
  low: 'bg-zinc-400',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
}

export function TicketsFiltersDropdown() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentSort = searchParams.get('sort')
  const currentPriority = searchParams.get('priority') as TicketPriority | null
  const currentCategory = searchParams.get('category') as TicketCategory | null

  const activeCount =
    (currentPriority ? 1 : 0) +
    (currentCategory ? 1 : 0) +
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
    update({ priority: null, category: null, sort: null })
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

      <PopoverContent className="w-64 p-0" align="end">
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
              dotColor={priorityDots[p]}
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
          {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((c) => (
            <FilterItem
              key={c}
              label={CATEGORY_LABELS[c]}
              isActive={currentCategory === c}
              onClick={() => update({ category: c })}
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
  dotColor?: string
}

function FilterItem({ label, isActive, onClick, dotColor }: FilterItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent',
        isActive && 'bg-accent/50 font-medium',
      )}
    >
      {dotColor && <span className={cn('size-1.5 rounded-full', dotColor)} />}
      <span className="flex-1 text-left">{label}</span>
      {isActive && <Check className="size-4 text-muted-foreground" />}
    </button>
  )
}